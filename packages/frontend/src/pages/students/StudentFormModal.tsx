import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy, Check, CheckCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, type SearchableOption } from '@/components/ui/SearchableSelect';
import { studentsApi } from '@/api/students.api';
import { getErrorMessage, apiClient } from '@/api/client';
import type { CreateStudentPayload, Student, StudentCredentials } from '@/types/student';

type Props = {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess: () => void;
};

type Parent = { id: string; fullName: string; dni: string };
type Section = {
  id: string;
  name: string;
  gradeLevel?: { name: string };
  academicYear?: { year: number };
};

type FormData = CreateStudentPayload & { password?: string };

export const StudentFormModal = ({ open, onClose, student, onSuccess }: Props) => {
  const isEdit = !!student;

  const [credentials, setCredentials] = useState<StudentCredentials | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  const { data: parentsData, isLoading: loadingParents } = useQuery({
    queryKey: ['parents-for-student'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Parent[] }>('/parents', {
        params: { active: 'true', limit: 1000 },
      });
      return data.items;
    },
    enabled: open,
  });

  const { data: sectionsData } = useQuery({
    queryKey: ['sections-for-student'],
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

  const guardianId = watch('guardianId') ?? '';
  const sectionId = watch('sectionId') ?? '';

  useEffect(() => {
    if (open) {
      setCredentials(null);
      setCopied(false);
      setShowPassword(false);
      if (student) {
        reset({
          fullName: student.fullName,
          dni: student.dni,
          birthDate: student.birthDate ? student.birthDate.substring(0, 10) : null,
          gender: student.gender ?? null,
          email: student.email ?? '',
          phone: student.phone ?? null,
          address: student.address ?? null,
          sectionId: student.sectionId ?? '',
          guardianId: student.guardian?.id ?? '',
          password: '',
        });
      } else {
        reset({});
      }
    }
  }, [open, student, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (isEdit && student) {
        const { dni, guardianId, ...rest } = data;
        // Si password está vacío, no lo enviamos
        if (!rest.password) {
          delete rest.password;
        }
        return studentsApi.update(student.id, rest);
      }
      const { password, ...createData } = data;
      return studentsApi.create(createData);
    },
    onSuccess: (data) => {
      const resp = data as Student & { credentials?: StudentCredentials };
      if (resp.credentials && resp.credentials.email) {
        setCredentials(resp.credentials);
      } else {
        onSuccess();
      }
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await mutation.mutateAsync(data);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    const text = `Email: ${credentials.email}\nContraseña: ${credentials.temporaryPassword}\n\nCambia tu contraseña al primer inicio de sesión.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert('No se pudo copiar al portapapeles');
    }
  };

  const handleCloseCredentials = () => {
    setCredentials(null);
    onSuccess();
  };

  // ── Vista de credenciales ────────────────────────────────────────────
  if (credentials) {
    return (
      <Modal
        open={open}
        onClose={handleCloseCredentials}
        title="Estudiante creado"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={copyCredentials}
              icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copiado' : 'Copiar credenciales'}
            </Button>
            <Button onClick={handleCloseCredentials}>Cerrar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <div className="font-semibold mb-1">Estudiante creado exitosamente</div>
              <div>Comparte estas credenciales con el estudiante o su apoderado.</div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">Email de acceso</div>
              <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded">
                {credentials.email}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Contraseña temporal</div>
              <div className="font-mono text-sm bg-yellow-50 px-3 py-2 rounded">
                {credentials.temporaryPassword}
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
            <strong>⚠️ Importante:</strong> La contraseña solo se muestra aquí una vez. El
            estudiante deberá cambiarla al primer inicio de sesión.
          </div>
        </div>
      </Modal>
    );
  }

  // ── Vista de formulario ──────────────────────────────────────────────
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar estudiante' : 'Nuevo estudiante'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear estudiante'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEdit && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            El estudiante tendrá una cuenta de acceso con el correo que ingreses. La
            contraseña se generará automáticamente.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="DNI *"
            {...register('dni', { required: 'Requerido' })}
            error={errors.dni?.message}
            disabled={isEdit}
          />
          <Input
            label="Nombre completo *"
            {...register('fullName', { required: 'Requerido' })}
            error={errors.fullName?.message}
          />
          <Input
            label="Correo de acceso *"
            type="email"
            {...register('email', {
              required: 'El correo es obligatorio (es el usuario de acceso)',
            })}
            error={errors.email?.message}
            hint={isEdit ? 'Cambiar el correo también actualiza el login' : 'Será el usuario para iniciar sesión'}
          />
          <Input
            label="Fecha de nacimiento"
            type="date"
            {...register('birthDate')}
            error={errors.birthDate?.message}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
            <select
              {...register('gender')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="">Sin especificar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="X">Otro</option>
            </select>
          </div>
          <Input label="Teléfono" {...register('phone')} />
          <div className="md:col-span-2">
            <Input label="Dirección" {...register('address')} />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Apoderado y sección</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apoderado *</label>
              <SearchableSelect
                options={parentOptions}
                value={guardianId}
                onChange={(val) => setValue('guardianId', val, { shouldValidate: true })}
                placeholder="Buscar apoderado..."
                searchPlaceholder="Escribe nombre o DNI..."
                emptyMessage="No hay apoderados que coincidan"
                disabled={isEdit}
                loading={loadingParents}
                error={errors.guardianId?.message}
              />
              <input
                type="hidden"
                {...register('guardianId', { required: 'Debes seleccionar un apoderado' })}
              />
              {isEdit && (
                <p className="text-xs text-gray-500 mt-1">
                  El apoderado no se puede cambiar desde aquí
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sección *</label>
              <SearchableSelect
                options={sectionOptions}
                value={sectionId}
                onChange={(val) => setValue('sectionId', val, { shouldValidate: true })}
                placeholder="Buscar sección..."
                searchPlaceholder="Escribe grado o letra..."
                emptyMessage="No hay secciones que coincidan"
                error={errors.sectionId?.message}
              />
              <input type="hidden" {...register('sectionId', { required: 'Requerido' })} />
            </div>
          </div>
        </div>

        {isEdit && student?.hasAccount && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-4 h-4 text-gray-500" />
              <h4 className="text-sm font-medium text-gray-900">
                Cambiar contraseña (opcional)
              </h4>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 mb-3">
              Déjalo vacío si no quieres cambiar la contraseña. Útil cuando el estudiante
              olvidó su contraseña y no puede recuperarla.
            </div>

            <div className="relative">
              <Input
                label="Nueva contraseña"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="Dejar vacío para no cambiar"
                hint="Mínimo 8 caracteres"
                error={errors.password?.message}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};