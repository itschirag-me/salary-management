import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('next/link', () => ({
    default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
        <a href={href} className={className}>{children}</a>
    ),
}));

vi.mock('@/lib/api', () => ({
    employees: { list: vi.fn() },
}));

vi.mock('@/app/hooks/use-debounce', () => ({
    useDebounce: (v: string) => v,
}));

import { employees } from '@/lib/api';
import EmployeesPage from './page';

const mockEmployees = employees as { list: ReturnType<typeof vi.fn> };

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
    hireDate: '2022-01-01',
    currentSalary: { id: 's1', employeeId: 'emp-1', baseAmount: '100000', currency: 'USD', effectiveFrom: '2022-01-01', effectiveTo: null, payFrequency: 'annual' as const },
};

const mockPaginatedResponse = {
    data: [mockEmployee],
    meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('EmployeesPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the Employees heading', async () => {
        mockEmployees.list.mockResolvedValue(mockPaginatedResponse);
        render(<EmployeesPage />);
        expect(screen.getByRole('heading', { name: /employees/i })).toBeInTheDocument();
    });

    it('shows skeleton rows while loading', () => {
        // Never resolves during this test
        mockEmployees.list.mockReturnValue(new Promise(() => {}));
        render(<EmployeesPage />);
        // Skeleton rows use animate-pulse divs — confirm table is rendered in loading state
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
    });

    it('renders employee rows after data loads', async () => {
        mockEmployees.list.mockResolvedValue(mockPaginatedResponse);
        render(<EmployeesPage />);

        expect(await screen.findByText('E001')).toBeInTheDocument();
        expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
        expect(await screen.findByText('Engineering')).toBeInTheDocument();
        expect(await screen.findByText('US')).toBeInTheDocument();
        expect(await screen.findByText('active')).toBeInTheDocument();
    });

    it('shows empty state message when no employees match', async () => {
        mockEmployees.list.mockResolvedValue({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } });
        render(<EmployeesPage />);
        expect(await screen.findByText(/no employees match your filters/i)).toBeInTheDocument();
    });

    it('shows error message when API fails', async () => {
        mockEmployees.list.mockRejectedValue(new Error('Network error'));
        render(<EmployeesPage />);
        expect(await screen.findByText('Network error')).toBeInTheDocument();
    });

    it('renders the Add employee link', async () => {
        mockEmployees.list.mockResolvedValue(mockPaginatedResponse);
        render(<EmployeesPage />);
        const addLink = screen.getByRole('link', { name: /add employee/i });
        expect(addLink).toBeInTheDocument();
        expect(addLink).toHaveAttribute('href', '/employees/add');
    });

    it('shows pagination info when data is loaded', async () => {
        mockEmployees.list.mockResolvedValue({
            data: [mockEmployee],
            meta: { page: 1, limit: 10, total: 15, totalPages: 2 },
        });
        render(<EmployeesPage />);
        expect(await screen.findByText(/showing 1 to 10 of 15 employees/i)).toBeInTheDocument();
    });

    it('formats salary correctly in the table', async () => {
        mockEmployees.list.mockResolvedValue(mockPaginatedResponse);
        render(<EmployeesPage />);
        // $100,000 USD formatted by formatMoney
        expect(await screen.findByText(/\$100,000/)).toBeInTheDocument();
    });

    it('shows — for employees with no current salary', async () => {
        const noSalaryEmp = { ...mockEmployee, currentSalary: null };
        mockEmployees.list.mockResolvedValue({
            data: [noSalaryEmp],
            meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        });
        render(<EmployeesPage />);
        expect(await screen.findByText('—')).toBeInTheDocument();
    });
});
