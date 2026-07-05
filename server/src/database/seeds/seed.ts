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
  const userRepo = AppDataSource.getRepository(User);

  console.log('Truncating tables...');
  await salaryRepo.query(
    'TRUNCATE "salaries", "employees" RESTART IDENTITY CASCADE',
  );
  await userRepo.query('TRUNCATE "users" RESTART IDENTITY CASCADE');

  console.log('Seeding HR user...');
  await userRepo.insert({
    email: process.env.HR_EMAIL!,
    passwordHash: await bcrypt.hash(process.env.HR_PASSWORD!, 10),
  });

  console.log(`Seeding ${TOTAL} employees in batches of ${BATCH} with full salary histories...`);

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
        email: `${firstName}.${lastName}.${n}@acme.example`.toLowerCase(),
        department: faker.helpers.arrayElement(DEPARTMENTS),
        jobTitle: faker.person.jobTitle(),
        country: country.code,
        employmentStatus: EmploymentStatus.ACTIVE,
        hireDate: faker.date.past({ years: 8 }),
      });
    }

    // Batch insert employees — returns generated UUIDs in order
    const result = await employeeRepo.insert(employees);

    // Generate multiple historical salary records per employee
    const salaries: Partial<Salary>[] = [];

    result.identifiers.forEach((idRow, i) => {
      const emp = employees[i];
      const country = COUNTRIES.find((c) => c.code === emp.country)!;
      const employeeId = idRow.id as string;
      const hireDate = emp.hireDate!;

      const now = new Date();
      const yearsDiff = (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

      // Determine number of revisions: 1 if hired recently (< 1 year), up to 4 if hired long ago (> 3 years)
      const maxRevisions = Math.min(4, Math.max(1, Math.floor(yearsDiff)));
      const numRevisions = faker.number.int({ min: 1, max: maxRevisions });

      // Start with a base amount based on country average and variance
      const variance = faker.number.float({ min: 0.6, max: 1.2 });
      let currentAmount = country.base * variance;
      let currentFromDate = new Date(hireDate);

      for (let j = 0; j < numRevisions; j++) {
        const isLast = j === numRevisions - 1;
        let currentToDate: Date | null = null;

        if (!isLast) {
          // Stagger dates in equal intervals based on yearsDiff
          const intervalDays = (yearsDiff * 365) / numRevisions;
          const nextDate = new Date(hireDate.getTime() + (j + 1) * intervalDays * 24 * 60 * 60 * 1000);
          
          if (nextDate < now) {
            currentToDate = nextDate;
          }
        }

        salaries.push({
          employeeId,
          baseAmount: currentAmount.toFixed(2),
          currency: country.currency,
          effectiveFrom: currentFromDate,
          effectiveTo: currentToDate,
          payFrequency: PayFrequency.ANNUAL,
        });

        if (!isLast && currentToDate) {
          // Next tier starts the next day
          currentFromDate = new Date(currentToDate.getTime() + 24 * 60 * 60 * 1000);
          // Give them a 5% to 15% raise
          currentAmount = currentAmount * faker.number.float({ min: 1.05, max: 1.15 });
        }
      }
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
