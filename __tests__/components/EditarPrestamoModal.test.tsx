import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import EditarPrestamoModal from '@/components/prestamos/EditarPrestamoModal'
import { prestamosService } from '@/services/prestamos-service'
import type { Prestamo } from '@/types/domain'
import { FrecuenciaPago, TipoAmortizacion } from '@/types/enums'

jest.mock('@/services/prestamos-service', () => ({
  prestamosService: { obtenerPrestamoPorId: jest.fn(), simularEdicion: jest.fn(), actualizarPrestamo: jest.fn() },
}))
jest.mock('@/components/providers/NotificationProvider', () => ({
  useNotification: () => ({ showNotification: jest.fn() }),
}))
jest.mock('@/components/providers/NotificacionesProvider', () => ({
  useNotificaciones: () => ({ refreshNotificaciones: jest.fn() }),
}))

const obtener = jest.mocked(prestamosService.obtenerPrestamoPorId)
const simular = jest.mocked(prestamosService.simularEdicion)
const guardar = jest.mocked(prestamosService.actualizarPrestamo)
const credito: Prestamo = {
  id: 'prestamo-test', clienteId: 'cliente-prueba', numeroPrestamo: 'IMP-PRUEBA-4',
  version: 4, monto: 900000, interesTotal: 270000, saldoPendiente: 1170000, totalPagado: 0,
  fechaInicio: '2026-08-01T05:00:00.000Z', fechaPrimerCobro: '2026-08-08T05:00:00.000Z',
  estado: 'ACTIVO', estadoEfectivo: 'EN_MORA', estadoAprobacion: 'APROBADO', cuotasVencidas: 6,
  tasaInteres: 20, tasaInteresMora: 0, plazoMeses: 2, plazoInteresMeses: 1.5, cantidadCuotas: 6, frecuenciaPago: FrecuenciaPago.SEMANAL,
  tipoAmortizacion: TipoAmortizacion.INTERES_SIMPLE, tipoPrestamo: 'EFECTIVO',
  notas: 'Inicial', creadoEn: '2026-08-01', actualizadoEn: '2026-08-01',
  cuotas: [{ numeroCuota: 1, fechaVencimiento: '2026-08-08T05:00:00.000Z', monto: 195000, montoCapital: 150000, montoInteres: 45000 }],
}

beforeEach(() => {
  jest.clearAllMocks()
  obtener.mockResolvedValue(credito)
  guardar.mockResolvedValue(credito)
})

it('muestra primero los importes registrados y conserva la mora al simular y guardar', async () => {
  simular.mockResolvedValue({
    interesTotal: 243000, totalFinal: 1143000, cuotaProyectada: 190500, plazoInteresMeses: 1.5,
    cuotas: [{ numeroCuota: 1, fechaVencimiento: '2026-08-08', monto: 190500, montoCapital: 150000, montoInteres: 40500 }],
  })
  render(<EditarPrestamoModal id={credito.id} onClose={jest.fn()} />)

  await screen.findByText('En mora')
  const resumen = within(screen.getByRole('region', { name: 'Resumen financiero' }))
  const plan = within(screen.getByRole('region', { name: 'Plan de cuotas' }))
  const submit = screen.getByRole('button', { name: 'Guardar cambios' })
  expect(resumen.getByText(/^\$\s*270\.000$/)).toBeInTheDocument()
  expect(plan.getByText('08/08/2026')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^(Activo|Pendiente)/ })).not.toBeInTheDocument()
  expect(simular).not.toHaveBeenCalled()

  fireEvent.change(screen.getByLabelText('Tasa mensual (%)'), { target: { value: '18' } })
  expect(submit).toBeDisabled()
  expect(resumen.queryByText(/^\$\s*270\.000$/)).not.toBeInTheDocument()
  expect(await resumen.findByText(/^\$\s*243\.000$/)).toBeInTheDocument()
  expect(resumen.getByText(/Registrado:.*270\.000/)).toBeInTheDocument()
  expect(plan.getByText(/190\.500/)).toBeInTheDocument()
  expect(simular).toHaveBeenCalledWith(credito.id, { tasaInteres: 18, version: 4 })
  expect(screen.getByText('En mora')).toBeInTheDocument()

  fireEvent.click(submit)
  await waitFor(() => expect(guardar).toHaveBeenCalledWith(credito.id, { tasaInteres: 18, version: 4 }))
})

it('permite cambiar notas sin proyectar ni modificar las condiciones de un crédito con pagos', async () => {
  obtener.mockResolvedValue({ ...credito, motivoBloqueoPlan: 'El crédito ya tiene pagos. Solo se pueden editar las observaciones.' })
  render(<EditarPrestamoModal id={credito.id} onClose={jest.fn()} />)

  await screen.findByText(/El crédito ya tiene pagos/)
  expect(screen.getByLabelText('Capital (COP)')).toBeDisabled()
  const notas = screen.getByLabelText('Notas / observaciones')
  expect(notas).toBeEnabled()
  fireEvent.change(notas, { target: { value: 'Visita realizada' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(guardar).toHaveBeenCalledWith(credito.id, { notas: 'Visita realizada', version: 4 }))
  expect(simular).not.toHaveBeenCalled()
})
