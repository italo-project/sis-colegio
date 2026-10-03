import { useQuery } from '@tanstack/react-query';
import { Users, GraduationCap, BookOpen, DollarSign } from 'lucide-react';
import { StatCard, Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth.store';
import { studentsApi } from '@/api/students.api';
import { apiClient } from '@/api/client';

export const CeoDashboardPage = () => {
  const { user, role } = useAuthStore();

  const { data: students } = useQuery({
    queryKey: ['students', 'count'],
    queryFn: () => studentsApi.list({ limit: 1 }),
  });

  const { data: teachers } = useQuery({
    queryKey: ['teachers', 'count'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ total: number }>('/teachers', {
        params: { limit: 1 },
      });
      return data;
    },
  });

  const { data: courses } = useQuery({
    queryKey: ['courses', 'count'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ total: number }>('/courses', {
        params: { limit: 1 },
      });
      return data;
    },
  });

  const { data: finance } = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        totalCollected: number;
        totalPending: number;
        collectionRate: number;
      }>('/finance/reports/summary');
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user?.fullName}
        </h1>
        <p className="text-gray-500 mt-1">
          Aquí tienes el resumen de tu colegio.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Estudiantes"
          value={students?.total ?? '—'}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Docentes"
          value={teachers?.total ?? '—'}
          icon={<GraduationCap className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Cursos"
          value={courses?.total ?? '—'}
          icon={<BookOpen className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Cobrado"
          value={finance ? `S/ ${finance.totalCollected.toFixed(2)}` : '—'}
          icon={<DollarSign className="w-5 h-5" />}
          color="yellow"
          subtitle={
            finance
              ? `Tasa de cobranza: ${finance.collectionRate.toFixed(1)}%`
              : undefined
          }
        />
      </div>

      <Card title="Actividad reciente">
        <p className="text-sm text-gray-500">
          El módulo de actividad se construirá en la siguiente fase.
        </p>
      </Card>
    </div>
  );
};