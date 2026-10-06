import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { meController } from './me.controller';
import { avatarUpload } from '../../middleware/upload';

export const meRouter = Router();

meRouter.use(resolveTenant, requireAuth);

// Perfil y cursos
meRouter.get('/courses', meController.myCourses);
meRouter.get('/profile', meController.myProfile);
meRouter.get('/full-profile', meController.fullProfile);

// Edición de perfil
meRouter.patch('/phone', meController.updatePhone);
meRouter.patch('/password', meController.updatePassword);
meRouter.patch('/profile-ceo', meController.updateCeoProfile);

// Foto de perfil
meRouter.patch('/avatar', avatarUpload.single('avatar'), meController.updateAvatar);
meRouter.delete('/avatar', meController.deleteAvatar);

// Hijos (padre)
meRouter.get('/children', meController.myChildren);
meRouter.get('/children/:id', meController.myChildDetail);
meRouter.get('/children/:id/courses', meController.myChildCourses);
meRouter.get('/children/:id/grades', meController.myChildGrades);
meRouter.get('/children/:id/grades/courses/:courseId', meController.myChildCourseGrades);

// Notas del estudiante autenticado
meRouter.get('/grades', meController.myGrades);
meRouter.get('/grades/courses/:courseId', meController.myCourseGrades);

// Asistencia
meRouter.get('/attendance', meController.myAttendance);
meRouter.get('/attendance/sections/:sectionId', meController.myAttendanceBySection);
meRouter.get('/children/:id/attendance', meController.myChildAttendance);
meRouter.get('/children/:id/attendance/sections/:sectionId', meController.myChildAttendanceBySection);

// Pagos
meRouter.get('/invoices', meController.myInvoices);
meRouter.get('/invoices/:id', meController.myInvoiceDetail);
meRouter.get('/payments', meController.myPayments);
meRouter.get('/children/:id/payments', meController.myChildPayments);