import Joi from "joi";

const Position = Joi.object({
    userId: Joi.string().required(),
    coordinates: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
        z: Joi.number().required()
    }).required(),
    rotation: Joi.number().required()
});

export default Position;