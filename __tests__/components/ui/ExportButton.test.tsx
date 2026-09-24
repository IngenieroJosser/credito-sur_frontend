import { act, fireEvent, render, screen } from '@testing-library/react'
import { ExportButton } from '@/components/ui/ExportButton'

/**
 * Que se vea que el archivo se está generando.
 *
 * Generar un Excel o un PDF tarda: el servidor arma el archivo y luego el
 * navegador lo descarga. Antes el botón recibía `() => void` y no podía saber
 * cuándo terminaba, así que se pulsaba, el menú se cerraba y no pasaba nada
 * visible durante segundos. La gente volvía a pulsar y se generaba dos veces.
 *
 * Estas pruebas fijan las tres cosas que lo evitan: avisar, bloquear mientras
 * dura, y volver al estado normal al acabar —incluso si falla—.
 */

/** Una exportación que no termina hasta que la prueba lo diga. */
function exportacionControlada() {
  let resolver!: () => void
  let rechazar!: (e: unknown) => void
  const accion = jest.fn(
    () =>
      new Promise<void>((res, rej) => {
        resolver = res
        rechazar = rej
      }),
  )
  return { accion, resolver: () => resolver(), rechazar: (e: unknown) => rechazar(e) }
}

const abrirMenu = () => fireEvent.click(screen.getAllByRole('button')[0])

describe('ExportButton', () => {
  it('avisa mientras genera el Excel', async () => {
    const { accion, resolver } = exportacionControlada()
    render(<ExportButton onExportExcel={accion} />)

    abrirMenu()
    fireEvent.click(screen.getByText('Excel'))

    expect(accion).toHaveBeenCalledTimes(1)
    const principal = screen.getAllByRole('button')[0]
    expect(principal).toHaveAttribute('aria-busy', 'true')
    expect(principal).toBeDisabled()
    expect(principal).toHaveTextContent(/Generando Excel/)

    await act(async () => {
      resolver()
    })

    expect(principal).toHaveAttribute('aria-busy', 'false')
    expect(principal).not.toBeDisabled()
  })

  it('distingue el formato en el aviso', async () => {
    const { accion, resolver } = exportacionControlada()
    render(<ExportButton onExportPDF={accion} />)

    abrirMenu()
    fireEvent.click(screen.getByText('PDF'))

    expect(screen.getAllByRole('button')[0]).toHaveTextContent(/Generando PDF/)

    await act(async () => {
      resolver()
    })
  })

  it('no permite lanzarla dos veces mientras dura', async () => {
    const { accion, resolver } = exportacionControlada()
    render(<ExportButton onExportExcel={accion} />)

    abrirMenu()
    fireEvent.click(screen.getByText('Excel'))
    // El menú ya se cerró y el botón está bloqueado: no hay forma de repetir.
    fireEvent.click(screen.getAllByRole('button')[0])

    expect(accion).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolver()
    })
  })

  it('vuelve al estado normal aunque la exportacion falle', async () => {
    const { accion, rechazar } = exportacionControlada()
    render(<ExportButton onExportExcel={accion} />)

    abrirMenu()
    fireEvent.click(screen.getByText('Excel'))
    expect(screen.getAllByRole('button')[0]).toBeDisabled()

    await act(async () => {
      rechazar(new Error('el servidor no pudo armar el archivo'))
    })

    const principal = screen.getAllByRole('button')[0]
    expect(principal).not.toBeDisabled()
    expect(principal).toHaveAttribute('aria-busy', 'false')
  })

  it('sin ninguna accion queda deshabilitado', () => {
    render(<ExportButton />)
    expect(screen.getAllByRole('button')[0]).toBeDisabled()
  })
})
