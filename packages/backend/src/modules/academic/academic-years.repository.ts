import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type { CreateAcademicYearInput, UpdateAcademicYearInput } from './academic.schemas';

type AcademicYearRow = {
  id: string;
  year: number;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const toApi = (row: AcademicYearRow) => ({
  id: row.id,
  year: row.year,
  startDate: row.start_date,
  endDate: row.end_date,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const academicYearsRepository = {
  async list(schemaName: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<AcademicYearRow[]>(
      `SELECT * FROM "${schemaName}".academic_years ORDER BY year DESC`,
    );
    return rows.map(toApi);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<AcademicYearRow[]>(
      `SELECT * FROM "${schemaName}".academic_years WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async findCurrent(schemaName: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<AcademicYearRow[]>(
      `SELECT * FROM "${schemaName}".academic_years WHERE is_active = true ORDER BY year DESC LIMIT 1`,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async create(schemaName: string, input: CreateAcademicYearInput) {
    assertSafeSchemaName(schemaName);

    // Si el nuevo año se marca activo, desactivar los demás
    if (input.isActive) {
      await prisma.$executeRawUnsafe(
        `UPDATE "${schemaName}".academic_years SET is_active = false WHERE is_active = true`,
      );
    }

    const rows = await prisma.$queryRawUnsafe<AcademicYearRow[]>(
      `INSERT INTO "${schemaName}".academic_years (year, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      input.year,
      input.startDate,
      input.endDate,
      input.isActive ?? false,
    );
    return toApi(rows[0]);
  },

  async update(schemaName: string, id: string, input: UpdateAcademicYearInput) {
    assertSafeSchemaName(schemaName);

    if (input.isActive === true) {
      await prisma.$executeRawUnsafe(
        `UPDATE "${schemaName}".academic_years SET is_active = false WHERE is_active = true AND id <> $1::uuid`,
        id,
      );
    }

    const map: Record<string, string> = {
      year: 'year',
      startDate: 'start_date',
      endDate: 'end_date',
      isActive: 'is_active',
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

    const rows = await prisma.$queryRawUnsafe<AcademicYearRow[]>(
      `UPDATE "${schemaName}".academic_years SET ${fields.join(', ')} WHERE id = $${params.length}::uuid RETURNING *`,
      ...params,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },
};