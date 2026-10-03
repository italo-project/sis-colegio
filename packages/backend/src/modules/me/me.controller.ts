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

};