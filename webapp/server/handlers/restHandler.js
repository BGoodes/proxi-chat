import { Router } from 'express';
import Coordinates from "../models/Coordinates.js";

const setupRestRoutes = (io) => {

    const router = Router();
    router.post('/update-coordinates', async (req, res) => {
        const {error, value} = Coordinates.validate(req.body);
        if (error) {
            return res.status(400).send({error: error.details[0].message});
        }
        const {userId, coordinates} = value;
        console.log(`Coordinates update from REST: ${userId} - ${coordinates}`);
        io.emit('coordinatesUpdate', {userId, coordinates});
        res.send({status: 'Coordinates updated from REST'});
    });

    return router;
}

export default setupRestRoutes;