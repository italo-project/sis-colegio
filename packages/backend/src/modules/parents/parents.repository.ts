import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type { CreateParentInput, ListParentsQuery, UpdateParentInput } from './parents.schemas';

type ParentRow = {
  id: string;
  user_id: string;
  full_name: string;
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
  fullName: row.full_name,
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
        (user_id, full_name, dni, email, phone, occupation, address)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      userId,
      input.fullName,
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

  async findByDnis(schemaName: string, dnis: string[]) {
    assertSafeSchemaName(schemaName);
    if (dnis.length === 0) return [];
    const rows = await prisma.$queryRawUnsafe<ParentRow[]>(
      `SELECT * FROM "${schemaName}".parents WHERE dni = ANY($1::varchar[])`,
      dnis,
    );
    return rows.map(toApi);
  },

  async list(schemaName: string, query: ListParentsQuery) {
    assertSafeSchemaName(schemaName);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.active === 'true') conditions.push('p.is_active = true');
    if (query.active === 'false') conditions.push('p.is_active = false');

    if (query.q) {
      params.push(`%${query.q.toLowerCase()}%`);
      conditions.push(
        `(LOWER(p.full_name) LIKE $${params.length} OR p.dni LIKE $${params.length} OR LOWER(p.email) LIKE $${params.length})`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(query.limit, query.offset);

    const rows = await prisma.$queryRawUnsafe<
      Array<ParentRow & { children_count: bigint }>
    >(
      `SELECT
         p.*,
         (SELECT COUNT(*) FROM "${schemaName}".student_parents sp
          WHERE sp.parent_id = p.id)::bigint AS children_count
       FROM "${schemaName}".parents p
       ${where}
       ORDER BY p.full_name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      ...params,
    );

    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM "${schemaName}".parents p ${where}`,
      ...params.slice(0, params.length - 2),
    );

    return {
      items: rows.map((r) => ({
        ...toApi(r),
        childrenCount: Number(r.children_count),
      })),
      total: Number(countRows[0].count),
    };
  },

  async update(schemaName: string, id: string, input: UpdateParentInput) {
    assertSafeSchemaName(schemaName);

    const map: Record<string, string> = {
      fullName: 'full_name',
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

  async countRelatedData(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<Array<{ students: bigint }>>(
      `SELECT
         (SELECT COUNT(*) FROM "${schemaName}".student_parents WHERE parent_id = $1::uuid) AS students
      `,
      id,
    );
    const r = rows[0];
    return {
      total: Number(r.students),
      breakdown: { students: Number(r.students) },
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