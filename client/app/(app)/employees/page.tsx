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
import { Button, buttonVariants } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { employees } from '@/lib/api';
import { useDebounce } from '@/app/hooks/use-debounce';
import { formatMoney, cn } from '@/lib/utils';
import { Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';

const LIMIT = 10;

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
    const [sortBy, setSortBy] = useState<'employeeCode' | 'name' | 'department' | 'country' | 'status' | 'salary'>('employeeCode');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
                sortBy,
                sortOrder,
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
    }, [page, debouncedSearch, department, status, sortBy, sortOrder]);

    // Reset to page 1 whenever a filter or sort changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, department, status, sortBy, sortOrder]);

    const handleSort = (field: typeof sortBy) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const renderSortIcon = (field: typeof sortBy) => {
        if (sortBy !== field) {
            return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />;
        }
        return sortOrder === 'asc' ? (
            <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary shrink-0" />
        ) : (
            <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary shrink-0" />
        );
    };

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Employees</h1>
            </div>

            {/* Filters & Add Button */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-1 flex-wrap gap-3">
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

                <Link
                    href="/employees/add"
                    className={cn(
                        buttonVariants({ variant: 'default' }),
                        "flex items-center gap-1.5"
                    )}
                >
                    <Plus className="h-4 w-4" />
                    Add employee
                </Link>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-background">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead 
                                className="cursor-pointer select-none hover:text-foreground py-3" 
                                onClick={() => handleSort('employeeCode')}
                            >
                                <div className="flex items-center">
                                    Code
                                    {renderSortIcon('employeeCode')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="cursor-pointer select-none hover:text-foreground py-3" 
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center">
                                    Name
                                    {renderSortIcon('name')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="cursor-pointer select-none hover:text-foreground py-3" 
                                onClick={() => handleSort('department')}
                            >
                                <div className="flex items-center">
                                    Department
                                    {renderSortIcon('department')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="cursor-pointer select-none hover:text-foreground py-3" 
                                onClick={() => handleSort('country')}
                            >
                                <div className="flex items-center">
                                    Country
                                    {renderSortIcon('country')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="cursor-pointer select-none hover:text-foreground py-3" 
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center">
                                    Status
                                    {renderSortIcon('status')}
                                </div>
                            </TableHead>
                            <TableHead 
                                className="text-right cursor-pointer select-none hover:text-foreground py-3" 
                                onClick={() => handleSort('salary')}
                            >
                                <div className="flex items-center justify-end">
                                    Current salary
                                    {renderSortIcon('salary')}
                                </div>
                            </TableHead>
                            <TableHead className="text-right py-3">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: LIMIT }).map((_, rowIndex) => (
                                <TableRow key={`skeleton-${rowIndex}`} className="hover:bg-transparent">
                                    <TableCell className="py-3"><div className="h-4 w-12 bg-muted animate-pulse rounded" /></TableCell>
                                    <TableCell className="py-3"><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                                    <TableCell className="py-3"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                                    <TableCell className="py-3"><div className="h-4 w-8 bg-muted animate-pulse rounded" /></TableCell>
                                    <TableCell className="py-3"><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                                    <TableCell className="py-3 text-right">
                                        <div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" />
                                    </TableCell>
                                    <TableCell className="py-3 text-right">
                                        <div className="h-7 w-12 bg-muted animate-pulse rounded ml-auto" />
                                    </TableCell>
                                </TableRow>
                            ))
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
                                            className={`capitalize ${emp.employmentStatus === 'active'
                                                ? 'text-green-600'
                                                : 'text-muted-foreground'
                                                }`}
                                        >
                                            {emp.employmentStatus}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground order-2 sm:order-1">
                        Showing {(page - 1) * LIMIT + 1} to {Math.min(page * LIMIT, meta.total)} of {meta.total} employees
                    </span>
                    <Pagination className="w-auto order-1 sm:order-2 mx-0">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (page > 1) setPage(page - 1);
                                    }}
                                    className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>

                            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => {
                                if (
                                    p === 1 ||
                                    p === meta.totalPages ||
                                    (p >= page - 1 && p <= page + 1)
                                ) {
                                    return (
                                        <PaginationItem key={p}>
                                            <PaginationLink
                                                href="#"
                                                isActive={p === page}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setPage(p);
                                                }}
                                                className="cursor-pointer"
                                            >
                                                {p}
                                            </PaginationLink>
                                        </PaginationItem>
                                    );
                                }

                                if (p === page - 2 || p === page + 2) {
                                    return (
                                        <PaginationItem key={p}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    );
                                }

                                return null;
                            })}

                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        if (page < meta.totalPages) setPage(page + 1);
                                    }}
                                    className={page >= meta.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
}