'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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

// Maps the `avg` series to a themed color + label.
const chartConfig = {
    avg: {
        label: 'Avg salary',
        color: 'var(--chart-1)',
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
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{title}</CardTitle>
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
                <ChartContainer config={chartConfig} className="min-h-[320px] w-full">
                    <BarChart accessibilityLayer data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="group"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            angle={-30}
                            textAnchor="end"
                            height={60}
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 12 }}
                            tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    formatter={(value) =>
                                        `${currency} ${new Intl.NumberFormat().format(Number(value) || 0)}`
                                    }
                                />
                            }
                        />
                        <Bar dataKey="avg" fill="var(--color-avg)" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}