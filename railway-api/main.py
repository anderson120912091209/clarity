from flask import Flask, send_file, request
import os
import subprocess
import tempfile
from flask_cors import CORS

app = Flask(__name__)

CORS(app)

@app.route('/', methods=['POST'])
def latex_to_pdf():
    print("Received request to convert LaTeX to PDF")
    files = request.files

    if 'main.tex' not in files:
        print("No main.tex file provided in the request")
        return {
            "error": "No main.tex file provided",
            "message": "Please upload a main.tex file."
        }, 400

    with tempfile.TemporaryDirectory() as temp_dir:
        print(f"Created temporary directory at {temp_dir}")
        generated_files = []
        try:
            for filename, file in files.items():
                file_path = os.path.join(temp_dir, filename)
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                file.save(file_path)
                generated_files.append(file_path)
                print(f"Saved file {filename} to {file_path}")
            
            input_file = os.path.join(temp_dir, 'main.tex')
            print(f"Input file path set to {input_file}")
            
            # Validate main.tex file exists and is not empty
            if not os.path.exists(input_file):
                return {
                    "error": "File not found",
                    "message": "main.tex file was not saved correctly",
                    "details": f"Expected file at {input_file} but it does not exist"
                }, 400
            
            file_size = os.path.getsize(input_file)
            if file_size == 0:
                return {
                    "error": "Empty file",
                    "message": "main.tex file is empty",
                    "details": "Please add content to main.tex before compiling"
                }, 400
            
            print(f"main.tex file size: {file_size} bytes")
            
            # Read and validate file content
            with open(input_file, 'r', encoding='utf-8') as f:
                file_content = f.read()
                file_lines = file_content.split('\n')
                print(f"main.tex file has {len(file_lines)} lines")
                print(f"First 10 lines of main.tex:")
                for i, line in enumerate(file_lines[:10], 1):
                    print(f"  Line {i}: {repr(line)}")
                
                # Check for common LaTeX errors
                if '\\titlef' in file_content and '\\titleformat' not in file_content:
                    return {
                        "error": "LaTeX syntax error",
                        "message": "Found '\\titlef' which is not a valid LaTeX command. Did you mean '\\titleformat'?",
                        "details": f"File content (first 20 lines):\n" + "\n".join(f"{i}: {line}" for i, line in enumerate(file_lines[:20], 1))
                    }, 400
            
            try:
                print("Running pdflatex for the first time")
                result1 = subprocess.run(['pdflatex', '-shell-escape', '-output-directory', temp_dir, input_file], 
                               check=False, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                               env=dict(os.environ, PATH=f"{os.environ['PATH']}:/usr/bin:/usr/local/bin"),
                               text=True)
                
                # Read log file for better error messages
                log_file = os.path.join(temp_dir, 'main.log')
                log_content = ""
                if os.path.exists(log_file):
                    with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                        log_content = f.read()
                
                if result1.returncode != 0:
                    print(f"First pdflatex run failed with return code {result1.returncode}")
                    print(f"Output: {result1.stdout}")
                    return {
                        "error": "LaTeX compilation failed",
                        "message": f"pdflatex returned exit code {result1.returncode}",
                        "details": f"Output:\n{result1.stdout}\n\nLog file:\n{log_content[-2000:]}"  # Last 2000 chars
                    }, 500
                
                print("Running pdflatex for the second time")
                result = subprocess.run(['pdflatex', '-shell-escape', '-output-directory', temp_dir, input_file], 
                                        check=False, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                        env=dict(os.environ, PATH=f"{os.environ['PATH']}:/usr/bin:/usr/local/bin"),
                                        text=True)
                
                # Read updated log file
                if os.path.exists(log_file):
                    with open(log_file, 'r', encoding='utf-8', errors='ignore') as f:
                        log_content = f.read()
                
                if result.returncode != 0:
                    print(f"Second pdflatex run failed with return code {result.returncode}")
                    print(f"Output: {result.stdout}")
                    return {
                        "error": "LaTeX compilation failed",
                        "message": f"pdflatex returned exit code {result.returncode}",
                        "details": f"Output:\n{result.stdout}\n\nLog file:\n{log_content[-2000:]}"
                    }, 500
                
                # Track generated files
                for ext in ['.aux', '.log', '.pdf']:
                    generated_files.append(os.path.join(temp_dir, f'main{ext}'))
                                        
                pdf_path = os.path.join(temp_dir, 'main.pdf')
                print(f"PDF generated successfully at {pdf_path}")
                return send_file(pdf_path, 
                                 mimetype='application/pdf',
                                 as_attachment=True,
                                 download_name='output.pdf')
            except subprocess.CalledProcessError as e:
                output = e.stdout + e.stderr
                print(f"Error generating PDF: {e}\nOutput: {output}")
                return {
                    "error": "Error generating PDF",
                    "message": str(e),
                    "details": output
                }, 500
        finally:
            # Manually remove tracked temporary files
            for file_path in generated_files:
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        os.rmdir(file_path)
                    print(f"Removed temporary file {file_path}")
                except Exception as e:
                    print(f"Failed to remove temporary file {file_path}. Reason: {e}")

if __name__ == '__main__':
    print("Starting Flask app")
    app.run(debug=True, port=8000)