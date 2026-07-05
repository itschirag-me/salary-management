'use client';

import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { salaries } from '@/lib/api';
import { ApiRequestError } from '@/lib/api';
import type { Salary } from '@/lib/types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
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

const schema = z.object({
    baseAmount: z.coerce.number().positive('Amount must be greater than 0'),
    currency: z.string().length(3, 'Use a 3-letter currency code'),
    effectiveFrom: z.string().min(1, 'Effective date is required'),
    payFrequency: z.enum(['annual', 'monthly']),
});

type FormValues = z.infer<typeof schema>;

export function RecordSalaryDialog({
    employeeId,
    defaultCurrency,
    onRecorded,
}: {
    employeeId: string;
    defaultCurrency?: string;
    onRecorded: (salary: Salary) => void;
}) {
    const [open, setOpen] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema) as Resolver<FormValues>,
        defaultValues: {
            currency: defaultCurrency ?? 'USD',
            payFrequency: 'annual',
        },
    });

    const onSubmit = async (values: FormValues) => {
        setServerError(null);
        try {
            const salary = await salaries.record(employeeId, values);
            onRecorded(salary);
            reset();
            setOpen(false);
        } catch (err) {
            // Backend rejects out-of-order dates with a 400 — surface that message
            setServerError(
                err instanceof ApiRequestError
                    ? err.message
                    : 'Failed to record salary',
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button>Record new salary</Button>} />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record new salary</DialogTitle>
                    <DialogDescription>
                        This creates a new salary record and closes the current one. History
                        is preserved.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="baseAmount">Base amount</Label>
                        <Input
                            id="baseAmount"
                            type="number"
                            step="0.01"
                            {...register('baseAmount')}
                        />
                        {errors.baseAmount && (
                            <p className="text-sm text-destructive">
                                {errors.baseAmount.message}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="currency">Currency</Label>
                            <Input
                                id="currency"
                                maxLength={3}
                                className="uppercase"
                                {...register('currency')}
                            />
                            {errors.currency && (
                                <p className="text-sm text-destructive">
                                    {errors.currency.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Frequency</Label>
                            <Select
                                value={watch('payFrequency')}
                                onValueChange={(v) =>
                                    setValue('payFrequency', v as 'annual' | 'monthly')
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="annual">Annual</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="effectiveFrom">Effective from</Label>
                        <Input id="effectiveFrom" type="date" {...register('effectiveFrom')} />
                        {errors.effectiveFrom && (
                            <p className="text-sm text-destructive">
                                {errors.effectiveFrom.message}
                            </p>
                        )}
                    </div>

                    {serverError && (
                        <p className="text-sm text-destructive">{serverError}</p>
                    )}

                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving…' : 'Save salary'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}