import Joi from 'joi';

export const createClientSchema = Joi.object({
  companyId: Joi.number().integer().positive().required().messages({
    'any.required': 'Company ID is required'
  }),
  leadId: Joi.number().integer().positive().allow(null),
  gstPan: Joi.string().max(100).allow('', null),
  panNumber: Joi.string().max(100).allow('', null),
  paymentTerms: Joi.string().max(50).allow('', null),
  creditLimit: Joi.number().positive().allow(null),
  preferredCommunication: Joi.string().max(50).allow('', null),
  relationshipManagerId: Joi.number().integer().positive().allow(null),
  accountManagerId: Joi.number().integer().positive().allow(null),
  status: Joi.string().valid('Active', 'Inactive').default('Active')
});

export const updateClientSchema = Joi.object({
  gstPan: Joi.string().max(100).allow('', null),
  panNumber: Joi.string().max(100).allow('', null),
  paymentTerms: Joi.string().max(50).allow('', null),
  creditLimit: Joi.number().positive().allow(null),
  preferredCommunication: Joi.string().max(50).allow('', null),
  relationshipManagerId: Joi.number().integer().positive().allow(null),
  accountManagerId: Joi.number().integer().positive().allow(null),
  status: Joi.string().valid('Active', 'Inactive')
});

export const createProjectSchema = Joi.object({
  clientId: Joi.number().integer().positive().required().messages({
    'any.required': 'Client ID is required'
  }),
  name: Joi.string().min(2).max(255).required().messages({
    'any.required': 'Project name is required'
  }),
  pmId: Joi.number().integer().positive().allow(null),
  status: Joi.string().max(50).default('Kickoff'),
  handoverDate: Joi.date().iso().allow(null),
  targetDate: Joi.date().iso().allow(null),
  kickoffDate: Joi.date().iso().allow(null),
  notes: Joi.string().max(5000).allow('', null),
  srsDocumentUrl: Joi.string().uri().allow('', null)
});

export const updateProjectSchema = Joi.object({
  name: Joi.string().min(2).max(255),
  pmId: Joi.number().integer().positive().allow(null),
  status: Joi.string().max(50),
  handoverDate: Joi.date().iso().allow(null),
  targetDate: Joi.date().iso().allow(null),
  kickoffDate: Joi.date().iso().allow(null),
  notes: Joi.string().max(5000).allow('', null),
  srsDocumentUrl: Joi.string().uri().allow('', null)
});
