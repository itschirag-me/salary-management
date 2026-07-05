import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { DistributionChart } from './distribution-chart';
import type { DistributionBucket } from '@/lib/types';

// Recharts uses ResizeObserver; provide a stub for jsdom
global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

const singleCurrencyData: DistributionBucket[] = [
    { currency: 'USD', bucket: '$80k–$100k', lowerBound: 80000, count: 3 },
    { currency: 'USD', bucket: '$100k–$120k', lowerBound: 100000, count: 7 },
    { currency: 'USD', bucket: '$120k–$140k', lowerBound: 120000, count: 2 },
];

const multiCurrencyData: DistributionBucket[] = [
    ...singleCurrencyData,
    { currency: 'EUR', bucket: '€60k–€80k', lowerBound: 60000, count: 4 },
];

describe('DistributionChart', () => {
    it('renders the "Salary distribution" heading', () => {
        render(<DistributionChart data={singleCurrencyData} />);
        expect(screen.getByText('Salary distribution')).toBeInTheDocument();
    });

    it('renders without crashing with empty data', () => {
        const { container } = render(<DistributionChart data={[]} />);
        expect(container).toBeTruthy();
    });

    it('does not show currency selector for single currency', () => {
        render(<DistributionChart data={singleCurrencyData} />);
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('shows currency selector when multiple currencies exist', () => {
        render(<DistributionChart data={multiCurrencyData} />);
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders a chart container element', () => {
        const { container } = render(<DistributionChart data={singleCurrencyData} />);
        expect(container.querySelector('[class*="h-"]')).toBeInTheDocument();
    });
});
