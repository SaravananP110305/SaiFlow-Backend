// Centralized Lead domain constants.
// Single source of truth for statuses, aliases and legal status transitions.

export const LEAD_STATUSES = [
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

/**
 * Aliases used by other modules / legacy UI that pass humanized status values
 * (e.g. the Contact / Follow-Up module sends "Contacted", "Qualified",
 * "Scheduled", "Rescheduled", "Lost"). They are normalized to the enum value.
 */
export const LEAD_STATUS_ALIASES = {
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  INTERESTED: 'QUALIFIED',
  SCHEDULED: 'MEETING_SCHEDULED',
  RESCHEDULED: 'MEETING_SCHEDULED',
  'PROPOSAL SENT': 'PROPOSAL',
  'PROPOSAL SEND': 'PROPOSAL',
  NEGOTIATION: 'NEGOTIATION',
  WON: 'WON',
  LOST: 'LOST',
  'NOT INTERESTED': 'LOST',
  DISQUALIFIED: 'DISQUALIFIED'
};

/**
 * Normalizes an arbitrary status value to a valid LeadStatus enum value,
 * or returns null when the value cannot be mapped.
 */
export const normalizeLeadStatus = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim().toUpperCase();
  if (LEAD_STATUSES.includes(normalized)) return normalized;
  return LEAD_STATUS_ALIASES[normalized] || null;
};

/**
 * Legal status transitions per current status.
 * Terminal statuses (WON / LOST / DISQUALIFIED) can only be reopened to NEW.
 */
export const LEAD_TRANSITIONS = {
  NEW: ['ASSIGNED', 'CONTACTED', 'MEETING_SCHEDULED', 'QUALIFIED', 'DISQUALIFIED', 'LOST'],
  ASSIGNED: ['CONTACTED', 'MEETING_SCHEDULED', 'QUALIFIED', 'DISQUALIFIED', 'LOST'],
  CONTACTED: ['MEETING_SCHEDULED', 'QUALIFIED', 'DISQUALIFIED', 'LOST'],
  MEETING_SCHEDULED: ['QUALIFIED', 'CONTACTED', 'DISQUALIFIED', 'LOST'],
  QUALIFIED: ['PROPOSAL', 'NEGOTIATION', 'MEETING_SCHEDULED', 'WON', 'DISQUALIFIED', 'LOST'],
  PROPOSAL: ['NEGOTIATION', 'MEETING_SCHEDULED', 'WON', 'LOST', 'DISQUALIFIED'],
  NEGOTIATION: ['MEETING_SCHEDULED', 'WON', 'LOST', 'DISQUALIFIED'],
  WON: [],
  LOST: ['NEW'],
  DISQUALIFIED: ['NEW']
};

export const TERMINAL_STATUSES = ['WON', 'LOST', 'DISQUALIFIED'];

export const isLegalLeadTransition = (fromStatus, toStatus) => {
  if (!fromStatus || !toStatus) return false;
  const allowed = LEAD_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
};

/** Statuses from which a lead may be converted to a client. */
export const CONVERTIBLE_STATUSES = ['QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'];

/** Roles allowed to access every lead (no ownership scoping applied). */
export const MANAGER_ROLE_NAMES = ['Administrator', 'Business Development Manager'];

export const canAccessAllLeads = (user) => {
  return user && MANAGER_ROLE_NAMES.includes(user.role?.name);
};
