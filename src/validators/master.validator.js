import Joi from 'joi';

const validCategories = [
  'LEAD_SOURCE',
  'INDUSTRY',
  'TECH_STACK',
  'PRIORITY',
  'COUNTRY',
  'STATE',
  'CITY',
  'SERVICE',
  'COMPANY_TYPE',
  'PAYMENT_TYPE',
  'FOLLOWUP_TYPE',
  'DEPARTMENT',
  'DESIGNATION'
];

export const createMasterItemSchema = Joi.object({
  category: Joi.string()
    .valid(...validCategories)
    .required()
    .messages({
      'any.only': `Category must be one of: ${validCategories.join(', ')}`,
      'any.required': 'Category is required'
    }),
  name: Joi.string().min(1).max(100).required().messages({
    'any.required': 'Name is required'
  }),
  status: Joi.string().valid('Active', 'Inactive').default('Active'),
  parentId: Joi.number().integer().positive().allow(null)
});

export const updateMasterItemSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  status: Joi.string().valid('Active', 'Inactive'),
  parentId: Joi.number().integer().positive().allow(null)
});
