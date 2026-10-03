/**
 * Formatea una fecha YYYY-MM-DD como "lunes, 3 de octubre de 2026".
 * Usa UTC para evitar desplazamiento por zona horaria.
 */
export const formatDateEs = (
  isoDate: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
): string => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.substring(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('es-PE', { ...options, timeZone: 'UTC' });
};

export const formatDateShort = (isoDate: string | null | undefined): string =>
  formatDateEs(isoDate, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Para timestamps reales (created_at, updated_at): convierte a hora local.
 */
export const formatDateTimeEs = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleString('es-PE');
};