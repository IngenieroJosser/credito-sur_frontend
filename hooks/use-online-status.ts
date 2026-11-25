import { useEffect, useState, useSyncExternalStore } from 'react';
import { checkRealConnectivity } from '@/lib/offline/connectivity';

/**
 * Si hay conexion de VERDAD, no solo lo que dice `navigator.onLine`.
 *
 * `navigator.onLine` dice «si» en cuanto hay wifi, aunque la wifi no llegue a
 * ningun sitio -el caso del cobrador en una zona sin cobertura-, asi que
 * ademas se confirma con un ping a `/api/ping`.
 *
 * ── Por que `useSyncExternalStore` y no `useState` ───────────────────────────
 *
 * Aqui habia esto:
 *
 *     useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
 *
 * La guarda esta escrita para un Node que no tenia `navigator`. El que corre
 * este proyecto SI lo tiene, asi que en el servidor `typeof navigator` es
 * `'object'`, se entra por la primera rama, `navigator.onLine` es `undefined`
 * y el estado inicial sale FALSO. Resultado medido en el log de `next dev`:
 * la pantalla de login rompia la hidratacion en cada carga, porque el
 * servidor pintaba «Sin conexion» y el navegador «En linea». React tira ese
 * trozo del arbol y lo vuelve a construir.
 *
 * No se puede arreglar eligiendo mejor el valor inicial: el dato es distinto
 * en el servidor -donde no existe- y en el navegador, y si el aparato esta de
 * verdad sin red los dos NUNCA van a coincidir. `useSyncExternalStore` es la
 * API hecha para eso: se le da una instantanea del servidor y otra del
 * cliente, y React cambia de una a otra sin tratarlo como un desajuste.
 */
const suscribirse = (avisar: () => void) => {
  window.addEventListener('online', avisar);
  window.addEventListener('offline', avisar);
  return () => {
    window.removeEventListener('online', avisar);
    window.removeEventListener('offline', avisar);
  };
};

/** En el servidor no hay red que mirar, asi que se asume que si. */
const instantaneaDelServidor = () => true;

export function useOnlineStatus() {
  const navegadorDice = useSyncExternalStore(
    suscribirse,
    () => navigator.onLine,
    instantaneaDelServidor,
  );

  /*
   * `null` es «todavia no se ha comprobado», que no es lo mismo que «no hay
   * red». Mientras no se sepa se cree al navegador, que es lo que hacia antes.
   */
  const [pingDice, setPingDice] = useState<boolean | null>(null);

  useEffect(() => {
    if (!navegadorDice) {
      // Sin red el ping no aporta nada y el navegador aqui no se equivoca.
      setPingDice(null);
      return;
    }
    let vigente = true;
    checkRealConnectivity().then((real) => {
      if (vigente) setPingDice(real);
    });
    return () => {
      vigente = false;
    };
  }, [navegadorDice]);

  return navegadorDice && (pingDice ?? true);
}
