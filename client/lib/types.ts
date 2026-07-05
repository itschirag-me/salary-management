export type EmploymentStatus = 'active' | 'terminated';
export type PayFrequency = 'annual' | 'monthly';

export interface ApiEnvelope<T> {
    success: boolean;
    statusCode: number;
    path: string;
    timestamp: string;
    data: T;
    meta?: PaginationMeta;
}

export interface ApiError {
    success: false;
    statusCode: number;
    path: string;
    timestamp: string;
    error: string | string[];
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface Paginated<T> {
    data: T[];
    meta: PaginationMeta;
}

export interface Salary {
    id: string;
    employeeId: string;
    baseAmount: string;
    currency: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    payFrequency: PayFrequency;
}

export interface Employee {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    jobTitle: string;
    country: string;
    employmentStatus: EmploymentStatus;
    hireDate: string;
    currentSalary?: Salary | null;
}

export interface CurrentUser {
    id: string;
    email: string;
}
export interface LoginPayload {
    email: string;
    password: string;
}

export interface CreateEmployeePayload {
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    jobTitle: string;
    country: string;
    employmentStatus?: EmploymentStatus;
    hireDate: string;
}

export type UpdateEmployeePayload = Partial<Omit<CreateEmployeePayload, 'employeeCode'>>;

export interface RecordSalaryPayload {
    baseAmount: number;
    currency: string;
    effectiveFrom: string;
    payFrequency: PayFrequency;
}

export interface EmployeeQuery {
    page?: number;
    limit?: number;
    department?: string;
    country?: string;
    status?: EmploymentStatus;
    search?: string;
    sortBy?: 'employeeCode' | 'name' | 'department' | 'country' | 'status' | 'salary';
    sortOrder?: 'asc' | 'desc' | 'ASC' | 'DESC';
}

export interface OverviewStat {
    currency: string;
    headcount: number;
    totalPayroll: string;
    avgSalary: string;
}

export interface GroupStat {
    group: string;
    currency: string;
    headcount: number;
    avgSalary: string;
    minSalary: string;
    maxSalary: string;
}

export interface DistributionBucket {
    currency: string;
    bucket: string;
    lowerBound: number;
    count: number;
}