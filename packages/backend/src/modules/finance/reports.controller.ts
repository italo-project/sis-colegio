import { Request, Response } from 'express';
import { reportsRepository } from './finance.repository';
import { getStringParam } from '../../utils/params';
import { dateRangeSchema, exportInvoicesSchema } from './reports.schemas';
import { studentsRepository } from '../students/students.repository';

export const reportsController = {
  /**
   * GET /api/finance/reports/summary
   */
  async summary(req: Request, res: Response) {
    const data = await reportsRepository.summaryExtended(req.tenant!.schemaName);
    res.json(data);
  },

  /**
   * GET /api/finance/reports/by-period?from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  async byPeriod(req: Request, res: Response) {
    const parsed = dateRangeSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const data = await reportsRepository.byPeriod(
      req.tenant!.schemaName,
      parsed.data.from,
      parsed.data.to,
    );
    res.json({ items: data, total: data.length });
  },

  /**
   * GET /api/finance/reports/by-concept
   */
  async byConcept(req: Request, res: Response) {
    const parsed = dateRangeSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const data = await reportsRepository.byConcept(
      req.tenant!.schemaName,
      parsed.data.from,
      parsed.data.to,
    );
    res.json({ items: data, total: data.length });
  },

  /**
   * GET /api/finance/reports/by-grade
   */
  async byGrade(req: Request, res: Response) {
    const parsed = dateRangeSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const data = await reportsRepository.byGrade(
      req.tenant!.schemaName,
      parsed.data.from,
      parsed.data.to,
    );
    res.json({ items: data, total: data.length });
  },

  /**
   * GET /api/finance/reports/overdue
   */
  async overdue(req: Request, res: Response) {
    const data = await reportsRepository.overdue(req.tenant!.schemaName);
    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    res.json({
      items: data,
      total: data.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
    });
  },

  /**
   * GET /api/finance/reports/student/:studentId
   */
  async studentStatement(req: Request, res: Response) {
    const studentId = getStringParam(req, res, 'studentId');
    if (!studentId) return;

    const student = await studentsRepository.findById(req.tenant!.schemaName, studentId);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const statement = await reportsRepository.studentStatement(
      req.tenant!.schemaName,
      studentId,
    );

    res.json({
      student: {
        id: student.id,
        fullName: student.fullName,
        dni: student.dni,
      },
      ...statement,
    });
  },

  /**
   * GET /api/finance/reports/export/invoices?from=...&to=...&status=...
   * Devuelve un archivo CSV.
   */
  async exportInvoicesCsv(req: Request, res: Response) {
    const parsed = exportInvoicesSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }

    const rows = await reportsRepository.listForExport(
      req.tenant!.schemaName,
      parsed.data,
    );

    const headers = [
      'invoice_id',
      'student_dni',
      'student_full_name',
      'concept_code',
      'concept_name',
      'period',
      'amount',
      'due_date',
      'status',
      'paid_at',
      'payment_method',
    ];

    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatDate = (d: Date | null): string => {
      if (!d) return '';
      return new Date(d).toISOString().split('T')[0];
    };

    const lines: string[] = [headers.join(',')];

    for (const r of rows) {
      lines.push(
        [
          escapeCsv(r.invoiceId),
          escapeCsv(r.studentDni),
          escapeCsv(r.studentFullName),
          escapeCsv(r.conceptCode),
          escapeCsv(r.conceptName),
          escapeCsv(r.period),
          escapeCsv(r.amount.toFixed(2)),
          escapeCsv(formatDate(r.dueDate)),
          escapeCsv(r.status),
          escapeCsv(formatDate(r.paidAt)),
          escapeCsv(r.paymentMethod),
        ].join(','),
      );
    }

    const csv = lines.join('\n');
    const filename = `facturas_${req.tenant!.subdomain}_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  },
};