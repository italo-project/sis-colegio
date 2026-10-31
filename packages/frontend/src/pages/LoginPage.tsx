import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { apiClient, getErrorMessage } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import { setCurrentSubdomain } from '@/lib/subdomain';
import {
  SearchableSelect,
  type SearchableOption,
} from '@/components/ui/SearchableSelect';

// 👇 IMPORTAMOS TU LOGO
import logoVioeduca from '@/assets/logoVioeduca.png';

const loginSchema = z.object({
  subdomain: z.string().min(1, 'Selecciona un colegio'),
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Requerido'),
});

type LoginForm = z.infer<typeof loginSchema>;

type Organization = {
  id: string;
  name: string;
  subdomain: string;
  plan: string;
};

export const LoginPage = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      subdomain: '',
      email: '',
      password: '',
    },
  });

  const subdomain = watch('subdomain');

  // Cargar la lista de colegios disponibles
  const { data: organizations, isLoading: loadingOrgs } = useQuery({
    queryKey: ['public-organizations'],
    queryFn: async () => {
      const { data } = await apiClient.get<Organization[]>('/organizations');
      return data;
    },
  });

  const orgOptions: SearchableOption[] = (organizations ?? []).map((o) => ({
    value: o.subdomain,
    label: o.name,
    keywords: o.subdomain,
  }));

  const onSubmit = async (form: LoginForm) => {
    setServerError(null);
    try {
      setCurrentSubdomain(form.subdomain);
      const data = await authApi.login(form.email, form.password);
      login(data);
      navigate('/dashboard');
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      {/* ── PANEL IZQUIERDO (Solo visible en pantallas grandes) ── */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
        {/* Efectos de luces de fondo */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-primary-600/20 blur-[120px]"></div>
          <div className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[100px]"></div>
        </div>

        {/* Contenido del panel */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <a href="https://viotechinformatics.com/"><img src={logoVioeduca} alt="Vioeduca" className="w-7 h-7 object-contain" /></a>
            </div>
            <a href="https://viotechinformatics.com/"><span className="text-2xl font-extrabold text-white tracking-tight">Vioeduca</span></a>
          </div>

          <center><h2 className="text-4xl font-bold text-white leading-tight mb-6">
            La gestión escolar <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary-300">
              del futuro.....
            </span>
          </h2>
          <p className="text-slate-300 text-lg max-w-md leading-relaxed">
            Centraliza la asistencia, calificaciones, finanzas y comunicación con los padres en una sola plataforma intuitiva y segura.
          </p></center>
        </div>

        {/* Testimonio o Features */}
        <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex gap-1 mb-3 text-yellow-400">
            {"★★★★★"}
          </div>
          <p className="text-slate-200 text-sm italic mb-4">
            "Desde que implementamos Vioeduca, redujimos el tiempo administrativo en un 90%. Los padres están encantados con la transparencia de los pagos y notas."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
              DR
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Director General</div>
              <div className="text-xs text-slate-400">Colegio San Martín</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PANEL DERECHO (Formulario de Login) ── */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative">
        {/* Botón para volver al inicio (opcional, si tuvieras landing page) */}
        <div className="absolute top-8 right-8 hidden sm:block">
           <span className="text-sm text-gray-500 font-medium">¿Quienes Somos? <a href="#" className="text-primary-600 hover:underline">Accede aquí</a></span>
        </div>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-apple p-8 border border-gray-100 relative z-10">
          <div className="flex flex-col items-center mb-8">
            {/* Logo en móvil (en desktop el logo está en el panel izquierdo) */}
            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-gray-100 lg:hidden overflow-hidden">
              <img src={logoVioeduca} alt="Vioeduca" className="w-14 h-14 object-contain" />
            </div>

            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Bienvenido de nuevo</h1>
            <p className="text-sm text-gray-500 mt-1 text-center font-medium">
              Ingresa a tu cuenta de Vioeduca
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Colegio
              </label>
              <SearchableSelect
                options={orgOptions}
                value={subdomain}
                onChange={(val) => setValue('subdomain', val, { shouldValidate: true })}
                placeholder="Selecciona tu colegio..."
                searchPlaceholder="Buscar colegio..."
                emptyMessage="No hay colegios disponibles"
                loading={loadingOrgs}
                error={errors.subdomain?.message}
              />
              <input
                type="hidden"
                {...register('subdomain', { required: 'Selecciona un colegio' })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="Ingresa tu correo"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary-600 hover:text-primary-700 font-semibold"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all"
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl p-3">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar al sistema'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Vioeduca. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};