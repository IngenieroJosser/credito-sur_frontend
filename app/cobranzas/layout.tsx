import AdminLayout from '../admin/layout';

/**
 * El FAB del cobrador lo renderiza VistaCobrador (dashboard) con sus 6
 * acciones completas. Antes este layout tambien montaba un FAB de 2 acciones,
 * que se veia durante la carga (y quedaba solapado despues): dos FAB. Se quita
 * para que solo aparezca el completo cuando la vista termina de cargar.
 */
export default function CobranzasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
