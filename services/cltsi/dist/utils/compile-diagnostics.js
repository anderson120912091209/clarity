import fs from 'node:fs/promises';
import path from 'node:path';
const MAX_LOG_TAIL_BYTES = 1_000_000;
export async function buildCompileDiagnostics(options) {
    const logs = await readOutputLog(options.compileDir);
    const fromLogs = options.compiler === 'typst'
        ? extractTypstDiagnostic(logs)
        : extractLatexDiagnostic(logs);
    if (fromLogs) {
        return fromLogs;
    }
    return {
        summary: summarizeInfrastructureMessage(options.fallbackMessage),
    };
}
async function readOutputLog(compileDir) {
    try {
        const logPath = path.join(compileDir, 'output.log');
        const text = await fs.readFile(logPath, 'utf-8');
        if (text.length <= MAX_LOG_TAIL_BYTES) {
            return text;
        }
        return text.slice(-MAX_LOG_TAIL_BYTES);
    }
    catch {
        return null;
    }
}
function extractLatexDiagnostic(logs) {
    if (!logs)
        return null;
    const fileLineMatch = logs.match(/^(.+?\.tex):(\d+):\s+(.+)$/m);
    if (fileLineMatch) {
        const filePath = fileLineMatch[1];
        const line = Number(fileLineMatch[2]);
        const message = cleanMessage(fileLineMatch[3]);
        return {
            summary: `${message} (${path.basename(filePath)}:${line})`,
            file: path.basename(filePath),
            line,
        };
    }
    const latexErrorMatch = logs.match(/! LaTeX Error:\s*(.+?)(?:\n|$)/m);
    if (latexErrorMatch) {
        const message = cleanMessage(latexErrorMatch[1]);
        const lineMatch = logs.match(/l\.(\d+)\s*/m);
        const line = lineMatch ? Number(lineMatch[1]) : undefined;
        return {
            summary: line ? `${message} (line ${line})` : message,
            line,
        };
    }
    const undefinedControlMatch = logs.match(/Undefined control sequence\.?/m);
    if (undefinedControlMatch) {
        const commandMatch = logs.match(/l\.\d+\s*(\\\S+)/m);
        const lineMatch = logs.match(/l\.(\d+)\s*/m);
        const line = lineMatch ? Number(lineMatch[1]) : undefined;
        const command = commandMatch ? commandMatch[1] : undefined;
        const commandSuffix = command ? ` near ${command}` : '';
        return {
            summary: `Undefined control sequence${commandSuffix}${line ? ` (line ${line})` : ''}.`,
            line,
        };
    }
    const missingFileMatch = logs.match(/! LaTeX Error: File `([^']+)' not found\./m);
    if (missingFileMatch) {
        return {
            summary: `Missing file: ${missingFileMatch[1]}.`,
            file: missingFileMatch[1],
        };
    }
    const noPagesMatch = logs.match(/No pages of output\./m);
    if (noPagesMatch) {
        return {
            summary: 'Compilation failed before producing any PDF pages.',
        };
    }
    const firstBangLine = logs
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.startsWith('! '));
    if (firstBangLine) {
        return {
            summary: cleanMessage(firstBangLine.replace(/^!\s*/, '')),
        };
    }
    return null;
}
function extractTypstDiagnostic(logs) {
    if (!logs)
        return null;
    const typstErrorMatch = logs.match(/^error:\s+(.+)$/mi);
    const locationMatch = logs.match(/-->\s+(.+?):(\d+):\d+/m);
    if (typstErrorMatch) {
        const summary = cleanMessage(typstErrorMatch[1]);
        const file = locationMatch ? path.basename(locationMatch[1]) : undefined;
        const line = locationMatch ? Number(locationMatch[2]) : undefined;
        return {
            summary: file && line ? `${summary} (${file}:${line})` : summary,
            file,
            line,
        };
    }
    return null;
}
function cleanMessage(message) {
    return message.replace(/\s+/g, ' ').trim();
}
function summarizeInfrastructureMessage(message) {
    const normalized = message.toLowerCase();
    if (normalized.includes('no such image')) {
        return 'Compiler image is missing on the server. Please retry shortly.';
    }
    if (normalized.includes('timed out')) {
        return 'Compilation timed out. Try simplifying the document and compile again.';
    }
    if (normalized.includes('failed to initialize docker')) {
        return 'Compiler service is temporarily unavailable. Please retry shortly.';
    }
    return message;
}
//# sourceMappingURL=compile-diagnostics.js.map