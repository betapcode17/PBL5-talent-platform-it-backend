import Joi from 'joi';

export const createJobTypeSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().allow('').optional(),
});

export const updateJobTypeSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  description: Joi.string().trim().allow('').optional(),
})
  .or('name', 'description')
  .required();

export const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  parentId: Joi.number().integer().positive().optional(),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  parentId: Joi.alternatives(
    Joi.number().integer().positive(),
    Joi.valid(null),
  ).optional(),
})
  .or('name', 'parentId')
  .required();
