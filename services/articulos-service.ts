import { apiRequest } from '@/lib/api/api'
import { PLAZOS_ARTICULO_MESES } from '@/lib/plazos-articulo'

/**
 * El precio tal y como llega del servidor, antes de convertirlo en
 * OpcionCuotas.
 *
 * No son lo mismo y confundirlos es facil: aqui el plazo se llama `meses` y el
 * importe `precio`; en OpcionCuotas son `numeroCuotas` y `precioTotal`. Un
 * `meses: 0` significa contado.
 *
 * Coincide con el modelo PrecioProducto del backend.
 */
export interface PrecioProductoApi {
  id?: string
  productoId?: string
  meses: number
  precio: number
  activo?: boolean
}

/**
 * El articulo tal como lo devuelve `GET /inventory/:id`.
 *
 * Cada dato aparece con su nombre en espanol Y en ingles (`nombre`/`name`,
 * `descripcion`/`description`, `categoria`/`category`, `precio`/`price`,
 * `stock`/`quantity`) porque el endpoint ha cambiado de convencion y el mapeo de abajo
 * lee las dos. Eso es lo que el `any` escondia: la lista completa de alternativas, que es
 * justo lo que hay que ver para saber por que hay cascadas aqui.
 */
interface ArticuloDeApi {
  id?: string
  nombre?: string | null
  name?: string | null
  descripcion?: string | null
  description?: string | null
  categoria?: string | null
  category?: string | null
  costo?: number | string | null
  precio?: number | string | null
  price?: number | string | null
  precioContado?: number | string | null
  precio_contado?: number | string | null
  stock?: number | null
  quantity?: number | null
  precios?: PrecioProductoApi[] | null
}


export interface OpcionCuotas {
  id?: string
  numeroCuotas: number
  precioTotal: number // Precio total con interés incluido
  valorCuota: number
  frecuenciaPago: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'
}

export interface Articulo {
  id: string
  nombre: string
  descripcion: string
  costo?: number
  precioBase: number
  precioContado?: number
  precioContadoId?: string
  categoria: string
  stock: number
  imagen?: string
  opcionesCuotas: OpcionCuotas[]
}

class ArticulosService {
  /**
   * Genera opciones de cuotas por defecto solo si el producto no tiene planes configurados.
   * IMPORTANTE: El backend guarda 'meses'. El frontend debe calcular el valor de la cuota
   * según la frecuencia elegida (Diario, Semanal, Quincenal, Mensual).
   */
  private generarOpcionesCuotas(precioBase: number): OpcionCuotas[] {
    // Estas son opciones de respaldo si NO hay data en la DB.
    // Usamos el precioBase (contado) como referencia sin intereses automáticos aquí,
    // ya que el usuario prefiere que se tome lo que dice la DB.
    const mesesEstandar = PLAZOS_ARTICULO_MESES

    return mesesEstandar.map((m) => {
      return {
        numeroCuotas: m, // Aquí guardamos Meses para que el componente calcule el resto
        precioTotal: precioBase,
        valorCuota: precioBase / m,
        frecuenciaPago: 'MENSUAL',
      }
    })
  }

  async obtenerArticulos(): Promise<Articulo[]> {
    try {
      const inventoryItems = await apiRequest('GET', '/inventory')
      if (!Array.isArray(inventoryItems)) return []

      return inventoryItems.map((item) => {
        const preciosRaw = item.precios || []

        const contadoItem = preciosRaw.find((p: PrecioProductoApi) => Number(p?.meses) === 0)
        const precioContado = contadoItem
          ? Number(contadoItem.precio)
          : Number(item.precioContado || item.precio_contado || item.price || item.precio || 0)

        const precioBase = precioContado || Number(item.costo || 0)

        // Mapear planes de crédito reales desde el backend (solo meses > 0)
        const opcionesCuotas: OpcionCuotas[] = preciosRaw
          .filter((p: PrecioProductoApi) => p && Number(p.meses) > 0)
          .map((p: PrecioProductoApi) => {
            const meses = Number(p.meses)
            const precio = Number(p.precio)
            return {
              id: p.id,
              numeroCuotas: meses,
              precioTotal: precio,
              valorCuota: precio / meses,
              frecuenciaPago: 'MENSUAL',
            }
          })

        return {
          id: String(item.id),
          // El `|| ''` lo pidio el tipo: las dos formas del nombre son opcionales y
          // `Articulo.nombre` es obligatorio. Con `any`, un articulo sin nombre pasaba
          // como `undefined` y la pantalla lo pintaba vacio.
          nombre: item.name || item.nombre || '',
          descripcion: item.description || item.descripcion || '',
          costo: Number(item.costo || 0),
          precioBase,
          precioContado,
          precioContadoId: contadoItem?.id,
          categoria: item.category || item.categoria || 'General',
          stock: Number(item.quantity || item.stock || 0),
          opcionesCuotas:
            opcionesCuotas.length > 0 ? opcionesCuotas : this.generarOpcionesCuotas(precioBase),
        }
      })
    } catch (error) {
      console.error('Error fetching articles', error)
      return []
    }
  }

  async obtenerArticuloPorId(id: string): Promise<Articulo | null> {
    try {
      const item = await apiRequest<ArticuloDeApi | null>(
        'GET',
        `/inventory/${id}`,
      )
      if (!item) return null

      const preciosRaw = item.precios || []
      const contadoItem = preciosRaw.find((p: PrecioProductoApi) => Number(p?.meses) === 0)
      const precioContado = contadoItem
        ? Number(contadoItem.precio)
        : Number(item.precioContado || item.precio_contado || item.price || item.precio || 0)

      const precioBase = precioContado || Number(item.costo || 0)

      const opcionesCuotas: OpcionCuotas[] = preciosRaw
        .filter((p: PrecioProductoApi) => p && Number(p.meses) > 0)
        .map((p: PrecioProductoApi) => {
          const meses = Number(p.meses)
          const precio = Number(p.precio)
          return {
            id: p.id,
            numeroCuotas: meses,
            precioTotal: precio,
            valorCuota: precio / meses,
            frecuenciaPago: 'MENSUAL',
          }
        })

      return {
        id: String(item.id),
        nombre: item.name || item.nombre || '',
        descripcion: item.description || item.descripcion || '',
        costo: Number(item.costo || 0),
        precioBase,
        precioContado,
        precioContadoId: contadoItem?.id,
        categoria: item.category || item.categoria || 'General',
        stock: Number(item.quantity || item.stock || 0),
        opcionesCuotas:
          opcionesCuotas.length > 0 ? opcionesCuotas : this.generarOpcionesCuotas(precioBase),
      }
    } catch {
      return null
    }
  }
}

export const articulosService = new ArticulosService()
