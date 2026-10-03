import { prisma } from '../../config/prisma';

type OrganizationRow = {
  id: string;
  name: string;
  subdomain: string;
  schema_name: string;
  plan: string;
  is_active: boolean;
  created_at: Date;
  mp_user_id: string | null;
  mp_connected_at: Date | null;
};

const toApi = (row: OrganizationRow) => ({
  id: row.id,
  name: row.name,
  subdomain: row.subdomain,
  schemaName: row.schema_name,
  plan: row.plan,
  isActive: row.is_active,
  createdAt: row.created_at,
  mercadoPago: {
    connected: row.mp_user_id !== null,
    connectedAt: row.mp_connected_at,
  },
});

export const adminRepository = {
  async listOrganizations(query: {
    q?: string;
    isActive?: string;
    plan?: string;
    limit: number;
    offset: number;
  }) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.q) {
      params.push(`%${query.q.toLowerCase()}%`);
      conditions.push(
        `(LOWER(name) LIKE $${params.length} OR LOWER(subdomain) LIKE $${params.length})`,
      );
    }
    if (query.isActive === 'true') conditions.push('is_active = true');
    if (query.isActive === 'false') conditions.push('is_active = false');
    if (query.plan) {
      params.push(query.plan);
      conditions.push(`plan = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(query.limit, query.offset);

    const rows = await prisma.$queryRawUnsafe<OrganizationRow[]>(
      `SELECT * FROM public.organizations ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      ...params,
    );

    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM public.organizations ${where}`,
      ...params.slice(0, params.length - 2),
    );

    return {
      items: rows.map(toApi),
      total: Number(countRows[0].count),
    };
  },

  async getOrganizationById(id: string) {
    const rows = await prisma.$queryRawUnsafe<OrganizationRow[]>(
      `SELECT * FROM public.organizations WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async getOrganizationStats(organizationId: string, schemaName: string) {
    // Contar estudiantes, docentes, cursos y usuarios de ese colegio
    const students = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM "${schemaName}".students WHERE is_active = true`,
    );
    const teachers = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM "${schemaName}".teachers WHERE is_active = true`,
    );
    const courses = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM "${schemaName}".courses WHERE is_active = true`,
    );
    const users = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM public.organization_users WHERE organization_id = $1::uuid AND is_active = true`,
      organizationId,
    );
    const invoices = await prisma.$queryRawUnsafe<
      Array<{ total_paid: string; total_pending: string }>
    >(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)::text AS total_paid,
        COALESCE(SUM(CASE WHEN status = 'pending' OR status = 'overdue' THEN amount ELSE 0 END), 0)::text AS total_pending
       FROM "${schemaName}".invoices`,
    );

    return {
      students: Number(students[0].count),
      teachers: Number(teachers[0].count),
      courses: Number(courses[0].count),
      users: Number(users[0].count),
      invoices: {
        totalPaid: Number(invoices[0].total_paid),
        totalPending: Number(invoices[0].total_pending),
      },
    };
  },

  async updateOrganization(
    id: string,
    data: { name?: string; plan?: string; isActive?: boolean },
  ) {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.name !== undefined) {
      params.push(data.name);
      fields.push(`name = $${params.length}`);
    }
    if (data.plan !== undefined) {
      params.push(data.plan);
      fields.push(`plan = $${params.length}`);
    }
    if (data.isActive !== undefined) {
      params.push(data.isActive);
      fields.push(`is_active = $${params.length}`);
    }

    if (fields.length === 0) return this.getOrganizationById(id);

    params.push(id);
    const rows = await prisma.$queryRawUnsafe<OrganizationRow[]>(
      `UPDATE public.organizations SET ${fields.join(', ')}
       WHERE id = $${params.length}::uuid RETURNING *`,
      ...params,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async getGlobalStats() {
    const orgs = await prisma.$queryRawUnsafe<
      Array<{ total: bigint; active: bigint }>
    >(
      `SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE is_active = true)::bigint AS active
       FROM public.organizations`,
    );

    const users = await prisma.$queryRawUnsafe<Array<{ total: bigint }>>(
      `SELECT COUNT(*)::bigint AS total FROM public.users WHERE is_active = true`,
    );

    // Sumar alumnos y docentes de todos los esquemas de tenants
    const orgsList = await prisma.$queryRawUnsafe<
      Array<{ schema_name: string; plan: string; is_active: boolean }>
    >(`SELECT schema_name, plan, is_active FROM public.organizations WHERE is_active = true`);

    let totalStudents = 0;
    let totalTeachers = 0;
    let totalPendingInvoices = 0;
    let totalCollected = 0;

    for (const org of orgsList) {
      try {
        const s = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint as count FROM "${org.schema_name}".students WHERE is_active = true`,
        );
        totalStudents += Number(s[0].count);

        const t = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint as count FROM "${org.schema_name}".teachers WHERE is_active = true`,
        );
        totalTeachers += Number(t[0].count);

        const inv = await prisma.$queryRawUnsafe<
          Array<{ paid: string; pending: string }>
        >(
          `SELECT
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)::text AS paid,
            COALESCE(SUM(CASE WHEN status = 'pending' OR status = 'overdue' THEN amount ELSE 0 END), 0)::text AS pending
           FROM "${org.schema_name}".invoices`,
        );
        totalCollected += Number(inv[0].paid);
        totalPendingInvoices += Number(inv[0].pending);
      } catch {
        // Colegio sin datos (esquema vacío)
      }
    }

    return {
      organizations: {
        total: Number(orgs[0].total),
        active: Number(orgs[0].active),
      },
      users: Number(users[0].total),
      students: totalStudents,
      teachers: totalTeachers,
      finance: {
        totalCollected,
        totalPending: totalPendingInvoices,
      },
    };
  },

  async listMemberships(organizationId: string) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        user_id: string;
        role: string;
        is_active: boolean;
        created_at: Date;
        email: string;
        full_name: string;
      }>
    >(
      `SELECT
        ou.id, ou.user_id, ou.role, ou.is_active, ou.created_at,
        u.email, u.full_name
       FROM public.organization_users ou
       JOIN public.users u ON u.id = ou.user_id
       WHERE ou.organization_id = $1::uuid
       ORDER BY ou.role ASC, u.full_name ASC`,
      organizationId,
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      email: r.email,
      fullName: r.full_name,
      role: r.role,
      isActive: r.is_active,
      createdAt: r.created_at,
    }));
  },
};