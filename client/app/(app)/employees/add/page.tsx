'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { employees } from '@/lib/api';
import { EmployeeForm, type EmployeeFormValues } from '../employee-form';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export default function AddEmployeePage() {
    const router = useRouter();

    const handleSubmit = async (values: EmployeeFormValues) => {
        const emp = await employees.create(values);
        router.push(`/employees/${emp.id}`);
    };

    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <Link
                href="/employees"
                className="text-sm text-muted-foreground hover:underline"
            >
                ← Back to list
            </Link>
            <Card>
                <CardHeader>
                    <CardTitle>Add employee</CardTitle>
                </CardHeader>
                <CardContent>
                    <EmployeeForm
                        mode="create"
                        onSubmit={handleSubmit}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
