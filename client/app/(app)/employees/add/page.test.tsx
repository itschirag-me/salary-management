import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

vi.mock('next/link', () => ({
    default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
        <a href={href} className={className}>{children}</a>
    ),
}));

vi.mock('@/lib/api', () => ({
    employees: { create: vi.fn() },
    ApiRequestError: class ApiRequestError extends Error {
        constructor(public status: number, message: string) {
            super(message);
        }
    },
}));

import { employees } from '@/lib/api';
import AddEmployeePage from './page';

const mockEmployees = employees as { create: ReturnType<typeof vi.fn> };

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AddEmployeePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders "Add employee" heading', () => {
        render(<AddEmployeePage />);
        expect(screen.getByText('Add employee')).toBeInTheDocument();
    });

    it('renders back-to-list link', () => {
        render(<AddEmployeePage />);
        const link = screen.getByRole('link', { name: /back to list/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/employees');
    });

    it('renders the create form (Employee code field visible)', () => {
        render(<AddEmployeePage />);
        expect(screen.getByLabelText(/employee code/i)).toBeInTheDocument();
    });

    it('shows validation errors and blocks API call when required fields are empty', async () => {
        const user = userEvent.setup();
        render(<AddEmployeePage />);

        await user.click(screen.getByRole('button', { name: /create employee/i }));

        // Multiple "Required" errors should appear (employeeCode, firstName, etc.)
        const errors = await screen.findAllByText(/required/i);
        expect(errors.length).toBeGreaterThan(0);
        // employees.create should NOT have been called
        expect(mockEmployees.create).not.toHaveBeenCalled();
    });
});
