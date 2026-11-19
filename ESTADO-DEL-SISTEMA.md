# Estado del sistema — Créditos del Sur

> **Para quién es esto.** Para el siguiente agente o desarrollador que retome el
> trabajo sin haber estado en las sesiones anteriores. No hace falta leer nada
> más para empezar: aquí están las reglas, el método que encontró los defectos,
> lo que ya está arreglado (para no repetirlo) y lo que queda, con evidencia
> medida y la receta de cada arreglo.
>
> **Última actualización:** 2026-11-18.
> **Alcance:** los dos repos, `credito-sur_backend` (NestJS + Prisma 7 +
> PostgreSQL) y `credito-sur_frontend` (Next.js 16, App Router).
> **Objetivo del dueño:** dejar el sistema al 100% para que el cliente empiece
> pruebas e importación de datos. Se puede tocar backend, base de datos o lo que
> haga falta.

---

## 1. Las reglas. No son negociables

Estas reglas no son estilo: cada una viene de un defecto que ya costó caro.

### 1.1 Medir antes de proponer

Antes de proponer una mejora, un endurecimiento o un «por si acaso», contesta
**midiendo**: ¿esto cambia algún resultado, o va a seguir funcionando igual? Si
funciona igual, **no lo propongas**; dilo y sigue.

Cómo medir: instrumenta, cuenta las llamadas reales, comprueba si el caso que
quieres cubrir ocurre alguna vez. Una sonda de seis líneas contesta en un minuto
lo que una discusión no resuelve. Luego, si el caso ocurre, propónlo con el dato
delante; si no ocurre, recomienda explícitamente no hacerlo y di cuál es el
límite de la medición.

**Ejemplo de esta sesión, aplicado:** se cambió «atrasados» y «activos» en
`loans.service.ts` para que miraran solo las cuotas. La medición dijo que no
cambiaba ninguna cifra en esta base, y una prueba existente afirmaba lo
contrario a propósito. **Se revirtió**, con el motivo escrito en el código.

### 1.2 Rastrear todos los consumidores antes de tocar un valor

Antes de cambiar un valor compartido, busca **todos** sus consumidores, en
backend y en frontend, y comprueba que ninguno lo interprete distinto. No basta
con que compile y pasen las pruebas: la misma cifra significa una cosa en una
pantalla y otra en la siguiente.

### 1.3 Si una prueba falla, averigua por qué

Averigua si la prueba está desactualizada o si el código regresó. **Nunca
ajustes la aserción para que pase.**

### 1.4 Una centinela que da cero hay que comprobarla al revés

Cuando escribas una prueba que lee el código buscando un defecto y da cero, no
lo celebres: **mete el defecto a mano**, confirma que lo caza, y restaura. Ha
pasado cuatro veces que una centinela pasaba en verde sin mirar nada:

- `[^>]*` se corta en el `>` de `=>`; `[^}]*` en la primera llave.
- `const [showX, setShowX] = useState(...)`: el setter va seguido de `]`, no de
  `(`, así que una prueba de «se entrega a otro» casaba con la declaración de
  TODOS los estados y los saltaba uno por uno.
- `lib/testing/sin-comentarios.ts` trataba el `/*` de `accept="image/*"` como
  comentario de bloque y devolvía el archivo **en blanco desde esa línea hasta el
  final**: 8 archivos con regiones ciegas, `FileUploader.tsx` 230 líneas.

Y ponle un **piso medido** («se leyeron 308 archivos y 165 estados»), cerca de
la cifra real y no en un número cómodo.

### 1.5 Un cero en dinero no es un hueco

«$ 0» y `diasMora: 0` se leen como «no debe nada» y «al día». Si lo que quieres
decir es «no se sabe», va `null` y esqueleto de carga. Lo vigila
`__tests__/cero-no-miente.test.ts`.

### 1.6 Todo en hora de Bogotá

El servidor corre en UTC: leer el reloj del proceso corre el día de noche. Lo
vigila `src/utils/fechas-siempre-en-bogota.spec.ts` (backend) y
`__tests__/fechas-siempre-en-bogota.test.ts` (frontend).

### 1.7 Al terminar

- **Nunca** te agregues como coautor en los commits.
- Si algo queda a medias o bloqueado, dilo explícitamente en vez de darlo por
  hecho.
- Commits de una línea en español, nombrando el defecto —no el cambio—, con el
  cuerpo explicando la medición. Mira `git log` para el tono.

---

## 2. El método que encontró todo esto

Los defectos de este sistema casi nunca son excepciones: son **cifras que
mienten**. Compilan, pasan las pruebas y se ven bien. El método que funciona:

### 2.1 Contrastar dos respuestas de la API que hablan de lo mismo

Es lo que más ha rendido. Levantar backend y frontend, y comparar:

- la cifra del listado contra la del detalle del mismo objeto;
- la tarjeta de totales contra las filas que tiene debajo;
- el contador del panel contra el de la pantalla especializada;
- el filtro «sin X» contra la columna que muestra X.

Así salieron: la ruta del crédito (41+24 contra un filtro que decía 26), la
tarjeta de mora (36 contra 41 en la misma pantalla), la mora de los créditos sin
aprobar (45 contra 41), el dinero de una página llamado total (61% escondido).

**Comparar API contra API, nunca API contra sonda:** el driver `pg` lee
`timestamp without time zone` como hora local y Prisma como UTC, así que una
sonda corre las fechas cinco horas.

### 2.2 Buscar la clase, no el caso

