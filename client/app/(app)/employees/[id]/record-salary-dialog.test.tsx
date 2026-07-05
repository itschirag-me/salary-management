import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
    salaries: { record: vi.fn() },
    ApiRequestError: class ApiRequestError extends Error {
        constructor(public status: number, message: string) {
            super(message);
            this.name = 'ApiRequestError';
        }
    },
}));

import { salaries } from '@/lib/api';
import { ApiRequestError } from '@/lib/api';
import { RecordSalaryDialog } from './record-salary-dialog';

const mockSalaries = salaries as { record: ReturnType<typeof vi.fn> };

const mockSalary = {
    id: 's-new',
    employeeId: 'emp-1',
    baseAmount: '120000',
    currency: 'USD',
    payFrequency: 'annual' as const,
    effectiveFrom: '2024-01-01',
    effectiveTo: null,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RecordSalaryDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the trigger button', () => {
        render(
            <RecordSalaryDialog
                employeeId="emp-1"
                onRecorded={vi.fn()}
            />,
        );
        expect(screen.getByRole('button', { name: /record new salary/i })).toBeInTheDocument();
    });

    it('opens the dialog on trigger click', async () => {
        const user = userEvent.setup();
        render(
            <RecordSalaryDialog
                employeeId="emp-1"
                onRecorded={vi.fn()}
            />,
        );

        await user.click(screen.getByRole('button', { name: /record new salary/i }));

        expect(await screen.findByRole('dialog')).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: /record new salary/i })).toBeInTheDocument();
    });

    it('shows validation errors when required fields are empty', async () => {
        const user = userEvent.setup();
        render(
            <RecordSalaryDialog
                employeeId="emp-1"
                onRecorded={vi.fn()}
            />,
        );

        await user.click(screen.getByRole('button', { name: /record new salary/i }));
        await screen.findByRole('dialog');

        await user.click(screen.getByRole('button', { name: /save salary/i }));

        expect(await screen.findByText(/amount must be greater than 0/i)).toBeInTheDocument();
        expect(await screen.findByText(/effective date is required/i)).toBeInTheDocument();
    });

    it('calls salaries.record and onRecorded with correct payload on valid submit', async () => {
        const user = userEvent.setup();
        const onRecorded = vi.fn();
        mockSalaries.record.mockResolvedValue(mockSalary);

        render(
            <RecordSalaryDialog
                employeeId="emp-1"
                defaultCurrency="USD"
                onRecorded={onRecorded}
            />,
        );

        await user.click(screen.getByRole('button', { name: /record new salary/i }));
        await screen.findByRole('dialog');

        await user.type(screen.getByLabelText(/base amount/i), '120000');
        await user.type(screen.getByLabelText(/effective from/i), '2024-01-01');

        await user.click(screen.getByRole('button', { name: /save salary/i }));

        await waitFor(() => {
            expect(mockSalaries.record).toHaveBeenCalledWith(
                'emp-1',
                expect.objectContaining({
                    baseAmount: 120000,
                    currency: 'USD',
                    effectiveFrom: '2024-01-01',
                }),
            );
            expect(onRecorded).toHaveBeenCalledWith(mockSalary);
        });
    });

    it('shows server error when API rejects', async () => {
        const user = userEvent.setup();
        mockSalaries.record.mockRejectedValue(
            new ApiRequestError(400, 'Effective date must be after current salary'),
        );

        render(
            <RecordSalaryDialog
                employeeId="emp-1"
                onRecorded={vi.fn()}
            />,
        );

        await user.click(screen.getByRole('button', { name: /record new salary/i }));
        await screen.findByRole('dialog');

        await user.type(screen.getByLabelText(/base amount/i), '50000');
        await user.type(screen.getByLabelText(/effective from/i), '2020-01-01');
        await user.click(screen.getByRole('button', { name: /save salary/i }));

        expect(
            await screen.findByText(/effective date must be after current salary/i),
        ).toBeInTheDocument();
    });

    it('uses defaultCurrency as the pre-filled currency value', async () => {
        const user = userEvent.setup();
        render(
            <RecordSalaryDialog
                employeeId="emp-1"
                defaultCurrency="EUR"
                onRecorded={vi.fn()}
            />,
        );

        await user.click(screen.getByRole('button', { name: /record new salary/i }));
        await screen.findByRole('dialog');

        const currencyInput = screen.getByLabelText<HTMLInputElement>(/currency/i);
        expect(currencyInput.value).toBe('EUR');
    });
});
