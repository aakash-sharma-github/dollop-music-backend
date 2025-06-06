import { Request, Response, NextFunction } from 'express';
import { AppError } from './error';

interface ValidationSchema {
  type: string;
  required?: boolean;
  min?: number;
  max?: number;
  email?: boolean;
  enum?: string[];
  match?: RegExp;
  custom?: (value: any) => boolean | Promise<boolean>;
}

interface ValidationRules {
  body?: Record<string, ValidationSchema>;
  params?: Record<string, ValidationSchema>;
  query?: Record<string, ValidationSchema>;
}

type ValidationTarget = 'body' | 'params' | 'query';

export const validateRequest = (rules: ValidationRules) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validations: Promise<void>[] = [];

      const validateField = async (
        value: any,
        schema: ValidationSchema,
        field: string,
        target: ValidationTarget
      ) => {
        // Required check
        if (schema.required && (value === undefined || value === null || value === '')) {
          throw new AppError(`${field} is required in ${target}`, 400);
        }

        if (value !== undefined && value !== null) {
          // Type validation
          switch (schema.type) {
            case 'string':
              if (typeof value !== 'string') {
                throw new AppError(`${field} must be a string`, 400);
              }
              if (schema.min && value.length < schema.min) {
                throw new AppError(`${field} must be at least ${schema.min} characters`, 400);
              }
              if (schema.max && value.length > schema.max) {
                throw new AppError(`${field} must not exceed ${schema.max} characters`, 400);
              }
              if (schema.email && !value.match(/^\S+@\S+\.\S+$/)) {
                throw new AppError(`${field} must be a valid email`, 400);
              }
              if (schema.match && !schema.match.test(value)) {
                throw new AppError(`${field} format is invalid`, 400);
              }
              break;

            case 'number':
              const num = Number(value);
              if (isNaN(num)) {
                throw new AppError(`${field} must be a number`, 400);
              }
              if (schema.min !== undefined && num < schema.min) {
                throw new AppError(`${field} must be at least ${schema.min}`, 400);
              }
              if (schema.max !== undefined && num > schema.max) {
                throw new AppError(`${field} must not exceed ${schema.max}`, 400);
              }
              break;

            case 'boolean':
              if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
                throw new AppError(`${field} must be a boolean`, 400);
              }
              break;

            case 'array':
              if (!Array.isArray(value)) {
                throw new AppError(`${field} must be an array`, 400);
              }
              if (schema.min !== undefined && value.length < schema.min) {
                throw new AppError(`${field} must contain at least ${schema.min} items`, 400);
              }
              if (schema.max !== undefined && value.length > schema.max) {
                throw new AppError(`${field} must not contain more than ${schema.max} items`, 400);
              }
              break;
          }

          // Enum validation
          if (schema.enum && !schema.enum.includes(value)) {
            throw new AppError(`${field} must be one of: ${schema.enum.join(', ')}`, 400);
          }

          // Custom validation
          if (schema.custom) {
            const isValid = await schema.custom(value);
            if (!isValid) {
              throw new AppError(`${field} is invalid`, 400);
            }
          }
        }
      };

      // Validate each target (body, params, query)
      const targets: ValidationTarget[] = ['body', 'params', 'query'];
      for (const target of targets) {
        if (rules[target]) {
          for (const [field, schema] of Object.entries(rules[target]!)) {
            validations.push(validateField(req[target][field], schema, field, target));
          }
        }
      }

      await Promise.all(validations);
      next();
    } catch (error) {
      next(error);
    }
  };
};

