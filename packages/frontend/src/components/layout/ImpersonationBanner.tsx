import { AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

export const ImpersonationBanner = () => {
  const navigate = useNavigate();
  const { impersonation, endImpersonation } = useAuthStore();

  if (!impersonation) return null;

  const handleEnd = () => {
    navigate('/admin/users');
    setTimeout(() => {
      endImpersonation();
    }, 0);
  };

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between shadow-sm z-50 relative">
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
        className="flex items-center gap-1 bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-800 transition-colors"
      >
        <X className="w-3 h-3" />
        Salir de impersonación
      </button>
    </div>
  );
};