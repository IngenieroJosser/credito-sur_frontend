import { test } from '@playwright/test'
import { entrarComo, USUARIOS, type Rol } from './sesion'

/**
 * Cuánto tarda cada rol en entrar cuando los siete entran A LA VEZ.
 *
 * Es el momento real de la mañana: todos abren el sistema al empezar la jornada. Mide, no
 * afirma. La cifra hace falta para saber si el arranque del día es usable o si la gente
 * espera minutos antes de poder trabajar.
 */
test('los siete entran a la vez y se mide cuánto tarda cada uno', async ({ browser }) => {
  test.setTimeout(10 * 60_000)

  const roles = Object.keys(USUARIOS) as Rol[]
  const contextos = await Promise.all(
    roles.map(() => browser.newContext({ locale: 'es-CO' })),
  )
  const paginas = await Promise.all(contextos.map((c) => c.newPage()))

  const tiempos = await Promise.all(
    roles.map(async (rol, i) => {
      try {
        const ms = await entrarComo(paginas[i], rol)
        return { rol, ms, error: '' }
      } catch (e) {
        return { rol, ms: -1, error: String((e as Error).message).slice(0, 80) }
      }
    }),
  )

  for (const t of tiempos) {
    console.log(
      `LOGIN ${t.rol} ${t.ms >= 0 ? `${(t.ms / 1000).toFixed(1)}s` : 'FALLÓ ' + t.error}`,
    )
  }
  await Promise.all(contextos.map((c) => c.close()))
})
