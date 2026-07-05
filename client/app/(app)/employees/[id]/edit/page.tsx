'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { employees } from '@/lib/api';
import type { Employee } from '@/lib/types';
import { EmployeeForm, type EmployeeFormValues } from '../../employee-form';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export default function EditEmployeePage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        employees
            .get(id)
            .then(setEmployee)
            .catch((e: Error) => setError(e.message))
            .finally(() => setLoading(false));
    }, [id]);

    const handleSubmit = async (values: EmployeeFormValues) => {
        // employeeCode is immutable — strip it from the update payload
        const { employeeCode, ...payload } = values;
        void employeeCode;
        await employees.update(id, payload);
        router.push(`/employees/${id}`);
    };

    if (loading) return <p className="text-muted-foreground">Loading…</p>;
    if (error || !employee) {
        return <p className="text-destructive">{error ?? 'Employee not found'}</p>;
    }

    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <Link
                href={`/employees/${id}`}
                className="text-sm text-muted-foreground hover:underline"
            >
                ← Back
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle>Edit employee</CardTitle>
                </CardHeader>
                <CardContent>
                    <EmployeeForm
                        mode="edit"
                        initial={employee}
                        onSubmit={handleSubmit}
                    />
                </CardContent>
            </Card>
        </div>
    );
}