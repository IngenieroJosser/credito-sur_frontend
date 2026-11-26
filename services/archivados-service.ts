import { apiRequest } from '@/lib/api/api';

export interface ElementoArchivado {
  id: string;
  entidadId: string;
  tipo: 'cliente' | 'prestamo' | 'producto' | 'usuario';
  nombre: string;
  fechaEliminacion: string | null;
  motivo: string;
  usuarioEliminador: string;
  /** Ruta a la que pertenecia. Null cuando la entidad no tiene ruta. */
  ruta: string | null;
  rutaId: string | null;
}

export const archivadosService = {
  /**
   * Listado de lo archivado.
   *
   * Lo devuelve el backend leyendo las entidades con fecha de eliminacion, no
   * el registro de auditoria: asi cada fila conoce su ruta y la lista no
   * depende de que las acciones de la bitacora se sigan llamando igual.
   */
  async listar(): Promise<ElementoArchivado[]> {
    return apiRequest<ElementoArchivado[]>('GET', '/archivados');
  },

  /**
   * Borrado definitivo de un elemento ya archivado.
   *
   * Es irreversible y NO tiene respaldo offline a proposito: no tiene sentido
   * encolar un borrado para reintentarlo despues. El backend lo rechaza (409)
   * si el registro tiene pagos o movimientos de dinero.
   */
  async eliminarDefinitivo(tipo: string, entidadId: string) {
    return apiRequest('DELETE', `/archivados/${tipo}/${entidadId}`);
  },
};
