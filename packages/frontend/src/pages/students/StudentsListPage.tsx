import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, KeyRound, RotateCcw, AlertTriangle } from 'lucide-react';
import { studentsApi } from '@/api/students.api';
import { Button } from '@/components/ui/Button';
import { StatusFilter, type FilterValue } from '@/components/ui/StatusFilter';
import { StudentFormModal } from './StudentFormModal.tsx';
import { CreateAccountModal } from './CreateAccountModal.tsx';
import { getErrorMessage } from '@/api/client';
import type { Student } from '@/types/student';

export const StudentsListPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterValue>('active');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [accountFor, setAccountFor] = useState<Student | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Mapear el filtro a lo que espera el backend
  const activeParam: 'true' | 'false' | undefined =
    statusFilter === 'active' ? 'true' : statusFilter === 'inactive' ? 'false' : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['students', search, statusFilter],
    queryFn: () =>
      studentsApi.list({
        q: search || undefined,
        active: activeParam,
        limit: 100,
        offset: 0,
      }),
  });

  const deactivateMutation = useMutation({
    mutationFn: studentsApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setToast({ type: 'success', msg: 'Estudiante desactivado' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const reactivateMutation = useMutation({
    mutationFn: studentsApi.reactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setToast({ type: 'success', msg: 'Estudiante reactivado' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: studentsApi.hardDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setToast({ type: 'success', msg: 'Estudiante eliminado definitivamente' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const handleEdit = (student: Student) => {
    setEditing(student);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditing(null);
  };

  const handleDeactivate = (student: Student) => {
    if (
      confirm(
        `¿Desactivar a ${student.firstName} ${student.lastName}?\n\nNo se eliminará, solo quedará inactivo.`,
      )
    ) {
      deactivateMutation.mutate(student.id);
    }
  };

  const handleReactivate = (student: Student) => {
    if (confirm(`¿Reactivar a ${student.firstName} ${student.lastName}?`)) {
      reactivateMutation.mutate(student.id);
    }
  };

  const handleHardDelete = async (student: Student) => {
    try {
      const detail = await studentsApi.getById(student.id);

      if (!detail.canBeDeleted) {
        const bd = detail.relatedBreakdown;
        const detalles: string[] = [];
        if (bd?.enrollments) detalles.push(`${bd.enrollments} matrícula(s)`);
        if (bd?.invoices) detalles.push(`${bd.invoices} factura(s)`);
        if (bd?.payments) detalles.push(`${bd.payments} pago(s)`);
        if (bd?.attendance) detalles.push(`${bd.attendance} asistencia(s)`);
        if (bd?.gradeEntries) detalles.push(`${bd.gradeEntries} nota(s)`);
        if (bd?.parents) detalles.push(`${bd.parents} vínculo(s) con padres`);

        alert(
          `No se puede eliminar a ${student.firstName} ${student.lastName}.\n\n` +
            `Tiene datos asociados:\n• ${detalles.join('\n• ')}\n\n` +
            `Solución: desactívalo en lugar de eliminarlo.`,
        );
        return;
      }

      if (
        confirm(
          `¿Eliminar DEFINITIVAMENTE a ${student.firstName} ${student.lastName}?\n\n` +
            `Esta acción NO se puede deshacer.`,
        )
      ) {
        hardDeleteMutation.mutate(student.id);
      }
    } catch (err) {
      alert(getErrorMessage(err));
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
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estudiantes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ?? 0} estudiante{data?.total === 1 ? '' : 's'} registrado
            {data?.total === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={handleCreate} icon={<Plus className="w-4 h-4" />}>
          Nuevo estudiante
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, DNI o email..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No hay estudiantes que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Nombre</th>
                  <th className="text-left font-medium px-4 py-3">DNI</th>
                  <th className="text-left font-medium px-4 py-3">Email</th>
                  <th className="text-left font-medium px-4 py-3">Apoderado</th>
                  <th className="text-left font-medium px-4 py-3">Cuenta</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                  <th className="text-right font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {student.lastName}, {student.firstName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{student.dni}</td>
                    <td className="px-4 py-3 text-gray-600">{student.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {student.guardianName ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {student.hasAccount ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Sí
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {student.isActive ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(student)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {!student.hasAccount && student.isActive && (
                          <button
                            onClick={() => setAccountFor(student)}
                            className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                            title="Crear cuenta de usuario"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}

                        {student.isActive ? (
                          <button
                            onClick={() => handleDeactivate(student)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Desactivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleReactivate(student)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Reactivar"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleHardDelete(student)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar definitivamente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <StudentFormModal
        open={isFormOpen}
        onClose={handleCloseForm}
        student={editing}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['students'] });
          setToast({
            type: 'success',
            msg: editing ? 'Estudiante actualizado' : 'Estudiante creado',
          });
          handleCloseForm();
        }}
      />

      <CreateAccountModal
        open={!!accountFor}
        onClose={() => setAccountFor(null)}
        student={accountFor}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['students'] });
          setToast({ type: 'success', msg: 'Cuenta creada exitosamente' });
          setAccountFor(null);
        }}
      />
    </div>
  );
};