import { getRutasList } from '@/lib/rutas-data';
import { getUsuariosByRol } from '@/lib/usuarios-data';
import { RutasPageView } from '@/components/rutas/RutasPageView';
import { RolUsuario } from '@/types/enums';

// Componente de servidor (RSC) para la página de gestión de rutas.
// Se encarga de obtener los datos iniciales (rutas, cobradores, coordinadores) 
// y pasarlos al componente de vista (RutasPageView).
export default async function Page() {
  // Carga paralela de datos para optimizar el tiempo de respuesta
  const [rutas, cobradores, supervisores] = await Promise.all([
    getRutasList(),
    getUsuariosByRol(RolUsuario.COBRADOR),
    getUsuariosByRol(RolUsuario.COORDINADOR)
  ]);

  // Transformación de datos para la vista
  const cobradoresList = cobradores.map(u => ({ id: u.id, nombre: `${u.nombres} ${u.apellidos}` }));
  const supervisoresList = supervisores.map(u => ({ id: u.id, nombre: `${u.nombres} ${u.apellidos}` }));

  return (
    <RutasPageView 
      rutasBasePath="/rutas" 
      rutas={rutas} 
      cobradores={cobradoresList}
      supervisores={supervisoresList}
    />
  );
}
