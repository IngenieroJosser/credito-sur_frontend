/**
 * @deprecated Importa desde '@/services/clientes-service' directamente.
 * Este archivo existe solo por compatibilidad hacia atrás y será eliminado.
 *
 * El servicio canónico es clientesService en clientes-service.ts
 */
export {
  clientesService,
  clientesService as default,
  type Cliente,
  type CrearClienteDto,
  type ActualizarClienteDto,
  type FiltrosClientes,
  type AgregarListaNegraDto,
  type AsignarRutaDto,
} from '@/services/clientes-service';
