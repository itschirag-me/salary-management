import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AuthProvider, useAuth } from './auth-context';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock @/lib/api
vi.mock('@/lib/api', () => ({
    auth: {
        me: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
    },
}));

import { auth } from '@/lib/api';

const mockAuth = auth as {
    me: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
};

// Helper: a consumer component that reads the context
function Consumer() {
    const { user, loading, login, logout } = useAuth();
    return (
        <div>
            <span data-testid="loading">{String(loading)}</span>
            <span data-testid="email">{user?.email ?? 'none'}</span>
            <button onClick={() => login({ email: 'a@b.com', password: 'pass' })}>login</button>
            <button onClick={() => logout()}>logout</button>
        </div>
    );
}

describe('AuthProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('starts with loading=true and calls auth.me on mount', async () => {
        mockAuth.me.mockResolvedValue({ id: '1', email: 'user@test.com' });

        render(
            <AuthProvider>
                <Consumer />
            </AuthProvider>,
        );

        // Before me() resolves, loading should be true
        expect(screen.getByTestId('loading').textContent).toBe('true');

        await waitFor(() =>
            expect(screen.getByTestId('loading').textContent).toBe('false'),
        );
        expect(mockAuth.me).toHaveBeenCalledTimes(1);
    });

    it('sets user after auth.me resolves', async () => {
        mockAuth.me.mockResolvedValue({ id: '1', email: 'user@test.com' });

        render(
            <AuthProvider>
                <Consumer />
            </AuthProvider>,
        );

        await waitFor(() =>
            expect(screen.getByTestId('email').textContent).toBe('user@test.com'),
        );
    });

    it('sets user to null when auth.me rejects', async () => {
        mockAuth.me.mockRejectedValue(new Error('Unauthorized'));

        render(
            <AuthProvider>
                <Consumer />
            </AuthProvider>,
        );

        await waitFor(() =>
            expect(screen.getByTestId('loading').textContent).toBe('false'),
        );
        expect(screen.getByTestId('email').textContent).toBe('none');
    });

    it('login() calls auth.login then auth.me', async () => {
        mockAuth.me
            .mockResolvedValueOnce(null) // initial mount
            .mockResolvedValueOnce({ id: '2', email: 'logged@in.com' }); // after login
        mockAuth.login.mockResolvedValue({});

        render(
            <AuthProvider>
                <Consumer />
            </AuthProvider>,
        );

        await waitFor(() =>
            expect(screen.getByTestId('loading').textContent).toBe('false'),
        );

        await act(async () => {
            userEvent.click(screen.getByText('login'));
        });

        await waitFor(() => expect(mockAuth.login).toHaveBeenCalledTimes(1));
    });

    it('logout() calls auth.logout and clears user', async () => {
        mockAuth.me.mockResolvedValue({ id: '1', email: 'user@test.com' });
        mockAuth.logout.mockResolvedValue({});

        render(
            <AuthProvider>
                <Consumer />
            </AuthProvider>,
        );

        await waitFor(() =>
            expect(screen.getByTestId('email').textContent).toBe('user@test.com'),
        );

        await act(async () => {
            userEvent.click(screen.getByText('logout'));
        });

        await waitFor(() => expect(mockAuth.logout).toHaveBeenCalledTimes(1));
    });
});

describe('useAuth', () => {
    it('throws when used outside AuthProvider', () => {
        // Suppress React's error boundary output
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => {
            render(React.createElement(Consumer));
        }).toThrow('useAuth must be used within AuthProvider');
        spy.mockRestore();
    });
});
