// Centralized Connect domain constants (Contact & Follow-up module).
// Single source of truth for outcomes, statuses and outcome -> lead status maps.

/** Contact outcomes recorded in the connect table. */
export const CONNECT_OUTCOMES = [
  'CONTACTED',
  'INTERESTED',
  'CALL_LATER',
  'NOT_INTERESTED'
];

/** Follow-up lifecycle statuses of a connect record. */
export const CONNECT_STATUSES = [
  'SCHEDULED',
  'COMPLETED',
  'MISSED',
  'RESCHEDULED'
];

/**
 * Maps a connect outcome to the resulting Lead status. Outcomes without a
 * mapping (null) leave the lead status untouched.
 */
export const CONNECT_OUTCOME_LEAD_STATUS = {
  CONTACTED: 'CONTACTED',
  INTERESTED: 'QUALIFIED',
  CALL_LATER: 'MEETING_SCHEDULED',
  NOT_INTERESTED: 'LOST'
};

/** Allowed values for the follow-up type field. */
export const CONNECT_FOLLOW_UP_TYPES = ['Call', 'Meeting', 'Email', 'WhatsApp'];

/**
 * Normalizes an arbitrary outcome value (e.g. "interested", "Call Later")
 * to the canonical enum value, or returns null when unmappable.
 */
export const normalizeConnectOutcome = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim().toUpperCase();
  if (CONNECT_OUTCOMES.includes(normalized)) return normalized;
  if (normalized === 'NOTINTERESTED') return 'NOT_INTERESTED';
  return null;
};

/**
 * Normalizes an arbitrary follow-up status value to the canonical enum value,
 * or returns null when unmappable.
 */
export const normalizeConnectStatus = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim().toUpperCase();
  if (CONNECT_STATUSES.includes(normalized)) return normalized;
  return null;
};
