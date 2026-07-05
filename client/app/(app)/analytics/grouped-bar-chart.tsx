'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import type { GroupStat } from '@/lib/types';
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
    '#3b82f685', // Blue
    '#0d948885', // Teal
    '#6366f185', // Indigo
    '#f9731685', // Orange
    '#ec489985', // Pink
];

// Maps the `avg` series to a themed color + label.
const chartConfig = {
    avg: {
        label: 'Avg salary',
    },
} satisfies ChartConfig;

export function GroupedBarChart({
    title,
    data,
}: {
    title: string;
    data: GroupStat[];
}) {
    const currencies = useMemo(
        () => Array.from(new Set(data.map((d) => d.currency))).sort(),
        [data],
    );
    const [currency, setCurrency] = useState<string>(currencies[0] ?? '');

    // One currency at a time — averages aren't comparable across currencies
    const chartData = useMemo(
        () =>
            data
                .filter((d) => d.currency === currency)
                .map((d) => ({
                    group: d.group,
                    avg: Number(d.avgSalary),
                }))
                .sort((a, b) => b.avg - a.avg),
        [data, currency],
    );

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
                {currencies.length > 1 && (
                    <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
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
                            dataKey="group"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            angle={-30}
                            textAnchor="end"
                            height={60}
                            tick={{ fontSize: 11 }}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <ChartTooltip
                            cursor={{ fill: 'var(--muted)', opacity: 0.15 }}
                            content={
                                <ChartTooltipContent
                                    formatter={(value) =>
                                        `${currency} ${new Intl.NumberFormat().format(Number(value) || 0)}`
                                    }
                                />
                            }
                        />
                        <Bar dataKey="avg" radius={[4, 4, 0, 0]} barSize={32}>
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