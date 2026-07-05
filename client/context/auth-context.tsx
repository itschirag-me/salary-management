'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { CurrentUser, LoginPayload } from '@/lib/types';
import { auth } from '@/lib/api';

interface AuthContextValue {
    user: CurrentUser | null;
    loading: boolean;
    login: (payload: LoginPayload) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<CurrentUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        auth
            .me()
            .then(setUser)
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);

    const login = async (payload: LoginPayload) => {
        await auth.login(payload);
        const me = await auth.me();
        setUser(me);
        router.push('/employees');
    };

    const logout = async () => {
        await auth.logout();
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}