import { getClientesData } from '../../../lib/clientes-data';
import ClientesFeature from '@/components/clientes/ClientesFeature';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Gestión de Cartera | Crédito Sur',
  description: 'Administración centralizada de clientes.',
};

export default async function ClientesPage() {
  const data = await getClientesData();
  return <ClientesFeature initialClientes={data} />;
}
