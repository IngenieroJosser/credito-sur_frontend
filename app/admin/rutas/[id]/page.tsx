import { getRutaDetalle } from '@/lib/rutas-data';
import RutaClient from './ruta-client';

export default async function Page({ params }: { params: { id: string } }) {
  // Fetch data on the server
  const ruta = await getRutaDetalle(params.id);

  return <RutaClient initialRuta={ruta} />;
}
