import { getClientesData } from '../../../lib/clientes-data';
import ClientesFeature from '@/components/clientes/ClientesFeature';
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Gestión de Cartera | Crédito Sur',
  description: 'Gestión operativa de clientes.',
};

export default async function ClientesCoordinadorPage() {
  const data = await getClientesData();
  
  // Reuse the feature component, passing the coordinator's base path
  return (
    <ClientesFeature 
      initialClientes={data} 
      basePath="/coordinador/clientes" 
    />
  );
}
