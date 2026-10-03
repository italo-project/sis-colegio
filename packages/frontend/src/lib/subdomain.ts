/**
 * Obtiene el subdominio del colegio actual.
 *
 * En producción: el colegio se resuelve por el subdominio (sanmartin.midominio.com)
 * En desarrollo: como no hay subdominios, usamos un valor por defecto.
 */
export const getCurrentSubdomain = (): string => {
  const hostname = window.location.hostname;

  // En desarrollo: usar el valor del .env
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const stored = localStorage.getItem('colegio_subdomain');
    if (stored) return stored;
    return import.meta.env.VITE_DEFAULT_SUBDOMAIN || 'sanmartin';
  }

  // En producción: extraer el subdominio del hostname
  // Ejemplo: sanmartin.midominio.com → "sanmartin"
  const parts = hostname.split('.');
  return parts[0];
};

export const setCurrentSubdomain = (subdomain: string) => {
  localStorage.setItem('colegio_subdomain', subdomain);
};