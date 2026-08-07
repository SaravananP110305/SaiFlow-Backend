const ARRAY_KEYS = new Set([
  'users', 'clients', 'leads', 'meetings', 'proposals', 'projects', 'phases',
  'objectives', 'technicalRequirements', 'deliverables', 'assumptions',
  'constraints', 'lineItems', 'children', 'auditLogs', 'data'
]);

const OBJECT_KEYS = new Set([
  'company', 'lead', 'priority', 'source', 'industry', 'country', 'state',
  'city', 'assignedTo', 'createdBy', 'relationshipManager', 'accountManager',
  'pm', 'parent', 'user', 'role', 'client'
]);

const NUMBER_KEYS = new Set([
  'id', 'roleId', 'companyId', 'leadId', 'clientId', 'parentId', 'pmId',
  'industryId', 'countryId', 'stateId', 'cityId', 'sourceId', 'priorityId',
  'createdById', 'durationMinutes', 'sortOrder', 'amount', 'creditLimit'
]);

export const sanitizePayload = (val, key = null) => {
  if (val === null || val === undefined) {
    if (key) {
      if (ARRAY_KEYS.has(key)) return [];
      if (OBJECT_KEYS.has(key)) return null;
      if (NUMBER_KEYS.has(key)) return null;
    }
    return '';
  }

  if (Array.isArray(val)) {
    return val.map(item => sanitizePayload(item, key));
  }

  if (typeof val === 'object') {
    if (val instanceof Date) {
      return val;
    }
    if (val.constructor && val.constructor.name === 'Decimal') {
      return Number(val.toString());
    }
    const copy = {};
    for (const k of Object.keys(val)) {
      copy[k] = sanitizePayload(val[k], k);
    }
    return copy;
  }

  return val;
};

class ApiResponse {
  constructor(statusCode, message = 'Success', data = null, meta = null) {
    this.success = statusCode >= 200 && statusCode < 300;
    this.message = message;
    if (data !== null) {
      this.data = sanitizePayload(data);
    }
    if (meta !== null) {
      this.meta = meta;
    }
  }
}

export default ApiResponse;
