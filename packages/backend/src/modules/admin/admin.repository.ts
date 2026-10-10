import { prisma } from '../../config/prisma';
import { hashPassword as bcryptHash } from '../../utils/password';
import { migrateTenantSchema } from '../../db/tenant-migrations-service';
import { seedAcademicBaseData } from '../../utils/tenant-schema';

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

  async deleteOrganization(organizationId: string, schemaName: string, deletedBy: string) {
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

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `DELETE FROM public.organization_users WHERE organization_id = $1::uuid`,
        organizationId,
      );

      await tx.$executeRawUnsafe(
        `DELETE FROM public.organizations WHERE id = $1::uuid`,
        organizationId,
      );

      if (userIdsToDelete.length > 0) {
        await tx.$executeRawUnsafe(
          `DELETE FROM public.users WHERE id = ANY($1::uuid[])`,
          userIdsToDelete,
        );
      }
    });

    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);

    return {
      deletedUsers: userIdsToDelete.length,
      schemaName,
    };
  },

  async exportOrganizationData(organizationId: string, schemaName: string) {
    const org = await this.getOrganizationById(organizationId);
    if (!org) throw new Error('Organización no encontrada');

    const memberships = await this.listMemberships(organizationId);
    const stats = await this.getOrganizationStats(organizationId, schemaName);

    const students = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, full_name, dni, email, phone, is_active, created_at
       FROM "${schemaName}".students
       ORDER BY full_name ASC`,
    );

    const teachers = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT id, full_name, dni, email, specialty, is_active, created_at
       FROM "${schemaName}".teachers
       ORDER BY full_name ASC`,
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

  /**
   * ⚠️ PELIGROSO: Borra TODOS los datos de la plataforma excepto el super-admin actual.
   */
  async resetAllData(currentUserId: string) {
    const orgs = await prisma.$queryRawUnsafe<
      Array<{ id: string; name: string; schemaName: string }>
    >(`SELECT id, name, schema_name AS "schemaName" FROM public.organizations`);

    await prisma.$executeRawUnsafe(`DELETE FROM public.organization_users`);
    await prisma.$executeRawUnsafe(`DELETE FROM public.organizations`);
    await prisma.$executeRawUnsafe(
      `DELETE FROM public.users WHERE id <> $1::uuid`,
      currentUserId,
    );
    await prisma.$executeRawUnsafe(`DELETE FROM public.audit_logs`);
    await prisma.$executeRawUnsafe(`DELETE FROM public.password_reset_tokens`);

    const dropped: string[] = [];
    for (const org of orgs) {
      await prisma.$executeRawUnsafe(
        `DROP SCHEMA IF EXISTS "${org.schemaName}" CASCADE`,
      );
      dropped.push(org.schemaName);
    }

    return {
      droppedSchemas: dropped,
      deletedOrganizations: orgs.length,
    };
  },

  /**
   * Crea un colegio demo completo con datos de prueba.
   * Idempotente: si el colegio demo ya existe, devuelve error.
   * Si algo falla a mitad de camino, limpia los datos creados (rollback manual).
   */
  async seedDemoData() {
    const DEMO_SUBDOMAIN = 'demo';
    const DEMO_SCHEMA = 'tenant_demo';
    const DEMO_CEO_EMAIL = 'ceo@demo.pe';
    const DEMO_CEO_PASSWORD = 'Demo123!';

    // 1. Verificar que no exista ya
    const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM public.organizations WHERE subdomain = $1 LIMIT 1`,
      DEMO_SUBDOMAIN,
    );
    if (existing[0]) {
      return {
        error: `Ya existe un colegio con subdominio "${DEMO_SUBDOMAIN}". Haz Reset total antes de volver a crear datos de prueba.`,
      };
    }

    try {
      // 2. Crear organización + CEO
      const org = await prisma.organization.create({
        data: {
          name: 'Colegio Demo',
          subdomain: DEMO_SUBDOMAIN,
          schemaName: DEMO_SCHEMA,
          plan: 'pro',
        },
      });

      const passwordHash = await bcryptHash(DEMO_CEO_PASSWORD);
      const ceo = await prisma.user.create({
        data: {
          email: DEMO_CEO_EMAIL,
          passwordHash,
          fullName: 'CEO Demo',
        },
      });

      await prisma.organizationUser.create({
        data: {
          organizationId: org.id,
          userId: ceo.id,
          role: 'ceo',
        },
      });

      // 3. Crear esquema y migraciones (usando imports estáticos)
      await migrateTenantSchema(DEMO_SCHEMA);
      await seedAcademicBaseData(DEMO_SCHEMA);

      // 4. Traer año escolar activo + grados
      const yearRows = await prisma.$queryRawUnsafe<Array<{ id: string; year: number }>>(
        `SELECT id, year FROM "${DEMO_SCHEMA}".academic_years WHERE is_active = true LIMIT 1`,
      );
      const year = yearRows[0];

      const gradeRows = await prisma.$queryRawUnsafe<
        Array<{ id: string; code: string; name: string; order_index: number }>
      >(
        `SELECT id, code, name, order_index FROM "${DEMO_SCHEMA}".grade_levels WHERE code IN ('PRIM_1', 'SEC_1') ORDER BY order_index ASC`,
      );

      // 5. Crear 2 docentes (con usuario y organización)
      const teacherPass = await bcryptHash('Docente123!');
      const teachersData = [
        { fullName: 'Juan Pérez Docente', email: 'juan.docente@demo.pe', dni: '70000001' },
        { fullName: 'María López Docente', email: 'maria.docente@demo.pe', dni: '70000002' },
      ];

      const teachers: Array<{ id: string; userId: string; fullName: string }> = [];
      for (const t of teachersData) {
        const u = await prisma.user.create({
          data: {
            email: t.email,
            passwordHash: teacherPass,
            fullName: t.fullName,
            mustChangePassword: true,
          },
        });
        await prisma.organizationUser.create({
          data: { organizationId: org.id, userId: u.id, role: 'docente' },
        });
        const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO "${DEMO_SCHEMA}".teachers (user_id, full_name, dni, email)
           VALUES ($1::uuid, $2, $3, $4) RETURNING id`,
          u.id,
          t.fullName,
          t.dni,
          t.email,
        );
        teachers.push({ id: rows[0].id, userId: u.id, fullName: t.fullName });
      }

      // 6. Crear 3 materias
      const subjectsData = [
        { code: 'MAT', name: 'Matemática', area: 'Ciencias' },
        { code: 'COM', name: 'Comunicación', area: 'Letras' },
        { code: 'ING', name: 'Inglés', area: 'Idiomas' },
      ];
      const subjects: Array<{ id: string; code: string }> = [];
      for (const s of subjectsData) {
        const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO "${DEMO_SCHEMA}".subjects (code, name, area) VALUES ($1, $2, $3) RETURNING id`,
          s.code,
          s.name,
          s.area,
        );
        subjects.push({ id: rows[0].id, code: s.code });
      }

      // 7. Crear secciones A y B para cada grado
      const sections: Array<{ id: string; name: string; gradeLevelId: string }> = [];
      for (const g of gradeRows) {
        for (const secName of ['A', 'B']) {
          const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
            `INSERT INTO "${DEMO_SCHEMA}".sections (academic_year_id, grade_level_id, name, capacity)
             VALUES ($1::uuid, $2::uuid, $3, 30) RETURNING id`,
            year.id,
            g.id,
            secName,
          );
          sections.push({ id: rows[0].id, name: secName, gradeLevelId: g.id });
        }
      }

      // 8. Crear 6 apoderados + 6 estudiantes
      const studentsData = [
        { fullName: 'Ana Torres', dni: '80000001', email: 'ana.torres@demo.pe' },
        { fullName: 'Carlos Gómez', dni: '80000002', email: 'carlos.gomez@demo.pe' },
        { fullName: 'Lucía Ramírez', dni: '80000003', email: 'lucia.ramirez@demo.pe' },
        { fullName: 'Diego Flores', dni: '80000004', email: 'diego.flores@demo.pe' },
        { fullName: 'Sofía Mendoza', dni: '80000005', email: 'sofia.mendoza@demo.pe' },
        { fullName: 'Mateo Rojas', dni: '80000006', email: 'mateo.rojas@demo.pe' },
      ];
      const parentPass = await bcryptHash('Padre123!');
      const studentPass = await bcryptHash('Estudiante123!');

      const createdStudents: Array<{
        id: string;
        sectionId: string;
        fullName: string;
      }> = [];

      // Repartir 3 en sección "1°A Primaria" y 3 en "1°A Secundaria"
      const prim1A = sections.find((s) => s.name === 'A' && s.gradeLevelId === gradeRows[0].id)!;
      const sec1A = sections.find((s) => s.name === 'A' && s.gradeLevelId === gradeRows[1].id)!;
      const targetSections = [prim1A, prim1A, prim1A, sec1A, sec1A, sec1A];

      for (let i = 0; i < studentsData.length; i++) {
        const sd = studentsData[i];
        const parentFullName = `Apoderado de ${sd.fullName.split(' ')[0]}`;
        const parentDni = `6000000${i + 1}`;
        const parentEmail = `apoderado${i + 1}@demo.pe`;

        // Crear usuario padre
        const pu = await prisma.user.create({
          data: {
            email: parentEmail,
            passwordHash: parentPass,
            fullName: parentFullName,
            mustChangePassword: true,
          },
        });
        await prisma.organizationUser.create({
          data: { organizationId: org.id, userId: pu.id, role: 'padre' },
        });

        const parentRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO "${DEMO_SCHEMA}".parents (user_id, full_name, dni, email)
           VALUES ($1::uuid, $2, $3, $4) RETURNING id`,
          pu.id,
          parentFullName,
          parentDni,
          parentEmail,
        );
        const parentId = parentRows[0].id;

        // Crear usuario estudiante
        const su = await prisma.user.create({
          data: {
            email: sd.email,
            passwordHash: studentPass,
            fullName: sd.fullName,
            mustChangePassword: true,
          },
        });
        await prisma.organizationUser.create({
          data: { organizationId: org.id, userId: su.id, role: 'estudiante' },
        });

        // Crear estudiante
        const targetSec = targetSections[i];
        const studentRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO "${DEMO_SCHEMA}".students
             (user_id, full_name, dni, email, section_id)
           VALUES ($1::uuid, $2, $3, $4, $5::uuid) RETURNING id`,
          su.id,
          sd.fullName,
          sd.dni,
          sd.email,
          targetSec.id,
        );
        const studentId = studentRows[0].id;

        // Vincular apoderado
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${DEMO_SCHEMA}".student_parents
             (student_id, parent_id, relationship, is_primary)
           VALUES ($1::uuid, $2::uuid, 'apoderado', true)`,
          studentId,
          parentId,
        );

        // Historial de sección
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${DEMO_SCHEMA}".student_section_history
             (student_id, section_id, academic_year_id, enrolled_at)
           VALUES ($1::uuid, $2::uuid, $3::uuid, now())`,
          studentId,
          targetSec.id,
          year.id,
        );

        createdStudents.push({
          id: studentId,
          sectionId: targetSec.id,
          fullName: sd.fullName,
        });
      }

      // 9. Crear 4 cursos: MAT y COM en 1°A Primaria + 1°A Secundaria
      const coursesData: Array<{
        sectionId: string;
        subjectCode: string;
        teacherIdx: number;
      }> = [
        { sectionId: prim1A.id, subjectCode: 'MAT', teacherIdx: 0 },
        { sectionId: prim1A.id, subjectCode: 'COM', teacherIdx: 1 },
        { sectionId: sec1A.id, subjectCode: 'MAT', teacherIdx: 0 },
        { sectionId: sec1A.id, subjectCode: 'COM', teacherIdx: 1 },
      ];

      const courses: Array<{ id: string; sectionId: string }> = [];
      for (const c of coursesData) {
        const subject = subjects.find((s) => s.code === c.subjectCode)!;
        const teacher = teachers[c.teacherIdx];
        const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO "${DEMO_SCHEMA}".courses
             (academic_year_id, section_id, subject_id, teacher_id, weekly_hours)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 5) RETURNING id`,
          year.id,
          c.sectionId,
          subject.id,
          teacher.id,
        );
        courses.push({ id: rows[0].id, sectionId: c.sectionId });
      }

      // 10. Matricular estudiantes en los cursos de su sección
      for (const s of createdStudents) {
        const coursesOfSection = courses.filter((c) => c.sectionId === s.sectionId);
        for (const c of coursesOfSection) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "${DEMO_SCHEMA}".enrollments (course_id, student_id)
             VALUES ($1::uuid, $2::uuid)
             ON CONFLICT DO NOTHING`,
            c.id,
            s.id,
          );
        }
      }

      // 11. Crear categoría + evaluación + notas en un curso (ej: MAT prim1A)
      const matPrim1A = courses.find((c) => c.sectionId === prim1A.id);
      if (matPrim1A) {
        const catRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO "${DEMO_SCHEMA}".grade_categories
             (course_id, name, weight, order_index)
           VALUES ($1::uuid, 'Prácticas', 100, 1) RETURNING id`,
          matPrim1A.id,
        );
        const catId = catRows[0].id;

        const evalRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `INSERT INTO "${DEMO_SCHEMA}".evaluations
             (category_id, name, weight, max_score, evaluation_date)
           VALUES ($1::uuid, 'Práctica 1', 100, 20, CURRENT_DATE) RETURNING id`,
          catId,
        );
        const evalId = evalRows[0].id;

        const studentsInPrim1A = createdStudents.filter((s) => s.sectionId === prim1A.id);
        const scores = [15, 17, 13];
        for (let i = 0; i < studentsInPrim1A.length; i++) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "${DEMO_SCHEMA}".grade_entries
               (evaluation_id, student_id, score, graded_at)
             VALUES ($1::uuid, $2::uuid, $3, now())
             ON CONFLICT DO NOTHING`,
            evalId,
            studentsInPrim1A[i].id,
            scores[i] ?? 14,
          );
        }
      }

      // 12. Registrar una sesión de asistencia de hoy en 1°A Primaria
      const attendanceSessionRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "${DEMO_SCHEMA}".attendance_sessions
           (section_id, session_date, topic, taken_by, is_final)
         VALUES ($1::uuid, CURRENT_DATE, 'Clase demo', $2::uuid, false)
         ON CONFLICT (section_id, session_date) DO NOTHING
         RETURNING id`,
        prim1A.id,
        teachers[0].userId,
      );

      if (attendanceSessionRows[0]) {
        const sessionId = attendanceSessionRows[0].id;
        const studentsInPrim1A = createdStudents.filter((s) => s.sectionId === prim1A.id);
        const statuses = ['present', 'absent', 'late'];
        for (let i = 0; i < studentsInPrim1A.length; i++) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "${DEMO_SCHEMA}".attendance_records
               (session_id, student_id, status, recorded_by)
             VALUES ($1::uuid, $2::uuid, $3, $4::uuid)
             ON CONFLICT DO NOTHING`,
            sessionId,
            studentsInPrim1A[i].id,
            statuses[i] ?? 'present',
            teachers[0].userId,
          );
        }
      }

      return {
        ok: true,
        organization: {
          id: org.id,
          name: org.name,
          subdomain: org.subdomain,
        },
        credentials: {
          ceo: { email: DEMO_CEO_EMAIL, password: DEMO_CEO_PASSWORD },
        },
        summary: {
          teachers: teachers.length,
          students: createdStudents.length,
          sections: sections.length,
          subjects: subjects.length,
          courses: courses.length,
        },
      };
    } catch (err) {
      // ⚠️ Rollback manual: limpiar todo lo que se haya creado
      console.error('❌ Error en seedDemoData, limpiando datos parciales...', err);

      try {
        // 1. Borrar membresías del colegio demo
        await prisma.$executeRawUnsafe(
          `DELETE FROM public.organization_users
           WHERE organization_id IN (
             SELECT id FROM public.organizations WHERE subdomain = $1
           )`,
          DEMO_SUBDOMAIN,
        );

        // 2. Borrar organización demo
        await prisma.$executeRawUnsafe(
          `DELETE FROM public.organizations WHERE subdomain = $1`,
          DEMO_SUBDOMAIN,
        );

        // 3. Borrar usuarios demo que quedaron huérfanos (sin membresías)
        //    Los emails demo siguen un patrón predecible.
        await prisma.$executeRawUnsafe(
          `DELETE FROM public.users
           WHERE email = $1
              OR email LIKE '%@demo.pe'`,
          DEMO_CEO_EMAIL,
        );

        // 4. Dropear el schema del tenant
        await prisma.$executeRawUnsafe(
          `DROP SCHEMA IF EXISTS "${DEMO_SCHEMA}" CASCADE`,
        );

        console.log('✅ Limpieza completada tras error en seedDemoData');
      } catch (cleanupErr) {
        console.error('⚠️ Error durante la limpieza del seed demo:', cleanupErr);
      }

      // Re-lanzar el error original para que el controller lo maneje
      throw err;
    }
  },
};