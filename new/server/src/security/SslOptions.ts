import { existsSync } from "fs";

export function getSslKeyPath(): string {
    var sslKeyPath = process.env.SSL_KEY_PATH;
    if (!sslKeyPath || !existsSync(sslKeyPath))
        throw new Error('SSL key path not found');
    return sslKeyPath;
}

export function getSslCertPath(): string {
    var sslCertPath = process.env.SSL_CERT_PATH;
    if (!sslCertPath || !existsSync(sslCertPath))
        throw new Error('SSL cert path not found');
    return sslCertPath;
}

export function getSslPassphrase(): string {
    return process.env.SSL_PASSPHRASE || '';
}

export default function getSslOptions() {
    return {
        key: getSslKeyPath(),
        cert: getSslCertPath(),
        passphrase: getSslPassphrase()
    };
}

export function isSslEnabled(): boolean {
    return process.env.SSL_ENABLED === 'true';
}