import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CLSISettings {
  host: string;
  port: number;
  compileDir: string;
  outputDir: string;
  texliveImage: string;
  typstImage: string;
  typstAllowNetwork: boolean;
  compileTimeout: number;
  maxCompileSize: number;
  cacheAge: number;
  cacheLimit: number;
  seccompProfilePath: string;
}

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const settings: CLSISettings = {
  // Server configuration
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT || '3013', 10),
  
  // Directory paths
  compileDir: process.env.COMPILE_DIR || '/tmp/clsi/compiles',
  outputDir: process.env.OUTPUT_DIR || '/tmp/clsi/output',
  
  // Docker configuration
  texliveImage: process.env.TEXLIVE_IMAGE || 'texlive/texlive:latest',
  typstImage: process.env.TYPST_IMAGE || 'ghcr.io/typst/typst:latest',
  typstAllowNetwork: parseBoolean(process.env.TYPST_ALLOW_NETWORK, false),
  
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
