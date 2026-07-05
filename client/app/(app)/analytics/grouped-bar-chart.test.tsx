import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GroupedBarChart } from './grouped-bar-chart';
import type { GroupStat } from '@/lib/types';

// Recharts uses ResizeObserver; provide a stub for jsdom
global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

const singleCurrencyData: GroupStat[] = [
    { group: 'Engineering', currency: 'USD', headcount: 10, avgSalary: '120000', minSalary: '90000', maxSalary: '150000' },
    { group: 'Sales', currency: 'USD', headcount: 5, avgSalary: '80000', minSalary: '60000', maxSalary: '100000' },
    { group: 'Marketing', currency: 'USD', headcount: 3, avgSalary: '90000', minSalary: '70000', maxSalary: '110000' },
];

const multiCurrencyData: GroupStat[] = [
    ...singleCurrencyData,
    { group: 'Finance', currency: 'EUR', headcount: 4, avgSalary: '95000', minSalary: '75000', maxSalary: '115000' },
];

describe('GroupedBarChart', () => {
    it('renders the card with the given title', () => {
        render(<GroupedBarChart title="Average salary by department" data={singleCurrencyData} />);
        expect(screen.getByText('Average salary by department')).toBeInTheDocument();
    });

    it('renders without crashing with empty data', () => {
        const { container } = render(<GroupedBarChart title="Dept chart" data={[]} />);
        expect(container).toBeTruthy();
    });

    it('does not show currency selector when only one currency', () => {
        render(<GroupedBarChart title="Chart" data={singleCurrencyData} />);
        // No select trigger visible for single currency
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('shows a currency selector when multiple currencies are present', () => {
        render(<GroupedBarChart title="Chart" data={multiCurrencyData} />);
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders a chart container element', () => {
        const { container } = render(
            <GroupedBarChart title="Dept chart" data={singleCurrencyData} />,
        );
        // ChartContainer wraps in a div with a specific class
        expect(container.querySelector('[class*="h-"]')).toBeInTheDocument();
    });
});
