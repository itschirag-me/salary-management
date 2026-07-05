'use client';

import { useEffect, useState } from 'react';
import { analytics } from '@/lib/api';
import type {
    OverviewStat,
    GroupStat,
    DistributionBucket,
} from '@/lib/types';
import { GroupedBarChart } from './grouped-bar-chart';
import { DistributionChart } from './distribution-chart';
import { OverviewCards, CurrencyBreakdownTable } from './overview-cards';

interface DashboardData {
    overview: OverviewStat[];
    byCountry: GroupStat[];
    byDepartment: GroupStat[];
    distribution: DistributionBucket[];
}

export default function AnalyticsPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            analytics.overview(),
            analytics.byCountry(),
            analytics.byDepartment(),
            analytics.distribution(),
        ])
            .then(([overview, byCountry, byDepartment, distribution]) =>
                setData({ overview, byCountry, byDepartment, distribution }),
            )
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p className="text-muted-foreground">Loading analytics…</p>;
    if (error || !data) {
        return <p className="text-destructive">{error ?? 'Failed to load'}</p>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    How the organization pays people, broken down by currency, country, and
                    department.
                </p>
            </div>

            <OverviewCards stats={data.overview} byCountry={data.byCountry} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <GroupedBarChart
                    title="Average salary by department"
                    data={data.byDepartment}
                />
                <DistributionChart data={data.distribution} />
            </div>

            <CurrencyBreakdownTable stats={data.overview} />
        </div>
    );
}