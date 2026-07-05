'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();

    // Redirect to login once we know there's no session
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [loading, user, router]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-muted-foreground">Loading…</p>
            </div>
        );
    }

    if (!user) return null; // redirecting

    return (
        <div className="min-h-screen bg-muted/20">
            <header className="border-b bg-background">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                    <nav className="flex items-center gap-6">
                        <span className="font-semibold">Salary Management</span>
                        <Link
                            href="/employees"
                            className="text-sm text-muted-foreground hover:text-foreground"
                        >
                            Employees
                        </Link>
                        <Link
                            href="/analytics"
                            className="text-sm text-muted-foreground hover:text-foreground"
                        >
                            Analytics
                        </Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                        <Button variant="outline" size="sm" onClick={() => logout()}>
                            Sign out
                        </Button>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-3">{children}</main>
        </div>
    );
}