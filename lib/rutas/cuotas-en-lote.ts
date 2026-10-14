import { prestamosService } from '@/services/prestamos-service'

type Cuotas = Awaited<ReturnType<typeof prestamosService.obtenerCuotas>>

export async function crearProveedorCuotasEnLote(
  prestamoIds: Array<string | null | undefined>,
): Promise<(prestamoId: string) => Promise<Cuotas>> {
  const ids = [...new Set(prestamoIds.map((id) => String(id || '').trim()).filter(Boolean))]
  const porPrestamo = ids.length
    ? await prestamosService.obtenerCuotasDeVarios(ids).catch(() => ({} as Record<string, Cuotas>))
    : {}
  return async (prestamoId: string) => {
    if (Object.prototype.hasOwnProperty.call(porPrestamo, prestamoId)) {
      return porPrestamo[prestamoId] || []
    }
    return []
  }
}
