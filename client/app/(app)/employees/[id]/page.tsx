'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { employees, salaries } from '@/lib/api';
import type { Employee, Salary } from '@/lib/types';
import { RecordSalaryDialog } from './record-salary-dialog';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatMoney } from '@/lib/utils';

export default function EmployeeDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [history, setHistory] = useState<Salary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([employees.get(id), salaries.history(id)])
            .then(([emp, hist]) => {
                if (cancelled) return;
                setEmployee(emp);
                setHistory(hist);
            })
            .catch((e: Error) => !cancelled && setError(e.message))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loading) {
        return <p className="text-muted-foreground">Loading…</p>;
    }
    if (error || !employee) {
        return (
            <div className="space-y-4">
                <p className="text-destructive">{error ?? 'Employee not found'}</p>
                <Button variant="outline">
                    <Link href="/employees">Back to list</Link>
                </Button>
            </div>
        );
    }

    const current = history.find((s) => s.effectiveTo === null);

    // New salary becomes current; the previously-current row is now closed.
    // Refetch history to reflect the closed effectiveTo the backend set.
    const handleRecorded = () => {
        salaries.history(id).then(setHistory);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        href="/employees"
                        className="text-sm text-muted-foreground hover:underline"
                    >
                        ← Employees
                    </Link>
                    <h1 className="mt-1 text-2xl font-semibold">
                        {employee.firstName} {employee.lastName}
                    </h1>
                    <p className="text-muted-foreground">
                        {employee.jobTitle} · {employee.department}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Link href={`/employees/${id}/edit`}>Edit</Link>
                    </Button>
                    <RecordSalaryDialog
                        employeeId={id}
                        defaultCurrency={current?.currency}
                        onRecorded={handleRecorded}
                    />
                </div>
            </div>

            {/* Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                    <Field label="Employee code" value={employee.employeeCode} />
                    <Field label="Email" value={employee.email} />
                    <Field label="Country" value={employee.country} />
                    <Field label="Status" value={employee.employmentStatus} />
                    <Field label="Hire date" value={employee.hireDate} />
                    <Field
                        label="Current salary"
                        value={
                            current
                                ? formatMoney(current.baseAmount, current.currency)
                                : '—'
                        }
                    />
                </CardContent>
            </Card>

            {/* Salary history */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Salary history</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Amount</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Effective from</TableHead>
                                <TableHead>Effective to</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell className="font-medium">
                                        {formatMoney(s.baseAmount, s.currency)}
                                    </TableCell>
                                    <TableCell>{s.payFrequency}</TableCell>
                                    <TableCell>{s.effectiveFrom}</TableCell>
                                    <TableCell>{s.effectiveTo ?? '—'}</TableCell>
                                    <TableCell>
                                        {s.effectiveTo === null && (
                                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                                                Current
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    );
}