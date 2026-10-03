import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type { CreateStudentInput, ListStudentsQuery, UpdateStudentInput } from './students.schemas';

type StudentRow = {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  dni: string;
  birth_date: Date | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const toApi = (row: StudentRow) => ({
  id: row.id,
  userId: row.user_id,
  hasAccount: row.user_id !== null,
  firstName: row.first_name,
  lastName: row.last_name,
  dni: row.dni,
  birthDate: row.birth_date,
  gender: row.gender,
  email: row.email,
  phone: row.phone,
  address: row.address,
  guardianName: row.guardian_name,
  guardianPhone: row.guardian_phone,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const studentsRepository = {
  async create(schemaName: string, input: CreateStudentInput) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `
      INSERT INTO "${schemaName}".students
        (first_name, last_name, dni, birth_date, gender, email, phone, address, guardian_name, guardian_phone)
      VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      input.firstName,
      input.lastName,
      input.dni,
      input.birthDate ?? null,
      input.gender ?? null,
      input.email ?? null,
      input.phone ?? null,
      input.address ?? null,
      input.guardianName ?? null,
      input.guardianPhone ?? null,
    );
    return toApi(rows[0]);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `SELECT * FROM "${schemaName}".students WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async findByUserId(schemaName: string, userId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `SELECT * FROM "${schemaName}".students WHERE user_id = $1::uuid LIMIT 1`,
      userId,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async findByDni(schemaName: string, dni: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `SELECT * FROM "${schemaName}".students WHERE dni = $1 LIMIT 1`,
      dni,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async list(schemaName: string, query: ListStudentsQuery) {
    assertSafeSchemaName(schemaName);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.active === 'true') conditions.push('is_active = true');
    if (query.active === 'false') conditions.push('is_active = false');

    if (query.q) {
      params.push(`%${query.q.toLowerCase()}%`);
      conditions.push(
        `(LOWER(first_name) LIKE $${params.length} OR LOWER(last_name) LIKE $${params.length} OR dni LIKE $${params.length})`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(query.limit, query.offset);

    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `
      SELECT * FROM "${schemaName}".students
      ${where}
      ORDER BY last_name ASC, first_name ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      ...params,
    );

    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM "${schemaName}".students ${where}`,
      ...params.slice(0, params.length - 2),
    );

    return {
      items: rows.map(toApi),
      total: Number(countRows[0].count),
    };
  },

  async update(schemaName: string, id: string, input: UpdateStudentInput) {
    assertSafeSchemaName(schemaName);

    const map: Record<string, { column: string; cast?: string }> = {
      firstName: { column: 'first_name' },
      lastName: { column: 'last_name' },
      dni: { column: 'dni' },
      birthDate: { column: 'birth_date', cast: '::date' },
      gender: { column: 'gender' },
      email: { column: 'email' },
      phone: { column: 'phone' },
      address: { column: 'address' },
      guardianName: { column: 'guardian_name' },
      guardianPhone: { column: 'guardian_phone' },
    };

    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, config] of Object.entries(map)) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined) {
        params.push(value);
        fields.push(`${config.column} = $${params.length}${config.cast ?? ''}`);
      }
    }

    if (fields.length === 0) return this.findById(schemaName, id);

    fields.push('updated_at = now()');
    params.push(id);

    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `
      UPDATE "${schemaName}".students
      SET ${fields.join(', ')}
      WHERE id = $${params.length}::uuid
      RETURNING *
      `,
      ...params,
    );

    return rows[0] ? toApi(rows[0]) : null;
  },

  async linkUser(schemaName: string, studentId: string, userId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `UPDATE "${schemaName}".students
       SET user_id = $1::uuid, updated_at = now()
       WHERE id = $2::uuid
       RETURNING *`,
      userId,
      studentId,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async deactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `
      UPDATE "${schemaName}".students
      SET is_active = false, updated_at = now()
      WHERE id = $1::uuid
      RETURNING *
      `,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },
    async reactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `UPDATE "${schemaName}".students
       SET is_active = true, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  /**
   * Cuenta cuántos datos relacionados tiene un estudiante.
   * Se usa para decidir si se puede eliminar definitivamente.
   */
  async countRelatedData(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        enrollments: bigint;
        invoices: bigint;
        payments: bigint;
        attendance: bigint;
        grade_entries: bigint;
        parents: bigint;
      }>
    >(
      `SELECT
         (SELECT COUNT(*) FROM "${schemaName}".enrollments WHERE student_id = $1::uuid) AS enrollments,
         (SELECT COUNT(*) FROM "${schemaName}".invoices WHERE student_id = $1::uuid) AS invoices,
         (SELECT COUNT(*) FROM "${schemaName}".payments p
            JOIN "${schemaName}".invoices i ON i.id = p.invoice_id
            WHERE i.student_id = $1::uuid) AS payments,
         (SELECT COUNT(*) FROM "${schemaName}".attendance_records WHERE student_id = $1::uuid) AS attendance,
         (SELECT COUNT(*) FROM "${schemaName}".grade_entries WHERE student_id = $1::uuid) AS grade_entries,
         (SELECT COUNT(*) FROM "${schemaName}".student_parents WHERE student_id = $1::uuid) AS parents
      `,
      id,
    );

    const r = rows[0];
    const total =
      Number(r.enrollments) +
      Number(r.invoices) +
      Number(r.payments) +
      Number(r.attendance) +
      Number(r.grade_entries) +
      Number(r.parents);

    return {
      total,
      breakdown: {
        enrollments: Number(r.enrollments),
        invoices: Number(r.invoices),
        payments: Number(r.payments),
        attendance: Number(r.attendance),
        gradeEntries: Number(r.grade_entries),
        parents: Number(r.parents),
      },
    };
  },

  /**
   * Elimina físicamente al estudiante.
   * IMPORTANTE: el llamador debe verificar que no tenga datos asociados.
   */
  async hardDelete(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `DELETE FROM "${schemaName}".students WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },
};