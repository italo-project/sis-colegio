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
    /**
   * Cuenta datos asociados a un colegio antes de eliminarlo.
   * Si tiene datos, no se puede eliminar definitivamente.
   */
  async countOrganizationData(schemaName: string) {
    const results = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint as count FROM "${schemaName}".students`,
      ),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint as count FROM "${schemaName}".teachers`,
      ),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint as count FROM "${schemaName}".courses`,
      ),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint as count FROM "${schemaName}".invoices`,
      ),
      prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint as count FROM "${schemaName}".payments`,
      ),
    ]);

    const breakdown = {
      students: Number(results[0][0].count),
      teachers: Number(results[1][0].count),
      courses: Number(results[2][0].count),
      invoices: Number(results[3][0].count),
      payments: Number(results[4][0].count),
    };

    const total = Object.values(breakdown).reduce((sum, n) => sum + n, 0);

    return { total, breakdown };
  },

  /**
   * Elimina un colegio definitivamente.
   * DROP SCHEMA ... CASCADE + DELETE de organization + DELETE de users únicos
   * (los que solo pertenecían a este colegio).
   */
  async deleteOrganization(organizationId: string, schemaName: string, deletedBy: string) {
    // 1. Obtener los user_ids que solo pertenecen a este colegio
    const usersOnlyInThisOrg = await prisma.$queryRawUnsafe<Array<{ user_id: string }>>(
      `SELECT ou.user_id
       FROM public.organization_users ou
       WHERE ou.organization_id = $1::uuid
         AND (
           SELECT COUNT(*)
           FROM public.organization_users ou2
           WHERE ou2.user_id = ou.user_id
         ) = 1`,
      organizationId,
    );

    const userIdsToDelete = usersOnlyInThisOrg.map((r) => r.user_id);

    // 2. Ejecutar todo en una transacción
    await prisma.$transaction(async (tx) => {
      // Borrar memberships
      await tx.$executeRawUnsafe(
        `DELETE FROM public.organization_users WHERE organization_id = $1::uuid`,
        organizationId,
      );

      // Borrar la organización
      await tx.$executeRawUnsafe(
        `DELETE FROM public.organizations WHERE id = $1::uuid`,
        organizationId,
      );

      // Borrar usuarios que solo pertenecían a este colegio
      if (userIdsToDelete.length > 0) {
        await tx.$executeRawUnsafe(
          `DELETE FROM public.users WHERE id = ANY($1::uuid[])`,
          userIdsToDelete,
        );
      }
    });

    // 3. DROP SCHEMA fuera de la transacción (DDL no puede estar en transacción de Prisma)
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);

    return {
      deletedUsers: userIdsToDelete.length,
      schemaName,
    };
  },

  /**
   * Exporta todos los datos de un colegio en formato JSON.
   * Incluye: organización, usuarios, y conteos de datos del tenant.
   */
  async exportOrganizationData(organizationId: string, schemaName: string) {
    const org = await this.getOrganizationById(organizationId);
    if (!org) throw new Error('Organización no encontrada');

    const memberships = await this.listMemberships(organizationId);
    const stats = await this.getOrganizationStats(organizationId, schemaName);

    // Traer estudiantes, docentes y facturas básicas (opcional, puede ser mucho)
    const students = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, first_name, last_name, dni, email, phone, is_active, created_at
       FROM "${schemaName}".students
       ORDER BY last_name ASC`,
    );

    const teachers = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, first_name, last_name, dni, email, specialty, is_active, created_at
       FROM "${schemaName}".teachers
       ORDER BY last_name ASC`,
    );

    const invoices = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT i.id, s.dni AS student_dni, fc.code AS concept_code, i.amount, i.status, i.due_date
       FROM "${schemaName}".invoices i
       JOIN "${schemaName}".students s ON s.id = i.student_id
       JOIN "${schemaName}".fee_concepts fc ON fc.id = i.fee_concept_id
       ORDER BY i.due_date DESC
       LIMIT 1000`,
    );

    return {
      exportedAt: new Date().toISOString(),
      organization: org,
      stats,
      memberships,
      students,
      teachers,
      invoices,
    };
  },

  /**
   * Lista organizaciones, incluyendo las soft-deleted si se pide.
   */
  async listAllOrganizations(query: {
    q?: string;
    isActive?: string;
    plan?: string;
    includeDeleted?: boolean;
    limit: number;
    offset: number;
  }) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (!query.includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }
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
    /**
   * Lista todos los usuarios del sistema con filtros y su cantidad de membresías.
   */
  async listUsers(query: {
    q?: string;
    isActive?: string;
    isSuperAdmin?: string;
    organizationId?: string;
    limit: number;
    offset: number;
  }) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.q) {
      params.push(`%${query.q.toLowerCase()}%`);
      conditions.push(
        `(LOWER(u.email) LIKE $${params.length} OR LOWER(u.full_name) LIKE $${params.length})`,
      );
    }
    if (query.isActive === 'true') conditions.push('u.is_active = true');
    if (query.isActive === 'false') conditions.push('u.is_active = false');
    if (query.isSuperAdmin === 'true') conditions.push('u.is_super_admin = true');
    if (query.isSuperAdmin === 'false') conditions.push('u.is_super_admin = false');

    if (query.organizationId) {
      params.push(query.organizationId);
      conditions.push(
        `EXISTS (SELECT 1 FROM public.organization_users ou
          WHERE ou.user_id = u.id AND ou.organization_id = $${params.length}::uuid)`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(query.limit, query.offset);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        email: string;
        full_name: string;
        is_active: boolean;
        is_super_admin: boolean;
        created_at: Date;
        memberships_count: bigint;
      }>
    >(
      `SELECT
        u.id, u.email, u.full_name, u.is_active, u.is_super_admin, u.created_at,
        (SELECT COUNT(*) FROM public.organization_users ou WHERE ou.user_id = u.id)::bigint AS memberships_count
       FROM public.users u
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      ...params,
    );

    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM public.users u ${where}`,
      ...params.slice(0, params.length - 2),
    );

    return {
      items: rows.map((r) => ({
        id: r.id,
        email: r.email,
        fullName: r.full_name,
        isActive: r.is_active,
        isSuperAdmin: r.is_super_admin,
        createdAt: r.created_at,
        membershipsCount: Number(r.memberships_count),
      })),
      total: Number(countRows[0].count),
    };
  },

  /**
   * Obtiene un usuario por ID con sus membresías.
   */
  async getUserById(id: string) {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        email: string;
        full_name: string;
        is_active: boolean;
        is_super_admin: boolean;
        created_at: Date;
      }>
    >(
      `SELECT id, email, full_name, is_active, is_super_admin, created_at
       FROM public.users WHERE id = $1::uuid LIMIT 1`,
      id,
    );

    if (!rows[0]) return null;
    const r = rows[0];

    const memberships = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        organization_id: string;
        organization_name: string;
        organization_subdomain: string;
        role: string;
        is_active: boolean;
        created_at: Date;
      }>
    >(
      `SELECT
        ou.id, ou.organization_id, o.name AS organization_name, o.subdomain AS organization_subdomain,
        ou.role, ou.is_active, ou.created_at
       FROM public.organization_users ou
       JOIN public.organizations o ON o.id = ou.organization_id
       WHERE ou.user_id = $1::uuid
       ORDER BY o.name ASC`,
      id,
    );

    return {
      user: {
        id: r.id,
        email: r.email,
        fullName: r.full_name,
        isActive: r.is_active,
        isSuperAdmin: r.is_super_admin,
        createdAt: r.created_at,
      },
      memberships: memberships.map((m) => ({
        id: m.id,
        organizationId: m.organization_id,
        organizationName: m.organization_name,
        organizationSubdomain: m.organization_subdomain,
        role: m.role,
        isActive: m.is_active,
        createdAt: m.created_at,
      })),
    };
  },

  async updateUser(
    id: string,
    data: { fullName?: string; email?: string; isActive?: boolean },
  ) {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (data.fullName !== undefined) {
      params.push(data.fullName);
      fields.push(`full_name = $${params.length}`);
    }
    if (data.email !== undefined) {
      params.push(data.email);
      fields.push(`email = $${params.length}`);
    }
    if (data.isActive !== undefined) {
      params.push(data.isActive);
      fields.push(`is_active = $${params.length}`);
    }

    if (fields.length === 0) {
      const existing = await this.getUserById(id);
      return existing?.user ?? null;
    }

    params.push(id);
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        email: string;
        full_name: string;
        is_active: boolean;
        is_super_admin: boolean;
        created_at: Date;
      }>
    >(
      `UPDATE public.users SET ${fields.join(', ')}
       WHERE id = $${params.length}::uuid RETURNING *`,
      ...params,
    );

    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id,
      email: r.email,
      fullName: r.full_name,
      isActive: r.is_active,
      isSuperAdmin: r.is_super_admin,
      createdAt: r.created_at,
    };
  },

  async updateUserPassword(id: string, passwordHash: string) {
    await prisma.$executeRawUnsafe(
      `UPDATE public.users SET password_hash = $1 WHERE id = $2::uuid`,
      passwordHash,
      id,
    );
  },

  async deleteUser(id: string) {
    // Solo se puede eliminar si no tiene memberships activas
    const memberships = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM public.organization_users WHERE user_id = $1::uuid`,
      id,
    );

    if (Number(memberships[0].count) > 0) {
      throw new Error(
        'No se puede eliminar: el usuario tiene membresías en colegios. Desactívalo en su lugar.',
      );
    }

    await prisma.$executeRawUnsafe(`DELETE FROM public.users WHERE id = $1::uuid`, id);
    return { ok: true };
  },
    /**
   * Lista los logs de auditoría con filtros.
   */
  async listAuditLogs(query: {
    action?: string;
    actorUserId?: string;
    organizationId?: string;
    fromDate?: string;
    toDate?: string;
    limit: number;
    offset: number;
  }) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.action) {
      params.push(query.action);
      conditions.push(`action = $${params.length}`);
    }
    if (query.actorUserId) {
      params.push(query.actorUserId);
      conditions.push(`actor_user_id = $${params.length}::uuid`);
    }
    if (query.organizationId) {
      params.push(query.organizationId);
      conditions.push(`organization_id = $${params.length}::uuid`);
    }
    if (query.fromDate) {
      params.push(query.fromDate);
      conditions.push(`created_at >= $${params.length}::timestamptz`);
    }
    if (query.toDate) {
      params.push(query.toDate);
      conditions.push(`created_at <= $${params.length}::timestamptz`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(query.limit, query.offset);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        actor_user_id: string;
        actor_email: string;
        action: string;
        target_type: string | null;
        target_id: string | null;
        target_name: string | null;
        organization_id: string | null;
        organization_name: string | null;
        metadata: unknown;
        ip_address: string | null;
        created_at: Date;
      }>
    >(
      `SELECT * FROM public.audit_logs ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      ...params,
    );

    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM public.audit_logs ${where}`,
      ...params.slice(0, params.length - 2),
    );

    return {
      items: rows.map((r) => ({
        id: r.id,
        actorUserId: r.actor_user_id,
        actorEmail: r.actor_email,
        action: r.action,
        targetType: r.target_type,
        targetId: r.target_id,
        targetName: r.target_name,
        organizationId: r.organization_id,
        organizationName: r.organization_name,
        metadata: r.metadata,
        ipAddress: r.ip_address,
        createdAt: r.created_at,
      })),
      total: Number(countRows[0].count),
    };
  },
};