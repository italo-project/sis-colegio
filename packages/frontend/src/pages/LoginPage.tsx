import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Loader2 } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { apiClient, getErrorMessage } from '@/api/client';
import { useAuthStore } from '@/stores/auth.store';
import { setCurrentSubdomain } from '@/lib/subdomain';
import {
  SearchableSelect,
  type SearchableOption,
} from '@/components/ui/SearchableSelect';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mb-4">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema Colegios</h1>
          <p className="text-sm text-gray-500 mt-1">Accede a tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder="Ingresa tu correo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
            {errors.email && (
              <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
            {errors.password && (
              <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Ingresando...
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>

        <Link
          to="/forgot-password"
          className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium mt-6"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
    </div>
  );
};