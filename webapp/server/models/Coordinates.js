import Joi from "joi";

const Coordinates = Joi.object({
    userId: Joi.string().required(),
    coordinates: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
        z: Joi.number().required()
    }).required()
});

export default Coordinates;