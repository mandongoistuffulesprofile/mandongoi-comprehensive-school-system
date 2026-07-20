import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from './errorHandler';

export function validate(schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError(
        result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        400,
      ));
    }
    req[source] = result.data;
    next();
  };
}
