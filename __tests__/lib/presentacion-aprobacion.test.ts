import {
  enriquecerAprobacionConContexto,
  montoSolicitudConocido,
  resumenAprobacionOperativa,
} from '@/lib/aprobaciones/presentacion-aprobacion'
import type { Aprobacion, ApprovalContext } from '@/services/aprobaciones-service'
import { EstadoAprobacion, TipoAprobacion } from '@/types/enums'

const aprobacion = (overrides: Partial<Aprobacion>): Aprobacion => ({
  id: 'aprobacion-1',
  tipoAprobacion: TipoAprobacion.PAGO_TRANSFERENCIA,
  referenciaId: 'prestamo-1',
  tablaReferencia: 'prestamos',
  solicitadoPorId: 'usuario-1',
  aprobadoPorId: null,
  estado: EstadoAprobacion.PENDIENTE,
  comentarios: null,
  datosSolicitud: {},
  datosAprobados: null,
  montoSolicitud: null,
  creadoEn: '2026-10-08T12:00:00.000Z',
  actualizadoEn: '2026-10-08T12:00:00.000Z',
  revisadoEn: null,
  solicitante: 'Ana Cobradora',
  ...overrides,
})

describe('presentacion de aprobaciones operativas', () => {
  it('lee montoTotal en pagos por transferencia sin inventar cero', () => {
    const item = aprobacion({
      datosSolicitud: { montoTotal: 180_000, numeroReferencia: 'TRX-88' },
    })

    expect(montoSolicitudConocido(item)).toBe(180_000)
    expect(resumenAprobacionOperativa(item)).toMatchObject({
      titulo: 'Pago por transferencia',
      monto: 180_000,
      labelMonto: 'Valor transferido',
    })
  })

  it('mantiene desconocido el monto cuando el endpoint no lo envia', () => {
    const item = aprobacion({ datosSolicitud: {}, montoSolicitud: null })

    expect(montoSolicitudConocido(item)).toBeUndefined()
    expect(resumenAprobacionOperativa(item)?.monto).toBeNull()
  })

  it('no muestra una referencia inexistente en solicitudes antiguas', () => {
    const item = aprobacion({
      datosSolicitud: { numeroPrestamo: 'PRE-100', montoTotal: 25_000 },
    })

    expect(resumenAprobacionOperativa(item)?.subtitulo).toBe(
      'Crédito PRE-100 · Solicitado por Ana Cobradora',
    )
  })

  it('lee monto y datos propios de una solicitud de base', () => {
    const item = aprobacion({
      tipoAprobacion: TipoAprobacion.SOLICITUD_BASE_EFECTIVO,
      datosSolicitud: {
        monto: 500_000,
        rutaNombre: 'Ruta Norte',
        cajaNombre: 'Caja Ruta Norte',
        descripcion: 'Base de apertura',
      },
    })

    expect(resumenAprobacionOperativa(item)).toEqual({
      titulo: 'Base para Ruta Norte',
      subtitulo: 'Caja Ruta Norte · Base de apertura · Solicitada por Ana Cobradora',
      monto: 500_000,
      labelMonto: 'Base solicitada',
    })
  })

  it('completa cliente y credito desde el contexto sin pisar datos originales', () => {
    const item = aprobacion({ datosSolicitud: { numeroReferencia: 'TRX-88' } })
    const context = {
      cliente: { nombres: 'María', apellidos: 'Pérez', dni: '123' },
      creditoSolicitud: {
        id: 'prestamo-1',
        numeroPrestamo: 'PRE-900',
        tipoPrestamo: 'ARTICULO',
      },
    } as ApprovalContext

    expect(enriquecerAprobacionConContexto(item, context).datosSolicitud).toMatchObject({
      numeroReferencia: 'TRX-88',
      cliente: 'María Pérez',
      clienteDni: '123',
      numeroPrestamo: 'PRE-900',
      tipoPrestamo: 'ARTICULO',
    })
  })

  it('resuelve el nombre y codigo de una ruta antigua a partir de su id', () => {
    const item = aprobacion({
      datosSolicitud: { rutaId: 'ruta-2' },
    })
    const context = {
      cliente: {
        nombres: 'María',
        apellidos: 'Pérez',
        asignacionesRuta: [
          {
            ruta: {
              id: 'ruta-2',
              nombre: 'Ruta Centro Norte',
              codigo: 'RT-CEN-02',
            },
          },
        ],
      },
      creditoSolicitud: {
        id: 'prestamo-1',
        numeroPrestamo: 'PRE-900',
        tipoPrestamo: 'EFECTIVO',
      },
      multimedia: [],
    } as unknown as ApprovalContext

    expect(enriquecerAprobacionConContexto(item, context).datosSolicitud).toMatchObject({
      rutaId: 'ruta-2',
      rutaNombre: 'Ruta Centro Norte',
      rutaCodigo: 'RT-CEN-02',
      tipoPrestamo: 'EFECTIVO',
    })
  })
})
