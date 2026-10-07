import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Copy, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { teachersApi } from '@/api/teachers.api';
import { getErrorMessage } from '@/api/client';
import type { BulkCreateTeacherRow, BulkCreateTeachersResponse } from '@/types/teacher';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const emptyRow = (): BulkCreateTeacherRow => ({
  dni: '',
  fullName: '',
  birthDate: '',
  email: '',
  phone: '',
  address: '',
});

export const BulkCreateTeachersModal = ({ open, onClose, onSuccess }: Props) => {
  const [rows, setRows] = useState<BulkCreateTeacherRow[]>([emptyRow()]);
  const [result, setResult] = useState<BulkCreateTeachersResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [conflicts, setConflicts] = useState<
    Array<{ row: number; field: string; value: string; reason: string }>
  >([]);

  const mutation = useMutation({
    mutationFn: teachersApi.bulkCreate,
    onSuccess: (data) => {
      setResult(data);
      setConflicts([]);
      onSuccess();
    },
    onError: (err: any) => {
      const resp = err?.response?.data;
      if (resp?.conflicts) {
        setConflicts(resp.conflicts);
      }
      alert(getErrorMessage(err));
    },
  });

  const addRow = () => setRows([...rows, emptyRow()]);

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
    setConflicts([]);
  };

  const updateRow = (index: number, field: keyof BulkCreateTeacherRow, value: string) => {
    setRows(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    if (conflicts.length > 0) setConflicts([]);
  };

  const getRowConflict = (rowIndex: number, field: string) => {
    return conflicts.find((c) => c.row === rowIndex + 1 && c.field === field);
  };

  const handleSubmit = () => {
    const validRows = rows.filter((r) => r.dni && r.fullName && r.email);
    if (validRows.length === 0) {
      alert('Completa al menos una fila (DNI, Nombre completo y Email son obligatorios)');
      return;
    }
    mutation.mutate({ teachers: validRows });
  };

  const handleClose = () => {
    if (result) {
      setRows([emptyRow()]);
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
      title={result ? 'Docentes creados exitosamente' : 'Crear docentes (masivo)'}
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
              Crear {rows.filter((r) => r.dni && r.fullName && r.email).length} docente(s)
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="font-semibold text-green-800 mb-1">
              ✅ {result.created} docente(s) creado(s)
            </div>
            {result.failed > 0 && (
              <div className="text-sm text-red-700 mt-2">
                ❌ {result.failed} con errores (ver lista abajo)
              </div>
            )}
          </div>

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
                      <td className="px-4 py-2 font-mono text-xs bg-yellow-50">{c.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
            <strong>⚠️ Importante:</strong> Las contraseñas solo se muestran aquí una vez. Cópialas
            antes de cerrar el modal.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            Los docentes deben cambiar su contraseña al iniciar sesión por primera vez.
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {rows.map((row, idx) => {
              const dniConflict = getRowConflict(idx, 'dni');
              const emailConflict = getRowConflict(idx, 'email');

              return (
                <div
                  key={idx}
                  className={`border rounded-lg p-4 space-y-3 ${
                    dniConflict || emailConflict ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      Docente #{idx + 1}
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

                    <input
                      type="date"
                      value={row.birthDate}
                      onChange={(e) => updateRow(idx, 'birthDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    />

                    <div>
                      <input
                        type="email"
                        placeholder="Email *"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    />
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
            Añadir otro docente
          </button>
        </div>
      )}
    </Modal>
  );
};