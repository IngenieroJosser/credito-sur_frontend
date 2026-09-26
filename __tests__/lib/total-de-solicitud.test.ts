import {
  totalDeSolicitud,
  plazoParaInteres,
  tipoAmortizacionDeSolicitud,
} from '@/lib/aprobaciones/total-de-solicitud'
import { TipoAmortizacion } from '@/types/enums'

/**
 * El total que ve quien aprueba un crédito.
 *
 * Esta cuenta vivía dentro de `NotificacionDetalleModal` y no había una sola
 * prueba que la tocara. Tenía dos errores:
 *
 *  1. Tomaba el `plazoMeses` de la solicitud, que es la columna de la base y es
 *     ENTERA, cuando el interés se calcula con el plazo fraccionario que sale de
 *     las cuotas y la frecuencia.
 *  2. Sumaba el interés sin truncar.
 *
 * Las pruebas de abajo fijan las dos cosas, con el caso que más dolía delante.
 */

describe('plazoParaInteres', () => {
  it('deduce el plazo de las cuotas y la frecuencia, no de la columna de la base', () => {
    // 45 cuotas diarias son mes y medio. La base guarda 2 porque la columna es
    // entera, y con 2 el interés sale un 33% más alto.
    expect(plazoParaInteres({ cantidadCuotas: 45, frecuenciaPago: 'DIARIO', plazoMeses: 2 })).toBe(
      1.5,
    )
  })

  it('usa la columna solo si no se puede deducir', () => {
    expect(plazoParaInteres({ plazoMeses: 3 })).toBe(3)
    expect(plazoParaInteres({ cantidadCuotas: 0, frecuenciaPago: 'DIARIO', plazoMeses: 3 })).toBe(3)
  })

  it('nunca devuelve cero: un plazo en cero anularía el interés', () => {
    expect(plazoParaInteres({})).toBe(1)
  })

  it('acepta el nombre alterno de la frecuencia', () => {
    expect(plazoParaInteres({ cuotas: 6, frecuencia: 'SEMANAL' })).toBe(1.5)
  })
})

describe('tipoAmortizacionDeSolicitud', () => {
  it('reconoce los tres métodos', () => {
    expect(tipoAmortizacionDeSolicitud('FRANCESA')).toBe(TipoAmortizacion.FRANCESA)
    expect(tipoAmortizacionDeSolicitud('INTERES_PLANO')).toBe(TipoAmortizacion.INTERES_PLANO)
    expect(tipoAmortizacionDeSolicitud('INTERES_SIMPLE')).toBe(TipoAmortizacion.INTERES_SIMPLE)
  })

  it('sin dato, interés simple, que es el método por defecto del sistema', () => {
    expect(tipoAmortizacionDeSolicitud(undefined)).toBe(TipoAmortizacion.INTERES_SIMPLE)
    expect(tipoAmortizacionDeSolicitud('')).toBe(TipoAmortizacion.INTERES_SIMPLE)
  })
})

describe('totalDeSolicitud', () => {
  describe('el caso que estaba mal', () => {
    const solicitudSinTotales = {
      monto: 1_000_000,
      tasaInteres: 10,
      cantidadCuotas: 45,
      frecuenciaPago: 'DIARIO',
      // La base guarda el plazo redondeado a 2. El crédito dura 1,5 meses.
      plazoMeses: 2,
      tipoAmortizacion: 'INTERES_SIMPLE',
    }

    it('cobra el interés de 1,5 meses, no de 2', () => {
      // 1,5 meses al 10% mensual sobre 1.000.000 = 150.000 de interés.
      expect(totalDeSolicitud(solicitudSinTotales, false)).toBe(1_150_000)
    })

    it('no es lo que mostraba antes, que eran 2 meses', () => {
      const loQueMostrabaAntes = 1_000_000 + (1_000_000 * 10 * 2) / 100
      expect(loQueMostrabaAntes).toBe(1_200_000)
      expect(totalDeSolicitud(solicitudSinTotales, false)).not.toBe(loQueMostrabaAntes)
    })

    it('el error era del 33% del interés', () => {
      const real = totalDeSolicitud(solicitudSinTotales, false) - 1_000_000
      expect(real).toBe(150_000)
      expect(200_000 / real).toBeCloseTo(1.333, 2)
    })
  })

  describe('lo que la solicitud ya trae manda sobre cualquier cuenta local', () => {
    it('usa montoTotal si viene', () => {
      expect(
        totalDeSolicitud({ montoTotal: 1_234_567, monto: 1_000_000, tasaInteres: 99 }, false),
      ).toBe(1_234_567)
    })

    it('acepta totalPagar y totalAPagar como nombres alternos', () => {
      expect(totalDeSolicitud({ totalPagar: 500_000, monto: 400_000 }, false)).toBe(500_000)
      expect(totalDeSolicitud({ totalAPagar: 600_000, monto: 400_000 }, false)).toBe(600_000)
    })

    it('con el interés ya calculado no deduce el plazo', () => {
      // Si el plazo entrara en juego daría otra cifra; aquí se suma y punto.
      expect(
        totalDeSolicitud(
          {
            monto: 1_000_000,
            interesTotal: 77_777,
            tasaInteres: 10,
            cantidadCuotas: 45,
            frecuenciaPago: 'DIARIO',
          },
          false,
        ),
      ).toBe(1_077_777)
    })
  })

  describe('crédito de artículo', () => {
    it('el total es el precio del artículo: no hay interés que calcular', () => {
      // El recargo por plazo ya está dentro del precio del plan.
      expect(
        totalDeSolicitud({ valorArticulo: 780_000, monto: 680_000, tasaInteres: 10 }, true),
      ).toBe(780_000)
    })

    it('si no vino el precio, cae al capital financiado', () => {
      expect(totalDeSolicitud({ monto: 680_000 }, true)).toBe(680_000)
    })
  })

  describe('amortización (interés plano)', () => {
    it('la tasa se aplica una sola vez, sin importar el plazo', () => {
      const corto = totalDeSolicitud(
        {
          monto: 1_000_000,
          tasaInteres: 10,
          cantidadCuotas: 30,
          frecuenciaPago: 'DIARIO',
          tipoAmortizacion: 'INTERES_PLANO',
        },
        false,
      )
      const largo = totalDeSolicitud(
        {
          monto: 1_000_000,
          tasaInteres: 10,
          cantidadCuotas: 360,
          frecuenciaPago: 'DIARIO',
          tipoAmortizacion: 'INTERES_PLANO',
        },
        false,
      )
      expect(corto).toBe(1_100_000)
      expect(largo).toBe(1_100_000)
    })
  })

  describe('datos incompletos', () => {
    it('sin nada devuelve cero, no NaN', () => {
      expect(totalDeSolicitud({}, false)).toBe(0)
    })

    it('sin cuotas ni tasa devuelve el capital', () => {
      expect(totalDeSolicitud({ monto: 500_000 }, false)).toBe(500_000)
    })

    it('un total en cero no se toma como válido', () => {
      expect(totalDeSolicitud({ montoTotal: 0, monto: 500_000 }, false)).toBe(500_000)
    })

    it('valores que no son números no contaminan el resultado', () => {
      expect(totalDeSolicitud({ montoTotal: 'N/A', monto: 500_000 }, false)).toBe(500_000)
    })
  })
})
