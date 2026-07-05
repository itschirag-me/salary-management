import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
    useParams: () => ({ id: 'emp-1' }),
    useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));

vi.mock('next/link', () => ({
    default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
        <a href={href} className={className}>{children}</a>
    ),
}));

vi.mock('@/lib/api', () => ({
    employees: { get: vi.fn(), update: vi.fn() },
    ApiRequestError: class ApiRequestError extends Error {
        constructor(public status: number, message: string) {
            super(message);
        }
    },
}));

import { employees } from '@/lib/api';
import EditEmployeePage from './page';

const mockEmployees = employees as { get: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };

const mockEmployee = {
    id: 'emp-1',
    employeeCode: 'E001',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    department: 'Engineering',
    jobTitle: 'Engineer',
    country: 'US',
    employmentStatus: 'active' as const,
    hireDate: '2022-01-15',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EditEmployeePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading while employee is being fetched', () => {
        mockEmployees.get.mockReturnValue(new Promise(() => {}));
        render(<EditEmployeePage />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('shows error message when fetch fails', async () => {
        mockEmployees.get.mockRejectedValue(new Error('Not found'));
        render(<EditEmployeePage />);
        expect(await screen.findByText('Not found')).toBeInTheDocument();
    });

    it('renders "Edit employee" heading after data loads', async () => {
        mockEmployees.get.mockResolvedValue(mockEmployee);
        render(<EditEmployeePage />);
        expect(await screen.findByText('Edit employee')).toBeInTheDocument();
    });

    it('pre-fills form with existing employee data', async () => {
        mockEmployees.get.mockResolvedValue(mockEmployee);
        render(<EditEmployeePage />);

        const emailInput = await screen.findByLabelText<HTMLInputElement>(/email/i);
        expect(emailInput.value).toBe('alice@example.com');

        const firstNameInput = screen.getByLabelText<HTMLInputElement>(/first name/i);
        expect(firstNameInput.value).toBe('Alice');
    });

    it('calls employees.update and navigates on save', async () => {
        const user = userEvent.setup();
        mockEmployees.get.mockResolvedValue(mockEmployee);
        mockEmployees.update.mockResolvedValue({ ...mockEmployee, firstName: 'Alicia' });

        render(<EditEmployeePage />);

        await screen.findByText('Edit employee');

        // Change first name
        const firstNameInput = screen.getByLabelText<HTMLInputElement>(/first name/i);
        await user.clear(firstNameInput);
        await user.type(firstNameInput, 'Alicia');

        await user.click(screen.getByRole('button', { name: /save changes/i }));

        await waitFor(() => {
            expect(mockEmployees.update).toHaveBeenCalledWith(
                'emp-1',
                expect.objectContaining({ firstName: 'Alicia' }),
            );
            expect(mockPush).toHaveBeenCalledWith('/employees/emp-1');
        });
    });

    it('renders back link to employee detail', async () => {
        mockEmployees.get.mockResolvedValue(mockEmployee);
        render(<EditEmployeePage />);
        await screen.findByText('Edit employee');
        const backLink = screen.getByRole('link', { name: /← back/i });
        expect(backLink).toHaveAttribute('href', '/employees/emp-1');
    });
});
