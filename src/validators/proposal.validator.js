import Joi from 'joi';

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
  amount: Joi.number().precision(2).positive().required().messages({
    'any.required': 'Proposal amount is required'
  }),
  status: Joi.string().max(50).default('Draft'),
  documentUrl: Joi.string().uri().allow('', null),
  validUntil: Joi.date().iso().allow(null)
});

export const updateProposalSchema = Joi.object({
  proposalNumber: Joi.string().max(50),
  title: Joi.string().min(2).max(255),
  amount: Joi.number().precision(2).positive(),
  status: Joi.string().max(50),
  documentUrl: Joi.string().uri().allow('', null),
  validUntil: Joi.date().iso().allow(null)
});
