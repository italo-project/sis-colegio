import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';

type GradeLevelRow = {
  id: string;
  code: string;
  name: string;
  level: string;
  order_index: number;
  is_active: boolean;
  created_at: Date;
};

const toApi = (row: GradeLevelRow) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  level: row.level,
  orderIndex: row.order_index,
  isActive: row.is_active,
  createdAt: row.created_at,
});

export const gradeLevelsRepository = {
  async list(schemaName: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<GradeLevelRow[]>(
      `SELECT * FROM "${schemaName}".grade_levels WHERE is_active = true ORDER BY order_index ASC`,
    );
    return rows.map(toApi);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<GradeLevelRow[]>(
      `SELECT * FROM "${schemaName}".grade_levels WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },
};