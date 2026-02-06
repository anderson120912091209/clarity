interface CLSISettings {
    port: number;
    compileDir: string;
    outputDir: string;
    texliveImage: string;
    typstImage: string;
    compileTimeout: number;
    maxCompileSize: number;
    cacheAge: number;
    cacheLimit: number;
    seccompProfilePath: string;
}
declare const settings: CLSISettings;
export default settings;
//# sourceMappingURL=settings.d.ts.map