import { resolveNivelRiesgoUi } from '@/lib/rutas/riesgo-obligacion'
import { resolveNivelRiesgoVisita } from '@/lib/rutas/resolve-riesgo-visita'

describe('riesgo de ruta compartido por roles', () => {
  it.each(['cobrador', 'supervisor', 'coordinador', 'administrador'])(
    'usa diasMora de la visita para %s',
    () => {
      expect(resolveNivelRiesgoVisita({ estado: 'en_mora', diasMora: 9 })).toBe('moderado')
    },
  )

  it('no convierte un valor ausente en riesgo minimo', () => {
    expect(resolveNivelRiesgoUi(undefined)).toBeUndefined()
    expect(resolveNivelRiesgoUi('')).toBeUndefined()
  })

  it('normaliza los cinco niveles visibles', () => {
    expect(resolveNivelRiesgoUi('VERDE')).toBe('minimo')
    expect(resolveNivelRiesgoUi('LEVE')).toBe('leve')
    expect(resolveNivelRiesgoUi('AMARILLO')).toBe('precaucion')
    expect(resolveNivelRiesgoUi('MODERADO')).toBe('moderado')
    expect(resolveNivelRiesgoUi('CRITICO')).toBe('critico')
  })
})
