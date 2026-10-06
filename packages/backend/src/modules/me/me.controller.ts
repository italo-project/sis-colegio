import { Request, Response } from 'express';
import { teachersRepository } from '../teachers/teachers.repository';
import { studentsRepository } from '../students/students.repository';
import { parentsRepository } from '../parents/parents.repository';
import { coursesRepository } from '../courses/courses.repository';
import { enrollmentsRepository } from '../enrollments/enrollments.repository';
import { studentParentsRepository } from '../student-parents/student-parents.repository';
import { attendanceRecordsRepository } from '../attendance/attendance.repository';
import { invoicesRepository, paymentsRepository } from '../finance/finance.repository';
import { reportsRepository } from '../finance/finance.repository';
import { verifyPassword, hashPassword } from '../../utils/password';
import { prisma } from '../../config/prisma';     
import {
  updateCeoProfileSchema,
  updatePasswordSchema,
  updatePhoneSchema,
} from './me.schemas';


import {
  computeAttendanceSummary,
  getStudentAttendanceReport,
} from '../attendance/attendance-query.controller';
import { getStudentCourseGrades, getStudentGradesReport } from '../grades/grades-query.controller';
import { getStringParam } from '../../utils/params';

export const meController = {
  async myCourses(req: Request, res: Response) {
    const user = req.user!;

    if (user.role === 'docente') {
      const teacher = await teachersRepository.findByUserId(req.tenant!.schemaName, user.userId);
      if (!teacher) {
        return res.status(404).json({ error: 'No estás registrado como docente en este colegio' });
      }
      const courses = await coursesRepository.listByTeacher(req.tenant!.schemaName, teacher.id);
      return res.json({ items: courses, total: courses.length });
    }

    if (user.role === 'estudiante') {
      const student = await studentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
      if (!student) {
        return res.status(404).json({ error: 'No estás registrado como estudiante en este colegio' });
      }
      const enrollments = await enrollmentsRepository.listByStudent(
        req.tenant!.schemaName,
        student.id,
      );
      return res.json({ items: enrollments, total: enrollments.length });
    }

    if (user.role === 'ceo') {
      const result = await coursesRepository.list(req.tenant!.schemaName, {
        limit: 200,
        offset: 0,
        active: 'true',
      });
      return res.json(result);
    }

    return res.status(403).json({ error: 'Rol no autorizado para este endpoint' });
  },

  async myProfile(req: Request, res: Response) {
    const user = req.user!;

    if (user.role === 'docente') {
      const teacher = await teachersRepository.findByUserId(req.tenant!.schemaName, user.userId);
      return res.json({
        role: 'docente',
        tenant: { subdomain: req.tenant!.subdomain, name: req.tenant!.name },
        profile: teacher,
      });
    }

    if (user.role === 'estudiante') {
      const student = await studentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
      return res.json({
        role: 'estudiante',
        tenant: { subdomain: req.tenant!.subdomain, name: req.tenant!.name },
        profile: student,
      });
    }

    if (user.role === 'padre') {
      const parent = await parentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
      return res.json({
        role: 'padre',
        tenant: { subdomain: req.tenant!.subdomain, name: req.tenant!.name },
        profile: parent,
      });
    }

    return res.json({
      role: user.role,
      tenant: { subdomain: req.tenant!.subdomain, name: req.tenant!.name },
      profile: null,
    });
  },

  // ── Hijos ──────────────────────────────────────────────────
  async myChildren(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'padre') {
      return res.status(403).json({ error: 'Solo disponible para padres' });
    }

    const parent = await parentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!parent) {
      return res.status(404).json({ error: 'No estás registrado como padre en este colegio' });
    }

    const links = await studentParentsRepository.listByParent(req.tenant!.schemaName, parent.id);

    const children = links.map((link) => ({
      studentId: link.student.id,
      firstName: link.student.firstName,
      lastName: link.student.lastName,
      dni: link.student.dni,
      relationship: link.relationship,
      isPrimary: link.isPrimary,
    }));

    res.json({ items: children, total: children.length });
  },

  async myChildDetail(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'padre') {
      return res.status(403).json({ error: 'Solo disponible para padres' });
    }

    const childId = getStringParam(req, res, 'id');
    if (!childId) return;

    const parent = await parentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!parent) {
      return res.status(404).json({ error: 'No estás registrado como padre en este colegio' });
    }

    const link = await studentParentsRepository.findByStudentAndParent(
      req.tenant!.schemaName,
      childId,
      parent.id,
    );
    if (!link) {
      return res.status(404).json({ error: 'Este estudiante no está vinculado a tu cuenta' });
    }

    const student = await studentsRepository.findById(req.tenant!.schemaName, childId);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

    res.json({
      relationship: link.relationship,
      isPrimary: link.isPrimary,
      student,
    });
  },

  async myChildCourses(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'padre') {
      return res.status(403).json({ error: 'Solo disponible para padres' });
    }

    const childId = getStringParam(req, res, 'id');
    if (!childId) return;

    const parent = await parentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!parent) {
      return res.status(404).json({ error: 'No estás registrado como padre en este colegio' });
    }

    const link = await studentParentsRepository.findByStudentAndParent(
      req.tenant!.schemaName,
      childId,
      parent.id,
    );
    if (!link) {
      return res.status(404).json({ error: 'Este estudiante no está vinculado a tu cuenta' });
    }

    const enrollments = await enrollmentsRepository.listByStudent(
      req.tenant!.schemaName,
      childId,
    );
    res.json({ items: enrollments, total: enrollments.length });
  },

  // ── Notas ──────────────────────────────────────────────────
  async myGrades(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'estudiante') {
      return res.status(403).json({ error: 'Solo disponible para estudiantes' });
    }

    const student = await studentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!student) {
      return res.status(404).json({ error: 'No estás registrado como estudiante en este colegio' });
    }

    const report = await getStudentGradesReport(req.tenant!.schemaName, student.id);
    res.json(report);
  },

  async myCourseGrades(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'estudiante') {
      return res.status(403).json({ error: 'Solo disponible para estudiantes' });
    }

    const courseId = getStringParam(req, res, 'courseId');
    if (!courseId) return;

    const student = await studentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!student) {
      return res.status(404).json({ error: 'No estás registrado como estudiante en este colegio' });
    }

    try {
      const report = await getStudentCourseGrades(
        req.tenant!.schemaName,
        student.id,
        courseId,
      );
      res.json(report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al obtener notas';
      const status = msg.includes('no matriculado') ? 403 : 404;
      return res.status(status).json({ error: msg });
    }
  },

  async myChildGrades(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'padre') {
      return res.status(403).json({ error: 'Solo disponible para padres' });
    }

    const childId = getStringParam(req, res, 'id');
    if (!childId) return;

    const parent = await parentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!parent) {
      return res.status(404).json({ error: 'No estás registrado como padre en este colegio' });
    }

    const link = await studentParentsRepository.findByStudentAndParent(
      req.tenant!.schemaName,
      childId,
      parent.id,
    );
    if (!link) {
      return res.status(404).json({ error: 'Este estudiante no está vinculado a tu cuenta' });
    }

    const report = await getStudentGradesReport(req.tenant!.schemaName, childId);
    res.json(report);
  },

  async myChildCourseGrades(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'padre') {
      return res.status(403).json({ error: 'Solo disponible para padres' });
    }

    const childId = getStringParam(req, res, 'id');
    if (!childId) return;
    const courseId = getStringParam(req, res, 'courseId');
    if (!courseId) return;

    const parent = await parentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!parent) {
      return res.status(404).json({ error: 'No estás registrado como padre en este colegio' });
    }

    const link = await studentParentsRepository.findByStudentAndParent(
      req.tenant!.schemaName,
      childId,
      parent.id,
    );
    if (!link) {
      return res.status(404).json({ error: 'Este estudiante no está vinculado a tu cuenta' });
    }

    try {
      const report = await getStudentCourseGrades(
        req.tenant!.schemaName,
        childId,
        courseId,
      );
      res.json(report);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al obtener notas';
      const status = msg.includes('no matriculado') ? 403 : 404;
      return res.status(status).json({ error: msg });
    }
  },

  // ── Asistencia ─────────────────────────────────────────────
  async myAttendance(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'estudiante') {
      return res.status(403).json({ error: 'Solo disponible para estudiantes' });
    }

    const student = await studentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!student) {
      return res.status(404).json({ error: 'No estás registrado como estudiante en este colegio' });
    }

    const report = await getStudentAttendanceReport(req.tenant!.schemaName, student.id);
    res.json(report);
  },

  async myAttendanceBySection(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'estudiante') {
      return res.status(403).json({ error: 'Solo disponible para estudiantes' });
    }

    const sectionId = getStringParam(req, res, 'sectionId');
    if (!sectionId) return;

    const student = await studentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!student) {
      return res.status(404).json({ error: 'No estás registrado como estudiante en este colegio' });
    }

    const history = await attendanceRecordsRepository.historyByStudent(
      req.tenant!.schemaName,
      student.id,
      sectionId,
    );
    const summary = computeAttendanceSummary(history);

    res.json({
      studentId: student.id,
      sectionId,
      summary,
      history,
    });
  },

  async myChildAttendance(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'padre') {
      return res.status(403).json({ error: 'Solo disponible para padres' });
    }

    const childId = getStringParam(req, res, 'id');
    if (!childId) return;

    const parent = await parentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!parent) {
      return res.status(404).json({ error: 'No estás registrado como padre en este colegio' });
    }

    const link = await studentParentsRepository.findByStudentAndParent(
      req.tenant!.schemaName,
      childId,
      parent.id,
    );
    if (!link) {
      return res.status(404).json({ error: 'Este estudiante no está vinculado a tu cuenta' });
    }

    const report = await getStudentAttendanceReport(req.tenant!.schemaName, childId);
    res.json(report);
  },

  async myChildAttendanceBySection(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'padre') {
      return res.status(403).json({ error: 'Solo disponible para padres' });
    }

    const childId = getStringParam(req, res, 'id');
    if (!childId) return;
    const sectionId = getStringParam(req, res, 'sectionId');
    if (!sectionId) return;

    const parent = await parentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!parent) {
      return res.status(404).json({ error: 'No estás registrado como padre en este colegio' });
    }

    const link = await studentParentsRepository.findByStudentAndParent(
      req.tenant!.schemaName,
      childId,
      parent.id,
    );
    if (!link) {
      return res.status(404).json({ error: 'Este estudiante no está vinculado a tu cuenta' });
    }

    const history = await attendanceRecordsRepository.historyByStudent(
      req.tenant!.schemaName,
      childId,
      sectionId,
    );
    const summary = computeAttendanceSummary(history);

    res.json({
      studentId: childId,
      sectionId,
      summary,
      history,
    });
  },
    /**
   * GET /api/me/invoices
   * Facturas de todos los hijos del padre autenticado.
   */
  async myInvoices(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'padre') {
      return res.status(403).json({ error: 'Solo disponible para padres' });
    }

    const parent = await parentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!parent) {
      return res.status(404).json({ error: 'No estás registrado como padre en este colegio' });
    }

    const links = await studentParentsRepository.listByParent(req.tenant!.schemaName, parent.id);
    const childIds = links.map((l) => l.student.id);

    if (childIds.length === 0) {
      return res.json({ items: [], total: 0 });
    }

    const allInvoices = [];
    for (const childId of childIds) {
      const result = await invoicesRepository.listByStudent(req.tenant!.schemaName, childId);
      allInvoices.push(...result.items);
    }

    // Ordenar por fecha de vencimiento descendente
    allInvoices.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

    res.json({ items: allInvoices, total: allInvoices.length });
  },

  /**
   * GET /api/me/invoices/:id
   * Detalle de una factura, validando que sea de un hijo del padre autenticado.
   */
  async myInvoiceDetail(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'padre') {
      return res.status(403).json({ error: 'Solo disponible para padres' });
    }

    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parent = await parentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!parent) {
      return res.status(404).json({ error: 'No estás registrado como padre en este colegio' });
    }

    const invoice = await invoicesRepository.findDetailedById(req.tenant!.schemaName, id);
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

    // Validar que el estudiante de la factura sea hijo del padre
    const link = await studentParentsRepository.findByStudentAndParent(
      req.tenant!.schemaName,
      invoice.studentId,
      parent.id,
    );
    if (!link) {
      return res.status(404).json({ error: 'Esta factura no pertenece a tus hijos' });
    }

    const payments = await paymentsRepository.listByInvoice(req.tenant!.schemaName, id);
    res.json({ ...invoice, payments });
  },
    /**
   * GET /api/me/payments
   * Historial de pagos de todos los hijos del padre autenticado.
   */
  async myPayments(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'padre') {
      return res.status(403).json({ error: 'Solo disponible para padres' });
    }

    const parent = await parentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!parent) {
      return res.status(404).json({ error: 'No estás registrado como padre en este colegio' });
    }

    const links = await studentParentsRepository.listByParent(req.tenant!.schemaName, parent.id);
    const childIds = links.map((l) => l.student.id);

    if (childIds.length === 0) {
      return res.json({ items: [], total: 0 });
    }

    const allPayments = [];
    for (const childId of childIds) {
      const statement = await reportsRepository.studentStatement(
        req.tenant!.schemaName,
        childId,
      );
      const student = links.find((l) => l.student.id === childId)?.student;
      for (const p of statement.payments) {
        allPayments.push({
          ...p,
          studentId: childId,
          student: student
            ? { firstName: student.firstName, lastName: student.lastName }
            : null,
        });
      }
    }

    allPayments.sort((a, b) => {
      const da = a.paidAt ? new Date(a.paidAt).getTime() : 0;
      const db = b.paidAt ? new Date(b.paidAt).getTime() : 0;
      return db - da;
    });

    res.json({ items: allPayments, total: allPayments.length });
  },

  /**
   * GET /api/me/children/:id/payments
   * Historial de pagos de un hijo específico.
   */
  async myChildPayments(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'padre') {
      return res.status(403).json({ error: 'Solo disponible para padres' });
    }

    const childId = getStringParam(req, res, 'id');
    if (!childId) return;

    const parent = await parentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!parent) {
      return res.status(404).json({ error: 'No estás registrado como padre en este colegio' });
    }

    const link = await studentParentsRepository.findByStudentAndParent(
      req.tenant!.schemaName,
      childId,
      parent.id,
    );
    if (!link) {
      return res.status(404).json({ error: 'Este estudiante no está vinculado a tu cuenta' });
    }

    const statement = await reportsRepository.studentStatement(
      req.tenant!.schemaName,
      childId,
    );

    res.json({
      studentId: childId,
      summary: statement.summary,
      payments: statement.payments,
    });
  },

    /**
   * GET /api/me/full-profile
   * Devuelve el perfil completo del usuario autenticado según su rol.
   */
  async fullProfile(req: Request, res: Response) {
    const user = req.user!;
    const schema = req.tenant!.schemaName;

    // Datos globales del usuario
    const globalUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        isSuperAdmin: true,
      },
    });

    if (!globalUser) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Datos específicos del rol
    let roleData: unknown = null;

    if (user.role === 'ceo') {
      // El CEO no tiene tabla propia, solo datos en users + organization
      roleData = null;
    } else if (user.role === 'docente') {
      roleData = await teachersRepository.findByUserId(schema, user.userId);
    } else if (user.role === 'estudiante') {
      roleData = await studentsRepository.findByUserId(schema, user.userId);
    } else if (user.role === 'padre') {
      roleData = await parentsRepository.findByUserId(schema, user.userId);
    }

    res.json({
      role: user.role,
      user: globalUser,
      roleData,
      tenant: {
        id: req.tenant!.id,
        subdomain: req.tenant!.subdomain,
        name: req.tenant!.name,
      },
    });
  },

  /**
   * PATCH /api/me/phone
   * Permite a cualquier usuario actualizar su teléfono.
   */
  async updatePhone(req: Request, res: Response) {
    const user = req.user!;
    const schema = req.tenant!.schemaName;

    const parsed = updatePhoneSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const phone = parsed.data.phone;

    if (user.role === 'docente') {
      const teacher = await teachersRepository.findByUserId(schema, user.userId);
      if (!teacher) return res.status(404).json({ error: 'Docente no encontrado' });
      await teachersRepository.update(schema, teacher.id, { phone: phone ?? undefined });
    } else if (user.role === 'estudiante') {
      const student = await studentsRepository.findByUserId(schema, user.userId);
      if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });
      await studentsRepository.update(schema, student.id, { phone: phone ?? undefined });
    } else if (user.role === 'padre') {
      const parent = await parentsRepository.findByUserId(schema, user.userId);
      if (!parent) return res.status(404).json({ error: 'Padre no encontrado' });
      await parentsRepository.update(schema, parent.id, { phone: phone ?? undefined });
    } else if (user.role === 'ceo') {
      // El CEO no tiene tabla propia. Por ahora, no se puede actualizar el teléfono del CEO sin una tabla.
      return res.status(400).json({
        error: 'El CEO debe actualizar su teléfono desde el panel de super-admin',
      });
    }

    res.json({ ok: true, phone });
  },

  /**
   * PATCH /api/me/password
   * Permite al usuario cambiar su propia contraseña.
   */
  async updatePassword(req: Request, res: Response) {
    const user = req.user!;

    const parsed = updatePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
    if (!dbUser) return res.status(404).json({ error: 'Usuario no encontrado' });

    const ok = await verifyPassword(parsed.data.currentPassword, dbUser.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: user.userId },
      data: { passwordHash: newHash },
    });

    res.json({ ok: true, message: 'Contraseña actualizada' });
  },

  /**
   * PATCH /api/me/avatar
   * Sube una foto de perfil (multipart/form-data con campo "avatar").
   */
  async updateAvatar(req: Request, res: Response) {
    const user = req.user!;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    }

    // URL pública del archivo
    const avatarUrl = `/uploads/avatars/${file.filename}`;

    await prisma.user.update({
      where: { id: user.userId },
      data: { avatarUrl },
    });

    res.json({ ok: true, avatarUrl });
  },

  /**
   * DELETE /api/me/avatar
   * Elimina la foto de perfil actual.
   */
  async deleteAvatar(req: Request, res: Response) {
    const user = req.user!;

    await prisma.user.update({
      where: { id: user.userId },
      data: { avatarUrl: null },
    });

    res.json({ ok: true });
  },

  /**
   * PATCH /api/me/profile-ceo
   * Permite al CEO editar sus propios datos (nombre, email).
   */
  async updateCeoProfile(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'ceo') {
      return res.status(403).json({ error: 'Solo el CEO puede usar este endpoint' });
    }

    const parsed = updateCeoProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.fullName !== undefined) data.fullName = parsed.data.fullName;
    if (parsed.data.email !== undefined) data.email = parsed.data.email;

    if (parsed.data.email) {
      const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (existing && existing.id !== user.userId) {
        return res.status(409).json({ error: 'Ese email ya está en uso' });
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: user.userId }, data });
    }

    res.json({ ok: true });
  },

};