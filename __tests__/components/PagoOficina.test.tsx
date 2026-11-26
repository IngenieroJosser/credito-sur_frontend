import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PagoOficinaModal } from '@/components/cobranza/PagoOficina'
import { formatearImportesEnConcepto } from '@/lib/contable/importes-en-concepto'
import { pagosService } from '@/services/pagos-service'
import { prestamosService } from '@/services/prestamos-service'

jest.mock('@/services/pagos-service', () => ({ pagosService: { registrarPago: jest.fn() } }))
jest.mock('@/services/prestamos-service', () => ({ prestamosService: { obtenerPrestamos: jest.fn() } }))

const consultar = jest.mocked(prestamosService.obtenerPrestamos)
const registrar = jest.mocked(pagosService.registrarPago)
const cliente = { id: 'cliente-1', nombres: 'Ana', apellidos: 'Prueba' }

it('formatea el importe legado sin cambiar un importe que ya tiene formato', () => {
  const texto = formatearImportesEnConcepto('Entrada de inventario — 100084: 3 und a $87266')
  expect(texto).toContain('100084: 3 und')
  expect(texto).toMatch(/\$\s?87\.266/)
  expect(formatearImportesEnConcepto(texto)).toBe(texto)
  expect(formatearImportesEnConcepto('Monto anterior: $87.266')).toBe('Monto anterior: $87.266')
})

it('exige elegir el crédito y lo identifica en el pago, incluso si está en otra página', async () => {
  const prestamo = (id: string, estado: string) => ({
    id, estado, clienteId: cliente.id, numeroPrestamo: id, montoPendiente: 50000,
    producto: 'Préstamo', rutaNombre: 'Ruta Norte',
  })
  consultar
    .mockResolvedValueOnce({ prestamos: [prestamo('PRES-001', 'ACTIVO'), prestamo('PRES-002', 'PAGADO')], paginacion: { totalPaginas: 2 } } as Awaited<ReturnType<typeof consultar>>)
    .mockResolvedValueOnce({ prestamos: [prestamo('ART-003', 'EN_MORA')], paginacion: { totalPaginas: 2 } } as Awaited<ReturnType<typeof consultar>>)
  registrar.mockResolvedValueOnce({ esOffline: true })
  render(<PagoOficinaModal cliente={cliente} onClose={jest.fn()} />)

  const selector = await screen.findByRole('combobox', { name: 'Crédito' })
  const enviar = screen.getByRole('button', { name: 'Registrar pago en efectivo' })
  expect(enviar).toBeDisabled()
  expect(selector).toHaveTextContent('Selecciona el crédito que se va a pagar')
  fireEvent.click(selector)
  const articulo = await screen.findByRole('option', { name: /ART-003/ })
  expect(screen.queryByRole('option', { name: /PRES-002/ })).not.toBeInTheDocument()
  fireEvent.click(articulo)
  const monto = screen.getByLabelText(/Monto recibido \(COP\)/)
  fireEvent.change(monto, { target: { value: '50001' } })
  expect(enviar).toBeDisabled()
  fireEvent.change(monto, { target: { value: '30000' } })
  fireEvent.click(enviar)
  await waitFor(() => expect(registrar).toHaveBeenCalledTimes(1))
  expect(registrar).toHaveBeenCalledWith(expect.objectContaining({
    clienteId: cliente.id, prestamoId: 'ART-003', montoTotal: 30000, metodoPago: 'EFECTIVO',
    idempotencyKey: expect.any(String),
  }))
  expect(await screen.findByText('Pago pendiente de sincronización')).toBeInTheDocument()
})
