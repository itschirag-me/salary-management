'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiRequestError } from '@/lib/api';
import type { Employee } from '@/lib/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

// Mirrors CreateEmployeeDto. employeeCode is omitted in edit mode (immutable).
const baseSchema = z.object({
    firstName: z.string().min(1, 'Required').max(100),
    lastName: z.string().min(1, 'Required').max(100),
    email: z.string().email('Enter a valid email').max(255),
    department: z.string().min(1, 'Required').max(100),
    jobTitle: z.string().min(1, 'Required').max(150),
    country: z.string().length(2, 'Use a 2-letter country code'),
    employmentStatus: z.enum(['active', 'terminated']),
    hireDate: z.string().min(1, 'Required'),
});

const createSchema = baseSchema.extend({
    employeeCode: z.string().min(1, 'Required').max(20),
});

export type EmployeeFormValues = z.infer<typeof createSchema>;

export function EmployeeForm({
    mode,
    initial,
    onSubmit,
}: {
    mode: 'create' | 'edit';
    initial?: Employee;
    onSubmit: (values: EmployeeFormValues) => Promise<void>;
}) {
    const [serverError, setServerError] = useState<string | null>(null);
    const isEdit = mode === 'edit';

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<EmployeeFormValues>({
        resolver: zodResolver(isEdit ? baseSchema : createSchema) as unknown as Resolver<EmployeeFormValues>,
        defaultValues: initial
            ? {
                employeeCode: initial.employeeCode,
                firstName: initial.firstName,
                lastName: initial.lastName,
                email: initial.email,
                department: initial.department,
                jobTitle: initial.jobTitle,
                country: initial.country,
                employmentStatus: initial.employmentStatus,
                hireDate: initial.hireDate,
            }
            : { employmentStatus: 'active' },
    });

    const submit = async (values: EmployeeFormValues) => {
        setServerError(null);
        try {
            await onSubmit(values);
        } catch (err) {
            // Duplicate employeeCode/email surface as a 400/409 here
            setServerError(
                err instanceof ApiRequestError ? err.message : 'Something went wrong',
            );
        }
    };

    return (
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {!isEdit && (
                    <TextField
                        id="employeeCode"
                        label="Employee code"
                        error={errors.employeeCode?.message}
                        {...register('employeeCode')}
                    />
                )}
                <TextField
                    id="email"
                    label="Email"
                    type="email"
                    error={errors.email?.message}
                    {...register('email')}
                />
                <TextField
                    id="firstName"
                    label="First name"
                    error={errors.firstName?.message}
                    {...register('firstName')}
                />
                <TextField
                    id="lastName"
                    label="Last name"
                    error={errors.lastName?.message}
                    {...register('lastName')}
                />
                <TextField
                    id="department"
                    label="Department"
                    error={errors.department?.message}
                    {...register('department')}
                />
                <TextField
                    id="jobTitle"
                    label="Job title"
                    error={errors.jobTitle?.message}
                    {...register('jobTitle')}
                />
                <TextField
                    id="country"
                    label="Country (2-letter)"
                    error={errors.country?.message}
                    className="uppercase"
                    maxLength={2}
                    {...register('country')}
                />
                <TextField
                    id="hireDate"
                    label="Hire date"
                    type="date"
                    error={errors.hireDate?.message}
                    {...register('hireDate')}
                />
                <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                        value={watch('employmentStatus')}
                        onValueChange={(v) =>
                            setValue('employmentStatus', v as 'active' | 'terminated')
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}

            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create employee'}
            </Button>
        </form>
    );
}

// Small labeled-input helper. forwardRef so react-hook-form's register works.
import { forwardRef } from 'react';

const TextField = forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; id: string }
>(({ label, error, id, ...props }, ref) => (
    <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Input id={id} ref={ref} {...props} />
        {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
));
TextField.displayName = 'TextField';