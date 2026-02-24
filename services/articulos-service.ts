import { apiRequest } from '@/lib/api/api';

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
    const mesesEstandar = [1, 2, 3, 4, 6, 12];

    return mesesEstandar.map(m => {
        return {
            numeroCuotas: m, // Aquí guardamos Meses para que el componente calcule el resto
            precioTotal: precioBase,
            valorCuota: precioBase / m, 
            frecuenciaPago: 'MENSUAL' 
        };
    });
  }

  async obtenerArticulos(): Promise<Articulo[]> {
    try {
        const inventoryItems: any[] = await apiRequest('GET', '/inventory');
        if (!Array.isArray(inventoryItems)) return [];
        
        return inventoryItems.map(item => {
            const preciosRaw = item.precios || [];

            const contadoItem = preciosRaw.find((p: any) => Number(p?.meses) === 0);
            const precioContado = contadoItem
              ? Number(contadoItem.precio)
              : Number(
                  item.precioContado ||
                  item.precio_contado ||
                  item.price ||
                  item.precio ||
                  0
                );

            const precioBase = precioContado || Number(item.costo || 0);
            
            // Mapear planes de crédito reales desde el backend (solo meses > 0)
            const opcionesCuotas: OpcionCuotas[] = preciosRaw
              .filter((p: any) => p && Number(p.meses) > 0)
              .map((p: any) => {
                const meses = Number(p.meses);
                const precio = Number(p.precio);
                return {
                  id: p.id,
                  numeroCuotas: meses,
                  precioTotal: precio,
                  valorCuota: precio / meses,
                  frecuenciaPago: 'MENSUAL'
                };
              });

            return {
                id: String(item.id),
                nombre: item.name || item.nombre,
                descripcion: item.description || item.descripcion || '',
                precioBase,
                precioContado,
                precioContadoId: contadoItem?.id,
                categoria: item.category || item.categoria || 'General',
                stock: Number(item.quantity || item.stock || 0),
                opcionesCuotas: opcionesCuotas.length > 0 ? opcionesCuotas : this.generarOpcionesCuotas(precioBase)
            };
        });
    } catch (error) {
        console.error("Error fetching articles", error);
        return [];
    }
  }

  async obtenerArticuloPorId(id: string): Promise<Articulo | null> {
    try {
        const item: any = await apiRequest('GET', `/inventory/${id}`);
        if (!item) return null;

        const preciosRaw = item.precios || [];
        const contadoItem = preciosRaw.find((p: any) => Number(p?.meses) === 0);
        const precioContado = contadoItem
          ? Number(contadoItem.precio)
          : Number(
              item.precioContado ||
              item.precio_contado ||
              item.price ||
              item.precio ||
              0
            );

        const precioBase = precioContado || Number(item.costo || 0);
        
        const opcionesCuotas: OpcionCuotas[] = preciosRaw
          .filter((p: any) => p && Number(p.meses) > 0)
          .map((p: any) => {
            const meses = Number(p.meses);
            const precio = Number(p.precio);
            return {
              id: p.id,
              numeroCuotas: meses,
              precioTotal: precio,
              valorCuota: precio / meses,
              frecuenciaPago: 'MENSUAL'
            };
          });

        return {
            id: String(item.id),
            nombre: item.name || item.nombre,
            descripcion: item.description || item.descripcion || '',
            precioBase,
            precioContado,
            precioContadoId: contadoItem?.id,
            categoria: item.category || item.categoria || 'General',
            stock: Number(item.quantity || item.stock || 0),
            opcionesCuotas: opcionesCuotas.length > 0 ? opcionesCuotas : this.generarOpcionesCuotas(precioBase)
        }
    } catch (error) {
        return null;
    }
  }
  
}

export const articulosService = new ArticulosService()
