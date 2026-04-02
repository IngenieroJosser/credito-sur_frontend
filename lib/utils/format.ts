/**
 * Utilidades para formateo de fechas y horas en el sistema
 */

/**
 * Formatea una fecha en formato "dd/mm/yy, hh:mm" (estilo corto es-CO)
 * @param date Fecha a formatear (Date, string o number)
 * @param fallback Valor a devolver si la fecha es inválida
 * @returns String formateado o fallback
 */
export const formatShortDateTime = (date: any, fallback: string = 'Nunca'): string => {
  if (!date) return fallback;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return fallback;
    
    return d.toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    });
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
    const d = new Date(date);
    if (isNaN(d.getTime())) return fallback;
    
    return d.toLocaleDateString("es-CO");
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
