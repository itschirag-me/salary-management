import 'dotenv/config';
import { faker } from '@faker-js/faker';
import { AppDataSource } from '../data-source';
import { EmploymentStatus } from '../../common/enums/employment-status.enum';
import { PayFrequency } from '../../common/enums/pay-frequency.enum';
import { Salary } from '../../salaries/entities/salary.entity';
import { Employee } from '../../employees/entities/employee.entity';
import * as bcrypt from 'bcrypt';
import { User } from '../../auth/user.entity';

faker.seed(42);

const COUNTRIES = [
  { code: 'US', currency: 'USD', base: 95_000 },
  { code: 'IN', currency: 'INR', base: 1_500_000 },
  { code: 'GB', currency: 'GBP', base: 65_000 },
  { code: 'DE', currency: 'EUR', base: 75_000 },
  { code: 'SG', currency: 'SGD', base: 90_000 },
  { code: 'CA', currency: 'CAD', base: 85_000 },
  { code: 'AU', currency: 'AUD', base: 92_000 },
  { code: 'BR', currency: 'BRL', base: 120_000 },
] as const;

const DEPARTMENTS = [
  'Engineering',
  'Sales',
  'Marketing',
  'Finance',
  'HR',
  'Operations',
  'Legal',
  'Support',
] as const;

const TOTAL = 10_000;
const BATCH = 1_000;

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run seed in production');
  }

  await AppDataSource.initialize();
  const employeeRepo = AppDataSource.getRepository(Employee);
  const salaryRepo = AppDataSource.getRepository(Salary);

  console.log('Truncating tables...');
  await salaryRepo.query(
    'TRUNCATE "salaries", "employees" RESTART IDENTITY CASCADE',
  );

  console.log(`Seeding ${TOTAL} employees in batches of ${BATCH}...`);

  for (let offset = 0; offset < TOTAL; offset += BATCH) {
    const employees: Partial<Employee>[] = [];

    for (let i = 0; i < BATCH; i++) {
      const n = offset + i + 1;
      const country = faker.helpers.arrayElement(COUNTRIES);
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      employees.push({
        employeeCode: `E${String(n).padStart(6, '0')}`,
        firstName,
        lastName,
        // Deterministic, unique email — avoids faker collisions across 10k rows
        email: `${firstName}.${lastName}.${n}@acme.example`.toLowerCase(),
        department: faker.helpers.arrayElement(DEPARTMENTS),
        jobTitle: faker.person.jobTitle(),
        country: country.code,
        employmentStatus: EmploymentStatus.ACTIVE,
        hireDate: faker.date.past({ years: 8 }),
      });
    }

    // Batch insert — returns generated UUIDs in order
    const result = await employeeRepo.insert(employees);

    // One current salary per employee, in their country's currency
    const salaries: Partial<Salary>[] = result.identifiers.map((idRow, i) => {
      const emp = employees[i];
      const country = COUNTRIES.find((c) => c.code === emp.country)!;
      const variance = faker.number.float({ min: 0.7, max: 1.9 });

      return {
        employeeId: idRow.id as string,
        // NUMERIC → string, fixed to 2 decimals
        baseAmount: (country.base * variance).toFixed(2),
        currency: country.currency,
        effectiveFrom: emp.hireDate,
        effectiveTo: null, // null = current salary
        payFrequency: PayFrequency.ANNUAL,
      };
    });

    const userRepo = AppDataSource.getRepository(User);
    await userRepo.query('TRUNCATE "users" RESTART IDENTITY CASCADE');
    await userRepo.insert({
      email: process.env.HR_EMAIL!,
      passwordHash: await bcrypt.hash(process.env.HR_PASSWORD!, 10),
    });

    await salaryRepo.insert(salaries);
    console.log(`  ${offset + BATCH}/${TOTAL}`);
  }

  await AppDataSource.destroy();
  console.log('Seeding complete.');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
