// Centralized exports for all services

export { usuariosService } from './usuarios-service';
export type { Usuario, CreateUsuarioDto, UpdateUsuarioDto, ChangePasswordDto } from './usuarios-service';
export { RolUsuario, EstadoUsuario } from './usuarios-service';

export { clientesService } from './clientes-service';
export type { Cliente, CrearClienteDto, ActualizarClienteDto, AgregarListaNegraDto, AsignarRutaDto, FiltrosClientes } from './clientes-service';
export { NivelRiesgo, EstadoAprobacion } from './clientes-service';

export { prestamosService } from './prestamos-service';
export type { Cuota, CrearPrestamoDto, FiltrosPrestamos, EstadisticasPrestamos, RespuestaPrestamos } from './prestamos-service';
export { EstadoPrestamo, FrecuenciaPago, EstadoCuota } from './prestamos-service';

export { rutasService } from './rutas-service';
export type { Ruta, CrearRutaDto, ActualizarRutaDto, FiltrosRutas, EstadisticasRutas, Cobrador } from './rutas-service';

export { inventarioService } from './inventario-service';
export type { Producto, CrearProductoDto, ActualizarProductoDto, EstadisticasInventario } from './inventario-service';

export { pagosService } from './pagos-service';
export type { Pago, CrearPagoDto, ActualizarPagoDto } from './pagos-service';
export { MetodoPago } from './pagos-service';

export { gastosService } from './gastos-service';
export type { Gasto, CrearGastoDto, ActualizarGastoDto } from './gastos-service';

export { aprobacionesService } from './aprobaciones-service';
export type { Aprobacion, AprobarDto, RechazarDto } from './aprobaciones-service';

export { auditoriaService } from './auditoria-service';
export type { RegistroAuditoria, CrearAuditoriaDto } from './auditoria-service';

export { permisosService } from './permisos-service';
export type { Permiso, CrearPermisoDto, ActualizarPermisoDto } from './permisos-service';

export { rolesService } from './roles-service';
export type { Rol, CrearRolDto, ActualizarRolDto } from './roles-service';

// Re-export all enums from centralized location
export * from '../types/enums';
