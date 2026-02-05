import { getRutasList } from '@/lib/rutas-data';
import { RutasPageView } from '@/components/rutas/RutasPageView';

export default async function Page() {
  const rutas = await getRutasList();

  return <RutasPageView rutasBasePath="/admin/rutas" rutas={rutas} />;
}
