import Joi from 'joi';

export const createUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).required().messages({
    'any.required': 'First name is required'
  }),
  lastName: Joi.string().min(2).max(100).required().messages({
    'any.required': 'Last name is required'
  }),
  email: Joi.string().email().required().lowercase().messages({
    'string.email': 'Valid email is required',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required'
  }),
  phone: Joi.string().max(20).allow('', null),
  roleId: Joi.number().integer().positive().required().messages({
    'any.required': 'Role ID is required'
  }),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED').default('ACTIVE')
});

export const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(100),
  lastName: Joi.string().min(2).max(100),
  email: Joi.string().email().lowercase(),
  phone: Joi.string().max(20).allow('', null),
  roleId: Joi.number().integer().positive(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED')
});
