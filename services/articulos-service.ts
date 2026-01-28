// Servicio de artículos con precios y cuotas asignadas por el contable

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
  // Opciones de cuotas asignadas por el contable
  opcionesCuotas: OpcionCuotas[]
}

// Mock de artículos con precios y cuotas asignadas por el contable
export const MOCK_ARTICULOS: Articulo[] = [
  {
    id: '1',
    nombre: 'TV Samsung 55" 4K',
    descripcion: 'Smart TV 55 pulgadas 4K UHD',
    precioBase: 2500000,
    categoria: 'Electrónica',
    stock: 5,
    opcionesCuotas: [
      {
        numeroCuotas: 3,
        precioTotal: 2625000, // 5% de interés
        valorCuota: 875000,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 6,
        precioTotal: 2750000, // 10% de interés
        valorCuota: 458333,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 12,
        precioTotal: 3000000, // 20% de interés
        valorCuota: 250000,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 18,
        precioTotal: 3250000, // 30% de interés
        valorCuota: 180556,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 24,
        precioTotal: 3500000, // 40% de interés
        valorCuota: 145833,
        frecuenciaPago: 'QUINCENAL',
      },
    ],
  },
  {
    id: '2',
    nombre: 'Refrigeradora LG 500L',
    descripcion: 'Refrigeradora de 500 litros con dispensador',
    precioBase: 3200000,
    categoria: 'Electrodomésticos',
    stock: 3,
    opcionesCuotas: [
      {
        numeroCuotas: 3,
        precioTotal: 3360000,
        valorCuota: 1120000,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 6,
        precioTotal: 3520000,
        valorCuota: 586667,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 12,
        precioTotal: 3840000,
        valorCuota: 320000,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 18,
        precioTotal: 4160000,
        valorCuota: 231111,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 24,
        precioTotal: 4480000,
        valorCuota: 186667,
        frecuenciaPago: 'QUINCENAL',
      },
    ],
  },
  {
    id: '3',
    nombre: 'Lavadora Whirlpool 18kg',
    descripcion: 'Lavadora automática de 18kg',
    precioBase: 1800000,
    categoria: 'Electrodomésticos',
    stock: 7,
    opcionesCuotas: [
      {
        numeroCuotas: 3,
        precioTotal: 1890000,
        valorCuota: 630000,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 6,
        precioTotal: 1980000,
        valorCuota: 330000,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 12,
        precioTotal: 2160000,
        valorCuota: 180000,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 18,
        precioTotal: 2340000,
        valorCuota: 130000,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 24,
        precioTotal: 2520000,
        valorCuota: 105000,
        frecuenciaPago: 'QUINCENAL',
      },
    ],
  },
  {
    id: '4',
    nombre: 'Celular iPhone 15',
    descripcion: 'iPhone 15 128GB',
    precioBase: 4500000,
    categoria: 'Celulares',
    stock: 10,
    opcionesCuotas: [
      {
        numeroCuotas: 3,
        precioTotal: 4725000,
        valorCuota: 1575000,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 6,
        precioTotal: 4950000,
        valorCuota: 825000,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 12,
        precioTotal: 5400000,
        valorCuota: 450000,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 18,
        precioTotal: 5850000,
        valorCuota: 325000,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 24,
        precioTotal: 6300000,
        valorCuota: 262500,
        frecuenciaPago: 'QUINCENAL',
      },
    ],
  },
  {
    id: '5',
    nombre: 'Moto Honda XR 190',
    descripcion: 'Motocicleta Honda XR 190cc',
    precioBase: 8500000,
    categoria: 'Vehículos',
    stock: 2,
    opcionesCuotas: [
      {
        numeroCuotas: 6,
        precioTotal: 9350000,
        valorCuota: 1558333,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 12,
        precioTotal: 10200000,
        valorCuota: 850000,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 18,
        precioTotal: 11050000,
        valorCuota: 613889,
        frecuenciaPago: 'QUINCENAL',
      },
      {
        numeroCuotas: 24,
        precioTotal: 11900000,
        valorCuota: 495833,
        frecuenciaPago: 'QUINCENAL',
      },
    ],
  },
]

class ArticulosService {
  async obtenerArticulos(): Promise<Articulo[]> {
    // Simular llamada a API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_ARTICULOS)
      }, 100)
    })
  }

  async obtenerArticuloPorId(id: string): Promise<Articulo | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const articulo = MOCK_ARTICULOS.find((a) => a.id === id)
        resolve(articulo || null)
      }, 100)
    })
  }

  obtenerOpcionesCuotas(articuloId: string): OpcionCuotas[] {
    const articulo = MOCK_ARTICULOS.find((a) => a.id === articuloId)
    return articulo?.opcionesCuotas || []
  }
}

export const articulosService = new ArticulosService()
