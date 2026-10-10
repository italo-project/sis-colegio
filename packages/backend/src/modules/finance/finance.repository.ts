import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type {
  BulkInvoicesInput,
  CreateFeeConceptInput,
  CreateInvoiceInput,
  ListInvoicesQuery,
  UpdateFeeConceptInput,
  UpdateInvoiceInput,
  UpsertFeeAmountInput,
} from './finance.schemas';

// ── Conceptos ──────────────────────────────────────────────
type FeeConceptRow = {
  id: string;
  name: string;
  description: string | null;
  code: string;
  default_amount: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const toFeeConceptApi = (row: FeeConceptRow) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  code: row.code,
  defaultAmount: Number(row.default_amount),
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const feeConceptsRepository = {
  async create(schemaName: string, input: CreateFeeConceptInput) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<FeeConceptRow[]>(
      `INSERT INTO "${schemaName}".fee_concepts (name, description, code, default_amount)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      input.name,
      input.description ?? null,
      input.code,
      input.defaultAmount,
    );
    return toFeeConceptApi(rows[0]);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<FeeConceptRow[]>(
      `SELECT * FROM "${schemaName}".fee_concepts WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toFeeConceptApi(rows[0]) : null;
  },

  async findByCode(schemaName: string, code: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<FeeConceptRow[]>(
      `SELECT * FROM "${schemaName}".fee_concepts WHERE code = $1 LIMIT 1`,
      code,
    );
    return rows[0] ? toFeeConceptApi(rows[0]) : null;
  },

  async list(schemaName: string, active?: string) {
    assertSafeSchemaName(schemaName);
    const where =
      active === 'true' ? 'WHERE is_active = true' : active === 'false' ? 'WHERE is_active = false' : '';
    const rows = await prisma.$queryRawUnsafe<FeeConceptRow[]>(
      `SELECT * FROM "${schemaName}".fee_concepts ${where} ORDER BY name ASC`,
    );
    return rows.map(toFeeConceptApi);
  },

  async update(schemaName: string, id: string, input: UpdateFeeConceptInput) {
    assertSafeSchemaName(schemaName);

    const map: Record<string, string> = {
      name: 'name',
      description: 'description',
      defaultAmount: 'default_amount',
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

    const rows = await prisma.$queryRawUnsafe<FeeConceptRow[]>(
      `UPDATE "${schemaName}".fee_concepts SET ${fields.join(', ')}
       WHERE id = $${params.length}::uuid RETURNING *`,
      ...params,
    );
    return rows[0] ? toFeeConceptApi(rows[0]) : null;
  },

  async deactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<FeeConceptRow[]>(
      `UPDATE "${schemaName}".fee_concepts SET is_active = false, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toFeeConceptApi(rows[0]) : null;
  },
};

// ── Montos por grado ────────────────────────────────────────
export const feeAmountsRepository = {
  async upsert(schemaName: string, feeConceptId: string, input: UpsertFeeAmountInput) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        fee_concept_id: string;
        grade_level_id: string;
        amount: string;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      `INSERT INTO "${schemaName}".fee_amounts (fee_concept_id, grade_level_id, amount)
       VALUES ($1::uuid, $2::uuid, $3)
       ON CONFLICT (fee_concept_id, grade_level_id) DO UPDATE SET
         amount = EXCLUDED.amount,
         updated_at = now()
       RETURNING *`,
      feeConceptId,
      input.gradeLevelId,
      input.amount,
    );
    const r = rows[0];
    return {
      id: r.id,
      feeConceptId: r.fee_concept_id,
      gradeLevelId: r.grade_level_id,
      amount: Number(r.amount),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  },

  async listByConcept(schemaName: string, feeConceptId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        fee_concept_id: string;
        grade_level_id: string;
        amount: string;
        grade_code: string;
        grade_name: string;
      }>
    >(
      `SELECT fa.*, gl.code AS grade_code, gl.name AS grade_name
       FROM "${schemaName}".fee_amounts fa
       JOIN "${schemaName}".grade_levels gl ON gl.id = fa.grade_level_id
       WHERE fa.fee_concept_id = $1::uuid
       ORDER BY gl.order_index ASC`,
      feeConceptId,
    );
    return rows.map((r) => ({
      id: r.id,
      feeConceptId: r.fee_concept_id,
      gradeLevelId: r.grade_level_id,
      amount: Number(r.amount),
      gradeCode: r.grade_code,
      gradeName: r.grade_name,
    }));
  },

  async findAmountForGrade(schemaName: string, feeConceptId: string, gradeLevelId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<Array<{ amount: string }>>(
      `SELECT amount FROM "${schemaName}".fee_amounts
       WHERE fee_concept_id = $1::uuid AND grade_level_id = $2::uuid LIMIT 1`,
      feeConceptId,
      gradeLevelId,
    );
    return rows[0] ? Number(rows[0].amount) : null;
  },
};

// ── Facturas ────────────────────────────────────────────────
type InvoiceRow = {
  id: string;
  student_id: string;
  fee_concept_id: string;
  amount: string;
  period: string | null;
  due_date: Date;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

const toInvoiceApi = (row: InvoiceRow) => ({
  id: row.id,
  studentId: row.student_id,
  feeConceptId: row.fee_concept_id,
  amount: Number(row.amount),
  period: row.period,
  dueDate: row.due_date,
  status: row.status,
  notes: row.notes,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const invoicesRepository = {
  async create(
    schemaName: string,
    studentId: string,
    feeConceptId: string,
    amount: number,
    period: string | null,
    dueDate: string,
    notes: string | undefined,
    createdBy: string,
  ) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<InvoiceRow[]>(
      `INSERT INTO "${schemaName}".invoices
        (student_id, fee_concept_id, amount, period, due_date, notes, created_by)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::date, $6, $7::uuid)
       RETURNING *`,
      studentId,
      feeConceptId,
      amount,
      period ?? null,
      dueDate,
      notes ?? null,
      createdBy,
    );
    return toInvoiceApi(rows[0]);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<InvoiceRow[]>(
      `SELECT * FROM "${schemaName}".invoices WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toInvoiceApi(rows[0]) : null;
  },

  async findDetailedById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<
      Array<
        InvoiceRow & {
          student_full_name: string;
          student_dni: string;
          concept_name: string;
          concept_code: string;
        }
      >
    >(
      `SELECT
         i.*,
         s.full_name AS student_full_name,
         s.dni AS student_dni,
         fc.name AS concept_name,
         fc.code AS concept_code
       FROM "${schemaName}".invoices i
       JOIN "${schemaName}".students s ON s.id = i.student_id
       JOIN "${schemaName}".fee_concepts fc ON fc.id = i.fee_concept_id
       WHERE i.id = $1::uuid LIMIT 1`,
      id,
    );
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      ...toInvoiceApi(r),
      student: {
        id: r.student_id,
        fullName: r.student_full_name,
        dni: r.student_dni,
      },
      feeConcept: {
        id: r.fee_concept_id,
        name: r.concept_name,
        code: r.concept_code,
      },
    };
  },

  async findByUniqueKey(
    schemaName: string,
    studentId: string,
    feeConceptId: string,
    period: string | null,
  ) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<InvoiceRow[]>(
      `SELECT * FROM "${schemaName}".invoices
       WHERE student_id = $1::uuid AND fee_concept_id = $2::uuid
         AND (period = $3 OR ($3 IS NULL AND period IS NULL))
       LIMIT 1`,
      studentId,
      feeConceptId,
      period,
    );
    return rows[0] ? toInvoiceApi(rows[0]) : null;
  },

  async list(schemaName: string, query: ListInvoicesQuery) {
    assertSafeSchemaName(schemaName);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.studentId) {
      params.push(query.studentId);
      conditions.push(`i.student_id = $${params.length}::uuid`);
    }
    if (query.feeConceptId) {
      params.push(query.feeConceptId);
      conditions.push(`i.fee_concept_id = $${params.length}::uuid`);
    }
    if (query.status) {
      params.push(query.status);
      conditions.push(`i.status = $${params.length}`);
    }
    if (query.fromDueDate) {
      params.push(query.fromDueDate);
      conditions.push(`i.due_date >= $${params.length}::date`);
    }
    if (query.toDueDate) {
      params.push(query.toDueDate);
      conditions.push(`i.due_date <= $${params.length}::date`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(query.limit, query.offset);

    const rows = await prisma.$queryRawUnsafe<
      Array<
        InvoiceRow & {
          student_full_name: string;
          student_dni: string;
          concept_name: string;
          concept_code: string;
        }
      >
    >(
      `SELECT
         i.*,
         s.full_name AS student_full_name,
         s.dni AS student_dni,
         fc.name AS concept_name,
         fc.code AS concept_code
       FROM "${schemaName}".invoices i
       JOIN "${schemaName}".students s ON s.id = i.student_id
       JOIN "${schemaName}".fee_concepts fc ON fc.id = i.fee_concept_id
       ${where}
       ORDER BY i.due_date DESC, s.full_name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      ...params,
    );

    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM "${schemaName}".invoices i ${where}`,
      ...params.slice(0, params.length - 2),
    );

    return {
      items: rows.map((r) => ({
        ...toInvoiceApi(r),
        student: {
          id: r.student_id,
          fullName: r.student_full_name,
          dni: r.student_dni,
        },
        feeConcept: {
          id: r.fee_concept_id,
          name: r.concept_name,
          code: r.concept_code,
        },
      })),
      total: Number(countRows[0].count),
    };
  },

  async listByStudent(schemaName: string, studentId: string) {
    return this.list(schemaName, { studentId, limit: 200, offset: 0 });
  },

  async update(schemaName: string, id: string, input: UpdateInvoiceInput) {
    assertSafeSchemaName(schemaName);

    const map: Record<string, { column: string; cast?: string }> = {
      dueDate: { column: 'due_date', cast: '::date' },
      status: { column: 'status' },
      notes: { column: 'notes' },
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

    const rows = await prisma.$queryRawUnsafe<InvoiceRow[]>(
      `UPDATE "${schemaName}".invoices SET ${fields.join(', ')}
       WHERE id = $${params.length}::uuid RETURNING *`,
      ...params,
    );
    return rows[0] ? toInvoiceApi(rows[0]) : null;
  },

  async markPaid(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<InvoiceRow[]>(
      `UPDATE "${schemaName}".invoices SET status = 'paid', updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toInvoiceApi(rows[0]) : null;
  },
};

// ── Pagos ───────────────────────────────────────────────────
type PaymentRow = {
  id: string;
  invoice_id: string;
  amount: string;
  method: string;
  gateway: string | null;
  gateway_tx_id: string | null;
  status: string;
  payer_user_id: string | null;
  notes: string | null;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const toPaymentApi = (row: PaymentRow) => ({
  id: row.id,
  invoiceId: row.invoice_id,
  amount: Number(row.amount),
  method: row.method,
  gateway: row.gateway,
  gatewayTxId: row.gateway_tx_id,
  status: row.status,
  payerUserId: row.payer_user_id,
  notes: row.notes,
  paidAt: row.paid_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const paymentsRepository = {
  async create(
    schemaName: string,
    invoiceId: string,
    amount: number,
    method: string,
    payerUserId: string,
    notes: string | undefined,
  ) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<PaymentRow[]>(
      `INSERT INTO "${schemaName}".payments
        (invoice_id, amount, method, status, payer_user_id, notes, paid_at)
       VALUES ($1::uuid, $2, $3, 'approved', $4::uuid, $5, now())
       RETURNING *`,
      invoiceId,
      amount,
      method,
      payerUserId,
      notes ?? null,
    );
    return toPaymentApi(rows[0]);
  },

  async listByInvoice(schemaName: string, invoiceId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<PaymentRow[]>(
      `SELECT * FROM "${schemaName}".payments WHERE invoice_id = $1::uuid ORDER BY created_at DESC`,
      invoiceId,
    );
    return rows.map(toPaymentApi);
  },

  async createPending(
    schemaName: string,
    invoiceId: string,
    amount: number,
    method: string,
    gateway: string,
    gatewayTxId: string,
    payerUserId: string,
  ) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<PaymentRow[]>(
      `INSERT INTO "${schemaName}".payments
        (invoice_id, amount, method, gateway, gateway_tx_id, status, payer_user_id)
       VALUES ($1::uuid, $2, $3, $4, $5, 'pending', $6::uuid)
       RETURNING *`,
      invoiceId,
      amount,
      method,
      gateway,
      gatewayTxId,
      payerUserId,
    );
    return toPaymentApi(rows[0]);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<PaymentRow[]>(
      `SELECT * FROM "${schemaName}".payments WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toPaymentApi(rows[0]) : null;
  },

  async updateStatus(
    schemaName: string,
    id: string,
    status: string,
    gatewayTxId?: string,
  ) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<PaymentRow[]>(
      `UPDATE "${schemaName}".payments
       SET status = $1,
           gateway_tx_id = COALESCE($2, gateway_tx_id),
           paid_at = CASE WHEN $1 = 'approved' THEN now() ELSE paid_at END,
           updated_at = now()
       WHERE id = $3::uuid
       RETURNING *`,
      status,
      gatewayTxId ?? null,
      id,
    );
    return rows[0] ? toPaymentApi(rows[0]) : null;
  },
};

// ── Reportes ────────────────────────────────────────────────
export const reportsRepository = {
  async summaryExtended(schemaName: string) {
    assertSafeSchemaName(schemaName);

    const rows = await prisma.$queryRawUnsafe<
      Array<{ status: string; count: bigint; total: string }>
    >(
      `SELECT status, COUNT(*)::bigint as count, COALESCE(SUM(amount), 0)::text as total
       FROM "${schemaName}".invoices
       GROUP BY status`,
    );

    const byStatus: Record<string, { count: number; total: number }> = {
      pending: { count: 0, total: 0 },
      paid: { count: 0, total: 0 },
      overdue: { count: 0, total: 0 },
      cancelled: { count: 0, total: 0 },
    };

    for (const r of rows) {
      if (r.status in byStatus) {
        byStatus[r.status] = { count: Number(r.count), total: Number(r.total) };
      }
    }

    const totalBilled = byStatus.pending.total + byStatus.paid.total + byStatus.overdue.total;
    const totalCollected = byStatus.paid.total;
    const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

    return {
      byStatus,
      totalBilled: round(totalBilled, 2),
      totalCollected: round(totalCollected, 2),
      totalPending: round(byStatus.pending.total + byStatus.overdue.total, 2),
      collectionRate: round(collectionRate, 2),
    };
  },

  async byPeriod(schemaName: string, from?: string, to?: string) {
    assertSafeSchemaName(schemaName);
    const params: unknown[] = [];
    const conditions: string[] = [`i.status = 'paid'`];

    if (from) {
      params.push(from);
      conditions.push(`p.paid_at >= $${params.length}::timestamptz`);
    }
    if (to) {
      params.push(to);
      conditions.push(`p.paid_at <= $${params.length}::timestamptz`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const rows = await prisma.$queryRawUnsafe<
      Array<{ period: string; count: bigint; total: string }>
    >(
      `SELECT
         TO_CHAR(p.paid_at, 'YYYY-MM') AS period,
         COUNT(DISTINCT i.id)::bigint AS count,
         COALESCE(SUM(i.amount), 0)::text AS total
       FROM "${schemaName}".invoices i
       JOIN "${schemaName}".payments p ON p.invoice_id = i.id AND p.status = 'approved'
       ${where}
       GROUP BY TO_CHAR(p.paid_at, 'YYYY-MM')
       ORDER BY period DESC`,
      ...params,
    );

    return rows.map((r) => ({
      period: r.period,
      count: Number(r.count),
      total: Number(r.total),
    }));
  },

  async byConcept(schemaName: string, from?: string, to?: string) {
    assertSafeSchemaName(schemaName);
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (from) {
      params.push(from);
      conditions.push(`i.due_date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      conditions.push(`i.due_date <= $${params.length}::date`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        concept_id: string;
        concept_code: string;
        concept_name: string;
        status: string;
        count: bigint;
        total: string;
      }>
    >(
      `SELECT
         fc.id AS concept_id,
         fc.code AS concept_code,
         fc.name AS concept_name,
         i.status,
         COUNT(*)::bigint AS count,
         COALESCE(SUM(i.amount), 0)::text AS total
       FROM "${schemaName}".invoices i
       JOIN "${schemaName}".fee_concepts fc ON fc.id = i.fee_concept_id
       ${where}
       GROUP BY fc.id, fc.code, fc.name, i.status
       ORDER BY fc.name ASC, i.status ASC`,
      ...params,
    );

    const byConcept = new Map<
      string,
      {
        conceptId: string;
        conceptCode: string;
        conceptName: string;
        byStatus: Record<string, { count: number; total: number }>;
        totalBilled: number;
        totalPaid: number;
      }
    >();

    for (const r of rows) {
      if (!byConcept.has(r.concept_id)) {
        byConcept.set(r.concept_id, {
          conceptId: r.concept_id,
          conceptCode: r.concept_code,
          conceptName: r.concept_name,
          byStatus: {
            pending: { count: 0, total: 0 },
            paid: { count: 0, total: 0 },
            overdue: { count: 0, total: 0 },
            cancelled: { count: 0, total: 0 },
          },
          totalBilled: 0,
          totalPaid: 0,
        });
      }
      const entry = byConcept.get(r.concept_id)!;
      entry.byStatus[r.status] = { count: Number(r.count), total: Number(r.total) };
      if (r.status !== 'cancelled') {
        entry.totalBilled += Number(r.total);
      }
      if (r.status === 'paid') {
        entry.totalPaid += Number(r.total);
      }
    }

    return Array.from(byConcept.values()).map((c) => ({
      ...c,
      totalBilled: round(c.totalBilled, 2),
      totalPaid: round(c.totalPaid, 2),
      totalPending: round(c.byStatus.pending.total + c.byStatus.overdue.total, 2),
    }));
  },

  async byGrade(schemaName: string, from?: string, to?: string) {
    assertSafeSchemaName(schemaName);
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (from) {
      params.push(from);
      conditions.push(`i.due_date >= $${params.length}::date`);
    }
    if (to) {
      params.push(to);
      conditions.push(`i.due_date <= $${params.length}::date`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        grade_level_id: string;
        grade_code: string;
        grade_name: string;
        status: string;
        count: bigint;
        total: string;
      }>
    >(
      `SELECT
         gl.id AS grade_level_id,
         gl.code AS grade_code,
         gl.name AS grade_name,
         i.status,
         COUNT(DISTINCT i.id)::bigint AS count,
         COALESCE(SUM(i.amount), 0)::text AS total
       FROM "${schemaName}".invoices i
       JOIN "${schemaName}".students s ON s.id = i.student_id
       LEFT JOIN "${schemaName}".sections sec ON sec.id = s.section_id
       LEFT JOIN "${schemaName}".grade_levels gl ON gl.id = sec.grade_level_id
       ${where}
       GROUP BY gl.id, gl.code, gl.name, i.status
       ORDER BY gl.order_index ASC NULLS LAST, i.status ASC`,
      ...params,
    );

    const byGrade = new Map<
      string,
      {
        gradeLevelId: string | null;
        gradeCode: string | null;
        gradeName: string | null;
        byStatus: Record<string, { count: number; total: number }>;
        totalBilled: number;
        totalPaid: number;
      }
    >();

    for (const r of rows) {
      const key = r.grade_level_id ?? 'sin_grado';
      if (!byGrade.has(key)) {
        byGrade.set(key, {
          gradeLevelId: r.grade_level_id,
          gradeCode: r.grade_code,
          gradeName: r.grade_name,
          byStatus: {
            pending: { count: 0, total: 0 },
            paid: { count: 0, total: 0 },
            overdue: { count: 0, total: 0 },
            cancelled: { count: 0, total: 0 },
          },
          totalBilled: 0,
          totalPaid: 0,
        });
      }
      const entry = byGrade.get(key)!;
      entry.byStatus[r.status] = { count: Number(r.count), total: Number(r.total) };
      if (r.status !== 'cancelled') {
        entry.totalBilled += Number(r.total);
      }
      if (r.status === 'paid') {
        entry.totalPaid += Number(r.total);
      }
    }

    return Array.from(byGrade.values()).map((g) => ({
      ...g,
      totalBilled: round(g.totalBilled, 2),
      totalPaid: round(g.totalPaid, 2),
      totalPending: round(g.byStatus.pending.total + g.byStatus.overdue.total, 2),
    }));
  },

  async overdue(schemaName: string) {
    assertSafeSchemaName(schemaName);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        student_id: string;
        student_full_name: string;
        student_dni: string;
        concept_name: string;
        concept_code: string;
        amount: string;
        due_date: Date;
        days_overdue: number;
      }>
    >(
      `SELECT
         i.id,
         i.student_id,
         s.full_name AS student_full_name,
         s.dni AS student_dni,
         fc.name AS concept_name,
         fc.code AS concept_code,
         i.amount::text,
         i.due_date,
         (CURRENT_DATE - i.due_date) AS days_overdue
       FROM "${schemaName}".invoices i
       JOIN "${schemaName}".students s ON s.id = i.student_id
       JOIN "${schemaName}".fee_concepts fc ON fc.id = i.fee_concept_id
       WHERE i.status = 'pending' AND i.due_date < CURRENT_DATE
       ORDER BY i.due_date ASC`,
    );

    return rows.map((r) => ({
      id: r.id,
      studentId: r.student_id,
      student: {
        fullName: r.student_full_name,
        dni: r.student_dni,
      },
      feeConcept: {
        name: r.concept_name,
        code: r.concept_code,
      },
      amount: Number(r.amount),
      dueDate: r.due_date,
      daysOverdue: r.days_overdue,
    }));
  },

  async studentStatement(schemaName: string, studentId: string) {
    assertSafeSchemaName(schemaName);

    const invoices = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        amount: string;
        period: string | null;
        due_date: Date;
        status: string;
        concept_name: string;
        concept_code: string;
      }>
    >(
      `SELECT i.id, i.amount::text, i.period, i.due_date, i.status,
              fc.name AS concept_name, fc.code AS concept_code
       FROM "${schemaName}".invoices i
       JOIN "${schemaName}".fee_concepts fc ON fc.id = i.fee_concept_id
       WHERE i.student_id = $1::uuid
       ORDER BY i.due_date DESC`,
      studentId,
    );

    const payments = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        invoice_id: string;
        amount: string;
        method: string;
        gateway: string | null;
        status: string;
        paid_at: Date | null;
      }>
    >(
      `SELECT p.id, p.invoice_id, p.amount::text, p.method, p.gateway, p.status, p.paid_at
       FROM "${schemaName}".payments p
       JOIN "${schemaName}".invoices i ON i.id = p.invoice_id
       WHERE i.student_id = $1::uuid
       ORDER BY p.created_at DESC`,
      studentId,
    );

    let totalBilled = 0;
    let totalPaid = 0;
    let totalPending = 0;

    for (const i of invoices) {
      const amount = Number(i.amount);
      if (i.status === 'cancelled') continue;
      totalBilled += amount;
      if (i.status === 'paid') totalPaid += amount;
      if (i.status === 'pending' || i.status === 'overdue') totalPending += amount;
    }

    return {
      summary: {
        totalBilled: round(totalBilled, 2),
        totalPaid: round(totalPaid, 2),
        totalPending: round(totalPending, 2),
      },
      invoices: invoices.map((i) => ({
        id: i.id,
        amount: Number(i.amount),
        period: i.period,
        dueDate: i.due_date,
        status: i.status,
        feeConcept: {
          name: i.concept_name,
          code: i.concept_code,
        },
      })),
      payments: payments.map((p) => ({
        id: p.id,
        invoiceId: p.invoice_id,
        amount: Number(p.amount),
        method: p.method,
        gateway: p.gateway,
        status: p.status,
        paidAt: p.paid_at,
      })),
    };
  },

  async listForExport(
    schemaName: string,
    filters: {
      from?: string;
      to?: string;
      status?: string;
      feeConceptId?: string;
      gradeLevelId?: string;
    },
  ) {
    assertSafeSchemaName(schemaName);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.from) {
      params.push(filters.from);
      conditions.push(`i.due_date >= $${params.length}::date`);
    }
    if (filters.to) {
      params.push(filters.to);
      conditions.push(`i.due_date <= $${params.length}::date`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`i.status = $${params.length}`);
    }
    if (filters.feeConceptId) {
      params.push(filters.feeConceptId);
      conditions.push(`i.fee_concept_id = $${params.length}::uuid`);
    }
    if (filters.gradeLevelId) {
      params.push(filters.gradeLevelId);
      conditions.push(`sec.grade_level_id = $${params.length}::uuid`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        invoice_id: string;
        student_dni: string;
        student_full_name: string;
        concept_code: string;
        concept_name: string;
        period: string | null;
        amount: string;
        due_date: Date;
        status: string;
        paid_at: Date | null;
        payment_method: string | null;
      }>
    >(
      `SELECT
         i.id AS invoice_id,
         s.dni AS student_dni,
         s.full_name AS student_full_name,
         fc.code AS concept_code,
         fc.name AS concept_name,
         i.period,
         i.amount::text,
         i.due_date,
         i.status,
         p.paid_at,
         p.method AS payment_method
       FROM "${schemaName}".invoices i
       JOIN "${schemaName}".students s ON s.id = i.student_id
       JOIN "${schemaName}".fee_concepts fc ON fc.id = i.fee_concept_id
       LEFT JOIN "${schemaName}".sections sec ON sec.id = s.section_id
       LEFT JOIN "${schemaName}".payments p
         ON p.invoice_id = i.id AND p.status = 'approved'
       ${where}
       ORDER BY i.due_date DESC, s.full_name ASC`,
      ...params,
    );

    return rows.map((r) => ({
      invoiceId: r.invoice_id,
      studentDni: r.student_dni,
      studentFullName: r.student_full_name,
      conceptCode: r.concept_code,
      conceptName: r.concept_name,
      period: r.period,
      amount: Number(r.amount),
      dueDate: r.due_date,
      status: r.status,
      paidAt: r.paid_at,
      paymentMethod: r.payment_method,
    }));
  },
};

const round = (n: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
};