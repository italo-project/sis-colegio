import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type {
  CreateStudentParentInput,
  ListStudentParentsQuery,
  UpdateStudentParentInput,
} from './student-parents.schemas';

type StudentParentRow = {
  id: string;
  student_id: string;
  parent_id: string;
  relationship: string;
  is_primary: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

type StudentParentDetailedRow = StudentParentRow & {
  student_full_name: string;
  student_dni: string;
  parent_full_name: string;
  parent_dni: string;
  parent_email: string;
  parent_phone: string | null;
};

const toApi = (row: StudentParentRow) => ({
  id: row.id,
  studentId: row.student_id,
  parentId: row.parent_id,
  relationship: row.relationship,
  isPrimary: row.is_primary,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toApiDetailed = (row: StudentParentDetailedRow) => ({
  id: row.id,
  studentId: row.student_id,
  parentId: row.parent_id,
  relationship: row.relationship,
  isPrimary: row.is_primary,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  student: {
    id: row.student_id,
    fullName: row.student_full_name,
    dni: row.student_dni,
  },
  parent: {
    id: row.parent_id,
    fullName: row.parent_full_name,
    dni: row.parent_dni,
    email: row.parent_email,
    phone: row.parent_phone,
  },
});

const buildDetailedSelect = (schemaName: string) => `
  SELECT
    sp.*,
    s.full_name AS student_full_name,
    s.dni AS student_dni,
    p.full_name AS parent_full_name,
    p.dni AS parent_dni,
    p.email AS parent_email,
    p.phone AS parent_phone
  FROM "${schemaName}".student_parents sp
  JOIN "${schemaName}".students s ON s.id = sp.student_id
  JOIN "${schemaName}".parents p ON p.id = sp.parent_id
`;

export const studentParentsRepository = {
  async create(schemaName: string, input: CreateStudentParentInput) {
    assertSafeSchemaName(schemaName);

    if (input.isPrimary) {
      await prisma.$executeRawUnsafe(
        `UPDATE "${schemaName}".student_parents SET is_primary = false, updated_at = now()
         WHERE student_id = $1::uuid AND is_primary = true`,
        input.studentId,
      );
    }

    const rows = await prisma.$queryRawUnsafe<StudentParentRow[]>(
      `INSERT INTO "${schemaName}".student_parents
        (student_id, parent_id, relationship, is_primary, notes)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5)
       RETURNING *`,
      input.studentId,
      input.parentId,
      input.relationship,
      input.isPrimary,
      input.notes ?? null,
    );
    return toApi(rows[0]);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentParentRow[]>(
      `SELECT * FROM "${schemaName}".student_parents WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async findDetailedById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentParentDetailedRow[]>(
      `${buildDetailedSelect(schemaName)} WHERE sp.id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApiDetailed(rows[0]) : null;
  },

  async findByStudentAndParent(schemaName: string, studentId: string, parentId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentParentRow[]>(
      `SELECT * FROM "${schemaName}".student_parents
       WHERE student_id = $1::uuid AND parent_id = $2::uuid LIMIT 1`,
      studentId,
      parentId,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async list(schemaName: string, query: ListStudentParentsQuery) {
    assertSafeSchemaName(schemaName);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.studentId) {
      params.push(query.studentId);
      conditions.push(`sp.student_id = $${params.length}::uuid`);
    }
    if (query.parentId) {
      params.push(query.parentId);
      conditions.push(`sp.parent_id = $${params.length}::uuid`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe<StudentParentDetailedRow[]>(
      `${buildDetailedSelect(schemaName)} ${where}
       ORDER BY sp.is_primary DESC, p.full_name ASC, s.full_name ASC`,
      ...params,
    );
    return rows.map(toApiDetailed);
  },

  async listByStudent(schemaName: string, studentId: string) {
    return this.list(schemaName, { studentId });
  },

  async listByParent(schemaName: string, parentId: string) {
    return this.list(schemaName, { parentId });
  },

  async update(schemaName: string, id: string, input: UpdateStudentParentInput) {
    assertSafeSchemaName(schemaName);

    const current = await this.findById(schemaName, id);
    if (!current) return null;

    if (input.isPrimary === true) {
      await prisma.$executeRawUnsafe(
        `UPDATE "${schemaName}".student_parents SET is_primary = false, updated_at = now()
         WHERE student_id = $1::uuid AND is_primary = true AND id <> $2::uuid`,
        current.studentId,
        id,
      );
    }

    const map: Record<string, string> = {
      relationship: 'relationship',
      isPrimary: 'is_primary',
      notes: 'notes',
    };

    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, column] of Object.entries(map)) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined) {
        params.push(value);
        fields.push(`${column} = $${params.length}`);
      }
    }

    if (fields.length === 0) return this.findDetailedById(schemaName, id);

    fields.push('updated_at = now()');
    params.push(id);

    await prisma.$executeRawUnsafe(
      `UPDATE "${schemaName}".student_parents SET ${fields.join(', ')} WHERE id = $${params.length}::uuid`,
      ...params,
    );

    return this.findDetailedById(schemaName, id);
  },

  async delete(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentParentRow[]>(
      `DELETE FROM "${schemaName}".student_parents WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },
};