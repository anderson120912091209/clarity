import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CLSISettings {
  port: number;
  compileDir: string;
  outputDir: string;
  texliveImage: string;
  compileTimeout: number;
  maxCompileSize: number;
  cacheAge: number;
  cacheLimit: number;
  seccompProfilePath: string;
}

const settings: CLSISettings = {
  // Server configuration
  port: parseInt(process.env.PORT || '3013', 10),
  
  // Directory paths
  compileDir: process.env.COMPILE_DIR || '/tmp/clsi/compiles',
  outputDir: process.env.OUTPUT_DIR || '/tmp/clsi/output',
  
  // Docker configuration
  texliveImage: process.env.TEXLIVE_IMAGE || 'texlive/texlive:latest',
  
  // Compilation limits
  compileTimeout: parseInt(process.env.COMPILE_TIMEOUT || '60000', 10),
  maxCompileSize: parseInt(process.env.MAX_COMPILE_SIZE || '52428800', 10), // 50MB
  
  // Cache configuration
  cacheAge: parseInt(process.env.CACHE_AGE || '5400000', 10), // 90 minutes
  cacheLimit: parseInt(process.env.CACHE_LIMIT || '2', 10),
  
  // Security
  seccompProfilePath: path.join(__dirname, 'seccomp.json'),
};

export default settings;