Cada defecto encontrado es una **clase**. Escribe un barrido que la busque en
todo el sistema. Los barridos de esta sesión están en el scratchpad y las
plantillas valen; conviene recrearlos:

| clase | cómo se busca |
|---|---|
| campo que el backend nunca manda | identificadores del frontend que no existen en el backend **ni** los escribe el frontend |
| totales sobre una página | `findMany` con `skip`/`take` y luego `reduce` sobre el resultado |
| consulta dentro de un `.map` (N+1) | `await prisma.X.findFirst` dentro del cuerpo de un `map(async` |
| paginación doble | `Math.ceil(x.length / N)` en una pantalla que pide `limite: M` |
| modal sin puerta | `useState` de modal cuyo setter solo se llama con `false`/`null` |
| manejador que solo cierra | `onConfirm={() => { cerrar() }}` |
| cifra inventada | constante de negocio escrita dentro de una pantalla |
| cero que miente | `objeto.montoAlgo || 0` sobre un campo de la API |

### 2.3 Dejar una centinela por cada clase cerrada

Una prueba que lea el código y falle si la clase vuelve a entrar. Con piso
medido y comprobada al revés (regla 1.4). Las que ya existen están en §6.

---

## 3. Invariantes del dominio

Lo que hay que saber del negocio para no romper nada. Esto no está en el código
de forma obvia.

1. **La ruta la lleva el CRÉDITO** (`Prestamo.rutaId`). `AsignacionRuta` es el
   orden de visita, **derivado** de los créditos
   (`src/routes/sincronizar-asignaciones.ts`). Describir un crédito con la ruta
   de su cliente es un defecto; describir a un CLIENTE con su asignación es
   correcto.
2. **Ningún crédito puede quedar sin ruta.** Regla dicha por el dueño. Ya se
   cierra al crear (`loans.service.ts` lanza `BadRequestException`) y al importar
   (el validador lo marca como error y `confirmar` bloquea si hay errores).
3. **El supervisor también cobra.** No es un rol de consulta: sale a las rutas
   que lleva y el dinero entra a SU caja. El coordinador y el admin también
   registran pagos.
4. **El cliente que paga en la oficina lo recibe el coordinador**, y su efectivo
   entra a `CAJA-OFICINA`. El pago nace con `origenGestion: 'OFICINA'` para que
   en la ruta se vea que ese dinero no lo tiene el cobrador.
5. **A qué caja entra un pago** lo decide `resolveCajaIngresoPago`
   (`payments.service.ts`): oficina en efectivo → `CAJA-OFICINA`; cualquier
   método que no sea efectivo → `CAJA-BANCO`; supervisor → su caja operativa, y
   solo en ruta que él supervise; cobrador → la caja de la ruta.
6. **Los combos de artículos ya no se venden.** Un crédito cubre un artículo con
   su cantidad, y la cantidad se cobra y se descuenta de verdad.
7. **El riesgo de una RUTA y el de un CLIENTE son enums distintos**, aunque se
   llamen parecido. Unificar sus etiquetas sería un bug.
8. **`Pago.rutaId` es NULL en casi todo el histórico** (91 de 64.091): la columna
   se añadió sin relleno. Para acotar un día van `fechaOperativa` o `cobradorId`.
9. **El orden de arranque del cliente** es: cobradores → rutas → inventario (si
   habrá créditos de artículo) → clientes y créditos. Cada paso necesita el
   anterior, porque las columnas obligatorias de la plantilla salen de ahí.
10. **La matemática del crédito vive en un solo sitio:**
    `lib/creditos/preview-credito.ts` y `POST /loans/simular` (frontend:
    `lib/creditos/crear-prestamo-payload.ts`). Había seis copias divergentes.

---

## 4. Hallazgos abiertos

Ordenados por lo que le cuesta al cliente. Cada uno trae evidencia medida y
receta. **Ninguno está arreglado todavía.**

### P1 — Las pantallas tenían techo silencioso de datos *(CERRADO)*

**Qué pasaba.** Ocho pantallas pedían al servidor un bloque con un límite fijo y
paginaban **en local** sobre lo que trajeron. El paginador contaba las filas
cargadas, así que decía «10 páginas» y no había forma de llegar a la fila 51.

| pantalla | qué tenía | commit |
|---|---|---|
| `CuentasMoraFeature` | 50 cuentas, paginaba de 5 | `ccff7849` |
| `admin/pagos/historial` | 500 pagos y 500 gastos, de 20 | `452f985d` |
| `DetalleReporteFinancieroModal` | sumaba los primeros 10.000 movimientos del ledger | `74bb5e96` |
| `SeguimientoPuntoVenta` | 200 créditos, y pedía 5.000 pagos para dos datos | `68e5cfe3` |
| `ListadoPrestamos` | **no pasaba de la primera página**: 8 de 67 créditos | `e9299dd1` |
| `admin/creditos-articulos` | 100 créditos, paginaba de 8 | `367ea6a1` |
| `RutasPageView` | 100 rutas, de 9 | `367ea6a1` |
| `PuntoDeVentaFloatingActions` | **20** ventas, de 5 | `367ea6a1` |

**Cómo quedó.** Cada una compara lo cargado con el total que el servidor ya
mandaba —`paginacion.total`, `meta.total`, `totales.totalRegistros`— y lo DICE
cuando se queda corta. El informe financiero no avisa: pide todas las páginas,
porque es la cuenta de resultados y ahí una cifra incompleta es una cifra falsa.
El listado de créditos no tenía techo sino un paginador atascado, y ahora usa el
total del servidor.

