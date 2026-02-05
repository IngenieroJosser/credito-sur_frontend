import { getRutaDetalle } from '@/lib/rutas-data';
import RutaClient from './ruta-client';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: { id: string } }) {
  // Fetch data on the server
  const ruta = await getRutaDetalle(params.id);

  if (!ruta) {
    notFound();
  }

  return <RutaClient initialRuta={ruta} />;
}
