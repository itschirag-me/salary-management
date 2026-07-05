'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import type { DistributionBucket } from '@/lib/types';
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const BAR_COLORS = [
    '#0d948885', // Teal
    '#6366f185', // Indigo
    '#f9731685', // Orange
    '#ec489985', // Pink
    '#3b82f685', // Blue
];

const chartConfig = {
    count: {
        label: 'Employees',
    },
} satisfies ChartConfig;

export function DistributionChart({
    data,
}: {
    data: DistributionBucket[];
}) {
    const currencies = useMemo(
        () => Array.from(new Set(data.map((d) => d.currency))).sort(),
        [data],
    );
    const [currency, setCurrency] = useState<string>(currencies[0] ?? '');

    const chartData = useMemo(
        () =>
            data
                .filter((d) => d.currency === currency)
                .sort((a, b) => a.lowerBound - b.lowerBound)
                .map((d) => ({ bucket: d.bucket, count: d.count })),
        [data, currency],
    );

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-base font-semibold">Salary distribution</CardTitle>
                {currencies.length > 1 && (
                    <Select value={currency} onValueChange={(val) => val && setCurrency(val)}>
                        <SelectTrigger className="w-28">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {currencies.map((c) => (
                                <SelectItem key={c} value={c}>
                                    {c}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[240px] w-full">
                    <BarChart accessibilityLayer data={chartData}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.4} />
                        <XAxis
                            dataKey="bucket"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tick={{ fontSize: 11 }}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            tick={{ fontSize: 11 }}
                        />
                        <ChartTooltip
                            cursor={{ fill: 'var(--muted)', opacity: 0.15 }}
                            content={<ChartTooltipContent />}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={45}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}