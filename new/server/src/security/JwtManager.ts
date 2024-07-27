import * as jwt from 'jsonwebtoken';
import { LinkData } from '../handlers/LinkerHandler';
import { randomUUID } from 'crypto';

export default class JwtManager {
    static options: jwt.SignOptions = {};

    static sign(data: JwtPayload): string {
        return jwt.sign({
            ...data,
            u: Date.now()
        }, getJwtSecret(), this.options);
    }

    static verify(token: string): JwtPayload {
        var data = token && typeof token === 'string' ? jwt.verify(token, getJwtSecret(), this.options) as JwtPayload : null;
        if (!data) data = {
            version: 1,
            uid: randomUUID(),
            links: [],
            updated_at: Date.now()
        };
        if (typeof data !== 'object')
            throw new Error('Invalid token data');
        return data as JwtPayload;
    }
}

export interface JwtPayload {
    version: number; // Version
    uid: string; // UUID
    links: LinkData[]; // Links
    updated_at: number; // last update
}

export function getJwtSecret(): string {
    var token = process.env.JWT_SECRET || process.env.SSL_PASSPHRASE || '';
    if (!token)
        throw new Error('JWT secret not found');
    return token;
}