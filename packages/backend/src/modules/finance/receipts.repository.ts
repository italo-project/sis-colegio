import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';

export type ReceiptRow = {
  id: string;
  invoice_id: string;
  uploaded_by: string;
  file_url: string;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: Date | null;
  review_notes: string | null;
  created_at: Date;
  updated_at: Date;
};

const toApi = (row: ReceiptRow) => ({
  id: row.id,
  invoiceId: row.invoice_id,
  uploadedBy: row.uploaded_by,
  fileUrl: row.file_url,
  notes: row.notes,
  status: row.status,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  reviewNotes: row.review_notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const receiptsRepository = {
  async create(
    schemaName: string,
    invoiceId: string,
    uploadedBy: string,
    fileUrl: string,
    notes?: string,
  ) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<ReceiptRow[]>(
      `INSERT INTO "${schemaName}".payment_receipts 
        (invoice_id, uploaded_by, file_url, notes)
       VALUES ($1::uuid, $2::uuid, $3, $4)
       RETURNING *`,
      invoiceId,
      uploadedBy,
      fileUrl,
      notes ?? null,
    );
    return toApi(rows[0]);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<ReceiptRow[]>(
      `SELECT * FROM "${schemaName}".payment_receipts WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async listPendingByInvoice(schemaName: string, invoiceId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<ReceiptRow[]>(
      `SELECT * FROM "${schemaName}".payment_receipts 
       WHERE invoice_id = $1::uuid 
       ORDER BY created_at DESC`,
      invoiceId,
    );
    return rows.map(toApi);
  },

  async listAllPending(schemaName: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<ReceiptRow[]>(
      `SELECT * FROM "${schemaName}".payment_receipts 
       WHERE status = 'pending' 
       ORDER BY created_at ASC`,
    );
    return rows.map(toApi);
  },

  async review(
    schemaName: string,
    id: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewNotes?: string,
  ) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<ReceiptRow[]>(
      `UPDATE "${schemaName}".payment_receipts
       SET status = $1,
           reviewed_by = $2::uuid,
           reviewed_at = now(),
           review_notes = $3,
           updated_at = now()
       WHERE id = $4::uuid
       RETURNING *`,
      status,
      reviewedBy,
      reviewNotes ?? null,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },
};