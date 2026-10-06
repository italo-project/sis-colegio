import { AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

export const ImpersonationBanner = () => {
  const navigate = useNavigate();
  const { impersonation, endImpersonation } = useAuthStore();

  if (!impersonation) return null;

  const handleEnd = () => {
    // 1. Navegar PRIMERO a la ruta de admin (para que React Router
    //    no evalúe la ruta actual con el usuario viejo)
    navigate('/admin/users');

    // 2. Terminar impersonación en el siguiente tick (después de que
    //    React Router haya procesado la navegación)
    setTimeout(() => {
      endImpersonation();
    }, 0);
  };

  return (
    <div className="bg-yellow-400 text-yellow-900 px-4 py-2 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="w-4 h-4" />
        <span>
          Estás viendo el sistema como{' '}
          <strong>{impersonation.impersonatedUser.fullName}</strong> (
          {impersonation.impersonatedUser.email})
        </span>
      </div>
      <button
        onClick={handleEnd}
        className="flex items-center gap-1 bg-yellow-900 text-yellow-50 px-3 py-1 rounded text-xs font-medium hover:bg-yellow-800 transition-colors"
      >
        <X className="w-3 h-3" />
        Salir de impersonación
      </button>
    </div>
  );
};