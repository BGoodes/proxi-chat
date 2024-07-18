import Main from "../Main";
import { randomBytes } from "crypto";
import Express, { NextFunction, RequestHandler, Router } from "express";
import { RestRequest, RestResponse, getPublicPath } from "../net/RestController";
import JwtManager, { JwtPayload } from "../security/JwtManager";

export default class LinkerHandler {

    tempLinks: Map<string, LinkObject> = new Map();

    constructor(private readonly main: Main) {

    }

    onUpdate() { }



    // Route Handlers

    apiRouter(): Router {
        var route = Router();
        route.post('/links',
            this.main.http.rest.checkIsModerator.bind(this.main.http.rest) as any,
            Express.json(),
            this.makeLinker.bind(this) as any
        ); // create a link for a user
        route.get('/links/:id',
            this.main.http.rest.checkIsModerator.bind(this.main.http.rest) as any,
            this.getLinker.bind(this) as any
        ); // get a linker information
        route.delete('/links/:id',
            this.main.http.rest.checkIsModerator.bind(this.main.http.rest) as any,
            this.deleteLinker.bind(this) as any
        ); // delete a linker
        return route;
    }

    linkRouter(): Router {
        var route = Router();
        route.get('/:tmp_id', this.attributeLinker.bind(this) as any); // bind a link to a user
        return route;
    }

    // Request Handlers

    private makeLinker(request: RestRequest, response: RestResponse, next: NextFunction) {
        let data: LinkData = request.body;
        if (!data.type || typeof data.type !== 'string')
            return response.status(400).send({ error: 'Invalid type' });
        this.makeLink(data, request.data.content.uid);
        return response.status(200).send(data);
    }

    public makeLink(data: { id: string, type: string }, uid: string): LinkObject {
        let link = {
            id: randomBytes(8).toString('hex'),
            data: {
                id: data.id,
                type: data.type,
                at: Date.now(),
                by: uid
            },
            expiration: new Date(Date.now() + getExpirationTime()),
            attributed: false,
            deletation: new Date(Date.now() + getDeletationTime())
        };
        this.tempLinks.set(link.id, link);
        return link;
    }

    private getLinker(request: RestRequest, response: RestResponse, next: NextFunction) {
        let id = request.params.id;
        let data = this.tempLinks.get(id);
        if (!data || data.expiration < new Date()) {
            this.tempLinks.delete(id);
            return response.status(404).send({ error: 'Link not found' });
        }
        return response.status(200).send(data);
    }

    private deleteLinker(request: RestRequest, response: RestResponse, next: NextFunction) {
        let id = request.params.id;
        let data = this.tempLinks.get(id);
        if (!data || data.expiration < new Date()) {
            this.tempLinks.delete(id);
            return response.status(404).send({ error: 'Link not found' });
        }
        this.tempLinks.delete(id);
        return response.status(200).send({ message: 'Link deleted' });
    }

    private attributeLinker(request: RestRequest, response: RestResponse, next: NextFunction) {
        let tmp_id = request.params.tmp_id;
        let data = this.tempLinks.get(tmp_id);

        // return data if found
        if (!data || data.attributed || data.expiration < new Date())
            return response.status(410).sendFile('nolink.html', { root: getPublicPath() });

        // process data
        let index = request.data.content.links.findIndex(l => l.type === data.data.type && l.id === data.data.id);
        if (index === -1) {
            request.data.content.links.push(data.data);
        } else request.data.content.links[index] = data.data;
        request.data.token = JwtManager.sign(request.data.content);
        response.cookie('_uid', request.data.token);
        data.attributed = true;
        return response.status(200).sendFile('link.html', { root: getPublicPath() });
    }

    getLink(id: string, type: string): LinkObject | undefined {
        return Array.from(this.tempLinks.values()).find(l => l.data.id === id && l.data.type === type);
    }
}

export type LinkData = {
    id: string; // unique id
    type: string; // type of link
    at: number; // timestamp of creation
    by: string; // user id  who created the link
    [key: string]: any; // other data
}

export function getExpirationTime(): number {
    var time = parseInt(process.env.LINK_EXPIRATION || '');
    return isNaN(time) ? 600000 : time;
}

export function getDeletationTime(): number {
    var time = parseInt(process.env.LINK_DELETATION || '');
    return isNaN(time) ? 900000 : time;
}

export interface LinkObject {
    id: string,
    data: LinkData,
    expiration: Date,
    attributed: boolean,
    deletation: Date
}