import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const parseBoolean = (value, defaultValue) => {
    if (value === undefined)
        return defaultValue;
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};
const parsePositiveInt = (value, defaultValue) => {
    if (!value)
        return defaultValue;
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};
const settings = {
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
    // Compile rate limiting
    compileRateLimit: {
        enabled: parseBoolean(process.env.COMPILE_RATE_LIMIT_ENABLED, true),
        clientUserIdHeader: process.env.COMPILE_RATE_LIMIT_USER_HEADER || 'x-clarity-user-id',
        cooldownLimit: parsePositiveInt(process.env.COMPILE_RATE_LIMIT_COOLDOWN_LIMIT, 1),
        cooldownWindowSec: parsePositiveInt(process.env.COMPILE_RATE_LIMIT_COOLDOWN_WINDOW_SEC, 2),
        burstLimit: parsePositiveInt(process.env.COMPILE_RATE_LIMIT_BURST_LIMIT, 60),
        burstWindowSec: parsePositiveInt(process.env.COMPILE_RATE_LIMIT_BURST_WINDOW_SEC, 600),
        autoLimit: parsePositiveInt(process.env.COMPILE_RATE_LIMIT_AUTO_LIMIT, 20),
        autoWindowSec: parsePositiveInt(process.env.COMPILE_RATE_LIMIT_AUTO_WINDOW_SEC, 60),
        dailyLimit: parsePositiveInt(process.env.COMPILE_RATE_LIMIT_DAILY_LIMIT, 200),
        dailyWindowSec: parsePositiveInt(process.env.COMPILE_RATE_LIMIT_DAILY_WINDOW_SEC, 86400),
    },
};
export default settings;
//# sourceMappingURL=settings.js.map