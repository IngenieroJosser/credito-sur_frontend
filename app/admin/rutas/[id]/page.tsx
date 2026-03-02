import RutaClient from './ruta-client';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <RutaClient initialRuta={null} rutaId={params.id} />;
}