**Lo que queda por hacer bien.** Paginación de servidor de verdad en las que
filtran en el cliente (mora por nivel, el historial por cobrador y método): hay
que subir esos filtros al backend primero. Mientras, el tope es honesto.

**La centinela.** `__tests__/sin-techo-silencioso.test.ts`, con la lista de deuda
tolerada **vacía** y una prueba que exige que siga vacía. Reconoce el patrón
—límite fijo, como número o constante, más paginador local— y exige las dos
cosas que lo desactivan: leer el total del servidor y compararlo con el límite.
Comprobada al revés.

### P2 — El desembolso podía salir de la caja equivocada *(ARREGLADO)*

**Qué pasa.** Al aprobar un crédito, la caja de la que sale el dinero se elige
con la ruta **del cliente**, no la del crédito:

- `src/approvals/approvals.service.ts:3165`
  `const rutaId = prestamo.cliente?.asignacionesRuta?.[0]?.rutaId;` (crédito de
  artículo)
- `src/approvals/approvals.service.ts:3504`
  `const rutaAsignadaId = prestamo?.cliente?.asignacionesRuta?.[0]?.rutaId;`
  (crédito de dinero, cuando lo pidió un cobrador)

**Por qué es un defecto.** `[0]` escoge una asignación cualquiera, y un cliente
con créditos en dos rutas tiene dos asignaciones activas (el índice único parcial
es `(rutaId, clienteId) WHERE activa`). El dinero sale de la caja de una ruta que
no es la del crédito. Lo dice el propio comentario del backend: «Equivocar la
caja aquí no se nota en el momento: aparece al cierre de ruta, como un descuadre
que nadie sabe de dónde salió».

**ARREGLADO** en `e7d6f09`: las dos cascadas empiezan por `prestamo.rutaId` y la
asignación del cliente se queda solo como respaldo para filas viejas. Centinela
en `src/approvals/caja-del-credito-no-del-cliente.spec.ts`, comprobada al revés:
prohíbe que la asignación del cliente sea el primer valor y fija en dos las
elecciones de caja, para que una tercera tenga que pasar por ahí.

---

### P3 — El barrido de pantallas por rol ya corre; el límite de peticiones queda visible

**Medido el 2026-11-18 contra `next build` + `next start`.** Los siete roles
terminaron el recorrido: 6 pasaron al primer intento y CONTADOR paso al reintento
despues de que el primer login agotara sus 180 s. No reaparecio el antiguo
`Invalid or unexpected token` de `/coordinador/revisiones`.

El recorrido produjo **156 respuestas 429**. No se subio el limite para esconderlas:
la prueba hace 112 recargas completas por usuario y cada recarga vuelve a montar el
shell. Una repeticion aislada de ADMIN midio 65 respuestas limitadas; las mas
frecuentes fueron `approvals/pending` (18), `notificaciones` (12), `routes` (7) y
`loans` (6). El informe ahora guarda el desglose por metodo y endpoint. Tambien se
quito una duplicacion real: el shell pedia `approvals/pending` al iniciar el polling
y otra vez al conectar el socket.

#### Los dos hallazgos del super admin eran del entorno. Con evidencia

Se repitieron en dos pasadas distintas, así que no eran azar, y aun así **no son
del producto**:

- **`/coordinador/perfil` → `Invalid or unexpected token`** (en otra pasada salió
  en `/coordinador/revisiones`: cambia de pantalla porque el chunk culpable es el
  del layout raíz, y lo pide la primera que llegue). La causa, medida: el HTML que
  servía el puerto 3000 pedía `app/layout-8d7826654329e658.js` y en disco estaba
  `app/layout-322ff4195a51a447.js`. **Otro hash**: el servidor seguía en pie
  mientras alguien volvía a compilar, así que servía HTML de una build y estáticos
  de otra. El navegador recibía un 500 de `text/plain` donde esperaba JavaScript
  y lo intentaba parsear. De 32 chunks de esa página, **31 daban 200 y ese uno
  daba 500**; al levantar un servidor nuevo sobre la misma build, los 32 dieron
  200.
- **`/admin/sistema/backups` → `net::ERR_ABORTED`**: esa ruta redirige a
  `/sistema/backups` como las otras diecinueve, y el abort es la navegación
  cortada por la redirección mientras `page.goto` aún cargaba.

**La receta, con lo que costó aprenderla:**

```bash
# 1. El limite de peticiones: el barrido hace 112 pantallas por rol a velocidad
#    de maquina, y el limitador da 300/min POR USUARIO. Sin subirlo, los roles
#    con mas pantallas se comen su cupo y el ultimo no puede ni entrar.
cd credito-sur_backend
RATE_LIMIT_DEFAULT_MAX=100000 RATE_LIMIT_HEAVY_MAX=100000 RATE_LIMIT_AUTH_MAX=5000 npm run start:dev

# 2. Build y servidor de produccion. Es la unica forma de probar lo offline: el
#    service worker se desactiva en desarrollo y se desregistra solo.
cd credito-sur_frontend
npm run build
npx next start -p 3100            # un puerto libre, para no heredar un servidor viejo

# 3. El barrido, sin reintentos para que el informe sea legible
E2E_BASE_URL=http://localhost:3100 npx playwright test e2e/pantallas-por-rol.e2e.ts --retries=0
```

**Dos trampas del entorno que cuestan una hora cada una, aprendidas a golpes:**

