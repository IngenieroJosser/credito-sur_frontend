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
  expect(screen.getByText('Préstamo en efectivo')).toBeInTheDocument()
  expect(screen.getByLabelText('Plazo (meses)')).toHaveValue('1,5')
  expect(screen.getByText('Guardado redondeado: 2 meses')).toBeInTheDocument()
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
  fireEvent.click(plan.getByRole('button', { name: /^Registrado$/ }))
  expect(plan.getByText(/195\.000/)).toBeInTheDocument()
  expect(plan.queryByText(/190\.500/)).not.toBeInTheDocument()
  fireEvent.click(plan.getByRole('button', { name: /^Proyectado$/ }))
  expect(plan.getByText(/190\.500/)).toBeInTheDocument()
  expect(simular).toHaveBeenCalledWith(credito.id, { tasaInteres: 18, version: 4 })
  expect(screen.getByText('En mora')).toBeInTheDocument()

  fireEvent.click(submit)
  await waitFor(() => expect(guardar).toHaveBeenCalledWith(credito.id, { tasaInteres: 18, version: 4 }))
})

it('deja escoger dos meses aunque ese sea el entero redondeado que ya estaba en la base', async () => {
  simular.mockResolvedValue({
    interesTotal: 360000, totalFinal: 1260000, cuotaProyectada: 210000, plazoInteresMeses: 2,
    cuotas: [{ numeroCuota: 1, fechaVencimiento: '2026-08-08', monto: 210000, montoCapital: 150000, montoInteres: 60000 }],
  })
  render(<EditarPrestamoModal id={credito.id} onClose={jest.fn()} />)
  const plazo = await screen.findByLabelText('Plazo (meses)')
  expect(plazo).toHaveValue('1,5')

  fireEvent.change(plazo, { target: { value: '2' } })
  await waitFor(() => expect(simular).toHaveBeenCalledWith(credito.id, { plazoMeses: 2, version: 4 }))
  const resumen = within(screen.getByRole('region', { name: 'Resumen financiero' }))
  expect(await resumen.findByText(/^\$\s*360\.000$/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(guardar).toHaveBeenCalledWith(credito.id, { plazoMeses: 2, version: 4 }))
})

it('identifica un crédito de artículo y no ofrece condiciones de interés', async () => {
  obtener.mockResolvedValue({ ...credito, tipoPrestamo: 'ARTICULO', cuotaInicial: 200000, interesTotal: 0 })
  render(<EditarPrestamoModal id={credito.id} onClose={jest.fn()} />)

  expect(await screen.findByText('Crédito de artículo')).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: /^Cuota inicial \(COP\)/ })).toHaveValue('200.000')
  expect(screen.queryByRole('combobox', { name: 'Tipo de interés' })).not.toBeInTheDocument()
})

it('marca la condición inválida y bloquea la proyección y el guardado', async () => {
  render(<EditarPrestamoModal id={credito.id} onClose={jest.fn()} />)
  const cuotas = await screen.findByLabelText('Número de cuotas')
  fireEvent.change(cuotas, { target: { value: '1001' } })

  expect(cuotas).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByRole('alert')).toHaveTextContent('Ingresa entre 1 y 1.000 cuotas.')
  expect(screen.getByText('Datos por corregir', { selector: '[role="status"]' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  expect(simular).not.toHaveBeenCalled()
  expect(guardar).not.toHaveBeenCalled()
})

it('ofrece solo los dos tipos vigentes y no cambia uno histórico al guardar las notas', async () => {
  obtener.mockResolvedValue({ ...credito, tipoAmortizacion: TipoAmortizacion.FRANCESA })
  render(<EditarPrestamoModal id={credito.id} onClose={jest.fn()} />)

  const tipo = await screen.findByRole('combobox', { name: 'Tipo de interés' })
  expect(tipo).toHaveTextContent('Francesa (histórica)')
  fireEvent.click(tipo)
  const opciones = await screen.findAllByRole('option')
  expect(opciones.map((opcion) => opcion.textContent?.trim())).toEqual(['Interés Simple', 'Amortización'])
  fireEvent.keyDown(tipo, { key: 'Escape' })

  fireEvent.change(screen.getByLabelText('Notas / observaciones'), { target: { value: 'Nota histórica' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(guardar).toHaveBeenCalledWith(credito.id, { notas: 'Nota histórica', version: 4 }))
  expect(simular).not.toHaveBeenCalled()
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
