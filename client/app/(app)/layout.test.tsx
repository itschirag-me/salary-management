import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
    usePathname: () => '/employees',
}));

// next/link renders as <a> in test environment
vi.mock('next/link', () => ({
    default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
        <a href={href} className={className}>{children}</a>
    ),
}));

vi.mock('@/context/auth-context', () => ({
    useAuth: vi.fn(),
}));

import { useAuth } from '@/context/auth-context';
import AppLayout from './layout';

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

function renderLayout(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
    mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        login: vi.fn(),
        logout: vi.fn(),
        ...overrides,
    });
    return render(
        <AppLayout>
            <div>page content</div>
        </AppLayout>,
    );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AppLayout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading state when loading=true', () => {
        renderLayout({ loading: true });
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('redirects to /login when unauthenticated', () => {
        renderLayout({ user: null, loading: false });
        expect(mockReplace).toHaveBeenCalledWith('/login');
    });

    it('returns null (no content) while redirecting', () => {
        const { container } = renderLayout({ user: null, loading: false });
        // Only the redirect fires — nothing is rendered
        expect(container.firstChild).toBeNull();
    });

    it('renders navigation when authenticated', () => {
        renderLayout({
            user: { id: '1', email: 'admin@test.com' },
            loading: false,
        });

        expect(screen.getByText('Salary Management')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /employees/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument();
    });

    it('shows the logged-in user email', () => {
        renderLayout({
            user: { id: '1', email: 'admin@test.com' },
            loading: false,
        });
        expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    });

    it('renders children when authenticated', () => {
        renderLayout({ user: { id: '1', email: 'a@b.com' }, loading: false });
        expect(screen.getByText('page content')).toBeInTheDocument();
    });

    it('calls logout() when Sign out button is clicked', async () => {
        const user = userEvent.setup();
        const mockLogout = vi.fn().mockResolvedValue(undefined);
        renderLayout({
            user: { id: '1', email: 'a@b.com' },
            loading: false,
            logout: mockLogout,
        });

        await user.click(screen.getByRole('button', { name: /sign out/i }));

        await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    });
});
