import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { StudentsListPage } from '@/pages/students/StudentsListPage';
import { TeachersListPage } from '@/pages/teachers/TeachersListPage';
import { ParentsListPage } from '@/pages/parents/ParentsListPage';
import { SubjectsListPage } from '@/pages/subjects/SubjectsListPage';
import { CoursesListPage } from '@/pages/courses/CoursesListPage';
import { SectionsListPage } from '@/pages/sections/SectionsListPage';
import { EnrollmentsListPage } from '@/pages/enrollments/EnrollmentsListPage';
import { FinanceDashboardPage } from '@/pages/finance/FinanceDashboardPage';
import { FeeConceptsPage } from '@/pages/finance/FeeConceptsPage';
import { InvoicesListPage } from '@/pages/finance/InvoicesListPage';
import { MyCoursesPage as TeacherMyCoursesPage } from '@/pages/teacher/MyCoursesPage';
import { CourseGradesPage } from '@/pages/teacher/CourseGradesPage';
import { CourseAttendancePage } from '@/pages/teacher/CourseAttendancePage';
import { MyGradesPage as StudentMyGradesPage } from '@/pages/student/MyGradesPage';
import { MyAttendancePage as StudentMyAttendancePage } from '@/pages/student/MyAttendancePage';
import { StudentMyCoursesPage } from '@/pages/student/MyCoursesPage';
import { MyChildrenPage } from '@/pages/parent/MyChildrenPage';
import { ChildGradesPage } from '@/pages/parent/ChildGradesPage';
import { ChildAttendancePage } from '@/pages/parent/ChildAttendancePage';
import { MyPaymentsPage } from '@/pages/parent/MyPaymentsPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { OrganizationsListPage } from '@/pages/admin/OrganizationsListPage';
import { OrganizationDetailPage } from '@/pages/admin/OrganizationDetailPage';
import { AdminLayout } from '@/layouts/AdminLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { UsersListPage } from '@/pages/admin/UsersListPage';
import { AuditLogsPage } from '@/pages/admin/AuditLogsPage';

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login normal de colegios */}
        <Route path="/login" element={<LoginPage />} />

        {/* Login de super-admin */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Rutas del panel super-admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="organizations" element={<OrganizationsListPage />} />
          <Route path="organizations/:id" element={<OrganizationDetailPage />} />
          <Route path="users" element={<UsersListPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
        </Route>

        {/* Rutas de colegios (CEO, docente, estudiante, padre) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* CEO */}
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['ceo', 'docente']}>
                  <StudentsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers"
              element={
                <ProtectedRoute allowedRoles={['ceo']}>
                  <TeachersListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parents"
              element={
                <ProtectedRoute allowedRoles={['ceo']}>
                  <ParentsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/subjects"
              element={
                <ProtectedRoute allowedRoles={['ceo']}>
                  <SubjectsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses"
              element={
                <ProtectedRoute allowedRoles={['ceo']}>
                  <CoursesListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sections"
              element={
                <ProtectedRoute allowedRoles={['ceo']}>
                  <SectionsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/enrollments"
              element={
                <ProtectedRoute allowedRoles={['ceo']}>
                  <EnrollmentsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance"
              element={
                <ProtectedRoute allowedRoles={['ceo']}>
                  <FinanceDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/concepts"
              element={
                <ProtectedRoute allowedRoles={['ceo']}>
                  <FeeConceptsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance/invoices"
              element={
                <ProtectedRoute allowedRoles={['ceo']}>
                  <InvoicesListPage />
                </ProtectedRoute>
              }
            />

            {/* Docente */}
            <Route
              path="/my-courses"
              element={
                <ProtectedRoute allowedRoles={['docente']}>
                  <TeacherMyCoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-courses/:courseId/grades"
              element={
                <ProtectedRoute allowedRoles={['docente']}>
                  <CourseGradesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-courses/:courseId/attendance"
              element={
                <ProtectedRoute allowedRoles={['docente']}>
                  <CourseAttendancePage />
                </ProtectedRoute>
              }
            />

            {/* Estudiante */}
            <Route
              path="/my-grades"
              element={
                <ProtectedRoute allowedRoles={['estudiante']}>
                  <StudentMyGradesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-attendance"
              element={
                <ProtectedRoute allowedRoles={['estudiante']}>
                  <StudentMyAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-courses-student"
              element={
                <ProtectedRoute allowedRoles={['estudiante']}>
                  <StudentMyCoursesPage />
                </ProtectedRoute>
              }
            />

            {/* Padre */}
            <Route
              path="/my-children"
              element={
                <ProtectedRoute allowedRoles={['padre']}>
                  <MyChildrenPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-children/:childId/grades"
              element={
                <ProtectedRoute allowedRoles={['padre']}>
                  <ChildGradesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-children/:childId/attendance"
              element={
                <ProtectedRoute allowedRoles={['padre']}>
                  <ChildAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-invoices"
              element={
                <ProtectedRoute allowedRoles={['padre']}>
                  <MyPaymentsPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
};