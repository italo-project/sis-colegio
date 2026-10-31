import { Outlet } from 'react-router-dom';
// ¡AQUÍ ESTABA EL ERROR! Faltaba la ruta completa
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';

export const AppLayout = () => {
  return (
    <div className="h-screen flex bg-gray-50 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ImpersonationBanner />
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};