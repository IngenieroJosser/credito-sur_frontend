export type VentaResumenInput = {
  tipo: 'CREDITO' | 'CONTADO' | string
  monto?: number | null
  cuotaInicial?: number | null
}

export function calcularResumenVentas(ventas: VentaResumenInput[]) {
  return ventas.reduce(
    (acc, venta) => {
      const tipo = String(venta.tipo || '').toUpperCase()
      const monto = Number(venta.monto || 0)
      const cuotaInicial = Number(venta.cuotaInicial || 0)

      if (tipo === 'CREDITO') {
        acc.totalFinanciado += monto
        acc.totalCuotaInicial += cuotaInicial
      }

      if (tipo === 'CONTADO') {
        acc.totalContado += monto
      }

      acc.totalOperaciones += 1
      return acc
    },
    {
      totalFinanciado: 0,
      totalContado: 0,
      totalCuotaInicial: 0,
      totalOperaciones: 0,
    },
  )
}
