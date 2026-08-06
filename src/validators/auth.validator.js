import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
});

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  email: Joi.string().email().lowercase(),
  phone: Joi.string().max(20).allow('', null),
  department: Joi.string().max(100).allow('', null)
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update'
  });

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Old password is required',
      'any.required': 'Old password is required'
    }),
  newPassword: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'New password must be at least 6 characters long',
      'string.empty': 'New password is required',
      'any.required': 'New password is required'
    })
});
