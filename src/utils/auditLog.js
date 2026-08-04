import prisma from '../config/prisma.js';

/**
 * Writes an entry to the audit_logs table.
 * Failures are logged but never thrown, so auditing can never break a request.
 */
export const writeAuditLog = async ({
  userId,
  action,
  entity,
  entityId,
  payload,
  ipAddress
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? null,
        action,
        entity,
        entityId,
        payload: payload ?? undefined,
        ipAddress: ipAddress ?? null
      }
    });
  } catch (error) {
    console.error(`Failed to write audit log [${action}] for ${entity}#${entityId}:`, error);
  }
};
