import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, CalendarCheck, ArrowRight, Eye, Lock } from 'lucide-react';
import { meApi } from '@/api/me.api';
import { useAuthStore } from '@/stores/auth.store';

export const MySectionsPage = () => {
  const role = useAuthStore((s) => s.role);

  const { data, isLoading } = useQuery({
    queryKey: ['my-sections'],
    queryFn: meApi.getMySections,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>;
  }

  if (!data || data.items.length === 0) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 text-sm mb-1">
        {role === 'ceo'
          ? 'No hay secciones registradas en el colegio.'
          : 'No tienes cursos asignados en ninguna sección.'}
      </p>
      <p className="text-xs text-gray-400">
        {role === 'ceo'
          ? 'Crea secciones desde el módulo "Secciones".'
          : 'Contacta al CEO si crees que es un error.'}
      </p>
    </div>
  );
}

  const isCeo = role === 'ceo';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isCeo ? 'Secciones del colegio' : 'Mis secciones'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {data.total} sección{data.total === 1 ? '' : 'es'}
          {!isCeo && ' donde enseñas'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.items.map((section) => (
          <div
            key={section.sectionId}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-white">
              <div className="flex items-start justify-between mb-2">
                <span
                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                    section.isTutor
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {section.isTutor ? 'Tutor' : 'Docente'}
                </span>
                <span className="text-xs text-gray-500">
                  {section.academicYear.year}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {section.gradeLevel.name} "{section.sectionName}"
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {section.coursesCount} curso{section.coursesCount === 1 ? '' : 's'} aquí
                {section.capacity && ` · Capacidad: ${section.capacity}`}
              </p>
            </div>

            <div className="p-4">
              <Link
                to={`/my-sections/${section.sectionId}/attendance`}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      section.isTutor
                        ? 'bg-green-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    {section.isTutor ? (
                      <CalendarCheck className="w-5 h-5 text-green-600" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {section.isTutor ? 'Asistencias' : 'Ver asistencias'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {section.isTutor
                        ? 'Tomar y ver asistencia del aula'
                        : 'Solo lectura (no eres tutor)'}
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </Link>

              {!section.isTutor && (
                <div className="mt-3 flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                  <Lock className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>
                    Solo el tutor de la sección o el CEO pueden tomar asistencia.
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};