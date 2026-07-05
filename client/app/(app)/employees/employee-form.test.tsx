import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { EmployeeForm } from './employee-form';
import type { Employee } from '@/lib/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
    ApiRequestError: class ApiRequestError extends Error {
        constructor(public status: number, message: string) {
            super(message);
            this.name = 'ApiRequestError';
        }
    },
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const existingEmployee: Employee = {
    id: 'emp-1',
    employeeCode: 'E001',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    department: 'Engineering',
    jobTitle: 'Engineer',
    country: 'US',
    employmentStatus: 'active',
    hireDate: '2022-01-15',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EmployeeForm — create mode', () => {
    it('renders the Employee code field in create mode', () => {
        render(<EmployeeForm mode="create" onSubmit={vi.fn()} />);
        expect(screen.getByLabelText(/employee code/i)).toBeInTheDocument();
    });

    it('submit button reads "Create employee"', () => {
        render(<EmployeeForm mode="create" onSubmit={vi.fn()} />);
        expect(screen.getByRole('button', { name: /create employee/i })).toBeInTheDocument();
    });

    it('shows required validation errors on empty submit', async () => {
        const user = userEvent.setup();
        render(<EmployeeForm mode="create" onSubmit={vi.fn()} />);
        await user.click(screen.getByRole('button', { name: /create employee/i }));
        const errors = await screen.findAllByText(/required/i);
        expect(errors.length).toBeGreaterThan(0);
    });

    it('does not call onSubmit when department and hireDate are missing', async () => {
        const { fireEvent } = await import('@testing-library/react');
        const onSubmit = vi.fn().mockResolvedValue(undefined);
        const { container } = render(<EmployeeForm mode="create" onSubmit={onSubmit} />);

        // Fill all text-based inputs registered with react-hook-form
        fireEvent.change(container.querySelector('input[name="employeeCode"]')!, { target: { value: 'E999' } });
        fireEvent.change(container.querySelector('input[name="email"]')!, { target: { value: 'bob@test.com' } });
        fireEvent.change(container.querySelector('input[name="firstName"]')!, { target: { value: 'Bob' } });
        fireEvent.change(container.querySelector('input[name="lastName"]')!, { target: { value: 'Jones' } });
        fireEvent.change(container.querySelector('input[name="jobTitle"]')!, { target: { value: 'Developer' } });
        fireEvent.change(container.querySelector('input[name="country"]')!, { target: { value: 'GB' } });

        // department (Select) and hireDate (Popover calendar) are not filled.
        // Submit the form — zod validation should block the call.
        fireEvent.submit(container.querySelector('form')!);

        // Give async validation a tick to complete
        await waitFor(() => {
            expect(onSubmit).not.toHaveBeenCalled();
        });
    });
});

describe('EmployeeForm — edit mode', () => {
    it('does not render the Employee code field in edit mode', () => {
        render(
            <EmployeeForm mode="edit" initial={existingEmployee} onSubmit={vi.fn()} />,
        );
        expect(screen.queryByLabelText(/employee code/i)).not.toBeInTheDocument();
    });

    it('submit button reads "Save changes"', () => {
        render(
            <EmployeeForm mode="edit" initial={existingEmployee} onSubmit={vi.fn()} />,
        );
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('pre-fills fields from the initial employee', () => {
        render(
            <EmployeeForm mode="edit" initial={existingEmployee} onSubmit={vi.fn()} />,
        );
        expect(screen.getByLabelText<HTMLInputElement>(/email/i).value).toBe(
            'alice@example.com',
        );
        expect(screen.getByLabelText<HTMLInputElement>(/first name/i).value).toBe(
            'Alice',
        );
        expect(screen.getByLabelText<HTMLInputElement>(/last name/i).value).toBe(
            'Smith',
        );
    });

    it('displays server error from onSubmit', async () => {
        const { ApiRequestError } = await import('@/lib/api');
        const user = userEvent.setup();
        const onSubmit = vi
            .fn()
            .mockRejectedValue(new ApiRequestError(409, 'Email already exists'));

        render(
            <EmployeeForm mode="edit" initial={existingEmployee} onSubmit={onSubmit} />,
        );
        await user.click(screen.getByRole('button', { name: /save changes/i }));

        expect(await screen.findByText(/email already exists/i)).toBeInTheDocument();
    });
});
