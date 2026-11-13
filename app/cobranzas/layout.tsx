/**
 * El armazon —cabecera, menu lateral, telon de entrada— lo monta
 * `ArmazonDeLaApp` desde el layout RAIZ, para que no se desmonte al cruzar
 * de un arbol a otro. Aqui estaba `AdminLayout`, y como los siete layouts del
 * proyecto lo montaban cada uno por su cuenta, pasar de /admin a /contable
 * tiraba la pantalla entera y la volvia a montar: eso es lo que se veia como
 * una recarga. Este archivo se queda solo con lo que es suyo.
 *
 * El FAB del cobrador lo renderiza `VistaCobrador`, no este layout: antes
 * montaba uno de 2 acciones que se veia durante la carga y quedaba solapado
 * despues.
 */
export default function CobranzasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
