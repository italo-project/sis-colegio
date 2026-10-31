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
import { receiptsRepository } from './receipts.repository';
import {
  feeAmountsRepository,
  feeConceptsRepository,
  reportsRepository,
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
    
    // NUEVO: Traer los comprobantes
    const receipts = await receiptsRepository.listPendingByInvoice(req.tenant!.schemaName, id);
    
    // NUEVO: Devolver receipts en la respuesta
    res.json({ ...invoice, payments, receipts });
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

    /**
   * POST /api/finance/invoices/:id/pay/gateway
   * Inicia el pago con pasarela (Izipay, etc.)
   * NOTA: Por ahora es un esqueleto. La integración real va en el bloque G4.
   */
  async payWithGateway(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const schema = req.tenant!.schemaName;

    // 1. Verificar que el colegio tiene habilitada la pasarela
    // Necesitamos buscar la org para ver el flag payment_gateway_enabled
    const org = await prisma.organization.findUnique({
      where: { id: req.tenant!.id },
      select: { paymentGatewayEnabled: true },
    });

    if (!org || !org.paymentGatewayEnabled) {
      return res.status(400).json({
        error: 'El colegio no tiene habilitada la pasarela de pago.',
      });
    }

    // 2. Cargar la factura y validar
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

    // 4. Crear un registro de pago pendiente (para tener trazabilidad)
    const payment = await paymentsRepository.createPending(
      schema,
      invoice.id,
      invoice.amount,
      'card',
      'gateway', // Aquí después será 'izipay'
      'temp_gateway_tx_id_' + Date.now(), // ID temporal
      req.user!.userId,
    );

    // 5. TODO: En el bloque G4, aquí llamaremos a la API de Izipay y 
    // devolveremos la URL de checkout.
    // Por ahora, devolvemos el mensaje de "próximamente".
    
    // Nota: Podríamos borrar el payment pendiente que acabamos de crear
    // para no dejar basura, ya que la pasarela no está real aún.
    // Lo dejamos comentado para cuando implementemos G4.
    
    return res.status(501).json({
      message: 'Pasarela de pago en configuración — próximamente',
      paymentId: payment.id, // Lo devolvemos para debug
      invoiceId: invoice.id,
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

    // ── Comprobantes manuales (Yape/Transferencia) ───────────────

  /**
   * POST /api/finance/invoices/:id/receipts
   * El padre sube un comprobante para una factura.
   */
  async uploadReceipt(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen de comprobante' });
    }

    const schema = req.tenant!.schemaName;

    // Verificar que la factura existe y está pendiente
    const invoice = await invoicesRepository.findById(schema, id);
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    if (invoice.status === 'paid') return res.status(409).json({ error: 'Esta factura ya está pagada' });
    if (invoice.status === 'cancelled') return res.status(409).json({ error: 'Esta factura está cancelada' });

    const fileUrl = `/uploads/receipts/${file.filename}`;
    const notes = req.body.notes || undefined;

    const receipt = await receiptsRepository.create(
      schema,
      id,
      req.user!.userId,
      fileUrl,
      notes
    );

    res.status(201).json(receipt);
  },

  /**
   * PATCH /api/finance/receipts/:id/review
   * El CEO aprueba o rechaza un comprobante.
   */
  async reviewReceipt(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    if (req.user!.role !== 'ceo') {
      return res.status(403).json({ error: 'Solo el CEO puede validar comprobantes' });
    }

    const { status, reviewNotes } = req.body;
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ error: 'Status inválido. Debe ser approved o rejected' });
    }

    const schema = req.tenant!.schemaName;
    const receipt = await receiptsRepository.findById(schema, id);
    if (!receipt) return res.status(404).json({ error: 'Comprobante no encontrado' });
    if (receipt.status !== 'pending') {
      return res.status(409).json({ error: 'Este comprobante ya fue procesado' });
    }

    const updated = await receiptsRepository.review(
      schema,
      id,
      status,
      req.user!.userId,
      reviewNotes
    );

    // Si se aprueba, marcar factura como pagada y crear el pago
    if (status === 'approved') {
      await invoicesRepository.markPaid(schema, receipt.invoiceId);
      
      await paymentsRepository.create(
        schema,
        receipt.invoiceId,
        // Necesitamos el monto de la factura. Lo obtenemos de la BD.
        (await invoicesRepository.findById(schema, receipt.invoiceId))?.amount || 0,
        'transfer', // método manual
        req.user!.userId,
        `Aprobado por CEO. Comprobante: ${id}`
      );
    }

    res.json(updated);
  },

  /**
   * GET /api/finance/receipts/pending
   * Lista los comprobantes pendientes (para el CEO).
   */
  async listPendingReceipts(req: Request, res: Response) {
    const receipts = await receiptsRepository.listAllPending(req.tenant!.schemaName);
    res.json({ items: receipts, total: receipts.length });
  },

};