1. **El puerto del frontend no es libre: CORS solo admite 3000.** `main.ts:117`
   permite `localhost:3000` y `127.0.0.1:3000`. Levantar la build en otro puerto
   —3100, por ejemplo— hace que el navegador no pueda ni iniciar sesión: el
   preflight vuelve sin `Access-Control-Allow-Origin` y el barrido muere con
   `page.waitForResponse: Timeout 180000ms` en `entrarComo`, que parece un
   backend lento y no lo es. Comprobado: con `Origin: http://localhost:3000`
   llega la cabecera; con el 3100, no.

   Si el 3000 está ocupado, la salida está prevista en el propio código: la
   variable `CORS_ORIGINS` (`main.ts:111`, separada por comas) añade orígenes
   para desarrollo. Hay que arrancar el backend con ella:

   ```bash
   CORS_ORIGINS="http://localhost:3100" RATE_LIMIT_DEFAULT_MAX=100000 npm run start:dev
   ```

2. **Parar la tarea del backend no libera el puerto.** El `nest start --watch`
   deja un proceso hijo vivo, así que el 3001 sigue ocupado y el arranque
   siguiente muere con `EADDRINUSE` —y lo peor: el que contesta es el proceso
   VIEJO, con la configuración vieja, de modo que parece que la variable de
   entorno no funcionó—. Hay que comprobar quién tiene el puerto y detener ese
   PID antes de volver a arrancar:

   ```powershell
   Get-NetTCPConnection -LocalPort 3001 -State Listen | Select OwningProcess
   ```

**Las dos reglas que hacen que el resultado signifique algo:**

1. **No recompilar ni editar nada mientras corre.** Ni el frontend —`next build`
   cambia los hashes y el servidor en pie se queda con los viejos, que es el
   fantasma de arriba— ni el backend, porque `nest --watch` reinicia y le tira las
   sesiones.
2. **Arrancar el servidor DESPUÉS de la build**, y en un puerto que no tenga ya
   otro `next start` viviendo de una build anterior.

El informe por rol queda en `test-results/hallazgos-<ROL>.json`, con el resumen de
cada pantalla, los hallazgos y el desglose de 429 por endpoint.

---

### P4 — Los `|| 0` sobre dinero: medido, es ruido *(CERRADO)*

**La cifra que circulaba —«185 sitios donde el dinero cae a cero»— exagera el
problema.** Medido el 2026-11-19, con el tipo de cada campo en la mano:

- **201** ocurrencias de `algo.montoX || 0` sobre un campo de dinero, en 56
  archivos;
- de esas, **solo 11** caen sobre un campo que **ningún** tipo del proyecto
  declara obligatorio. En las otras 190 el campo está declarado requerido en
  algún sitio, así que el `|| 0` es defensa muerta: fea, pero no esconde nada.
- Y de esas 11, las que se pueden comprobar contra la API **sí llegan**:
  `recaudoRegularizadoHoy` viene en `/routes` (valor 0 real) y
  `capitalPrestado` viene en `/dashboard` (5.000.000).

**Los 11 se comprobaron uno por uno contra la API local, y todos llegan:**

| campo | comprobado en | resultado |
|---|---|---|
| `recaudoRegularizadoHoy` | `GET /routes` | llega (0 real) |
| `capitalPrestado` | `GET /dashboard` | llega (5.000.000) |
| `deudaFisica` y `saldoReal` | `GET /accounting/cierres` | llegan: 13 cierres con 5.410 · 27.500 · 938.539 |
| `recaudadoTotalClient`, `saldoExigibleEnFechaOperativa` | — | los calcula el propio frontend; el `|| 0` es su valor por omisión |

Los dos de los cierres eran los únicos sospechosos de verdad, porque salen de
parsear una cadena (`RC:...|MT:...|SD:...`), y también llegan.

**Conclusión: no hay nada que arreglar aquí.** Cambiar los 201 habría sido
trabajo puro sin mover ningún resultado, que es justo lo que la regla §1.1 manda
no hacer. Si algún día una de estas cifras sale en cero sin motivo, el camino
está escrito: comprobar el campo contra la API antes de tocar la pantalla.

**Lo ya arreglado de esta clase:** el detalle de cliente, donde tres pantallas
mapeaban lo mismo con tres copias y una inventaba «cuota 1» (`e9d07621`), y los
importes del respaldo sin conexión de cuentas vencidas (Codex).

**La regla sigue siendo la de §1.5:** un cero en dinero se lee «no debe nada».
Si el campo no llega nunca, es un defecto como el de la tarjeta de mora; si
significa «no se sabe», va `null` con esqueleto. Lo que **no** hay que hacer es
un reemplazo masivo de los 201.

### P5 — Consultas dentro de un `.map` (N+1): avance medido

Cada una multiplica las consultas por el número de filas. Con la cartera del
cliente esto es la diferencia entre una pantalla que abre y una que caduca.

- **ARREGLADO `d2fb639`:** contabilidad resuelve las rutas de las cajas en lote.
- **ARREGLADO `7b84ccb`:** reportes agrupa novedades de prestamos y clientes por
  ruta; ademas los totales respetan las rutas visibles para el actor.
- **ARREGLADO `14feab3`:** el listado de rutas reutiliza las asignaciones que ya
  incluyo su consulta principal: elimina dos consultas por ruta (40 con 20 rutas).
- **PENDIENTE:** `findAll` de rutas todavia ejecuta estadisticas y
  `getDailyVisits` dentro del `map` de rutas. `getDailyVisitsBatch` limita la
  concurrencia en tandas de seis, pero internamente sigue siendo N llamadas completas;
  no es una consulta en lote real.

