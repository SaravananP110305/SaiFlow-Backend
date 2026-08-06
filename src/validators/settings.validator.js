import Joi from 'joi';

export const updateSettingsSchema = Joi.object({
  appName: Joi.string().max(255).allow('', null),
  timeZone: Joi.string().max(50).allow('', null),
  language: Joi.string().max(50).allow('', null),
  companyName: Joi.string().max(255).allow('', null),
  contactEmail: Joi.string().email().max(255).allow('', null).messages({
    'string.email': 'Contact email must be a valid email address'
  }),
  address: Joi.string().max(1000).allow('', null)
}).min(1);
