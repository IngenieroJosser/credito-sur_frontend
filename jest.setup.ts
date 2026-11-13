import '@testing-library/jest-dom'

/**
 * Huecos de jsdom, no del producto.
 *
 * jsdom no implementa toda la API del DOM. Lo que falta aquí son cosas que en
 * un navegador de verdad existen siempre, así que el sitio correcto para
 * rellenarlas es el entorno de pruebas y no el componente: ensuciar el código
 * con comprobaciones defensivas para un caso que solo ocurre en jsdom esconde
 * la intención de quien lo lea después.
 *
 * `scrollIntoView` lo usa `components/ui/Selector.tsx` para mantener a la
 * vista la opción resaltada cuando se navega la lista con las flechas.
 */
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {
    /* jsdom no desplaza nada: basta con que exista. */
  }
}
