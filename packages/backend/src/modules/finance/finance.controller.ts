import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { getStringParam } from '../../utils/params';
import { studentsRepository } from '../students/students.repository';
import { env } from '../../config/env';
import { parentsRepository } from '../parents/parents.repository';
import { studentParentsRepository } from '../student-parents/student-parents.repository';
import { mpRepository } from '../mercadopago/mp.repository';
import { createPreference } from '../mercadopago/mp.client';
import { buildPreferencePayload } from '../mercadopago/mp-payment.helpers';
import {
  feeAmountsRepository,
  feeConceptsRepository,
  invoicesRepository,
  paymentsRepository,
} from './finance.repository';
import { resolveAmountForStudent } from './finance.helpers';
import {
  bulkInvoicesSchema,
  createFeeConceptSchema,
  createInvoiceSchema,
  listFeeConceptsQuerySchema,
  listInvoicesQuerySchema,
  simulatePaymentSchema,
  updateFeeConceptSchema,
  updateInvoiceSchema,
  upsertFeeAmountSchema,
} from './finance.schemas';

export const financeController = {
  // ── Conceptos ─────────────────────────────────────────────
  async createConcept(req: Request, res: Response) {
    const parsed = createFeeConceptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const existing = await feeConceptsRepository.findByCode(
      req.tenant!.schemaName,
      parsed.data.code,
    );
    if (existing) {
      return res.status(409).json({ error: `Ya existe un concepto con código ${parsed.data.code}` });
    }

    const concept = await feeConceptsRepository.create(req.tenant!.schemaName, parsed.data);
    res.status(201).json(concept);
  },

  async listConcepts(req: Request, res: Response) {
    const parsed = listFeeConceptsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const concepts = await feeConceptsRepository.list(
      req.tenant!.schemaName,
      parsed.data.active,
    );
    res.json({ items: concepts, total: concepts.length });
  },

  async updateConcept(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateFeeConceptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const concept = await feeConceptsRepository.update(
      req.tenant!.schemaName,
      id,
      parsed.data,
    );
    if (!concept) return res.status(404).json({ error: 'Concepto no encontrado' });
    res.json(concept);
  },

  async deactivateConcept(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const concept = await feeConceptsRepository.deactivate(req.tenant!.schemaName, id);
    if (!concept) return res.status(404).json({ error: 'Concepto no encontrado' });
    res.json(concept);
  },

  async upsertAmount(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = upsertFeeAmountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const concept = await feeConceptsRepository.findById(req.tenant!.schemaName, id);
    if (!concept) return res.status(404).json({ error: 'Concepto no encontrado' });

    const amount = await feeAmountsRepository.upsert(req.tenant!.schemaName, id, parsed.data);
    res.json(amount);
  },

  async listAmounts(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const amounts = await feeAmountsRepository.listByConcept(req.tenant!.schemaName, id);
    res.json({ items: amounts, total: amounts.length });
  },

  // ── Facturas ──────────────────────────────────────────────
  async createInvoice(req: Request, res: Response) {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const student = await studentsRepository.findById(
      req.tenant!.schemaName,
      parsed.data.studentId,
    );
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

   const concept = await feeConceptsRepository.findById(
  req.tenant!.schemaName,
  parsed.data.feeConceptId,
);
if (!concept || !concept.isActive) {
  return res.status(404).json({ error: 'Concepto no encontrado o inactivo' });
}

    const existing = await invoicesRepository.findByUniqueKey(
      req.tenant!.schemaName,
      parsed.data.studentId,
      parsed.data.feeConceptId,
      parsed.data.period ?? null,
    );
    if (existing) {
      return res.status(409).json({
        error: 'Ya existe una factura para ese estudiante, concepto y período',
      });
    }

    // Resolver monto: si no se envía, calcular según grado
    const amount =
      parsed.data.amount ??
      (await resolveAmountForStudent(
        req.tenant!.schemaName,
        parsed.data.studentId,
        parsed.data.feeConceptId,
        concept.defaultAmount,
      ));

    const invoice = await invoicesRepository.create(
      req.tenant!.schemaName,
      parsed.data.studentId,
      parsed.data.feeConceptId,
      amount,
      parsed.data.period ?? null,
      parsed.data.dueDate,
      parsed.data.notes,
      req.user!.userId,
    );

    const detailed = await invoicesRepository.findDetailedById(
      req.tenant!.schemaName,
      invoice.id,
    );
    res.status(201).json(detailed);
  },

  async bulkInvoices(req: Request, res: Response) {
    const parsed = bulkInvoicesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    // Verificar que la sección existe
    const sectionRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${req.tenant!.schemaName}".sections WHERE id = $1::uuid LIMIT 1`,
      parsed.data.sectionId,
    );
    if (!sectionRows[0]) {
      return res.status(404).json({ error: 'Sección no encontrada' });
    }

    const concept = await feeConceptsRepository.findById(
      req.tenant!.schemaName,
      parsed.data.feeConceptId,
    );
    if (!concept || !concept.isActive) {
      return res.status(404).json({ error: 'Concepto no encontrado o inactivo' });
    }

    // Estudiantes de la sección
    const students = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT DISTINCT s.id
       FROM "${req.tenant!.schemaName}".students s
       JOIN "${req.tenant!.schemaName}".enrollments e ON e.student_id = s.id AND e.status = 'active'
       JOIN "${req.tenant!.schemaName}".courses c ON c.id = e.course_id
       WHERE c.section_id = $1::uuid AND s.is_active = true`,
      parsed.data.sectionId,
    );

    if (students.length === 0) {
      return res.json({ created: 0, skipped: 0, results: [] });
    }

    const results: Array<{ studentId: string; ok: boolean; error?: string; invoiceId?: string }> = [];

    for (const s of students) {
      // Verificar duplicado
      const existing = await invoicesRepository.findByUniqueKey(
        req.tenant!.schemaName,
        s.id,
        parsed.data.feeConceptId,
        parsed.data.period ?? null,
      );
      if (existing) {
        results.push({
          studentId: s.id,
          ok: false,
          error: 'Ya existe factura para este período',
        });
        continue;
      }

      const amount = await resolveAmountForStudent(
        req.tenant!.schemaName,
        s.id,
        parsed.data.feeConceptId,
        concept.defaultAmount,
      );

      const invoice = await invoicesRepository.create(
        req.tenant!.schemaName,
        s.id,
        parsed.data.feeConceptId,
        amount,
        parsed.data.period ?? null,
        parsed.data.dueDate,
        parsed.data.notes,
        req.user!.userId,
      );

      results.push({ studentId: s.id, ok: true, invoiceId: invoice.id });
    }

    const created = results.filter((r) => r.ok).length;
    const skipped = results.filter((r) => !r.ok).length;

    res.json({ created, skipped, results });
  },

  async listInvoices(req: Request, res: Response) {
    const parsed = listInvoicesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const result = await invoicesRepository.list(req.tenant!.schemaName, parsed.data);
    res.json(result);
  },

  async getInvoice(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const invoice = await invoicesRepository.findDetailedById(req.tenant!.schemaName, id);
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

    const payments = await paymentsRepository.listByInvoice(req.tenant!.schemaName, id);
    res.json({ ...invoice, payments });
  },

  async updateInvoice(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateInvoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const invoice = await invoicesRepository.update(
      req.tenant!.schemaName,
      id,
      parsed.data,
    );
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(invoice);
  },

  async cancelInvoice(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const invoice = await invoicesRepository.update(req.tenant!.schemaName, id, {
      status: 'cancelled',
    });
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(invoice);
  },

  // ── Pagos ─────────────────────────────────────────────────
  async simulatePayment(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = simulatePaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const invoice = await invoicesRepository.findById(req.tenant!.schemaName, id);
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

    if (invoice.status === 'paid') {
      return res.status(409).json({ error: 'Esta factura ya está pagada' });
    }

    if (invoice.status === 'cancelled') {
      return res.status(409).json({ error: 'Esta factura está cancelada' });
    }

    const payment = await paymentsRepository.create(
      req.tenant!.schemaName,
      id,
      invoice.amount,
      parsed.data.method,
      req.user!.userId,
      parsed.data.notes,
    );

    await invoicesRepository.markPaid(req.tenant!.schemaName, id);

    res.status(201).json(payment);
  },

  /**
   * POST /api/finance/invoices/:id/pay/mercadopago
   * Crea una preferencia de pago en Mercado Pago para que el padre complete
   * el pago en el checkout. Devuelve los init_points (producción y sandbox).
   */
  async payWithMercadoPago(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const schema = req.tenant!.schemaName;

    // 1. Verificar que el colegio tiene MP conectado
    const mpConnection = await mpRepository.getConnection(req.tenant!.id);
    if (!mpConnection || !mpConnection.connected) {
      return res.status(400).json({
        error: 'El colegio aún no ha conectado Mercado Pago. Pide al CEO que lo conecte.',
      });
    }

    // 2. Cargar la factura detallada
    const invoice = await invoicesRepository.findDetailedById(schema, id);
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

    if (invoice.status === 'paid') {
      return res.status(409).json({ error: 'Esta factura ya está pagada' });
    }
    if (invoice.status === 'cancelled') {
      return res.status(409).json({ error: 'Esta factura está cancelada' });
    }

    // 3. Validar que el padre esté vinculado al estudiante (si el rol es padre)
    if (req.user!.role === 'padre') {
      const parent = await parentsRepository.findByUserId(schema, req.user!.userId);
      if (!parent) {
        return res.status(404).json({ error: 'No estás registrado como padre' });
      }
      const link = await studentParentsRepository.findByStudentAndParent(
        schema,
        invoice.studentId,
        parent.id,
      );
      if (!link) {
        return res.status(403).json({ error: 'Esta factura no pertenece a tus hijos' });
      }
    }

    // 4. Construir el payload de la preferencia
    const notificationUrl = `${env.MP_REDIRECT_URI.replace('/callback', '/webhook')}`;
    const payload = buildPreferencePayload({
      invoice: {
        id: invoice.id,
        amount: invoice.amount,
        feeConcept: invoice.feeConcept,
        student: invoice.student,
      },
      notificationUrl,
      marketplaceFeePercent: env.MP_MARKETPLACE_FEE_PERCENT,
    });

    // 5. Crear la preferencia en MP con el access_token del colegio
    let preference;
    try {
      preference = await createPreference(mpConnection.accessToken, {
        items: payload.items,
        externalReference: payload.external_reference,
        notificationUrl: payload.notification_url,
        backUrls: payload.back_urls,
        marketplaceFee: payload.marketplace_fee,
        payer: payload.payer,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ Error creando preferencia MP:', msg);
      return res.status(500).json({
        error: 'No se pudo crear la preferencia de pago',
        details: env.NODE_ENV === 'development' ? msg : undefined,
      });
    }

    // 6. Registrar el pago en estado 'pending' con el preference_id
    const payment = await paymentsRepository.createPending(
      schema,
      invoice.id,
      invoice.amount,
      'card', // método inicial, se actualizará cuando llegue el webhook
      'mercadopago',
      preference.id,
      req.user!.userId,
    );

    // 7. Devolver ambos init_points (sandbox y producción)
    res.status(201).json({
      paymentId: payment.id,
      invoiceId: invoice.id,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      // El frontend usa sandbox_init_point si MP_SANDBOX=true
      useSandbox: env.MP_SANDBOX,
    });
  },

  // ── Reportes ──────────────────────────────────────────────
  async summary(req: Request, res: Response) {
    const schemaName = req.tenant!.schemaName;

    const totals = await prisma.$queryRawUnsafe<
      Array<{
        status: string;
        count: bigint;
        total: string;
      }>
    >(
      `SELECT status, COUNT(*)::bigint as count, COALESCE(SUM(amount), 0)::text as total
       FROM "${schemaName}".invoices
       GROUP BY status`,
    );

    const result = {
      pending: { count: 0, total: 0 },
      paid: { count: 0, total: 0 },
      overdue: { count: 0, total: 0 },
      cancelled: { count: 0, total: 0 },
    };

    for (const t of totals) {
      const key = t.status as keyof typeof result;
      if (key in result) {
        result[key] = { count: Number(t.count), total: Number(t.total) };
      }
    }

    res.json(result);
  },
};