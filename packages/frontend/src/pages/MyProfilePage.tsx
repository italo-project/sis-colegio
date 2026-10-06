import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Save, KeyRound, AlertTriangle } from 'lucide-react';
import { meApi } from '@/api/me.api';
import { getErrorMessage } from '@/api/client';
import { AvatarUploader } from '@/components/ui/AvatarUploader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const MyProfilePage = () => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['full-profile'],
    queryFn: meApi.getFullProfile,
  });

  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.user.avatarUrl);
      setFullName(profile.user.fullName);
      setEmail(profile.user.email);
      const roleData = profile.roleData as { phone?: string | null } | null;
      setPhone(roleData?.phone ?? '');
    }
  }, [profile]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSavePhone = async () => {
    setSavingProfile(true);
    try {
      await meApi.updatePhone(phone || null);
      showToast('success', 'Teléfono actualizado');
      refetch();
    } catch (err) {
      showToast('error', getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveCeoProfile = async () => {
    setSavingProfile(true);
    try {
      await meApi.updateCeoProfile({ fullName, email });
      showToast('success', 'Perfil actualizado');
      refetch();
    } catch (err) {
      showToast('error', getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showToast('error', 'Las contraseñas no coinciden');
      return;
    }
    if (newPassword.length < 8) {
      showToast('error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setSavingPassword(true);
    try {
      await meApi.updatePassword(currentPassword, newPassword);
      showToast('success', 'Contraseña actualizada');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast('error', getErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  if (isLoading) {
    return <div className="p-12 text-center text-gray-500 text-sm">Cargando perfil...</div>;
  }

  if (!profile) {
    return <div className="p-12 text-center text-gray-500 text-sm">Perfil no encontrado</div>;
  }

  const isCeo = profile.role === 'ceo';
  const roleData = profile.roleData as Record<string, string | null | undefined> | null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-1">
          Actualiza tu información personal
        </p>
      </div>

      {/* Card de foto */}
      <Card title="Foto de perfil">
        <div className="py-4">
          <AvatarUploader
            avatarUrl={avatarUrl}
            name={profile.user.fullName}
            onUpdate={setAvatarUrl}
          />
        </div>
      </Card>

      {/* Card de datos */}
      <Card title="Datos personales">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isCeo ? (
              <>
                <Input
                  label="Nombre completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 987654321"
                />
              </>
            ) : (
              <>
                <Input label="Nombre completo" value={fullName} disabled hint="Solo el CEO puede editarlo" />
                <Input label="Email" value={email} disabled hint="Solo el CEO puede editarlo" />
                <Input
                  label="Teléfono"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: 987654321"
                />
              </>
            )}
          </div>

          {/* Datos adicionales según rol (solo lectura) */}
          {roleData && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Datos adicionales</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {'dni' in roleData && (
                  <div>
                    <span className="text-gray-500">DNI:</span>{' '}
                    <span className="font-medium">{String(roleData.dni)}</span>
                  </div>
                )}
                {'specialty' in roleData && roleData.specialty && (
                  <div>
                    <span className="text-gray-500">Especialidad:</span>{' '}
                    <span className="font-medium">{String(roleData.specialty)}</span>
                  </div>
                )}
                {'address' in roleData && roleData.address && (
                  <div>
                    <span className="text-gray-500">Dirección:</span>{' '}
                    <span className="font-medium">{String(roleData.address)}</span>
                  </div>
                )}
                {'occupation' in roleData && roleData.occupation && (
                  <div>
                    <span className="text-gray-500">Ocupación:</span>{' '}
                    <span className="font-medium">{String(roleData.occupation)}</span>
                  </div>
                )}
                {'guardianName' in roleData && roleData.guardianName && (
                  <div>
                    <span className="text-gray-500">Apoderado:</span>{' '}
                    <span className="font-medium">{String(roleData.guardianName)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={isCeo ? handleSaveCeoProfile : handleSavePhone}
              loading={savingProfile}
              icon={<Save className="w-4 h-4" />}
            >
              Guardar cambios
            </Button>
          </div>
        </div>
      </Card>

      {/* Card de contraseña */}
      <Card title="Cambiar contraseña">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <Shield className="w-4 h-4 inline-block mr-1" />
            Tu contraseña debe tener al menos 8 caracteres
          </div>

          <Input
            label="Contraseña actual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nueva contraseña"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirmar nueva contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleChangePassword}
              loading={savingPassword}
              disabled={!currentPassword || !newPassword || !confirmPassword}
              icon={<KeyRound className="w-4 h-4" />}
              variant="secondary"
            >
              Cambiar contraseña
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};