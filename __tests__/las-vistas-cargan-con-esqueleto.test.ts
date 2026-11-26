import fs from 'fs'
import path from 'path'
import { sinComentarios } from '@/lib/testing/sin-comentarios'

/**
 * Una vista que carga datos enseña su forma, no un spinner que tapa todo.
 *
 * ── Lo que pedía el dueño ─────────────────────────────────────────────────
 *
 * «Necesito que casi todas o si es posible y mejor todas las vistas tengan
 * skeleton».
 *
 * ── Lo que había, medido ──────────────────────────────────────────────────
 *
 * Mejor de lo que parecía: de las 40 pantallas que cargan datos, **33** ya
 * tenían esqueleto. Y dos de las siete restantes —el login y recuperar
 * contraseña— no lo necesitan: son formularios, no vistas de datos.
 *
 * Un aviso sobre la medición: `ClientesFeature` y `ListadoPrestamos` también
 * lo tenían, escrito a mano con `animate-pulse` en vez del componente, así
 * que el primer barrido los dio por pelados. Buscar el nombre del componente
 * no basta.
 *
 * El hueco real eran **tres** usos de `AnimacionCarga`, que tapa la pantalla
 * entera: el panel contable, los créditos de artículo y el inventario. Al
 * terminar, todo aparecía de golpe, y mientras tanto no se sabía ni qué se
 * estaba cargando ni cuánto iba a ocupar.
 *
 * ── Lo que vigila ─────────────────────────────────────────────────────────
 *
 * Que nadie vuelva a poner un spinner a pantalla completa en una vista que
 * carga datos.
 *
 * `PantallaCarga` NO entra aquí, y es a propósito: se usa mientras se
 * resuelve la sesión o mientras se redirige, y ahí de verdad no hay forma que
 * enseñar —no se sabe todavía a qué pantalla se va—. Un esqueleto ahí
 * dibujaría la silueta de algo que a lo mejor no se llega a ver.
 */
const RAIZ = process.cwd()

/**
 * Las que de verdad no son vistas de datos.
 *
 * Cada una con su motivo: una lista de excepciones sin motivos se convierte
 * en el sitio donde se esconde lo que no se quiso arreglar.
 */
const NO_SON_VISTAS: Record<string, string> = {
  'components/ui/AnimacionCarga.tsx': 'es el propio componente',
}

function archivos(): string[] {
  const salida: string[] = []
  const recorrer = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const completo = path.join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.next') continue
        recorrer(completo)
        continue
      }
      if (e.name.endsWith('.tsx')) {
        salida.push(path.relative(RAIZ, completo).split(path.sep).join('/'))
      }
    }
  }
  for (const base of ['app', 'components']) {
    const dir = path.join(RAIZ, base)
    if (fs.existsSync(dir)) recorrer(dir)
  }
  return salida
}

const barrido = (() => {
  const conSpinner: string[] = []
  let leidos = 0

  for (const rel of archivos()) {
    if (NO_SON_VISTAS[rel]) continue
    const fuente = sinComentarios(fs.readFileSync(path.join(RAIZ, rel), 'utf8'))
    leidos += 1
    if (/<AnimacionCarga\b/.test(fuente)) conSpinner.push(rel)
  }
  return { conSpinner, leidos }
})()

describe('las vistas que cargan enseñan su forma', () => {
  it('el barrido lee las pantallas', () => {
    // Piso medido: el frontend pasa de 250 archivos .tsx entre app y components.
    expect(barrido.leidos).toBeGreaterThanOrEqual(150)
  })

  it('ninguna vista tapa la pantalla con un spinner mientras carga', () => {
    /*
     * Si esto falla con una pantalla tuya: usa una de las piezas de
     * `components/ui/Skeleton.tsx` —`SkeletonTablero`, `SkeletonTabla`,
     * `SkeletonDetalle`, `SkeletonFormulario`— con la forma de lo que estás
     * cargando. Si de verdad no hay forma que enseñar porque todavía no se
     * sabe a dónde se va, eso es `PantallaCarga`, que esta prueba no toca.
     */
    expect(barrido.conSpinner).toEqual([])
  })
})
