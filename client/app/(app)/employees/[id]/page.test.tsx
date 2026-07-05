import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
    useParams: () => ({ id: 'emp-1' }),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('next/link', () => ({
    default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
        <a href={href} className={className}>{children}</a>
    ),
}));

vi.mock('@/lib/api', () => ({
    employees: { get: vi.fn() },
    salaries: { history: vi.fn() },
}));

// RecordSalaryDialog is a dialog — stub it out to avoid dialog complexity in this suite
vi.mock('./record-salary-dialog', () => ({
    RecordSalaryDialog: () => <button>Record new salary</button>,
}));

import { employees, salaries } from '@/lib/api';
import EmployeeDetailPage from './page';

const mockEmployees = employees as { get: ReturnType<typeof vi.fn> };
const mockSalaries = salaries as { history: ReturnType<typeof vi.fn> };

const mockEmployee = {
    id: 'emp-1',
    employeeCode: 'E001',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    department: 'Engineering',
    jobTitle: 'Software Engineer',
    country: 'US',
    employmentStatus: 'active' as const,
    hireDate: '2022-01-15',
};

const mockSalaryHistory = [
    {
        id: 's1',
        employeeId: 'emp-1',
        baseAmount: '80000',
        currency: 'USD',
        payFrequency: 'annual' as const,
        effectiveFrom: '2022-01-15',
        effectiveTo: '2023-06-01',
    },
    {
        id: 's2',
        employeeId: 'emp-1',
        baseAmount: '100000',
        currency: 'USD',
        payFrequency: 'annual' as const,
        effectiveFrom: '2023-06-01',
        effectiveTo: null,
    },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EmployeeDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading state initially', () => {
        mockEmployees.get.mockReturnValue(new Promise(() => {}));
        mockSalaries.history.mockReturnValue(new Promise(() => {}));
        render(<EmployeeDetailPage />);
        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('renders employee name and job info after loading', async () => {
        mockEmployees.get.mockResolvedValue(mockEmployee);
        mockSalaries.history.mockResolvedValue(mockSalaryHistory);
        render(<EmployeeDetailPage />);

        expect(await screen.findByRole('heading', { name: /alice smith/i })).toBeInTheDocument();
        expect(await screen.findByText(/software engineer/i)).toBeInTheDocument();
        expect(await screen.findByText(/engineering/i)).toBeInTheDocument();
    });

    it('renders employee detail fields', async () => {
        mockEmployees.get.mockResolvedValue(mockEmployee);
        mockSalaries.history.mockResolvedValue(mockSalaryHistory);
        render(<EmployeeDetailPage />);

        expect(await screen.findByText('E001')).toBeInTheDocument();
        expect(await screen.findByText('alice@example.com')).toBeInTheDocument();
        expect(await screen.findByText('US')).toBeInTheDocument();
    });

    it('renders salary history table with all rows', async () => {
        mockEmployees.get.mockResolvedValue(mockEmployee);
        mockSalaries.history.mockResolvedValue(mockSalaryHistory);
        render(<EmployeeDetailPage />);

        await waitFor(() =>
            expect(screen.getByText('Salary history')).toBeInTheDocument(),
        );

        // Both salary rows should appear — dates can appear in multiple cells
        // (e.g. 2022-01-15 in hire date + effectiveFrom, 2023-06-01 in effectiveTo + effectiveFrom)
        expect(screen.getAllByText('2022-01-15').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('2023-06-01').length).toBeGreaterThanOrEqual(2);
    });

    it('shows "Current" badge for open salary row', async () => {
        mockEmployees.get.mockResolvedValue(mockEmployee);
        mockSalaries.history.mockResolvedValue(mockSalaryHistory);
        render(<EmployeeDetailPage />);

        expect(await screen.findByText('Current')).toBeInTheDocument();
    });

    it('shows error state when API fails', async () => {
        mockEmployees.get.mockRejectedValue(new Error('Not found'));
        mockSalaries.history.mockResolvedValue([]);
        render(<EmployeeDetailPage />);

        expect(await screen.findByText('Not found')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /back to list/i })).toBeInTheDocument();
    });

    it('renders the Record new salary button', async () => {
        mockEmployees.get.mockResolvedValue(mockEmployee);
        mockSalaries.history.mockResolvedValue(mockSalaryHistory);
        render(<EmployeeDetailPage />);

        expect(await screen.findByRole('button', { name: /record new salary/i })).toBeInTheDocument();
    });

    it('renders the Edit link', async () => {
        mockEmployees.get.mockResolvedValue(mockEmployee);
        mockSalaries.history.mockResolvedValue(mockSalaryHistory);
        render(<EmployeeDetailPage />);

        const editLink = await screen.findByRole('link', { name: /edit/i });
        expect(editLink).toHaveAttribute('href', '/employees/emp-1/edit');
    });
});
