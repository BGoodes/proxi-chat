import { Router } from 'express';
import Position from "../models/Position.js";

const setupRestRoutes = (io) => {

    const router = Router();
    router.post('/update-position', async (req, res) => {
        const {error, value} = Position.validate(req.body);
        if (error) {
            return res.status(400).send({error: error.details[0].message});
        }
        const {userId, coordinates, rotation} = value;
        console.log(`Position update from REST: ${userId} - ${coordinates} / ${rotation}`);
        io.emit('positionUpdate', {userId, coordinates, rotation});
        res.send({status: 'Position updated from REST'});
    });

    return router;
}

export default setupRestRoutes;