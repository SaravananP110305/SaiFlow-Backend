import Joi from 'joi';

const leadStatuses = [
  'NEW',
  'ASSIGNED',
  'CONTACTED',
  'MEETING_SCHEDULED',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
  'DISQUALIFIED'
];

export const createLeadSchema = Joi.object({
  title: Joi.string().min(2).max(255).required().messages({
    'any.required': 'Lead title is required'
  }),
  contactPerson: Joi.string().min(2).max(150).required().messages({
    'any.required': 'Contact person name is required'
  }),
  email: Joi.string().email().required().lowercase().messages({
    'string.email': 'Valid email is required',
    'any.required': 'Email is required'
  }),
  phone: Joi.string().max(20).allow('', null),
  companyId: Joi.number().integer().positive().allow(null),
  sourceId: Joi.number().integer().positive().allow(null),
  priorityId: Joi.number().integer().positive().allow(null),
  assignedToId: Joi.number().integer().positive().allow(null),
  budget: Joi.number().precision(2).positive().allow(null),
  currency: Joi.string().max(10).default('USD'),
  status: Joi.string().valid(...leadStatuses).default('NEW'),
  requirements: Joi.string().allow('', null)
});

export const updateLeadSchema = Joi.object({
  title: Joi.string().min(2).max(255),
  contactPerson: Joi.string().min(2).max(150),
  email: Joi.string().email().lowercase(),
  phone: Joi.string().max(20).allow('', null),
  companyId: Joi.number().integer().positive().allow(null),
  sourceId: Joi.number().integer().positive().allow(null),
  priorityId: Joi.number().integer().positive().allow(null),
  assignedToId: Joi.number().integer().positive().allow(null),
  budget: Joi.number().precision(2).positive().allow(null),
  currency: Joi.string().max(10),
  status: Joi.string().valid(...leadStatuses),
  requirements: Joi.string().allow('', null)
});

export const assignLeadSchema = Joi.object({
  assignedToId: Joi.number().integer().positive().required().messages({
    'any.required': 'Assigned user ID is required'
  })
});
