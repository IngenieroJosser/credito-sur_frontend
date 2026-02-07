import { getClientesData } from '../../../lib/clientes-data';
import ClientesClient from './clientes-client';

export const metadata = {
  title: 'Gestión de Cartera | Crédito Sur',
  description: 'Administración centralizada de clientes.',
};

export default async function ClientesPage() {
  const data = await getClientesData();
  return <ClientesClient initialClientes={data} />;
}