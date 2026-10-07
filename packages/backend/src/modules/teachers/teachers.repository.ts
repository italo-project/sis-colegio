import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type {
  CreateTeacherInput,
  ListTeachersQuery,
  UpdateTeacherInput,
} from './teachers.schemas';

type TeacherRow = {
  id: string;
  user_id: string;
  full_name: string;
  dni: string;
  email: string;
  phone: string | null;
  birth_date: Date | null;
  hire_date: Date | null;
  specialty: string | null;
  address: string | null;
  payment_type: string | null;
  hourly_rate: string | null;
  monthly_salary: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const toApi = (row: TeacherRow) => ({
  id: row.id,
  userId: row.user_id,
  fullName: row.full_name,
  dni: row.dni,
  email: row.email,
  phone: row.phone,
  birthDate: row.birth_date,
  hireDate: row.hire_date,
  specialty: row.specialty,
  address: row.address,
  paymentType: row.payment_type,
  hourlyRate: row.hourly_rate !== null ? Number(row.hourly_rate) : null,
  monthlySalary: row.monthly_salary !== null ? Number(row.monthly_salary) : null,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const teachersRepository = {
  async create(schemaName: string, userId: string, input: CreateTeacherInput) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<TeacherRow[]>(
      `INSERT INTO "${schemaName}".teachers
        (user_id, full_name, dni, email, phone, birth_date, hire_date, specialty, address,
         payment_type, hourly_rate, monthly_salary)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::date, $7::date, $8, $9, $10, $11, $12)
       RETURNING *`,
      userId,
      input.fullName,
      input.dni,
      input.email,
      input.phone ?? null,
      input.birthDate || null,
      input.hireDate || null,
      input.specialty ?? null,
      input.address ?? null,
      input.paymentType ?? null,
      input.hourlyRate ?? null,
      input.monthlySalary ?? null,
    );
    return toApi(rows[0]);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<TeacherRow[]>(
      `SELECT * FROM "${schemaName}".teachers WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async findByUserId(schemaName: string, userId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<TeacherRow[]>(
      `SELECT * FROM "${schemaName}".teachers WHERE user_id = $1::uuid LIMIT 1`,
      userId,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async findByDni(schemaName: string, dni: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<TeacherRow[]>(
      `SELECT * FROM "${schemaName}".teachers WHERE dni = $1 LIMIT 1`,
      dni,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async findByDnis(schemaName: string, dnis: string[]) {
    assertSafeSchemaName(schemaName);
    if (dnis.length === 0) return [];
    const rows = await prisma.$queryRawUnsafe<TeacherRow[]>(
      `SELECT * FROM "${schemaName}".teachers WHERE dni = ANY($1::varchar[])`,
      dnis,
    );
    return rows.map(toApi);
  },

  async list(schemaName: string, query: ListTeachersQuery) {
    assertSafeSchemaName(schemaName);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.active === 'true') conditions.push('is_active = true');
    if (query.active === 'false') conditions.push('is_active = false');

    if (query.q) {
      params.push(`%${query.q.toLowerCase()}%`);
      conditions.push(
        `(LOWER(full_name) LIKE $${params.length} OR dni LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(query.limit, query.offset);

    const rows = await prisma.$queryRawUnsafe<TeacherRow[]>(
      `SELECT * FROM "${schemaName}".teachers ${where}
       ORDER BY full_name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      ...params,
    );

    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM "${schemaName}".teachers ${where}`,
      ...params.slice(0, params.length - 2),
    );

    return {
      items: rows.map(toApi),
      total: Number(countRows[0].count),
    };
  },

  async update(schemaName: string, id: string, input: UpdateTeacherInput) {
    assertSafeSchemaName(schemaName);

    const map: Record<string, { column: string; cast?: string }> = {
      fullName: { column: 'full_name' },
      dni: { column: 'dni' },
      email: { column: 'email' },
      phone: { column: 'phone' },
      birthDate: { column: 'birth_date', cast: '::date' },
      hireDate: { column: 'hire_date', cast: '::date' },
      specialty: { column: 'specialty' },
      address: { column: 'address' },
      paymentType: { column: 'payment_type' },
      hourlyRate: { column: 'hourly_rate' },
      monthlySalary: { column: 'monthly_salary' },
    };

    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, config] of Object.entries(map)) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined) {
        params.push(value === '' ? null : value);
        fields.push(`${config.column} = $${params.length}${config.cast ?? ''}`);
      }
    }

    if (fields.length === 0) return this.findById(schemaName, id);

    fields.push('updated_at = now()');
    params.push(id);

    const rows = await prisma.$queryRawUnsafe<TeacherRow[]>(
      `UPDATE "${schemaName}".teachers SET ${fields.join(', ')} WHERE id = $${params.length}::uuid RETURNING *`,
      ...params,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async deactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<TeacherRow[]>(
      `UPDATE "${schemaName}".teachers SET is_active = false, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async reactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<TeacherRow[]>(
      `UPDATE "${schemaName}".teachers
       SET is_active = true, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async countRelatedData(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<Array<{ courses: bigint }>>(
      `SELECT
         (SELECT COUNT(*) FROM "${schemaName}".courses WHERE teacher_id = $1::uuid) AS courses
      `,
      id,
    );
    const r = rows[0];
    return {
      total: Number(r.courses),
      breakdown: { courses: Number(r.courses) },
    };
  },

  async hardDelete(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<TeacherRow[]>(
      `DELETE FROM "${schemaName}".teachers WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  /**
   * Calcula las horas totales semanales sumando weekly_hours de sus cursos activos.
   */
  async getWeeklyHoursTotal(schemaName: string, teacherId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
      `SELECT COALESCE(SUM(weekly_hours), 0)::bigint as total
       FROM "${schemaName}".courses
       WHERE teacher_id = $1::uuid AND is_active = true`,
      teacherId,
    );
    return Number(rows[0].total);
  },
};