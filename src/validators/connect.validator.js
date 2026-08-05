import Joi from 'joi';
import {
  CONNECT_OUTCOMES,
  CONNECT_STATUSES,
  CONNECT_FOLLOW_UP_TYPES,
  normalizeConnectOutcome,
  normalizeConnectStatus
} from '../constants/connect.constants.js';

/**
 * Accepts any outcome alias (case-insensitive) and normalizes it to the
 * canonical enum value; rejects unknown values.
 */
const connectOutcomeField = Joi.string()
  .custom((value, helpers) => {
    const normalized = normalizeConnectOutcome(value);
    if (!normalized) {
      return helpers.error('any.invalid');
    }
    return normalized;
  }, 'Connect outcome normalization')
  .messages({
    'any.invalid': `Invalid outcome. Allowed: ${CONNECT_OUTCOMES.join(', ')}`
  });

/**
 * Normalizes a time value to 24-hour HH:MM. Accepts both "HH:MM" and
 * "h:mm AM/PM" (as produced by the frontend time picker). Returns null when
 * the value is not a valid time.
 */
const normalizeTime24 = (value) => {
  const trimmed = String(value).trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  if (min > 59) return null;

  const meridiem = (match[3] || '').toUpperCase();
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    if (meridiem === 'PM' && hour !== 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }

  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};

/**
 * Accepts any follow-up status alias (case-insensitive) and normalizes it to
 * the canonical enum value; rejects unknown values.
 */
const connectStatusField = Joi.string()
  .custom((value, helpers) => {
    const normalized = normalizeConnectStatus(value);
    if (!normalized) {
      return helpers.error('any.invalid');
    }
    return normalized;
  }, 'Connect status normalization')
  .messages({
    'any.invalid': `Invalid status. Allowed: ${CONNECT_STATUSES.join(', ')}`
  });

const connectCommonFields = {
  outcome: connectOutcomeField.allow('', null),
  summary: Joi.string().max(5000).allow('', null),
  followUpType: Joi.string()
    .valid(...CONNECT_FOLLOW_UP_TYPES)
    .allow('', null)
    .messages({
      'any.only': `Invalid follow-up type. Allowed: ${CONNECT_FOLLOW_UP_TYPES.join(', ')}`
    }),
  followUpDate: Joi.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .allow('', null)
    .messages({
      'string.pattern.base': 'followUpDate must be in YYYY-MM-DD format'
    }),
  followUpTime: Joi.string()
    .custom((value, helpers) => {
      const normalized = normalizeTime24(value);
      if (!normalized) {
        return helpers.error('any.invalid');
      }
      return normalized;
    }, 'Time normalization')
    .allow('', null)
    .messages({
      'any.invalid': 'followUpTime must be in HH:MM or h:mm AM/PM format'
    }),
  status: connectStatusField.allow('', null)
};

export const createConnectSchema = Joi.object({
  leadId: Joi.number().integer().positive().required().messages({
    'any.required': 'leadId is required'
  }),
  ...connectCommonFields
});

export const updateConnectSchema = Joi.object({
  ...connectCommonFields
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});
