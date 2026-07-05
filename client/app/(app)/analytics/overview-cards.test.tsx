import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewCards, CurrencyBreakdownTable } from './overview-cards';
import type { OverviewStat, GroupStat } from '@/lib/types';
import React from 'react';

const mockStats: OverviewStat[] = [
    { currency: 'USD', headcount: 10, totalPayroll: '1000000', avgSalary: '100000' },
    { currency: 'EUR', headcount: 5, totalPayroll: '400000', avgSalary: '80000' },
];

const mockByCountry: GroupStat[] = [
    { group: 'US', currency: 'USD', headcount: 10, avgSalary: '100000', minSalary: '80000', maxSalary: '120000' },
    { group: 'DE', currency: 'EUR', headcount: 5, avgSalary: '80000', minSalary: '60000', maxSalary: '100000' },
];

describe('OverviewCards Component', () => {
    it('renders the headcount and global coverage metrics correctly', () => {
        render(<OverviewCards stats={mockStats} byCountry={mockByCountry} />);

        // Check total headcount card
        expect(screen.getByText('Total Organization Headcount')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument(); // 10 + 5

        // Check global coverage card
        expect(screen.getByText('Global Coverage')).toBeInTheDocument();
        expect(screen.getByText('2 Currencies')).toBeInTheDocument();
    });

    it('renders the average salary by country details card', () => {
        render(<OverviewCards stats={mockStats} byCountry={mockByCountry} />);

        expect(screen.getByText('Average Salary by Country')).toBeInTheDocument();
        expect(screen.getByText(/Germany/)).toBeInTheDocument();
        expect(screen.getByText(/€80,000/)).toBeInTheDocument();
    });
});

describe('CurrencyBreakdownTable Component', () => {
    it('renders rows for each currency stats item', () => {
        render(<CurrencyBreakdownTable stats={mockStats} />);

        expect(screen.getByText('Geographic & Currency Breakdown')).toBeInTheDocument();
        expect(screen.getByText('United States')).toBeInTheDocument();
        expect(screen.getByText('Germany')).toBeInTheDocument();
    });
});
