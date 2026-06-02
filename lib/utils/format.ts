/**
 * Utilidades para formateo de fechas y horas en el sistema
 */

/**
 * Formatea una fecha en formato "02 jun, 02:58 PM"
 * @param date Fecha a formatear (Date, string o number)
 * @param fallback Valor a devolver si la fecha es inválida
 * @returns String formateado o fallback
 */
export const formatShortDateTime = (date: any, fallback: string = 'Nunca'): string => {
  if (!date) return fallback;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return fallback;
    
    const fecha = d
      .toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
      })
      .replace('.', '');
    const hora = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return `${fecha}, ${hora}`;
  } catch (error) {
    return fallback;
  }
};

/**
 * Formatea una fecha en formato "dd/mm/yyyy" (estilo corto es-CO)
 * @param date Fecha a formatear
 * @param fallback Valor a devolver si la fecha es inválida
 */
export const formatShortDate = (date: any, fallback: string = '—'): string => {
  if (!date) return fallback;
  try {
    let d: Date;
    if (typeof date === 'string') {
      // Si es formato ISO 2024-04-02T... o simple 2024-04-02
      const datePart = date.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        // Crear fecha usando constructor local: new Date(year, monthIndex, day)
        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        d = new Date(date);
      }
    } else {
      d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return fallback;
    
    // Formato consistente dd/mm/yyyy
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return fallback;
  }
};

/**
 * Obtiene la clave de fecha YYYY-MM-DD para una fecha dada
 */
export const getLocalDateKey = (date: Date = new Date()): string => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
