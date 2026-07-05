import Joi from 'joi';

export enum Env {
  DB_HOST = 'DB_HOST',
  DB_PORT = 'DB_PORT',
  DB_USERNAME = 'DB_USERNAME',
  DB_PASSWORD = 'DB_PASSWORD',
  DB_DATABASE = 'DB_DATABASE',

  JWT_SECRET = 'JWT_SECRET',
  JWT_EXPIRES_IN = 'JWT_EXPIRES_IN',

  FRONTEND_URL = 'FRONTEND_URL',

  HR_EMAIL = 'HR_EMAIL',
  HR_PASSWORD = 'HR_PASSWORD',

  COOKIE_SECURE = 'COOKIE_SECURE',
}

export const validationSchema = Joi.object({
  [Env.DB_HOST]: Joi.string().required(),
  [Env.DB_PORT]: Joi.number().required(),
  [Env.DB_USERNAME]: Joi.string().required(),
  [Env.DB_PASSWORD]: Joi.string().required(),
  [Env.DB_DATABASE]: Joi.string().required(),

  [Env.JWT_SECRET]: Joi.string().min(32).required(),
  [Env.JWT_EXPIRES_IN]: Joi.string().default('1d'),

  [Env.FRONTEND_URL]: Joi.string().uri().default('http://localhost:3000'),

  [Env.HR_EMAIL]: Joi.string().email().required(),
  [Env.HR_PASSWORD]: Joi.string().min(8).required(),

  [Env.COOKIE_SECURE]: Joi.boolean().default(false),
});
