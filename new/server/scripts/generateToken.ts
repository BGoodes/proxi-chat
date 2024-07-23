import DotEnv from 'dotenv';
import JwtManager, { JwtPayload } from '../src/security/JwtManager';
import { randomBytes } from 'crypto';
DotEnv.config();

const content: JwtPayload = {
    version: 1,
    uid: randomBytes(16).toString('hex'),
    /**
     * Please keep the partern: 
     * {
     *  type: string,           // name of the service
     *  id: string,             // the identifier of the user in the service
     *  at: number,             // the time when the link was created (recommended to use Date.now()
     *  by: string              // the user who created the link (recommended to use 'generator')
     *  [key: string]: any      // any other information you want to store
     * }
     * 
     * Example:
     * {
     *  type: 'minecraft',
     *  id: 'd8092d79-d42a-4481-b8fa-97efacb4e2d6',
     *  moderation_id: 274789574,
     *  at: Date.now(),
     *  by: 'generator'
     * }
     * 
     * For make a server token, you can use the following example:
     * {
     *   type: 'moderator',     // the type 'moderator' is reserved for the servers 
     *   id: 'uhc-core-41', 
     *   at: Date.now(),
     *   by: 'generator'
     * }
     * 
     */
    links: [
        { 
            type: 'minecraft', 
            id: 'd8092d79-d42a-4481-b8fa-97efacb4e2d6', 
            at: Date.now(), 
            by: 'generator' 
        },
        {
            type: 'moderator',
            id: 'admin-01',
            at: Date.now(),
            by: 'generator'
        }
    ],
    updated_at: Date.now()
};

console.log('Generated token:', content);
var jwt = JwtManager.sign(content);
console.log('Token:', jwt);
