import { getClientesData } from '@/lib/clientes-data';
import ClientesClient from './clientes-client';

/**
 * ============================================================================
 * GESTIÓN CENTRALIZADA DE CLIENTES (SERVER COMPONENT)
 * ============================================================================
 * 
 * @description
 * Página principal de clientes optimizada con SSR.
 * Obtiene los datos iniciales en el servidor para mejorar el SEO y la velocidad
 * de carga inicial (Core Web Vitals), eliminando estados de "Cargando...".
 * 
 * @architecture
 * - Page (Server): Fetch de datos iniciales.
 * - Client (Client): Interactividad, filtros, modales.
 */

export const metadata = {
  title: 'Gestión de Cartera | Crédito Sur',
  description: 'Administración centralizada de clientes y scoring crediticio.',
};

export default async function ClientesPage() {
  // 1. Obtener datos en el servidor (sin useEffect)
  // Esto se ejecuta en el backend de Next.js antes de enviar HTML al navegador.
  const initialClientes = await getClientesData();

  // 2. Pasar datos al componente cliente interactivo
  return <ClientesClient initialClientes={initialClientes} />;
}