import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Copy, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, type SearchableOption } from '@/components/ui/SearchableSelect';
import { studentsApi } from '@/api/students.api';
import { apiClient, getErrorMessage } from '@/api/client';
import type { BulkCreateStudentRow, BulkCreateStudentsResponse } from '@/types/student';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type Parent = { id: string; fullName: string; dni: string };
type Section = {
  id: string;
  name: string;
  gradeLevel?: { name: string };
  academicYear?: { year: number };
};

const emptyRow = (): BulkCreateStudentRow => ({
  dni: '',
  fullName: '',
  birthDate: '',
  gender: '',
  email: '',
  phone: '',
  address: '',
  guardianId: '',
});

export const BulkCreateStudentsModal = ({ open, onClose, onSuccess }: Props) => {
  const [sectionId, setSectionId] = useState('');
  const [rows, setRows] = useState<BulkCreateStudentRow[]>([emptyRow()]);
  const [result, setResult] = useState<BulkCreateStudentsResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [conflicts, setConflicts] = useState<
    Array<{ row: number; field: string; value: string; reason: string }>
  >([]);

  const { data: parentsData, isLoading: loadingParents } = useQuery({
    queryKey: ['parents-for-bulk-student'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Parent[] }>('/parents', {
        params: { active: 'true', limit: 1000 },
      });
      return data.items;
    },
    enabled: open,
  });

  const { data: sectionsData } = useQuery({
    queryKey: ['sections-for-bulk-student'],
    queryFn: async () => {
      const { data } = await apiClient.get<Section[]>('/academic/sections', {
        params: { active: 'true' },
      });
      return data;
    },
    enabled: open,
  });

  const parentOptions: SearchableOption[] = useMemo(
    () =>
      (parentsData ?? []).map((p) => ({
        value: p.id,
        label: p.fullName,
        keywords: p.dni,
      })),
    [parentsData],
  );

  const sectionOptions: SearchableOption[] = useMemo(
    () =>
      (sectionsData ?? []).map((s) => ({
        value: s.id,
        label: `${s.gradeLevel?.name ?? ''} "${s.name}" (${s.academicYear?.year ?? ''})`,
      })),
    [sectionsData],
  );

  const mutation = useMutation({
    mutationFn: studentsApi.bulkCreate,
    onSuccess: (data) => {
      setResult(data);
      setConflicts([]);
      onSuccess();
    },
    onError: (err: any) => {
      const resp = err?.response?.data;
      if (resp?.conflicts) setConflicts(resp.conflicts);
      alert(getErrorMessage(err));
    },
  });

  const addRow = () => setRows([...rows, emptyRow()]);

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
    setConflicts([]);
  };

  const updateRow = (index: number, field: keyof BulkCreateStudentRow, value: string) => {
    setRows(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    if (conflicts.length > 0) setConflicts([]);
  };

  const getRowConflict = (rowIndex: number, field: string) =>
    conflicts.find((c) => c.row === rowIndex + 1 && c.field === field);

  const handleSubmit = () => {
    if (!sectionId) {
      alert('Debes seleccionar una sección');
      return;
    }
    const validRows = rows.filter((r) => r.dni && r.fullName && r.email && r.guardianId);
    if (validRows.length === 0) {
      alert(
        'Completa al menos una fila (DNI, Nombre completo, Correo y Apoderado son obligatorios)',
      );
      return;
    }
    mutation.mutate({ sectionId, students: validRows });
  };

  const handleClose = () => {
    if (result) {
      setRows([emptyRow()]);
      setSectionId('');
      setResult(null);
      setCopied(false);
    }
    setConflicts([]);
    onClose();
  };

  const copyCredentials = async () => {
    if (!result) return;
    const text = result.credentials
      .map(
        (c) =>
          `${c.fullName}\nDNI: ${c.dni}\nEmail: ${c.email}\nContraseña: ${c.password}\n`,
      )
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert('No se pudo copiar al portapapeles');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={result ? 'Estudiantes creados' : 'Crear estudiantes (masivo)'}
      size="2xl"
      footer={
        result ? (
          <>
            <Button
              variant="secondary"
              onClick={copyCredentials}
              icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copiado' : 'Copiar credenciales'}
            </Button>
            <Button onClick={handleClose}>Cerrar</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={mutation.isPending}>
              Crear{' '}
              {rows.filter((r) => r.dni && r.fullName && r.email && r.guardianId).length}{' '}
              estudiante(s)
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="font-semibold text-green-800 mb-1">
              ✅ {result.created} estudiante(s) creado(s)
            </div>
            {result.failed > 0 && (
              <div className="text-sm text-red-700 mt-2">❌ {result.failed} con errores</div>
            )}
          </div>

          {result.credentials.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600 border-b">
                Credenciales generadas (cópialas y compártelas manualmente)
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <th className="text-left font-medium px-4 py-2">Nombre</th>
                      <th className="text-left font-medium px-4 py-2">DNI</th>
                      <th className="text-left font-medium px-4 py-2">Email</th>
                      <th className="text-left font-medium px-4 py-2">Contraseña</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.credentials.map((c) => (
                      <tr key={c.row}>
                        <td className="px-4 py-2">{c.fullName}</td>
                        <td className="px-4 py-2 font-mono text-xs">{c.dni}</td>
                        <td className="px-4 py-2 font-mono text-xs">{c.email}</td>
                        <td className="px-4 py-2 font-mono text-xs bg-yellow-50">
                          {c.password}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-2 text-xs font-medium text-red-700 border-b border-red-200">
                Errores ({result.errors.length})
              </div>
              <ul className="divide-y divide-red-100 text-sm">
                {result.errors.map((e) => (
                  <li key={e.row} className="px-4 py-2">
                    <span className="text-red-700">Fila {e.row}:</span> {e.dni} - {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
            <strong>⚠️ Importante:</strong> Las contraseñas solo se muestran aquí una vez.
            Cópialas antes de cerrar el modal.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            Todos los estudiantes se matricularán en la <strong>misma sección</strong>. Cada
            uno tendrá una cuenta de acceso con el correo que ingreses.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sección destino *
            </label>
            <SearchableSelect
              options={sectionOptions}
              value={sectionId}
              onChange={setSectionId}
              placeholder="Buscar sección..."
              searchPlaceholder="Escribe grado o letra..."
              emptyMessage="No hay secciones que coincidan"
            />
          </div>

          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {rows.map((row, idx) => {
              const dniConflict = getRowConflict(idx, 'dni');
              const emailConflict = getRowConflict(idx, 'email');
              const guardianConflict = getRowConflict(idx, 'guardianId');

              return (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 space-y-3 ${
                    dniConflict || emailConflict || guardianConflict
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Estudiante #{idx + 1}
                    </span>
                    <button
                      onClick={() => removeRow(idx)}
                      disabled={rows.length === 1}
                      className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30 rounded"
                      title="Eliminar fila"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="DNI *"
                        value={row.dni}
                        onChange={(e) => updateRow(idx, 'dni', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none text-sm ${
                          dniConflict
                            ? 'border-red-400 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 focus:ring-primary-500'
                        }`}
                      />
                      {dniConflict && (
                        <p className="text-xs text-red-600 mt-1">{dniConflict.reason}</p>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Nombre completo *"
                      value={row.fullName}
                      onChange={(e) => updateRow(idx, 'fullName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    />

                    <div>
                      <input
                        type="email"
                        placeholder="Correo de acceso *"
                        value={row.email}
                        onChange={(e) => updateRow(idx, 'email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 outline-none text-sm ${
                          emailConflict
                            ? 'border-red-400 focus:ring-red-500 bg-red-50'
                            : 'border-gray-300 focus:ring-primary-500'
                        }`}
                      />
                      {emailConflict && (
                        <p className="text-xs text-red-600 mt-1">{emailConflict.reason}</p>
                      )}
                    </div>

                    <input
                      type="date"
                      value={row.birthDate}
                      onChange={(e) => updateRow(idx, 'birthDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    />

                    <select
                      value={row.gender}
                      onChange={(e) => updateRow(idx, 'gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    >
                      <option value="">Género</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="X">Otro</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Teléfono"
                      value={row.phone}
                      onChange={(e) => updateRow(idx, 'phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    />

                    <input
                      type="text"
                      placeholder="Dirección"
                      value={row.address}
                      onChange={(e) => updateRow(idx, 'address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm md:col-span-2 lg:col-span-1"
                    />

                    <div className="lg:col-span-2">
                      <SearchableSelect
                        options={parentOptions}
                        value={row.guardianId}
                        onChange={(val) => updateRow(idx, 'guardianId', val)}
                        placeholder="Buscar apoderado..."
                        searchPlaceholder="Escribe nombre o DNI..."
                        emptyMessage="No hay apoderados que coincidan"
                        loading={loadingParents}
                        error={guardianConflict?.reason}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors w-full justify-center border-2 border-dashed border-primary-200"
          >
            <Plus className="w-4 h-4" />
            Añadir otro estudiante
          </button>
        </div>
      )}
    </Modal>
  );
};