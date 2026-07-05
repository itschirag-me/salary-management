import { describe, it, expect } from 'vitest';
import { ApiRequestError } from './api';

describe('ApiRequestError', () => {
    it('sets status and message correctly', () => {
        const err = new ApiRequestError(404, 'Not found');
        expect(err.status).toBe(404);
        expect(err.message).toBe('Not found');
    });

    it('sets name to ApiRequestError', () => {
        const err = new ApiRequestError(500, 'Server error');
        expect(err.name).toBe('ApiRequestError');
    });

    it('is an instance of Error', () => {
        const err = new ApiRequestError(401, 'Unauthorized');
        expect(err).toBeInstanceOf(Error);
    });

    it('is an instance of ApiRequestError', () => {
        const err = new ApiRequestError(403, 'Forbidden');
        expect(err).toBeInstanceOf(ApiRequestError);
    });

    it('captures the stack trace', () => {
        const err = new ApiRequestError(400, 'Bad request');
        expect(err.stack).toBeDefined();
    });
});
