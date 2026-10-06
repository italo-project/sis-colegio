import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { Avatar } from './Avatar';
import { meApi } from '@/api/me.api';
import { getErrorMessage } from '@/api/client';

type Props = {
  avatarUrl: string | null;
  name: string;
  onUpdate: (newUrl: string | null) => void;
};

export const AvatarUploader = ({ avatarUrl, name, onUpdate }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones cliente
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede pesar más de 5 MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      alert('Solo se permiten imágenes JPG, PNG, WebP o GIF');
      return;
    }

    // Preview local
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Subir
    setUploading(true);
    try {
      const result = await meApi.updateAvatar(file);
      onUpdate(result.avatarUrl);
      setPreview(null);
    } catch (err) {
      alert(getErrorMessage(err));
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar tu foto de perfil?')) return;

    setUploading(true);
    try {
      await meApi.deleteAvatar();
      onUpdate(null);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const displayUrl = preview ?? avatarUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar src={displayUrl} name={name} size="xl" />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity disabled:cursor-not-allowed"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Camera className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
        </button>

        {avatarUrl && !uploading && (
          <>
            <span className="text-gray-300">·</span>
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Eliminar
            </button>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-gray-400 text-center max-w-xs">
        JPG, PNG, WebP o GIF · Máx 5 MB
      </p>
    </div>
  );
};