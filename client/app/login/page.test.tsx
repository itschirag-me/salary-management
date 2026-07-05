import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

vi.mock('@/lib/api', () => ({
    ApiRequestError: class ApiRequestError extends Error {
        constructor(
            public status: number,
            message: string,
        ) {
            super(message);
            this.name = 'ApiRequestError';
        }
    },
    auth: {
        me: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
    },
}));

// Provide a minimal AuthContext so LoginPage can call useAuth()
vi.mock('@/context/auth-context', () => {
    const React = require('react');
    const mockLogin = vi.fn();
    return {
        useAuth: vi.fn(() => ({
            user: null,
            loading: false,
            login: mockLogin,
            logout: vi.fn(),
        })),
        __mockLogin: mockLogin,
    };
});

import { useAuth } from '@/context/auth-context';
import LoginPage from './page';
import { ApiRequestError } from '@/lib/api';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderLogin(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
    mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        ...overrides,
    });
    return render(<LoginPage />);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the sign-in form', () => {
        renderLogin();
        // CardTitle renders as a div[data-slot=card-title], not a semantic heading
        expect(screen.getByText('Sign in', { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('shows loading state when loading=true', () => {
        renderLogin({ loading: true });
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('redirects to /employees when user is already logged in', () => {
        renderLogin({ user: { id: '1', email: 'a@b.com' } });
        expect(mockReplace).toHaveBeenCalledWith('/employees');
    });

    it('shows validation errors when submitting empty form', async () => {
        const user = userEvent.setup();
        renderLogin();
        await user.click(screen.getByRole('button', { name: /sign in/i }));
        expect(await screen.findByText(/enter a valid email/i)).toBeInTheDocument();
        expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    });

    it('calls login() with form values on valid submit', async () => {
        const user = userEvent.setup();
        const mockLogin = vi.fn().mockResolvedValue(undefined);
        renderLogin({ login: mockLogin });

        await user.type(screen.getByLabelText(/email/i), 'test@example.com');
        await user.type(screen.getByLabelText(/password/i), 'secret');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() =>
            expect(mockLogin).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'secret',
            }),
        );
    });

    it('shows "Invalid email or password" on 401', async () => {
        const user = userEvent.setup();
        const mockLogin = vi.fn().mockRejectedValue(new ApiRequestError(401, 'Unauthorized'));
        renderLogin({ login: mockLogin });

        await user.type(screen.getByLabelText(/email/i), 'bad@example.com');
        await user.type(screen.getByLabelText(/password/i), 'wrong');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
    });

    it('shows server error message on non-401 ApiRequestError', async () => {
        const user = userEvent.setup();
        const mockLogin = vi
            .fn()
            .mockRejectedValue(new ApiRequestError(500, 'Internal server error'));
        renderLogin({ login: mockLogin });

        await user.type(screen.getByLabelText(/email/i), 'a@b.com');
        await user.type(screen.getByLabelText(/password/i), 'pass');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        expect(await screen.findByText(/internal server error/i)).toBeInTheDocument();
    });

    it('shows generic error on unknown exceptions', async () => {
        const user = userEvent.setup();
        const mockLogin = vi.fn().mockRejectedValue(new Error('Network error'));
        renderLogin({ login: mockLogin });

        await user.type(screen.getByLabelText(/email/i), 'a@b.com');
        await user.type(screen.getByLabelText(/password/i), 'pass');
        await user.click(screen.getByRole('button', { name: /sign in/i }));

        expect(
            await screen.findByText(/something went wrong/i),
        ).toBeInTheDocument();
    });
});
