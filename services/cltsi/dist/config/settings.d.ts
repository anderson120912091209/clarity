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
    compileRateLimit: {
        enabled: boolean;
        clientUserIdHeader: string;
        cooldownLimit: number;
        cooldownWindowSec: number;
        burstLimit: number;
        burstWindowSec: number;
        autoLimit: number;
        autoWindowSec: number;
        dailyLimit: number;
        dailyWindowSec: number;
    };
}
declare const settings: CLSISettings;
export default settings;
//# sourceMappingURL=settings.d.ts.map