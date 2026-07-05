'use client';

import { useMemo, useState } from 'react';
import type { OverviewStat, GroupStat } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Users, Globe, ArrowUpDown } from 'lucide-react';

const CURRENCY_TO_COUNTRY: Record<string, { name: string; flag: string }> = {
    USD: { name: 'United States', flag: '🇺🇸' },
    EUR: { name: 'Germany', flag: '🇩🇪' },
    GBP: { name: 'United Kingdom', flag: '🇬🇧' },
    INR: { name: 'India', flag: '🇮🇳' },
    AUD: { name: 'Australia', flag: '🇦🇺' },
    CAD: { name: 'Canada', flag: '🇨🇦' },
    SGD: { name: 'Singapore', flag: '🇸🇬' },
    BRL: { name: 'Brazil', flag: '🇧🇷' },
};

function formatCompactMoney(amount: string | number, currency: string): string {
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(val)) return '—';
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(val);
    } catch {
        return `${val.toLocaleString()} ${currency}`;
    }
}

function formatFullMoney(amount: string | number, currency: string): string {
    const val = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(val)) return '—';
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        }).format(val);
    } catch {
        return `${val.toLocaleString()} ${currency}`;
    }
}

export function OverviewCards({ 
    stats, 
    byCountry 
}: { 
    stats: OverviewStat[]; 
    byCountry: GroupStat[]; 
}) {
    const totalHeadcount = useMemo(() => {
        return stats.reduce((acc, curr) => acc + curr.headcount, 0);
    }, [stats]);

    const totalCurrencies = stats.length;

    // Unique country codes in the data
    const countries = useMemo(() => {
        return Array.from(new Set(byCountry.map((d) => d.group))).sort();
    }, [byCountry]);

    const [selectedCountry, setSelectedCountry] = useState<string>(countries[0] ?? '');

    const selectedStat = useMemo(() => {
        return byCountry.find((d) => d.group === selectedCountry);
    }, [byCountry, selectedCountry]);

    const countryInfo = CURRENCY_TO_COUNTRY[selectedStat?.currency ?? ''] || { name: selectedCountry, flag: '🌐' };

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Card 1: Total Headcount */}
            <Card className="transition-all duration-300 hover:shadow-sm flex flex-col justify-between">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Organization Headcount
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold tracking-tight">
                        {new Intl.NumberFormat().format(totalHeadcount)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Employees across all geographic locations
                    </p>
                </CardContent>
            </Card>

            {/* Card 2: Global Coverage */}
            <Card className="transition-all duration-300 hover:shadow-sm flex flex-col justify-between">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Global Coverage
                    </CardTitle>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold tracking-tight">
                        {totalCurrencies} Currencies
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Active transaction and payroll currencies
                    </p>
                </CardContent>
            </Card>

            {/* Card 3: Average Salary by Country */}
            {selectedStat && (
                <Card className="transition-all duration-300 hover:shadow-sm flex flex-col justify-between">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Average Salary by Country
                        </CardTitle>
                        {countries.length > 1 && (
                            <Select value={selectedCountry} onValueChange={(v) => v && setSelectedCountry(v)}>
                                <SelectTrigger className="w-28 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {countries.map((code) => {
                                        const cStat = byCountry.find((d) => d.group === code);
                                        const info = CURRENCY_TO_COUNTRY[cStat?.currency ?? ''] || { name: code, flag: '🌐' };
                                        return (
                                            <SelectItem key={code} value={code}>
                                                <span className="mr-1.5">{info.flag}</span>
                                                {code}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="text-3xl font-bold tracking-tight text-primary">
                            {formatFullMoney(selectedStat.avgSalary, selectedStat.currency)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {countryInfo.flag} {countryInfo.name} · Range: {formatCompactMoney(selectedStat.minSalary, selectedStat.currency)} - {formatCompactMoney(selectedStat.maxSalary, selectedStat.currency)}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export function CurrencyBreakdownTable({ stats }: { stats: OverviewStat[] }) {
    const [sortCol, setSortCol] = useState<'currency' | 'headcount' | 'totalPayroll' | 'avgSalary'>('headcount');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const handleSort = (col: typeof sortCol) => {
        if (sortCol === col) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortCol(col);
            setSortOrder('desc');
        }
    };

    const sortedStats = useMemo(() => {
        return [...stats].sort((a, b) => {
            let valA: any = a[sortCol];
            let valB: any = b[sortCol];

            if (sortCol === 'totalPayroll' || sortCol === 'avgSalary') {
                valA = parseFloat(a[sortCol]) || 0;
                valB = parseFloat(b[sortCol]) || 0;
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [stats, sortCol, sortOrder]);

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Geographic & Currency Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border bg-background">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead 
                                    className="cursor-pointer select-none py-3 hover:text-foreground" 
                                    onClick={() => handleSort('currency')}
                                >
                                    <div className="flex items-center gap-1 font-semibold">
                                        Country / Currency
                                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="text-right cursor-pointer select-none py-3 hover:text-foreground" 
                                    onClick={() => handleSort('headcount')}
                                >
                                    <div className="flex items-center justify-end gap-1 font-semibold">
                                        Headcount
                                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="text-right cursor-pointer select-none py-3 hover:text-foreground" 
                                    onClick={() => handleSort('totalPayroll')}
                                >
                                    <div className="flex items-center justify-end gap-1 font-semibold">
                                        Total Payroll
                                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
                                    </div>
                                </TableHead>
                                <TableHead 
                                    className="text-right cursor-pointer select-none py-3 hover:text-foreground" 
                                    onClick={() => handleSort('avgSalary')}
                                >
                                    <div className="flex items-center justify-end gap-1 font-semibold">
                                        Avg Salary
                                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />
                                    </div>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedStats.map((row) => (
                                <TableRow key={row.currency} className="hover:bg-muted/30">
                                    <TableCell className="py-2.5 font-medium">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base" title={CURRENCY_TO_COUNTRY[row.currency]?.name}>
                                                {CURRENCY_TO_COUNTRY[row.currency]?.flag || '🌐'}
                                            </span>
                                            <span className="font-semibold text-sm">
                                                {CURRENCY_TO_COUNTRY[row.currency]?.name || 'Global'}
                                            </span>
                                            <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground ring-1 ring-inset ring-border">
                                                {row.currency}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right py-2.5 font-medium">
                                        {new Intl.NumberFormat().format(row.headcount)}
                                    </TableCell>
                                    <TableCell 
                                        className="text-right py-2.5 font-mono text-sm cursor-help" 
                                        title={formatFullMoney(row.totalPayroll, row.currency)}
                                    >
                                        {formatCompactMoney(row.totalPayroll, row.currency)}
                                    </TableCell>
                                    <TableCell 
                                        className="text-right py-2.5 font-mono text-sm cursor-help" 
                                        title={formatFullMoney(row.avgSalary, row.currency)}
                                    >
                                        {formatCompactMoney(row.avgSalary, row.currency)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}