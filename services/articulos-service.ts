import { apiRequest } from '@/lib/api/api';

export interface OpcionCuotas {
  numeroCuotas: number
  precioTotal: number // Precio total con interés incluido
  valorCuota: number
  frecuenciaPago: 'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'
}

export interface Articulo {
  id: string
  nombre: string
  descripcion: string
  precioBase: number // Precio sin financiamiento
  categoria: string
  stock: number
  imagen?: string
  // Opciones de cuotas asignadas dinámicamente
  opcionesCuotas: OpcionCuotas[]
}

class ArticulosService {
  private generarOpcionesCuotas(precioBase: number): OpcionCuotas[] {
    // Generar opciones estándar basadas en el precio base
    const configuraciones = [
      { cuotas: 3, interes: 0.05 },
      { cuotas: 6, interes: 0.10 },
      { cuotas: 12, interes: 0.20 },
      { cuotas: 18, interes: 0.30 },
      { cuotas: 24, interes: 0.40 },
    ];

    return configuraciones.map(conf => {
        const precioTotal = precioBase * (1 + conf.interes);
        return {
            numeroCuotas: conf.cuotas,
            precioTotal: precioTotal,
            valorCuota: precioTotal / conf.cuotas, // Asumiendo pago por cuota (sea quincena o mes, aqui simplificamos)
            frecuenciaPago: 'QUINCENAL' // Por defecto
        };
    });
  }

  async obtenerArticulos(): Promise<Articulo[]> {
    try {
        const inventoryItems: any[] = await apiRequest('GET', '/inventory');
        if (!Array.isArray(inventoryItems)) return [];
        
        return inventoryItems.map(item => ({
            id: String(item.id),
            nombre: item.name || item.nombre,
            descripcion: item.description || item.descripcion || '',
            precioBase: Number(item.price || item.precio),
            categoria: item.category || item.categoria || 'General',
            stock: Number(item.quantity || item.stock || 0),
            opcionesCuotas: this.generarOpcionesCuotas(Number(item.price || item.precio))
        }));
    } catch (error) {
        console.error("Error fetching articles", error);
        return [];
    }
  }

  async obtenerArticuloPorId(id: string): Promise<Articulo | null> {
    try {
        const item: any = await apiRequest('GET', `/inventory/${id}`);
        if (!item) return null;
        return {
            id: String(item.id),
            nombre: item.name || item.nombre,
            descripcion: item.description || item.descripcion || '',
            precioBase: Number(item.price || item.precio),
            categoria: item.category || item.categoria || 'General',
            stock: Number(item.quantity || item.stock || 0),
            opcionesCuotas: this.generarOpcionesCuotas(Number(item.price || item.precio))
        }
    } catch (error) {
        return null;
    }
  }
  
}

export const articulosService = new ArticulosService()
