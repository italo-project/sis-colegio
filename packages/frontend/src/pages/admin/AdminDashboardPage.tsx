import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Users,
  GraduationCap,
  DollarSign,
  Trash2,
  AlertTriangle,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { StatCard, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ResetAllDataModal } from './ResetAllDataModal';
import { getErrorMessage } from '@/api/client';

export const AdminDashboardPage = () => {
  const queryClient = useQueryClient();
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.globalStats,
  });

  const seedMutation = useMutation({
    mutationFn: adminApi.seedDemo,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setToast({
        type: 'success',
        msg: `Datos de prueba creados: ${data.summary.students} estudiantes, ${data.summary.courses} cursos, ${data.summary.sections} secciones.`,
      });
      alert(
        `✅ Colegio Demo creado\n\n` +
          `URL: demo.localhost:5173\n` +
          `CEO: ${data.credentials.ceo.email}\n` +
          `Contraseña: ${data.credentials.ceo.password}\n\n` +
          `Docentes: juan.docente@demo.pe / maria.docente@demo.pe\n` +
          `Contraseña docentes: Docente123!\n\n` +
          `Estudiantes: ana.torres@demo.pe, carlos.gomez@demo.pe, etc.\n` +
          `Contraseña estudiantes: Estudiante123!`,
      );
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const handleSeedDemo = () => {
    const hasData = (stats?.organizations.total ?? 0) > 0;
    const msg = hasData
      ? 'Ya existen colegios en el sistema. ¿Quieres agregar el Colegio Demo de todas formas?'
      : '¿Crear el Colegio Demo con datos de prueba?';
    if (confirm(msg)) {
      seedMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`rounded-lg p-3 text-sm flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel global del SaaS</h1>
          <p className="text-sm text-gray-500 mt-1">Métricas de todos los colegios</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={handleSeedDemo}
            loading={seedMutation.isPending}
          >
            Cargar datos de prueba
          </Button>
          <Button
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => setIsResetOpen(true)}
          >
            Reset total
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Colegios"
          value={stats?.organizations.total ?? '—'}
          icon={<Building2 className="w-5 h-5" />}
          color="blue"
          subtitle={stats ? `${stats.organizations.active} activos` : undefined}
        />
        <StatCard
          title="Alumnos"
          value={stats?.students ?? '—'}
          icon={<Users className="w-5 h-5" />}
          color="green"
          subtitle="En todos los colegios"
        />
        <StatCard
          title="Docentes"
          value={stats?.teachers ?? '—'}
          icon={<GraduationCap className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Cobrado (global)"
          value={stats ? `S/ ${stats.finance.totalCollected.toFixed(2)}` : '—'}
          icon={<DollarSign className="w-5 h-5" />}
          color="yellow"
        />
      </div>

      <Card title="Resumen">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Usuarios registrados</div>
            <div className="text-2xl font-bold text-gray-900">{stats?.users ?? '—'}</div>
          </div>
          <div>
            <div className="text-gray-500">Por cobrar (global)</div>
            <div className="text-2xl font-bold text-orange-600">
              S/ {(stats?.finance.totalPending ?? 0).toFixed(2)}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Herramientas de prueba">
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-blue-900 mb-1">
                Cargar datos de prueba
              </div>
              <p className="text-sm text-blue-800 mb-3">
                Crea un colegio demo (<code>demo.localhost:5173</code>) con CEO, docentes,
                estudiantes, apoderados, cursos, notas y asistencia de ejemplo.
              </p>
              <Button
                variant="secondary"
                size="sm"
                icon={<Sparkles className="w-4 h-4" />}
                onClick={handleSeedDemo}
                loading={seedMutation.isPending}
              >
                Cargar datos de prueba
              </Button>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-800 mb-1">
                Borrar todos los datos de la plataforma
              </div>
              <p className="text-sm text-red-700 mb-3">
                Elimina todos los colegios, usuarios, notas, asistencias, facturas y pagos.
                Solo conserva tu cuenta de super-admin. <strong>No se puede deshacer.</strong>
              </p>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => setIsResetOpen(true)}
              >
                Reset total
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <ResetAllDataModal
        open={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onSuccess={(result) => {
          setIsResetOpen(false);
          queryClient.invalidateQueries({ queryKey: ['admin'] });
          setToast({
            type: 'success',
            msg: `Se borraron ${result.deletedOrganizations} colegio(s) y ${result.droppedSchemas.length} esquema(s).`,
          });
        }}
      />
    </div>
  );
};