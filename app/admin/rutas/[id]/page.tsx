import { getRutaDetalle } from '@/lib/rutas-data';
import RutaClient from './ruta-client';
import { notFound } from 'next/navigation';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  // Fetch data on the server
  const ruta = await getRutaDetalle(params.id);

  if (!ruta) {
    notFound();
  }

  return <RutaClient initialRuta={ruta} />;
}
