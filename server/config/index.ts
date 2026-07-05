import Joi from 'joi'

export enum Env {
    DB_HOST = 'DB_HOST',
    DB_PORT = 'DB_PORT',
    DB_USERNAME = 'DB_USERNAME',
    DB_PASSWORD = 'DB_PASSWORD',
    DB_DATABASE = 'DB_DATABASE'
}

export const validationSchema = Joi.object({
    [Env.DB_HOST]: Joi.string().required(),
    [Env.DB_PORT]: Joi.number().required(),
    [Env.DB_USERNAME]: Joi.string().required(),
    [Env.DB_PASSWORD]: Joi.string().required(),
    [Env.DB_DATABASE]: Joi.string().required()
})