import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Copy, Check, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { teachersApi } from '@/api/teachers.api';
import { getErrorMessage } from '@/api/client';
import type { PaymentType, Teacher } from '@/types/teacher';

type Props = {
  open: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  onSuccess: () => void;
};

type FormData = {
  dni: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  specialty: string;
  birthDate: string;
  hireDate: string;
  paymentEnabled: boolean;
  paymentType: PaymentType;
  hourlyRate: string;
  monthlySalary: string;
  password: string;
};

const emptyForm = (): FormData => ({
  dni: '',
  fullName: '',
  email: '',
  phone: '',
  address: '',
  specialty: '',
  birthDate: '',
  hireDate: '',
  paymentEnabled: false,
  paymentType: 'hourly',
  hourlyRate: '',
  monthlySalary: '',
  password: '',
});

export const TeacherFormModal = ({ open, onClose, teacher, onSuccess }: Props) => {
  const isEdit = !!teacher;
  const [form, setForm] = useState<FormData>(emptyForm());
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setCredentials(null);
      setCopied(false);
      setShowPassword(false);

      if (teacher) {
        setForm({
          dni: teacher.dni,
          fullName: teacher.fullName,
          email: teacher.email,
          phone: teacher.phone ?? '',
          address: teacher.address ?? '',
          specialty: teacher.specialty ?? '',
          birthDate: teacher.birthDate ? teacher.birthDate.substring(0, 10) : '',
          hireDate: teacher.hireDate ? teacher.hireDate.substring(0, 10) : '',
          paymentEnabled: !!teacher.paymentType,
          paymentType: teacher.paymentType ?? 'hourly',
          hourlyRate: teacher.hourlyRate !== null ? String(teacher.hourlyRate) : '',
          monthlySalary: teacher.monthlySalary !== null ? String(teacher.monthlySalary) : '',
          password: '',
        });
      } else {
        setForm(emptyForm());
      }
    }
  }, [open, teacher]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const baseData: any = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        address: form.address || undefined,
        specialty: form.specialty || undefined,
        birthDate: form.birthDate || undefined,
        hireDate: form.hireDate || undefined,
        paymentType: form.paymentEnabled ? form.paymentType : null,
        hourlyRate:
          form.paymentEnabled && form.paymentType === 'hourly' && form.hourlyRate
            ? Number(form.hourlyRate)
            : null,
        monthlySalary:
          form.paymentEnabled && form.paymentType === 'monthly' && form.monthlySalary
            ? Number(form.monthlySalary)
            : null,
      };

      if (isEdit && teacher) {
        return teachersApi.update(teacher.id, {
          ...baseData,
          password: form.password.trim() || undefined,
        } as any);
      }

      const payload = {
        ...baseData,
        dni: form.dni,
      };

      const result = await teachersApi.create(payload);
      return result;
    },
    onSuccess: (data) => {
      if (!isEdit) {
        const result = data as Teacher & { credentials?: { temporaryPassword?: string } };
        if (result.credentials?.temporaryPassword) {
          setCredentials({
            email: form.email,
            password: result.credentials.temporaryPassword,
          });
        } else {
          onSuccess();
        }
      } else {
        onSuccess();
      }
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  const handleSubmit = async () => {
    if (!form.dni || !form.fullName || !form.email) {
      alert('DNI, Nombre completo y Email son obligatorios');
      return;
    }

    if (isEdit && form.password && form.password.trim().length > 0 && form.password.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (form.paymentEnabled) {
      if (form.paymentType === 'hourly' && !form.hourlyRate) {
        alert('Si el pago es por horas, ingresa el costo por hora');
        return;
      }
      if (form.paymentType === 'monthly' && !form.monthlySalary) {
        alert('Si el pago es mensual, ingresa el monto');
        return;
      }
    }

    mutation.mutate();
  };

  const handleClose = () => {
    setCredentials(null);
    setCopied(false);
    setForm(emptyForm());
    onClose();
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    const text = `Email: ${credentials.email}\nContraseña: ${credentials.password}\n\nCambia tu contraseña al primer inicio de sesión.`;
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
      title={credentials ? 'Docente creado' : isEdit ? 'Editar docente' : 'Nuevo docente'}
      size="lg"
      footer={
        credentials ? (
          <>
            <Button
              variant="secondary"
              onClick={copyCredentials}
              icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copiado' : 'Copiar credenciales'}
            </Button>
            <Button
              onClick={() => {
                handleClose();
                onSuccess();
              }}
            >
              Cerrar
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={mutation.isPending}>
              {isEdit ? 'Guardar cambios' : 'Crear docente'}
            </Button>
          </>
        )
      }
    >
      {credentials ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="font-semibold text-green-800 mb-1">
              ✅ Docente creado exitosamente
            </div>
            <div className="text-sm text-green-700">
              Comparte estas credenciales con el docente de forma segura.
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">Email</div>
              <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded">
                {credentials.email}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Contraseña temporal</div>
              <div className="font-mono text-sm bg-yellow-50 px-3 py-2 rounded">
                {credentials.password}
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
            <strong>⚠️ Importante:</strong> La contraseña solo se muestra aquí una vez.
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {!isEdit && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              El docente deberá cambiar su contraseña al iniciar sesión por primera vez.
            </div>
          )}

          {/* Datos básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="DNI *"
              value={form.dni}
              onChange={(e) => updateField('dni', e.target.value)}
              disabled={isEdit}
            />
            <Input
              label="Nombre completo *"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              disabled={isEdit}
            />
            <Input
              label="Email *"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
            <Input
              label="Teléfono"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
            <Input
              label="Especialidad"
              value={form.specialty}
              onChange={(e) => updateField('specialty', e.target.value)}
              placeholder="Ej: Matemática y Física"
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              value={form.birthDate}
              onChange={(e) => updateField('birthDate', e.target.value)}
              disabled={isEdit}
            />
            <Input
              label="Fecha de contratación"
              type="date"
              value={form.hireDate}
              onChange={(e) => updateField('hireDate', e.target.value)}
            />
            <div className="md:col-span-2">
              <Input
                label="Dirección"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>
          </div>

          {/* Pago */}
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={form.paymentEnabled}
                onChange={(e) => updateField('paymentEnabled', e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-900">
                Configurar pago del docente
              </span>
            </label>

            {form.paymentEnabled && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-white transition-colors">
                    <input
                      type="radio"
                      name="paymentType"
                      checked={form.paymentType === 'hourly'}
                      onChange={() => updateField('paymentType', 'hourly')}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Por horas</div>
                      <div className="text-xs text-gray-500">
                        Costo por hora × horas totales
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-white transition-colors">
                    <input
                      type="radio"
                      name="paymentType"
                      checked={form.paymentType === 'monthly'}
                      onChange={() => updateField('paymentType', 'monthly')}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Sueldo fijo</div>
                      <div className="text-xs text-gray-500">Monto mensual</div>
                    </div>
                  </label>
                </div>

                {form.paymentType === 'hourly' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Costo por hora (S/)"
                      type="number"
                      step="0.01"
                      value={form.hourlyRate}
                      onChange={(e) => updateField('hourlyRate', e.target.value)}
                      placeholder="Ej: 25.00"
                    />
                    <Input
                      label="Horas totales (auto)"
                      value="Se calculará según sus cursos"
                      disabled
                    />
                  </div>
                )}

                {form.paymentType === 'monthly' && (
                  <Input
                    label="Sueldo mensual (S/)"
                    type="number"
                    step="0.01"
                    value={form.monthlySalary}
                    onChange={(e) => updateField('monthlySalary', e.target.value)}
                    placeholder="Ej: 2000.00"
                  />
                )}
              </div>
            )}
          </div>

          {/* Cambio de contraseña (solo en edición) */}
          {isEdit && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-900">
                  Cambiar contraseña (opcional)
                </h4>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 mb-3">
                Déjalo vacío si no quieres cambiar la contraseña. Útil cuando un docente
                olvidó su contraseña y no puede recuperarla.
              </div>

              <div className="relative">
                <Input
                  label="Nueva contraseña"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Dejar vacío para no cambiar"
                  hint="Mínimo 8 caracteres"
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
        </div>
      )}
    </Modal>
  );
};