**Receta.** Sacar la consulta del `map`: una sola consulta con `in: [...ids]` y un
`Map` por id. Ya se hizo así en `getCobradores` (`01ab0f9`) y en los dos reportes
de mora y vencidas (`cdc47dd`).

---

### P6 — Variables que guardan un cálculo y nadie usa — CERRADO

El patrón que escondía el contador correcto de la mora: alguien calculó algo, no
lo usó, y le puso `_` delante para que el linter callara. **24 ocurrencias.** Las
de los `.template.ts` son colores y da igual; estas merecen una mirada porque
huelen a cálculo perdido:

- `src/accounting/accounting.service.ts:3163` `_ingresosCajaAyerLedgerVal`
- `src/dashboard/dashboard.service.ts:109` `_requestedBaseResult`
- `src/clients/clients.service.ts:1685` `_clienteActualizado`
- `src/importaciones/importaciones.service.ts:2288` `_transaccion`
- `src/payments/payments.service.ts:939` `_capitalTotalFinal`
- `src/loans/loans.service.ts:3455,3458` `_estadoInicial`, `_estadoAprobacionInicial`

**ARREGLADO en `4b29165` y `6664856`.** Se eliminaron consultas, calculos y una
implementacion duplicada de reparto de pagos que no alimentaban ninguna respuesta.
Dos valores que si debian usarse ahora se validan: el monto normalizado del abono
contable llega al servicio y una caja explicita para actores de ruta debe ser de tipo
`RUTA`. El barrido final solo dejo coordenadas `_LC` de una plantilla Excel, no
calculos de negocio.

---

### P7 — Un campo que nadie produce — CERRADO

`components/dashboards/shared/NotificacionDetalleModal.tsx:1235-1236` lee
`editedDetails?.phone` y `safeMeta?.phone`. **`phone` no existe** ni en el
backend ni en el frontend: el proyecto usa `telefono`. Las dos lecturas valen
siempre `undefined`.

**ARREGLADO en `e63debd3`.** El modal dejo de buscar `phone`; el proyecto conserva
un solo nombre de contrato, `telefono`.

---

### P10 — La solicitud de base no tiene clave de idempotencia *(ABIERTO, es dinero)*

**Qué pasa.** `solicitarBase` —el cobrador o el supervisor pidiendo efectivo para
salir a la calle— manda `{monto, descripcion, cobradorId, rutaId}` y **ninguna
clave**:

- frontend: `services/contabilidad-service.ts:1065`
- backend: `accounting.controller.ts:494` → `accounting.service.ts:1083`, que
  hace `aprobacion.create(...)` sin comprobar duplicados.

**Por qué importa.** Dos toques en el móvil —o un reintento de la cola sin
conexión, que es el caso normal en la calle— crean **dos aprobaciones pendientes
del mismo monto**. Si el aprobador aprueba las dos, el cobrador recibe la base
dos veces.

**Medido.** De las 46 llamadas del frontend que mueven dinero, 40 no pasan clave
en el sitio de llamada, pero eso **no es el problema**: el servicio la genera
cuando falta en `registrarPago` (`pagos-service.ts:279`), `crearPrestamo`
(`prestamos-service.ts:262`), `registrarGasto`
(`contabilidad-service.ts:1026`) y `consolidarCaja`
(`contabilidad-service.ts:373`). **`solicitarBase` es la única que no la tiene
en ningún sitio.**

**La receta está escrita y probada en el mismo archivo.** `Aprobacion` ya tiene
`idempotencyKey String? @unique` en el esquema, y `accounting.service.ts:735-790`
—el registro de gasto— ya implementa el patrón completo: acepta la clave, busca
una aprobación con ella, devuelve la existente con `idempotentReplay: true` si la
encuentra, y si no crea con la clave puesta. Hay que copiar ese patrón en
`solicitarBase` y que el frontend genere la clave con el `generarIdempotencyKey`
que ya está en ese servicio.

Y la cola sin conexión tiene que mandar **la misma** clave al reintentar, no una
nueva: si no, la idempotencia no sirve de nada. `consolidarCaja` ya lo hace así
(`buildRecolectarIdempotencyKey`), que es el ejemplo a seguir.

---

### P8 — Pantallas bifurcadas por rol que divergen

Un arreglo hay que hacerlo dos o tres veces, y en esta sesión se pagó ese precio
varias veces. Las copias de verdad (no puentes de redirección):

| pantalla | líneas por rol |
|---|---|
| `clientes/[id]` | admin 238 · coordinador 233 · **supervisor 1255** |
| `cuentas-mora/[id]` | admin 367 · coordinador 208 · supervisor 24 |
| `rutas/[id]` | admin ~2.700 · coordinador ~2.400 |
| `cuentas-vencidas/[id]` | admin 24 · coordinador 20 (ya son puentes) |

El caso del supervisor en `clientes/[id]` es el peor: 1.255 líneas con tres
modales propios, y es donde estaba escondida la séptima copia de la matemática
del crédito (arreglada en `d195a747`).

**Receta.** No unificar por unificar: cuando toques una de estas pantallas,
comprueba si el defecto está en las otras copias y arréglalo en todas, o unifica
esa zona concreta detrás de un componente compartido.

---

### P9 — Deuda técnica medida, para hablarla con el dueño

