import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type { CreateParentInput, ListParentsQuery, UpdateParentInput } from './parents.schemas';

type ParentRow = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  dni: string;
  email: string;
  phone: string | null;
  occupation: string | null;
  address: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const toApi = (row: ParentRow) => ({
  id: row.id,
  userId: row.user_id,
  firstName: row.first_name,
  lastName: row.last_name,
  dni: row.dni,
  email: row.email,
  phone: row.phone,
  occupation: row.occupation,
  address: row.address,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const parentsRepository = {
  async create(schemaName: string, userId: string, input: CreateParentInput) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<ParentRow[]>(
      `INSERT INTO "${schemaName}".parents
        (user_id, first_name, last_name, dni, email, phone, occupation, address)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      userId,
      input.firstName,
      input.lastName,
      input.dni,
      input.email,
      input.phone ?? null,
      input.occupation ?? null,
      input.address ?? null,
    );
    return toApi(rows[0]);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<ParentRow[]>(
      `SELECT * FROM "${schemaName}".parents WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async findByUserId(schemaName: string, userId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<ParentRow[]>(
      `SELECT * FROM "${schemaName}".parents WHERE user_id = $1::uuid LIMIT 1`,
      userId,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async findByDni(schemaName: string, dni: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<ParentRow[]>(
      `SELECT * FROM "${schemaName}".parents WHERE dni = $1 LIMIT 1`,
      dni,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async list(schemaName: string, query: ListParentsQuery) {
    assertSafeSchemaName(schemaName);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.active === 'true') conditions.push('is_active = true');
    if (query.active === 'false') conditions.push('is_active = false');

    if (query.q) {
      params.push(`%${query.q.toLowerCase()}%`);
      conditions.push(
        `(LOWER(first_name) LIKE $${params.length} OR LOWER(last_name) LIKE $${params.length} OR dni LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(query.limit, query.offset);

    const rows = await prisma.$queryRawUnsafe<ParentRow[]>(
      `SELECT * FROM "${schemaName}".parents ${where}
       ORDER BY last_name ASC, first_name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      ...params,
    );

    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM "${schemaName}".parents ${where}`,
      ...params.slice(0, params.length - 2),
    );

    return {
      items: rows.map(toApi),
      total: Number(countRows[0].count),
    };
  },

  async update(schemaName: string, id: string, input: UpdateParentInput) {
    assertSafeSchemaName(schemaName);

    const map: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      dni: 'dni',
      email: 'email',
      phone: 'phone',
      occupation: 'occupation',
      address: 'address',
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

    if (fields.length === 0) return this.findById(schemaName, id);

    fields.push('updated_at = now()');
    params.push(id);

    const rows = await prisma.$queryRawUnsafe<ParentRow[]>(
      `UPDATE "${schemaName}".parents SET ${fields.join(', ')} WHERE id = $${params.length}::uuid RETURNING *`,
      ...params,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async deactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<ParentRow[]>(
      `UPDATE "${schemaName}".parents SET is_active = false, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },
    async reactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<ParentRow[]>(
      `UPDATE "${schemaName}".parents
       SET is_active = true, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  /**
   * Cuenta cuántos datos relacionados tiene un padre.
   * Se usa para decidir si se puede eliminar definitivamente.
   */
  async countRelatedData(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);

    const rows = await prisma.$queryRawUnsafe<
      Array<{ students: bigint }>
    >(
      `SELECT
         (SELECT COUNT(*) FROM "${schemaName}".student_parents WHERE parent_id = $1::uuid) AS students
      `,
      id,
    );

    const r = rows[0];
    return {
      total: Number(r.students),
      breakdown: {
        students: Number(r.students),
      },
    };
  },

  async hardDelete(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<ParentRow[]>(
      `DELETE FROM "${schemaName}".parents WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },
};