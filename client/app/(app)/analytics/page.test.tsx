import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
    analytics: {
        overview: vi.fn(),
        byCountry: vi.fn(),
        byDepartment: vi.fn(),
        distribution: vi.fn(),
    },
}));

// Stub out recharts-based chart components to avoid SVG rendering issues in jsdom
vi.mock('./grouped-bar-chart', () => ({
    GroupedBarChart: ({ title }: { title: string }) => <div data-testid="grouped-bar-chart">{title}</div>,
}));
vi.mock('./distribution-chart', () => ({
    DistributionChart: () => <div data-testid="distribution-chart">Salary distribution</div>,
}));
vi.mock('./overview-cards', () => ({
    OverviewCards: () => <div data-testid="overview-cards">OverviewCards</div>,
    CurrencyBreakdownTable: () => <div data-testid="currency-breakdown">CurrencyBreakdown</div>,
}));

import { analytics } from '@/lib/api';
import AnalyticsPage from './page';

const mockAnalytics = analytics as {
    overview: ReturnType<typeof vi.fn>;
    byCountry: ReturnType<typeof vi.fn>;
    byDepartment: ReturnType<typeof vi.fn>;
    distribution: ReturnType<typeof vi.fn>;
};

const mockOverview = [
    { currency: 'USD', headcount: 10, totalPayroll: '1000000', avgSalary: '100000' },
];
const mockByCountry = [
    { group: 'US', currency: 'USD', headcount: 10, avgSalary: '100000', minSalary: '80000', maxSalary: '120000' },
];
const mockByDepartment = [
    { group: 'Engineering', currency: 'USD', headcount: 10, avgSalary: '100000', minSalary: '80000', maxSalary: '120000' },
];
const mockDistribution = [
    { currency: 'USD', bucket: '$80k–$100k', lowerBound: 80000, count: 5 },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AnalyticsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading state while data is being fetched', () => {
        mockAnalytics.overview.mockReturnValue(new Promise(() => {}));
        mockAnalytics.byCountry.mockReturnValue(new Promise(() => {}));
        mockAnalytics.byDepartment.mockReturnValue(new Promise(() => {}));
        mockAnalytics.distribution.mockReturnValue(new Promise(() => {}));

        render(<AnalyticsPage />);
        expect(screen.getByText('Loading analytics…')).toBeInTheDocument();
    });

    it('shows error when any API call fails', async () => {
        mockAnalytics.overview.mockRejectedValue(new Error('Analytics unavailable'));
        mockAnalytics.byCountry.mockResolvedValue([]);
        mockAnalytics.byDepartment.mockResolvedValue([]);
        mockAnalytics.distribution.mockResolvedValue([]);

        render(<AnalyticsPage />);
        expect(await screen.findByText('Analytics unavailable')).toBeInTheDocument();
    });

    it('renders the Analytics heading after data loads', async () => {
        mockAnalytics.overview.mockResolvedValue(mockOverview);
        mockAnalytics.byCountry.mockResolvedValue(mockByCountry);
        mockAnalytics.byDepartment.mockResolvedValue(mockByDepartment);
        mockAnalytics.distribution.mockResolvedValue(mockDistribution);

        render(<AnalyticsPage />);
        expect(await screen.findByRole('heading', { name: /analytics/i })).toBeInTheDocument();
    });

    it('renders OverviewCards component', async () => {
        mockAnalytics.overview.mockResolvedValue(mockOverview);
        mockAnalytics.byCountry.mockResolvedValue(mockByCountry);
        mockAnalytics.byDepartment.mockResolvedValue(mockByDepartment);
        mockAnalytics.distribution.mockResolvedValue(mockDistribution);

        render(<AnalyticsPage />);
        expect(await screen.findByTestId('overview-cards')).toBeInTheDocument();
    });

    it('renders GroupedBarChart with correct title', async () => {
        mockAnalytics.overview.mockResolvedValue(mockOverview);
        mockAnalytics.byCountry.mockResolvedValue(mockByCountry);
        mockAnalytics.byDepartment.mockResolvedValue(mockByDepartment);
        mockAnalytics.distribution.mockResolvedValue(mockDistribution);

        render(<AnalyticsPage />);
        expect(
            await screen.findByText('Average salary by department'),
        ).toBeInTheDocument();
    });

    it('renders DistributionChart', async () => {
        mockAnalytics.overview.mockResolvedValue(mockOverview);
        mockAnalytics.byCountry.mockResolvedValue(mockByCountry);
        mockAnalytics.byDepartment.mockResolvedValue(mockByDepartment);
        mockAnalytics.distribution.mockResolvedValue(mockDistribution);

        render(<AnalyticsPage />);
        expect(await screen.findByTestId('distribution-chart')).toBeInTheDocument();
    });

    it('renders CurrencyBreakdownTable', async () => {
        mockAnalytics.overview.mockResolvedValue(mockOverview);
        mockAnalytics.byCountry.mockResolvedValue(mockByCountry);
        mockAnalytics.byDepartment.mockResolvedValue(mockByDepartment);
        mockAnalytics.distribution.mockResolvedValue(mockDistribution);

        render(<AnalyticsPage />);
        expect(await screen.findByTestId('currency-breakdown')).toBeInTheDocument();
    });

    it('renders the analytics description text', async () => {
        mockAnalytics.overview.mockResolvedValue(mockOverview);
        mockAnalytics.byCountry.mockResolvedValue(mockByCountry);
        mockAnalytics.byDepartment.mockResolvedValue(mockByDepartment);
        mockAnalytics.distribution.mockResolvedValue(mockDistribution);

        render(<AnalyticsPage />);
        expect(
            await screen.findByText(/broken down by currency, country, and department/i),
        ).toBeInTheDocument();
    });
});