Medido el 2026-11-18. **Ojo:** las cifras de controles nativos que circulaban en
el plan de hace unos días (~440 elementos, 56 `<select>`, 124 `title=`) están
**desactualizadas**; ese trabajo avanzó mucho. Esto es el censo real:

**Archivos largos** (el problema no es la longitud: es que un arreglo obliga a
tocar varias copias, §P8):

| archivo | líneas |
|---|---|
| `components/dashboards/VistaCobrador.tsx` | 4.591 — es la pantalla del dinero del cobrador: cada cambio va con su prueba |
| `app/admin/contable/page.tsx` | 3.820 |
| `components/dashboards/SupervisorCobroView.tsx` | 3.673 |
| `app/admin/rutas/[id]/ruta-client.tsx` | 2.748 |
| `app/coordinador/rutas/[id]/page.tsx` | 2.501 |
| `src/routes/routes.service.ts` (backend) | 7.301 |

**Controles nativos: 67 en total, no 440.** Lo grande ya está hecho —`<select>`
en **0**, campos de fecha en **0**, `alert`/`confirm`/`prompt` en **0**,
`scrollbar-hide` definida en `app/globals.css:496`, `:autofill` tratado—. Queda:

| qué | cuántos |
|---|---|
| `<textarea>` sin `resize-none` | 23 en 20 archivos |
| `title=` nativo (en vez del `Tooltip` del sistema) | 22 en 13 archivos |
| `type="file"` suelto | 12 en 7 archivos |
| `type="checkbox"` | 5 |
| `type="number"` | 4 |
| `<details>` | 1 |

**Área táctil.** 670 botones; solo 29 declaran altura táctil y **430 llevan
padding pequeño** (`p-1`…`p-2`, `py-1`…`py-2`), así que quedan por debajo de los
44 px recomendados. Importa sobre todo en la pantalla del cobrador, que se usa en
el móvil y en la calle.

**Tablas.** 40 `<table>`, y solo 18 viven en un archivo que además tiene una
vista alternativa para móvil.

---

## 4b. Medido y descartado. No lo "arregles"

Estos casos **parecen** defectos, se midieron, y no lo son. Van aquí porque el
siguiente que los encuentre va a querer tocarlos, y cambiarlos sería trabajo sin
mover ningún resultado —lo que la regla §1.1 manda no hacer—. Si algún día la
medición cambia, aquí está escrito qué habría que volver a comprobar.

| caso | por qué parece un defecto | lo que dijo la medición |
|---|---|---|
| Los 201 `|| 0` sobre dinero | un cero se lee «no debe nada» | los 11 que caen sobre un campo no garantizado llegan todos: ver §P4 |
| `CrearCreditoModal.tsx:302-306` deriva el plazo a mano (`cuotas/30`, `/4`, `/2`) | hay una función canónica, `derivarPlazoMeses` | los factores son **idénticos** a `CUOTAS_POR_MES` (30/4/2/1): no mueve ni un peso. Ojo: `CreacionPrestamo` usa 4,33 para SEMANAL **a propósito** y eso está documentado en `preview-credito.ts:104-109` — «no unificar sin hablarlo» |
| `NotificacionDetalleModal.tsx:1900-1906`: si el tipo es FRANCESA calcula el interés como `monto × tasa/100`, ignorando el plazo; y si no, escribe «Total a Cobrar: $ 0» | es la pantalla donde se aprueba un crédito | **no se alcanza**: la aprobación guarda siempre `montoTotal = monto + interesTotal` (`loans.service.ts:4286`), así que la primera rama devuelve esa cifra. Y un crédito de monto cero ya se rechaza al crearlo (`918a3a2`) |
| El `limite: 500` de `ListadoPrestamos` | huele a techo de datos | es el cruce con el informe de mora para enriquecer las ocho filas visibles; si el cruce no encuentra un crédito, la fila se queda con lo que mandó `/loans`, que ya trae `cuotasVencidas` y deduce el estado con la misma regla. Ninguna cifra depende de ese tope |
| «Atrasados» y «activos» de `/loans` miran la columna `estado`, no solo las cuotas | las filas de abajo deducen la mora de las cuotas | se cambió, se midió que **no mueve ninguna cifra** en esta base, y `loans.service.spec.ts` afirma a propósito que la columna también cuenta. Se revirtió, con el motivo en el código |
| Los cuatro agregados por ruta del informe operativo | 4 consultas × nº de rutas | los agrupó Codex en 4 consultas totales (`7b84ccb`), y se verificó contra la API que las cifras no se mueven: recaudo 2.630.000 y capital 5.000.000 coinciden con el panel, y la meta de «hoy» (1.068.539) con `metaDelDia` de `/routes` |

## 5. Lo que ya está arreglado. No lo repitas

Un commit por defecto, con la medición en el cuerpo. `git show <hash>` cuenta la
historia completa.

### Backend

