import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Award, CalendarCheck, DollarSign } from 'lucide-react';
import { meApi } from '@/api/me.api';

export const MyChildrenPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['my-children'],
    queryFn: meApi.getMyChildren,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>;
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">
          No tienes hijos vinculados a tu cuenta. Contacta al colegio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis hijos</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data.total} hijo{data.total === 1 ? '' : 's'} vinculado{data.total === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.items.map((child) => (
          <div
            key={child.studentId}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {child.firstName[0]}
                  {child.lastName[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {child.firstName} {child.lastName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    DNI {child.dni} · {child.relationship}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <Link
                to={`/my-children/${child.studentId}/grades`}
                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <Award className="w-4 h-4" />
                Ver notas
              </Link>
              <Link
                to={`/my-children/${child.studentId}/attendance`}
                className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <CalendarCheck className="w-4 h-4" />
                Ver asistencia
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};