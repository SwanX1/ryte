import { ZodError } from "zod";

export function prettifyZodError(error: ZodError) {
  return error.errors?.map(e => `${e.path.join('.')}: ${e.message}`).join(',\n') || 'Invalid input';
}