| commit | qué |
|---|---|
| `4448b4c` | Un crédito sin aprobar aparecía EN MORA (45 → 41, cuadra con el panel) |
| `cdc47dd` | Mora y vencidas sumaban el dinero de una página (61% escondido, medido) |
| `ac6b38d` | Un crédito sin ruta aparecía dentro de la ruta de su cliente |
| `01ab0f9` | `GET /routes/cobradores` cuenta rutas y clientes de verdad |
| `0c03c04` | El inventario vacío decía «es requerido» en vez de «importe primero» |
| `fe57191` | La importación no decía que primero hay que crear las rutas |
| `c7e8ea8` | El pago en la oficina deja rastro (`origenGestion: 'OFICINA'`) |
| `3682c45` | Cualquier usuario con sesión podía registrar un pago |
| `918a3a2` | Un crédito a financiar de CERO no es un crédito |
| `9b056ad` | Ningún crédito sin ruta: ni al crearlo, ni al importarlo |
| `0595718` | Un crédito que no empieza HOY nunca entraba a la ruta (26 huérfanos) |
| `21fb215` | Entrar bien ya no gasta el cupo: la oficina se bloqueaba sola |
| `d2fb639` | Las cajas resuelven sus rutas en lote |
| `4b29165` | Se retiraron consultas y calculos sin consumidor |
| `7b84ccb` | Los reportes agrupan novedades por ruta sin N+1 |
| `14feab3` | El listado reutiliza asignaciones ya cargadas |
| `6664856` | Las visitas dejan de calcular una fecha sin uso |

### Frontend

| commit | qué |
|---|---|
| `128d5c4b` | La tarjeta de mora decía 36 y la lista traía 41 |
| `4bde58e0` | El reparto de rutas ve la carga real (se quitó la capacidad inventada) |
| `3a33e885` | La pantalla de importación dice el orden de los pasos |
| `d195a747` | El modal del supervisor cobraba 5% de mora y plazo inflado |
| `f8ec1627` | La oficina ya tiene por dónde registrar un pago |
| `f627b155` | Un modal pedía caja destino y el backend no recibía ninguna |
| `674a2261` | El coordinador no podía reprogramar; la prórroga estaba escrita 11 veces |
| `88011553` | El panel del admin tenía dos modales sin botón |
| `5bfc99d9` | Subir archivo decía «intente nuevamente» y tiraba el motivo |
| `26cb5289` | Un `image/*` dejaba ciegas a las centinelas |
| `fad92848` | Dos teléfonos cobrando el mismo crédito a la vez |
| `854f1c9f` | El modal de pago del coordinador no registraba nada |
| `e63debd3` | El detalle de notificacion deja de leer `phone`, que no existe |

---

## 6. Las centinelas que ya vigilan

Si una de estas se pone roja, **el defecto volvió**. No toques la aserción
(regla 1.3).

**Frontend** (`npx jest`, 99 suites / 8.610 pruebas):

| prueba | qué vigila |
|---|---|
| `__tests__/modales-con-puerta.test.ts` | ningún modal sin nada que lo abra |
| `__tests__/lib/sin-comentarios.test.ts` | el recortador no deja ciego ningún archivo |
| `__tests__/lib/una-sola-regla-de-ruta.test.ts` | una sola regla de listado y de prórroga |
| `__tests__/lib/crear-prestamo-payload.test.ts` | nadie arma el payload del crédito a mano |
| `__tests__/quien-cobro-se-dice.test.ts` | el supervisor y la oficina dejan rastro |
| `__tests__/cero-no-miente.test.ts` | un cero en dinero no es un hueco |
| `__tests__/cifras-que-no-se-inventan.test.ts` | ninguna cifra fabricada en pantalla |
| `__tests__/el-motivo-no-se-tira.test.ts` | ningún `catch` cambia el motivo del backend |
| `__tests__/etiquetas-unidas-a-su-campo.test.ts` | toda etiqueta nombra un campo |
| `__tests__/fechas-siempre-en-bogota.test.ts` | nada lee el reloj del proceso |
| `__tests__/ninguna-pantalla-sin-salida.test.ts` | toda pantalla tiene cómo volver |

**Backend** (`npx jest src/<zona>`, **nunca la suite completa**):

| prueba | qué vigila |
|---|---|
| `src/payments/origen-de-gestion.spec.ts` | los roles de oficina y los de la caja son la misma lista |
| `src/loans/ruta-del-credito-no-del-cliente.spec.ts` | la ruta y el estado salen del crédito |
| `src/routes/carga-del-cobrador.spec.ts` | la carga del cobrador, sin contar dos veces |
| `src/security/controller-guards.spec.ts` | cada endpoint declara sus roles |
| `src/importaciones/primer-dia-sin-rutas.spec.ts` | la plantilla avisa del paso que falta |
| `src/importaciones/importar-sin-ruta-se-avisa.spec.ts` | el informe nombra a los que quedaron sin ruta |
| `src/utils/fechas-siempre-en-bogota.spec.ts` | hora de Bogotá |

---

## 7. Cómo verificar

```bash
# FRONTEND
cd credito-sur_frontend
npx tsc --noEmit            # tipos
npx eslint .                # lint (los avisos de coverage/ no cuentan)
npx jest                    # 99 suites, 8.610 pruebas, ~20 s

# BACKEND — solo la zona que tocaste
cd credito-sur_backend
npx tsc --noEmit
npx jest src/payments src/routes          # ejemplo
# NO correr `npx jest` entero: ~600 MB de heap por worker.
# Si una suite falla entera con todas las pruebas en verde: pnpm test:log
```

**Levantar el sistema para contrastar cifras (§2.1):**

```bash
cd credito-sur_backend && npm run start:dev     # 3001
cd credito-sur_frontend && npm run dev -- -p 3000

# login (ojo: el campo es `contrasena`, y el prefijo `api-credisur`)
curl -s -X POST http://localhost:3001/api-credisur/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@creditosur.com","contrasena":"Admin123!"}'
```

Los siete usuarios de prueba están en `e2e/sesion.ts`.

---

## 8. Trampas del entorno. Cuestan una hora cada una

