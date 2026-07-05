import { describe, it, expect } from 'vitest';
import { cn, formatMoney } from './utils';

describe('cn utility', () => {
    it('merges classNames correctly', () => {
        expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
        expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });
});

describe('formatMoney utility', () => {
    it('formats monetary amounts correctly for known currencies', () => {
        const resultUSD = formatMoney('12500.50', 'USD');
        expect(resultUSD).toContain('12,501');
        
        const resultINR = formatMoney('1500000', 'INR');
        expect(resultINR).toContain('1,500,000');
    });

    it('falls back gracefully if amount is not a number', () => {
        expect(formatMoney('invalid', 'USD')).toBe('invalid USD');
    });
});
