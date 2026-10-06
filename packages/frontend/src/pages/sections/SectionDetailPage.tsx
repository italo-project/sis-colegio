import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  BookOpen,
  CalendarCheck,
  UserCog,
  Award,
} from 'lucide-react';
import { sectionsApi } from '@/api/sections.api';
import { StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

type Tab = 'students' | 'courses';

export const SectionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('students');

  const { data: detail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['section-detail', id],
    queryFn: () => sectionsApi.getDetail(id!),
    enabled: !!id,
  });

  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['section-students', id],
    queryFn: () => sectionsApi.listStudents(id!),
    enabled: !!id && tab === 'students',
  });

  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ['section-courses', id],
    queryFn: () => sectionsApi.listCourses(id!),
    enabled: !!id && tab === 'courses',
  });

  if (isLoadingDetail) {
    return <div className="p-12 text-center text-gray-500">Cargando sección...</div>;
  }

  if (!detail) {
    return (
      <div className="p-12 text-center text-gray-500">Sección no encontrada</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/sections"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Secciones
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {detail.gradeLevel.name} "{detail.name}"
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Año escolar {detail.academicYear.year}
              {detail.capacity && ` · Capacidad: ${detail.capacity}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={`/my-sections/${detail.id}/attendance`}>
              <Button variant="secondary" icon={<CalendarCheck className="w-4 h-4" />}>
                Ver asistencias
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Alumnos"
          value={detail.studentsCount}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Cursos"
          value={detail.coursesCount}
          icon={<BookOpen className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Estado"
          value={detail.isActive ? 'Activa' : 'Inactiva'}
          icon={<Award className="w-5 h-5" />}
          color={detail.isActive ? 'green' : 'yellow'}
        />
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Tutor</span>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          {detail.tutor ? (
            <div className="flex items-center gap-3">
              <Avatar src={null} name={detail.tutor.fullName ?? 'Tutor'} size="sm" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {detail.tutor.fullName}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {detail.tutor.email}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">Sin tutor asignado</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-100 px-5">
          <div className="flex gap-1">
            <button
              onClick={() => setTab('students')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'students'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Alumnos ({detail.studentsCount})
            </button>
            <button
              onClick={() => setTab('courses')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'courses'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Cursos ({detail.coursesCount})
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* Tab: Alumnos */}
          {tab === 'students' && (
            <>
              {isLoadingStudents ? (
                <div className="p-12 text-center text-gray-500 text-sm">Cargando alumnos...</div>
              ) : !students || students.items.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-sm">
                  Esta sección no tiene alumnos matriculados aún.
                </div>
              ) : (
                <div className="overflow-x-auto -mx-5 -mb-5">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left font-medium px-5 py-3">Alumno</th>
                        <th className="text-left font-medium px-5 py-3">DNI</th>
                        <th className="text-left font-medium px-5 py-3">Email</th>
                        <th className="text-left font-medium px-5 py-3">Teléfono</th>
                        <th className="text-left font-medium px-5 py-3">Cuenta</th>
                        <th className="text-left font-medium px-5 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {students.items.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={null}
                                name={`${s.firstName} ${s.lastName}`}
                                size="sm"
                              />
                              <div className="font-medium text-gray-900">
                                {s.lastName}, {s.firstName}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-600">{s.dni}</td>
                          <td className="px-5 py-3 text-gray-600">{s.email ?? '—'}</td>
                          <td className="px-5 py-3 text-gray-600">{s.phone ?? '—'}</td>
                          <td className="px-5 py-3">
                            {s.hasAccount ? (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                Sí
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                No
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {s.isActive ? (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                Inactivo
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Tab: Cursos */}
          {tab === 'courses' && (
            <>
              {isLoadingCourses ? (
                <div className="p-12 text-center text-gray-500 text-sm">Cargando cursos...</div>
              ) : !courses || courses.items.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-sm">
                  Esta sección no tiene cursos creados.
                </div>
              ) : (
                <div className="overflow-x-auto -mx-5 -mb-5">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left font-medium px-5 py-3">Asignatura</th>
                        <th className="text-left font-medium px-5 py-3">Docente</th>
                        <th className="text-left font-medium px-5 py-3">Horas/sem</th>
                        <th className="text-left font-medium px-5 py-3">Alumnos</th>
                        <th className="text-left font-medium px-5 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {courses.items.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3">
                            <div className="font-medium text-gray-900">
                              {c.subject.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {c.subject.code}
                              {c.subject.area && ` · ${c.subject.area}`}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {c.teacher.lastName}, {c.teacher.firstName}
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {c.weeklyHours ?? '—'}
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {c.studentsCount}
                          </td>
                          <td className="px-5 py-3">
                            {c.isActive ? (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                Inactivo
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};