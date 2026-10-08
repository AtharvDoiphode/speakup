import { httpError } from './httpError.js';

// Validates data against a zod schema, or throws a 400 with the first problem found
export const parse = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw httpError(400, result.error.issues[0].message);
  }
  return result.data;
};