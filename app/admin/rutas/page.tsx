import { getRutasList } from '@/lib/rutas-data';
import { getUsuariosByRol } from '@/lib/usuarios-data';
import { RutasPageView } from '@/components/rutas/RutasPageView';
import { RolUsuario } from '@/types/enums';
export const dynamic = 'force-dynamic';

// Componente de servidor (RSC) para la página de gestión de rutas.
// Se encarga de obtener los datos iniciales (rutas, cobradores, coordinadores) 
// y pasarlos al componente de vista (RutasPageView).
export default async function Page() {
  // Carga paralela de datos para optimizar el tiempo de respuesta
  const [rutas, cobradores, supervisores, coordinadores] = await Promise.all([
    getRutasList(),
    getUsuariosByRol(RolUsuario.COBRADOR),
    getUsuariosByRol(RolUsuario.SUPERVISOR),
    getUsuariosByRol(RolUsuario.COORDINADOR)
  ]);

  // Transformación de datos para la vista
  const cobradoresList = cobradores.map(u => ({ id: u.id, nombre: `${u.nombres} ${u.apellidos}`, rol: u.rol }));
  const supervisoresList = [...supervisores, ...coordinadores].map(u => ({ id: u.id, nombre: `${u.nombres} ${u.apellidos}`, rol: u.rol }));

  return (
    <RutasPageView 
      rutasBasePath="/admin/rutas" 
      rutas={rutas} 
      cobradores={cobradoresList}
      supervisores={supervisoresList}
    />
  );
}
