import axios, { AxiosError, type AxiosInstance } from 'axios';
import type {
    ApiEnvelope,
    CurrentUser,
    CreateEmployeePayload,
    DistributionBucket,
    Employee,
    EmployeeQuery,
    GroupStat,
    LoginPayload,
    OverviewStat,
    Paginated,
    RecordSalaryPayload,
    Salary,
    UpdateEmployeePayload,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export class ApiRequestError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message);
        this.name = 'ApiRequestError';
    }
}

const client: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

// Response interceptor: unwrap the { success, data, ... } envelope,
// and normalize errors into a typed ApiRequestError.
client.interceptors.response.use(
    (response) => {
        // Return the inner `data` from the success envelope
        const envelope = response.data as ApiEnvelope<unknown>;
        response.data = envelope?.data;
        return response;
    },
    (error: AxiosError<{ error?: string | string[]; message?: string }>) => {
        const status = error.response?.status ?? 0;
        const body = error.response?.data;
        const raw = body?.error ?? body?.message ?? error.message;
        const message = Array.isArray(raw) ? raw.join(', ') : raw;

        // 401 → session gone. Redirect to login (browser only).
        if (status === 401 && typeof window !== 'undefined') {
            // Avoid redirect loop if already on the login page
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
        }

        return Promise.reject(new ApiRequestError(status, message));
    },
);

function buildParams(query: Record<string, any>): Record<string, string> {
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
            params[key] = String(value);
        }
    }
    return params;
}

// ---------------- Auth ----------------
export const auth = {
    login: async (payload: LoginPayload) => {
        const res = await client.post<{ message: string }>('/auth/login', payload);
        return res.data;
    },
    logout: async () => {
        const res = await client.post<{ message: string }>('/auth/logout');
        return res.data;
    },
    me: async () => {
        const res = await client.get<CurrentUser>('/auth/me');
        return res.data;
    },
};

// ---------------- Employees ----------------
export const employees = {
    list: async (query: EmployeeQuery = {}) => {
        const res = await client.get<Paginated<Employee>>('/employees', {
            params: buildParams(query),
        });
        return res.data;
    },
    get: async (id: string) => {
        const res = await client.get<Employee>(`/employees/${id}`);
        return res.data;
    },
    create: async (payload: CreateEmployeePayload) => {
        const res = await client.post<Employee>('/employees', payload);
        return res.data;
    },
    update: async (id: string, payload: UpdateEmployeePayload) => {
        const res = await client.patch<Employee>(`/employees/${id}`, payload);
        return res.data;
    },
    remove: async (id: string) => {
        const res = await client.delete<Employee>(`/employees/${id}`);
        return res.data;
    },
};

// ---------------- Salaries ----------------
export const salaries = {
    history: async (employeeId: string) => {
        const res = await client.get<Salary[]>(
            `/employees/${employeeId}/salaries`,
        );
        return res.data;
    },
    record: async (employeeId: string, payload: RecordSalaryPayload) => {
        const res = await client.post<Salary>(
            `/employees/${employeeId}/salaries`,
            payload,
        );
        return res.data;
    },
};

// ---------------- Analytics ----------------
export const analytics = {
    overview: async () => {
        const res = await client.get<OverviewStat[]>('/analytics/overview');
        return res.data;
    },
    byCountry: async () => {
        const res = await client.get<GroupStat[]>('/analytics/by-country');
        return res.data;
    },
    byDepartment: async () => {
        const res = await client.get<GroupStat[]>('/analytics/by-department');
        return res.data;
    },
    distribution: async () => {
        const res = await client.get<DistributionBucket[]>(
            '/analytics/distribution',
        );
        return res.data;
    },
};

export { client };