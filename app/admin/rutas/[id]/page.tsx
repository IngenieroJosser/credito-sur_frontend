'use client';

// Cliente (no server component async): la app es offline-first y esta vista de
// detalle debe renderizar desde el shell cacheado sin ejecutar el servidor. El
// id se resuelve de la URL con `use(params)`. RutaClient carga sus datos en
// cliente (con respaldo offline).
import { use } from 'react';
import RutaClient from './ruta-client';

export default function Page(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  return <RutaClient initialRuta={null} rutaId={params.id} />;
}
