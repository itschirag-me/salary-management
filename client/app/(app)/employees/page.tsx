'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Employee, PaginationMeta, EmploymentStatus } from '@/lib/types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { employees } from '@/lib/api';
import { useDebounce } from '@/app/hooks/use-debounce';
import { formatMoney } from '@/lib/utils';

const LIMIT = 25;

export default function EmployeesPage() {
    const [rows, setRows] = useState<Employee[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState<string>('');
    const [status, setStatus] = useState<string>('');

    const debouncedSearch = useDebounce(search);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        employees
            .list({
                page,
                limit: LIMIT,
                search: debouncedSearch || undefined,
                department: department || undefined,
                status: (status as EmploymentStatus) || undefined,
            })
            .then((res) => {
                if (cancelled) return;
                setRows(res.data);
                setMeta(res.meta);
            })
            .catch((e: Error) => {
                if (!cancelled) setError(e.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [page, debouncedSearch, department, status]);

    // Reset to page 1 whenever a filter changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, department, status]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Employees</h1>
                <Button>
                    <Link href="/employees/add">Add employee</Link>
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Input
                    placeholder="Search name, email, or code…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs"
                />
                <Select
                    value={status}
                    onValueChange={(v) => setStatus(v === 'all' || !v ? '' : v)}
                >
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={department}
                    onValueChange={(v) => setDepartment(v === 'all' || !v ? '' : v)}
                >
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All departments</SelectItem>
                        <SelectItem value="Engineering">Engineering</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Legal">Legal</SelectItem>
                        <SelectItem value="Support">Support</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-background">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Country</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Current salary</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                    Loading…
                                </TableCell>
                            </TableRow>
                        ) : error ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-destructive">
                                    {error}
                                </TableCell>
                            </TableRow>
                        ) : Array.isArray(rows) && rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-muted-foreground">
                                    No employees match your filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            Array.isArray(rows) && rows.map((emp) => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-mono text-xs">
                                        {emp.employeeCode}
                                    </TableCell>
                                    <TableCell>
                                        <Link
                                            href={`/employees/${emp.id}`}
                                            className="font-medium hover:underline"
                                        >
                                            {emp.firstName} {emp.lastName}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{emp.department}</TableCell>
                                    <TableCell>{emp.country}</TableCell>
                                    <TableCell>
                                        <span
                                            className={`capitalize ${
                                                emp.employmentStatus === 'active'
                                                    ? 'text-green-600'
                                                    : 'text-muted-foreground'
                                            }`}
                                        >
                                            {emp.employmentStatus}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {emp.currentSalary
                                            ? formatMoney(
                                                emp.currentSalary.baseAmount,
                                                emp.currentSalary.currency,
                                            )
                                            : '—'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm">
                                            <Link href={`/employees/${emp.id}/edit`}>
                                                Edit
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {meta && meta.total > 0 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                        Page {meta.page} of {meta.totalPages} · {meta.total} total
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={meta.page >= meta.totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}