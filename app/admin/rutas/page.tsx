import { getRutasList } from '@/lib/rutas-data';
import { getUsuariosByRol } from '@/lib/usuarios-data';
import { RutasPageView } from '@/components/rutas/RutasPageView';
import { RolUsuario } from '@/types/enums';

export default async function Page() {
  const [rutas, cobradores, supervisores] = await Promise.all([
    getRutasList(),
    getUsuariosByRol(RolUsuario.COBRADOR),
    getUsuariosByRol(RolUsuario.COORDINADOR)
  ]);

  const cobradoresList = cobradores.map(u => ({ id: u.id, nombre: `${u.nombres} ${u.apellidos}` }));
  const supervisoresList = supervisores.map(u => ({ id: u.id, nombre: `${u.nombres} ${u.apellidos}` }));

  return (
    <RutasPageView 
      rutasBasePath="/admin/rutas" 
      rutas={rutas} 
      cobradores={cobradoresList}
      supervisores={supervisoresList}
    />
  );
}
