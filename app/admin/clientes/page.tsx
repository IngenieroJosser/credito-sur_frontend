import ClientesFeature from '@/components/clientes/ClientesFeature';

export const metadata = {
  title: 'Gestión de Cartera | Crédito Sur',
  description: 'Administración centralizada de clientes.',
};

// Pagina estatica (se precachea -> funciona offline). ClientesFeature carga
// los datos en cliente, con fallback a IndexedDB sin conexion.
export default function ClientesPage() {
  return <ClientesFeature initialClientes={[]} />;
}
