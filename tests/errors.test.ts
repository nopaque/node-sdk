import { describe, it, expect } from 'vitest';
import {
  NopaqueError,
  NopaqueAPIError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  ServerError,
  APIConnectionError,
  APITimeoutError,
  NopaqueTimeoutError,
  classifyStatus,
} from '../src/errors.js';

describe('error hierarchy', () => {
  it('has correct inheritance', () => {
    expect(new AuthenticationError({ status: 401 }) instanceof NopaqueAPIError).toBe(true);
    expect(new AuthenticationError({ status: 401 }) instanceof NopaqueError).toBe(true);
    expect(new APIConnectionError('x') instanceof NopaqueError).toBe(true);
    expect(new NopaqueTimeoutError('x') instanceof NopaqueError).toBe(true);
  });

  it('api error carries metadata', () => {
    const err = new NotFoundError({
      status: 404,
      code: 'mapping_not_found',
      message: 'not found',
      details: { id: 'x' },
      requestId: 'req_123',
    });
    expect(err.status).toBe(404);
    expect(err.code).toBe('mapping_not_found');
    expect(err.details).toEqual({ id: 'x' });
    expect(err.requestId).toBe('req_123');
    expect(err.message).toBe('not found');
  });

  it('rate limit error carries retryAfter', () => {
    const err = new RateLimitError({ status: 429, retryAfter: 12.5 });
    expect(err.retryAfter).toBe(12.5);
  });

  it.each([
    [400, ValidationError],
    [401, AuthenticationError],
    [403, PermissionError],
    [404, NotFoundError],
    [409, ConflictError],
    [429, RateLimitError],
    [500, ServerError],
    [502, ServerError],
    [503, ServerError],
    [504, ServerError],
  ])('classifyStatus(%d) returns correct subclass', (status, cls) => {
    expect(classifyStatus(status as number)).toBe(cls);
  });

  it('classifyStatus unknown falls back to base NopaqueAPIError', () => {
    expect(classifyStatus(418)).toBe(NopaqueAPIError);
  });

  // APITimeoutError re-used for compilation sanity
  it('APITimeoutError is a NopaqueError', () => {
    expect(new APITimeoutError('x') instanceof NopaqueError).toBe(true);
  });

  it('PermissionError is a NopaqueAPIError', () => {
    expect(new PermissionError({ status: 403 }) instanceof NopaqueAPIError).toBe(true);
  });

  it('ConflictError is a NopaqueAPIError', () => {
    expect(new ConflictError({ status: 409 }) instanceof NopaqueAPIError).toBe(true);
  });

  it('ValidationError is a NopaqueAPIError', () => {
    expect(new ValidationError({ status: 400 }) instanceof NopaqueAPIError).toBe(true);
  });

  it('ServerError is a NopaqueAPIError', () => {
    expect(new ServerError({ status: 500 }) instanceof NopaqueAPIError).toBe(true);
  });
});