1. **`sed -i` destruye los CRLF** y dispara miles de errores de prettier. Usa
   `Edit`, o python con `io.open(..., newline='')` detectando el final de línea
   del archivo. Hay archivos LF y archivos CRLF en el mismo repo; algunos
   **mezclan** los dos, así que usa `splitlines(True)` en vez de `split('\n')`.
2. **Escribir regex de TypeScript desde python** se come las barras invertidas.
   Si el archivo acaba con un `\n` literal dentro de un regex, no compila. Usa
   `Edit` para los regex.
3. **El backend corre en el prefijo `api-credisur`**, no `api`.
4. **El frontend local debe apuntar a 3001** en `.env.local` (gitignored); si
   no, pega contra Render y devuelve 401. Reiniciar `next dev` tras cambiarlo.
5. **No edites nada mientras corre un e2e:** `nest --watch` y `next dev`
   recompilan y le rompen las sesiones. Pasó en esta sesión y el barrido quedó
   inservible.
6. **`next dev` no sirve para probar lo offline:** el service worker está
   desactivado y se desregistra solo. Hace falta `build` + `start`.
7. **Playwright no pulsa dentro del aside:** rechaza el clic aunque esté en
   pantalla. Se rodea con `evaluate(e => e.click())`.
8. **Las sondas y scripts temporales van al scratchpad de la sesión**, nunca al
   repo: un `git add -A` colgó 14 archivos `.probe` (1,2 MB) en un commit ya
   publicado.
9. **La base de pruebas nunca puede ser `credito_sur`** (es la de desarrollo con
   datos).
10. **No reescribir historial ya publicado:** hay un segundo desarrollador.
11. **`whitelist` del DTO descarta lo no declarado:** con un DTO,
    `(dto as any).campo` no declarado vale siempre `undefined`. Por eso
    `origenGestion: 'OFICINA'` lo pone el servidor y no el cliente.
12. **Un tipo declarado no es un tipo comprobado:** si el eslabón de arriba es
    `any`, declarar un tipo no comprueba nada.

---

## 9. Estado de los datos de desarrollo

Medido el 2026-11-18 contra `credito_sur` con el backend en marcha. Sirve para
saber si una cifra que ves es un defecto o son los datos.

- 67 créditos: 41 en mora, 12 activos, 6 pagados, 4 en `PENDIENTE_APROBACION`.
- **26 créditos sin ruta**, 24 de ellos EN_MORA. Son de antes de que se cerrara
  la regla; se encuentran con el filtro «Sin ruta» de la pantalla de créditos.
- 4 créditos de artículo con **0/0 cuotas y saldo 0**: datos de antes de la
  guarda que impide crear un crédito sin monto. Explican por qué la cabecera dice
  12 activos y la tabla 16.
- 1 ruta («Ruta Centro - Norte») con 17 clientes y un cobrador.
- 20 cuentas vencidas, $22.451.135.
- **85 pagos** en total. Ojo: circulaba la cifra de «64.091 pagos, 91 con
  `rutaId`» y en esta base **no es cierta** —será de otra base o de antes de un
  reinicio—. Lo que sí sigue valiendo es el invariante 8: la columna `rutaId` de
  `Pago` se añadió sin relleno, así que no se puede filtrar un día por ella.

---

## 10. Lo que el dueño pidió y no está cerrado

1. **Que no quede ningún elemento ni estilo por defecto del navegador.** Queda
   mucho menos de lo que decía el plan: **67 en total** (§P9), y lo más visible
   —`<select>`, fechas, `alert`/`confirm`, el relleno amarillo de Chrome, las
   barras de scroll— ya está. Lo que falta son 23 `textarea` sin `resize-none`,
   22 `title=` nativos, 12 `type="file"`, 5 `checkbox`, 4 `number` y un
   `<details>`. Hace falta componente destino para `Casilla`, `CampoNumero` y
   `CampoArchivo`; `Selector` y `CampoFecha` ya existen y están propagados.
2. **Capturas antes/después de las zonas tocadas**, los 7 roles × móvil y
   escritorio (~526 imágenes por pasada). El script reutiliza
   `e2e/pantallas.generado.ts` y `e2e/sesion.ts`. La pasada «después» se
   interrumpió dos veces y nunca se completó.
3. **Que todo siga funcionando sin conexión.** El bloque offline del cobrador
   está cerrado (arranque en frío, comprobante, aviso de pago encolado, el botón
   «Limpiar» solo sale si hay operaciones fallidas), pero **no se ha probado
   contra una build de producción**, que es la única forma de probarlo.
4. **Hablar de la deuda técnica y la estructura del proyecto** (§P9).

---

## 11. Por dónde empezar

Si retomas esto sin más contexto, este orden es el que más valor da por hora, y
está pensado para que el cliente pueda importar y probar:

1. **Terminar P5 en el listado de rutas.** El batch actual controla concurrencia,
   pero no reduce el numero de consultas de `getDailyVisits`.
2. **P8**, las pantallas bifurcadas por rol. El detalle de cliente ya se
   unificó detrás de `lib/clientes/detalle-financiero.ts` (`e9d07621`); las que
   siguen divergiendo están en la tabla de §P8.
4. Y lo del dueño: lo offline contra una build (§10.3) y las capturas (§10.2).

Dos cosas que conviene hacer **antes** de tocar código, cada vez:

- Levantar los dos servidores y contrastar las cifras de la pantalla que vas a
  tocar contra la API (§2.1). Es como salieron casi todos estos defectos.
- Correr la zona de pruebas que cubre lo que vas a cambiar, para saber de qué
  verde partías.
