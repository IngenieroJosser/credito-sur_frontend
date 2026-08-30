import { RutasPageView } from '@/components/rutas/RutasPageView';

// Pagina estatica (se precachea -> funciona offline). RutasPageView carga
// rutas, cobradores y supervisores en cliente, con fallback offline.
export default function Page() {
  return <RutasPageView rutasBasePath="/admin/rutas" />;
}
