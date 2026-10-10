import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.routes';
import { orgRouter } from './modules/organizations/org.routes';
import { demoRouter } from './modules/tenant-demo/demo.routes';
import { studentsRouter } from './modules/students/students.routes';
import { adminMigrationsRouter } from './modules/admin/migrations.routes';
import { academicRouter } from './modules/academic/academic.routes';
import { teachersRouter } from './modules/teachers/teachers.routes';
import { subjectsRouter } from './modules/subjects/subjects.routes';
import { coursesRouter } from './modules/courses/courses.routes';
import { enrollmentsRouter } from './modules/enrollments/enrollments.routes';
import { meRouter } from './modules/me/me.routes';
import { parentsRouter } from './modules/parents/parents.routes';
import { studentParentsRouter } from './modules/student-parents/student-parents.routes';
import { gradesRouter } from './modules/grades/grades.routes';
import { attendanceRouter } from './modules/attendance/attendance.routes';
import { financeRouter } from './modules/finance/finance.routes';
import { mpRouter } from './modules/mercadopago/mp.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { whatsappRouter } from './modules/whatsapp/whatsapp.routes';

export const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
// Servir archivos subidos (fotos de perfil)
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  },
  express.static(path.join(process.cwd(), 'uploads')),
);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/organizations', orgRouter);
app.use('/api/auth', authRouter);
app.use('/api/demo', demoRouter);
app.use('/api/students', studentsRouter);
app.use('/api/academic', academicRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/enrollments', enrollmentsRouter);
app.use('/api/me', meRouter);
app.use('/api/parents', parentsRouter);
app.use('/api/student-parents', studentParentsRouter);
app.use('/api/grades', gradesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/finance', financeRouter);
app.use('/api/mercadopago', mpRouter);
app.use('/api/whatsapp', whatsappRouter);

// ⚠️ ORDEN IMPORTANTE: /api/admin/migrations va ANTES que /api/admin
app.use('/api/admin/migrations', adminMigrationsRouter);
app.use('/api/admin', adminRouter);

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Error en', req.method, req.path, '→', err?.message || err);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Error interno del servidor' });
});