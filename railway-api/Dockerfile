# Flask API Dockerfile for LaTeX Compilation
FROM python:3.11-slim

# Install system dependencies for LaTeX compilation
RUN apt-get update && apt-get install -y \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-recommended \
    texlive-publishers \
    texlive-science \
    texlive-pictures \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .

# Expose port
EXPOSE 8000

# Run the application with hypercorn
CMD ["hypercorn", "main:app", "--bind", "0.0.0.0:8000"]

