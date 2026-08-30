import ClientesFeature from '@/components/clientes/ClientesFeature';

export const metadata = {
  title: 'Gestión de Cartera | Crédito Sur',
  description: 'Gestión operativa de clientes.',
};

export default function ClientesCoordinadorPage() {
  return (
    <ClientesFeature initialClientes={[]} basePath="/coordinador/clientes" />
  );
}
