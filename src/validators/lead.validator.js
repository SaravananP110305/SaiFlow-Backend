import Joi from 'joi';
import { normalizeLeadStatus } from '../constants/lead.constants.js';

/**
 * Joi custom type that accepts any status (enum value or humanized alias),
 * normalizes it to the canonical enum value, and rejects unknown values.
 */
const leadStatusField = Joi.string()
  .custom((value, helpers) => {
    const normalized = normalizeLeadStatus(value);
    if (!normalized) {
      return helpers.error('any.invalid');
    }
    return normalized;
  }, 'Lead status normalization')
  .messages({
    'any.invalid': 'Invalid lead status provided'
  });

const companyAddressFields = {
  designation: Joi.string().max(150).allow('', null),
  alternatePhone: Joi.string().max(20).allow('', null),
  alternateEmail: Joi.string().email().max(255).lowercase().allow('', null).messages({
    'string.email': 'Valid alternate email is required'
  }),
  expectedCloseDate: Joi.date().iso().allow(null).messages({
    'date.base': 'Expected close date must be a valid ISO date'
  }),
  nextFollowUpDate: Joi.date().iso().allow(null).messages({
    'date.base': 'Next follow-up date must be a valid ISO date'
  }),
  budget: Joi.number().precision(2).positive().allow(null),
  wonAmount: Joi.number().precision(2).positive().allow(null),
  currency: Joi.string().max(10).default('USD'),
  lostReason: Joi.string().allow('', null)
};

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
  status: leadStatusField.default('NEW'),
  requirements: Joi.string().allow('', null),
  ...companyAddressFields
});

export const updateLeadSchema = Joi.object({
  title: Joi.string().min(2).max(255),
  contactPerson: Joi.string().min(2).max(150),
  email: Joi.string().email().lowercase().messages({
    'string.email': 'Valid email is required'
  }),
  phone: Joi.string().max(20).allow('', null),
  companyId: Joi.number().integer().positive().allow(null),
  sourceId: Joi.number().integer().positive().allow(null),
  priorityId: Joi.number().integer().positive().allow(null),
  assignedToId: Joi.number().integer().positive().allow(null),
  status: leadStatusField,
  requirements: Joi.string().allow('', null),
  ...companyAddressFields
});

export const assignLeadSchema = Joi.object({
  assignedToId: Joi.number().integer().positive().required().messages({
    'any.required': 'Assigned user ID is required'
  })
});

export const importLeadRowSchema = Joi.object({
  title: Joi.string().min(2).max(255).required().messages({
    'any.required': 'Row "title" is required'
  }),
  contactPerson: Joi.string().min(2).max(150).allow('', null),
  email: Joi.string().email().lowercase().allow('', null).messages({
    'string.email': 'Row contains an invalid email address'
  }),
  phone: Joi.string().max(20).allow('', null),
  designation: Joi.string().max(150).allow('', null),
  alternatePhone: Joi.string().max(20).allow('', null),
  alternateEmail: Joi.string().email().max(255).lowercase().allow('', null),
  companyName: Joi.string().min(2).max(255).allow('', null),
  website: Joi.string().max(255).allow('', null),
  address: Joi.string().allow('', null),
  pincode: Joi.string().max(20).allow('', null),
  industryId: Joi.number().integer().positive().allow(null),
  countryId: Joi.number().integer().positive().allow(null),
  stateId: Joi.number().integer().positive().allow(null),
  cityId: Joi.number().integer().positive().allow(null),
  companyType: Joi.string().max(100).allow('', null),
  sourceId: Joi.number().integer().positive().allow(null),
  priorityId: Joi.number().integer().positive().allow(null),
  assignedToId: Joi.number().integer().positive().allow(null),
  budget: Joi.number().precision(2).positive().allow(null),
  currency: Joi.string().max(10).allow('', null),
  status: leadStatusField.default('NEW'),
  requirements: Joi.string().allow('', null),
  expectedCloseDate: Joi.date().iso().allow(null),
  nextFollowUpDate: Joi.date().iso().allow(null)
});

export const importLeadsSchema = Joi.object({
  // Each row is validated individually inside the controller so one bad row is
  // skipped + reported instead of aborting the entire batch.
  leads: Joi.array()
    .items(Joi.any())
    .min(1)
    .max(500)
    .required()
    .messages({
      'array.min': 'At least one lead row is required',
      'array.max': 'A maximum of 500 lead rows can be imported at once',
      'any.required': 'leads[] array is required'
    })
});

export const bulkAssignSchema = Joi.object({
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(500).required().messages({
    'array.min': 'Select at least one lead',
    'array.max': 'A maximum of 500 leads can be processed at once'
  }),
  assignedToId: Joi.number().integer().positive().required().messages({
    'any.required': 'Assigned user ID is required'
  })
});

export const bulkDeleteSchema = Joi.object({
  ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(500).required().messages({
    'array.min': 'Select at least one lead',
    'array.max': 'A maximum of 500 leads can be processed at once'
  })
});

export const convertLeadSchema = Joi.object({
  gstPan: Joi.string().max(100).allow('', null),
  paymentTerms: Joi.string().max(50).allow('', null),
  creditLimit: Joi.number().precision(2).positive().allow(null),
  relationshipManagerId: Joi.number().integer().positive().allow(null),
  accountManagerId: Joi.number().integer().positive().allow(null),
  wonAmount: Joi.number().precision(2).positive().allow(null)
});
