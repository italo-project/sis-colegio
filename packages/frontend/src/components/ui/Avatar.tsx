type Props = {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-3xl',
};

export const Avatar = ({ src, name, size = 'md', className = '' }: Props) => {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  // Prefijo de la API para las URLs relativas
  const fullSrc = src
  ? src.startsWith('http')
    ? src
    : `${import.meta.env.VITE_API_URL}${src.startsWith('/') ? src : '/' + src}`
  : null;

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center overflow-hidden bg-slate-100 text-slate-600 font-medium ${className}`}
    >
      {fullSrc ? (
        <img src={fullSrc} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};