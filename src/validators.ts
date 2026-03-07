import { VALID_STATUSES, Status } from './types.js';

export function isValidStatus(value: unknown): value is Status {
  return typeof value === 'string' && (VALID_STATUSES as string[]).includes(value);
}

export function isValidIso8601(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes('T');
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateCreateBody(body: Record<string, unknown>): ValidationError | null {
  if (!body.teamId || typeof body.teamId !== 'string') {
    return { field: 'teamId', message: 'teamId is required and must be a string' };
  }
  if (!isValidStatus(body.status)) {
    return { field: 'status', message: `status must be one of: ${VALID_STATUSES.join(', ')}` };
  }
  if (!isValidIso8601(body.startTime)) {
    return { field: 'startTime', message: 'startTime must be a valid ISO 8601 string' };
  }
  if (!isValidIso8601(body.endTime)) {
    return { field: 'endTime', message: 'endTime must be a valid ISO 8601 string' };
  }
  if (new Date(body.endTime as string) <= new Date(body.startTime as string)) {
    return { field: 'endTime', message: 'endTime must be strictly after startTime' };
  }
  if (body.note !== undefined && typeof body.note !== 'string') {
    return { field: 'note', message: 'note must be a string if provided' };
  }
  return null;
}

export function validateUpdateBody(body: Record<string, unknown>): ValidationError | null {
  if (body.teamId !== undefined && typeof body.teamId !== 'string') {
    return { field: 'teamId', message: 'teamId must be a string' };
  }
  if (body.status !== undefined && !isValidStatus(body.status)) {
    return { field: 'status', message: `status must be one of: ${VALID_STATUSES.join(', ')}` };
  }
  if (body.startTime !== undefined && !isValidIso8601(body.startTime)) {
    return { field: 'startTime', message: 'startTime must be a valid ISO 8601 string' };
  }
  if (body.endTime !== undefined && !isValidIso8601(body.endTime)) {
    return { field: 'endTime', message: 'endTime must be a valid ISO 8601 string' };
  }

  const startTime = body.startTime as string | undefined;
  const endTime = body.endTime as string | undefined;
  if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
    return { field: 'endTime', message: 'endTime must be strictly after startTime' };
  }
  if (body.note !== undefined && body.note !== null && typeof body.note !== 'string') {
    return { field: 'note', message: 'note must be a string if provided' };
  }
  return null;
}
