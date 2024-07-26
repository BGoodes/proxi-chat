import HttpManager from "./HttpManager";
import Express, { RequestHandler } from "express";
import { isAbsolute, join } from "path";
import JwtManager, { JwtPayload } from "../security/JwtManager";
import cookieParser from "cookie-parser";
import { getIsProxied } from "./PeerController";

export default class RestController {

    express: Express.Application;

    constructor(private readonly httpManager: HttpManager) {
        this.express = Express();
    }

    init() {
        this.express.set('trust proxy', getIsProxied());
        this.express.use(cookieParser());
        this.express.use(this.before.bind(this) as RequestHandler);
        this.express.use(Express.static(getPublicPath()));

        // this.express.use("/rtc", this.httpManager.peer.peerServer);
        this.express.use('/link', this.httpManager.main.linkhandler.linkRouter());
        this.express.use('/api', this.httpManager.main.linkhandler.apiRouter());

        // end of handlers
        this.express.use(this.after.bind(this) as RequestHandler);
    }

    before(request: RestRequest, response: RestResponse, next: Express.NextFunction) {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST');
        var token = request.get('authorization')?.replace('Bearer ', '') || request.query.token || request.cookies['_uid'];
        request.data = {
            token: token,
            content: JwtManager.verify(token)
        };
        console.log(request.ip, '|', request.method, '>', request.url);
        return next();
    }

    after(request: RestRequest, response: RestResponse, next: Express.NextFunction) {
        return response.status(404).sendFile('404.html', { root: getPublicPath() });
    }

    checkIsModerator(request: RestRequest, response: RestResponse, next: Express.NextFunction) {
        if (request.data.content.links.find(l => l.type === 'moderator'))
            return next();
        return response.status(401).send('Unauthorized');
    }
}

export type RestRequest = Express.Request & { data: RestData };
export type RestResponse = Express.Response<any, Record<string, any>>;
export type RestData = {
    token: string;
    content: JwtPayload;
};

export function getPublicPath(): string {
    var publicPath = process.env.PUBLIC_PATH || './public/';
    return isAbsolute(publicPath) ? publicPath : join(process.cwd(), publicPath);
}