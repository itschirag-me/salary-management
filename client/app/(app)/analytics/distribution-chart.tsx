'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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

const chartConfig = {
    count: {
        label: 'Employees',
        color: 'var(--chart-1)',
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
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Salary distribution</CardTitle>
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
                <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
                    <BarChart accessibilityLayer data={chartData}>
                        <CartesianGrid vertical={false} />
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
                            tick={{ fontSize: 12 }}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                        />
                        <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}