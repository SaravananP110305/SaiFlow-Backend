import Joi from 'joi';

const validModules = [
  'dashboard', 'master', 'users', 'roles', 'leads', 'connect',
  'meetings', 'proposals', 'clients', 'reports', 'settings'
];
const validActions = ['view', 'create', 'edit', 'delete', 'export', 'approve', 'assign'];

const permissionsSchema = Joi.object().pattern(
  Joi.string().valid(...validModules),
  Joi.array().items(Joi.string().valid(...validActions))
);

export const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Role name must be at least 2 characters',
    'any.required': 'Role name is required'
  }),
  status: Joi.string().valid('Active', 'Inactive'),
  permissions: permissionsSchema.default({})
});

export const updateRoleSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  status: Joi.string().valid('Active', 'Inactive'),
  permissions: permissionsSchema
});
