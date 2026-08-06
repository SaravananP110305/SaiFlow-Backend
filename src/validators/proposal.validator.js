import Joi from 'joi';

const phaseLineItemSchema = Joi.object({
  id: Joi.number().integer().positive().allow(null),
  category: Joi.string().max(100).required().messages({
    'any.required': 'Line item category is required'
  }),
  description: Joi.string().max(2000).required().messages({
    'any.required': 'Line item description is required'
  }),
  unit: Joi.string().max(50).allow(''),
  unitPrice: Joi.number().precision(2).min(0).required().messages({
    'any.required': 'Line item unit price is required'
  }),
  quantity: Joi.number().integer().min(0).default(1),
  amount: Joi.number().precision(2).min(0)
});

const phaseSchema = Joi.object({
  id: Joi.number().integer().positive().allow(null),
  phaseName: Joi.string().min(1).max(200).required().messages({
    'any.required': 'Phase name is required'
  }),
  overview: Joi.string().max(5000).allow('', null),
  estimatedTimeline: Joi.string().max(100).allow('', null),
  objectives: Joi.array().items(Joi.string().max(2000).allow('')),
  technicalRequirements: Joi.array().items(Joi.string().max(2000).allow('')),
  deliverables: Joi.array().items(Joi.string().max(2000).allow('')),
  assumptions: Joi.array().items(Joi.string().max(2000).allow('')),
  constraints: Joi.array().items(Joi.string().max(2000).allow('')),
  lineItems: Joi.array().items(phaseLineItemSchema).min(1).messages({
    'array.min': 'Each phase must have at least one line item'
  })
});

const phasesSchema = Joi.array().items(phaseSchema);

export const createProposalSchema = Joi.object({
  leadId: Joi.number().integer().positive().required().messages({
    'any.required': 'Lead ID is required'
  }),
  proposalNumber: Joi.string().max(50).required().messages({
    'any.required': 'Proposal number is required'
  }),
  title: Joi.string().min(2).max(255).required().messages({
    'any.required': 'Proposal title is required'
  }),
  amount: Joi.number().precision(2).min(0).required().messages({
    'any.required': 'Proposal amount is required'
  }),
  status: Joi.string().max(50).default('Draft'),
  documentUrl: Joi.string().uri().allow('', null),
  validUntil: Joi.date().iso().allow(null),
  requirements: Joi.object().allow(null),
  estimation: Joi.object().allow(null),
  quotation: Joi.object().allow(null),
  pricing: Joi.object().allow(null),
  discountPercent: Joi.number().precision(2).min(0).max(100).default(0),
  taxPercent: Joi.number().precision(2).min(0).max(100).default(0),
  phases: phasesSchema.optional()
});

export const updateProposalSchema = Joi.object({
  proposalNumber: Joi.string().max(50),
  title: Joi.string().min(2).max(255),
  amount: Joi.number().precision(2).min(0),
  status: Joi.string().max(50),
  documentUrl: Joi.string().uri().allow('', null),
  validUntil: Joi.date().iso().allow(null),
  requirements: Joi.object().allow(null),
  estimation: Joi.object().allow(null),
  quotation: Joi.object().allow(null),
  pricing: Joi.object().allow(null),
  discountPercent: Joi.number().precision(2).min(0).max(100),
  taxPercent: Joi.number().precision(2).min(0).max(100),
  phases: phasesSchema.optional()
});
