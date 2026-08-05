import Joi from 'joi';

export const createCompanySchema = Joi.object({
  name: Joi.string().min(2).max(255).required().messages({
    'any.required': 'Company name is required'
  }),
  website: Joi.string().uri().allow('', null).messages({
    'string.uri': 'Website must be a valid URL'
  }),
  email: Joi.string().max(255).allow('', null),
  phone: Joi.string().max(20).allow('', null),
  address: Joi.string().allow('', null),
  pincode: Joi.string().max(20).allow('', null),
  companyType: Joi.string().max(100).allow('', null),
  industryId: Joi.number().integer().positive().allow(null),
  countryId: Joi.number().integer().positive().allow(null),
  stateId: Joi.number().integer().positive().allow(null),
  cityId: Joi.number().integer().positive().allow(null)
});

export const updateCompanySchema = Joi.object({
  name: Joi.string().min(2).max(255),
  website: Joi.string().uri().allow('', null),
  email: Joi.string().max(255).allow('', null),
  phone: Joi.string().max(20).allow('', null),
  address: Joi.string().allow('', null),
  pincode: Joi.string().max(20).allow('', null),
  companyType: Joi.string().max(100).allow('', null),
  industryId: Joi.number().integer().positive().allow(null),
  countryId: Joi.number().integer().positive().allow(null),
  stateId: Joi.number().integer().positive().allow(null),
  cityId: Joi.number().integer().positive().allow(null)
});
