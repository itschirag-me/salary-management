import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1783255725594 implements MigrationInterface {
  name = 'InitSchema1783255725594';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."salaries_pay_frequency_enum" AS ENUM('annual', 'monthly')`,
    );
    await queryRunner.query(
      `CREATE TABLE "salaries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_id" uuid NOT NULL, "base_amount" numeric(12,2) NOT NULL, "currency" character(3) NOT NULL, "effective_from" date NOT NULL, "effective_to" date, "pay_frequency" "public"."salaries_pay_frequency_enum" NOT NULL DEFAULT 'annual', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_20ca60aa8d4201c7bcb430fdb36" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_salary_employee_effective" ON "salaries"  ("employee_id", "effective_from") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."employees_employment_status_enum" AS ENUM('active', 'terminated')`,
    );
    await queryRunner.query(
      `CREATE TABLE "employees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employee_code" character varying(20) NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "email" character varying(255) NOT NULL, "department" character varying(100) NOT NULL, "job_title" character varying(150) NOT NULL, "country" character(2) NOT NULL, "employment_status" "public"."employees_employment_status_enum" NOT NULL DEFAULT 'active', "hire_date" date NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_56162b5f24af743a154680684f5" UNIQUE ("employee_code"), CONSTRAINT "UQ_765bc1ac8967533a04c74a9f6af" UNIQUE ("email"), CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a927eecda70146bdf59674d939" ON "employees"  ("department") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a3ef94443aea823b546594c7d7" ON "employees"  ("country") `,
    );
    await queryRunner.query(
      `ALTER TABLE "salaries" ADD CONSTRAINT "FK_9ac79195d31e77bb6df432eab13" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "salaries" DROP CONSTRAINT "FK_9ac79195d31e77bb6df432eab13"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a3ef94443aea823b546594c7d7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a927eecda70146bdf59674d939"`,
    );
    await queryRunner.query(`DROP TABLE "employees"`);
    await queryRunner.query(
      `DROP TYPE "public"."employees_employment_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_salary_employee_effective"`,
    );
    await queryRunner.query(`DROP TABLE "salaries"`);
    await queryRunner.query(`DROP TYPE "public"."salaries_pay_frequency_enum"`);
  }
}
