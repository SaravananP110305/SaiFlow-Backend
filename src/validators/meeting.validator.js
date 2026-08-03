import Joi from 'joi';

const meetingStatuses = ['SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED'];

export const createMeetingSchema = Joi.object({
  leadId: Joi.number().integer().positive().required().messages({
    'any.required': 'Lead ID is required'
  }),
  title: Joi.string().min(2).max(255).required().messages({
    'any.required': 'Meeting title is required'
  }),
  scheduledAt: Joi.date().iso().required().messages({
    'any.required': 'Scheduled date & time is required'
  }),
  durationMinutes: Joi.number().integer().positive().default(30),
  meetingLink: Joi.string().uri().allow('', null),
  status: Joi.string().valid(...meetingStatuses).default('SCHEDULED'),
  agenda: Joi.string().allow('', null),
  scopeNotes: Joi.string().allow('', null)
});

export const updateMeetingSchema = Joi.object({
  title: Joi.string().min(2).max(255),
  scheduledAt: Joi.date().iso(),
  durationMinutes: Joi.number().integer().positive(),
  meetingLink: Joi.string().uri().allow('', null),
  status: Joi.string().valid(...meetingStatuses),
  agenda: Joi.string().allow('', null),
  scopeNotes: Joi.string().allow('', null)
});

export const updateMeetingStatusSchema = Joi.object({
  status: Joi.string().valid(...meetingStatuses).required().messages({
    'any.required': 'Meeting status is required'
  }),
  scopeNotes: Joi.string().allow('', null)
});
