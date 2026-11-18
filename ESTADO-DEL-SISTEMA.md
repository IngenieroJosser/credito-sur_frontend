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

### P1 — Las pantallas tienen techo silencioso de datos *(1 de 8 arreglada)*

**Qué pasa.** Varias pantallas piden al servidor una página con un límite fijo y
luego paginan **en local** sobre lo que trajeron. El paginador cuenta las filas
cargadas, así que dice «10 páginas» y no hay forma de llegar a la fila 51.

| pantalla | pide | pagina local | techo real |
|---|---|---|---|
| `components/cuentas/CuentasMoraFeature.tsx:258` | `limite: 50` | 5 (línea 243) | **50 cuentas en mora** |
| `app/admin/pagos/historial/page.tsx:137,222` | `limit: 500` | 20 (línea 352) | 500 pagos y 500 gastos |
| `components/prestamos/ListadoPrestamos.tsx:176` | `limite: 500` | — | 500 créditos |
| `app/admin/creditos-articulos/page.tsx:83` | `limit: 100` | 219 | 100 créditos |
| `components/rutas/RutasPageView.tsx:481` | `limit: 100` | 9 (línea 897) | 100 rutas |
| `components/dashboards/PuntoDeVentaFloatingActions.tsx:327,345` | — | 2 paginadores | revisar |
| `components/dashboards/admin/SeguimientoPuntoVenta.tsx:544` | — | — | revisar |
| `components/reportes/DetalleReporteFinancieroModal.tsx:190` | — | — | revisar |

**Por qué importa el día de la importación.** Hoy no se nota: hay 41 cuentas en
mora y 67 créditos. Con la cartera del cliente, la pantalla de mora enseñará 50
de 800 sin decir nada.

**Mora ya está arreglada** (`ccff7849`): pide 1000 y, si el servidor tiene más,
el paginador lo dice comparando con `totales.totalRegistros`. No se paginó en el
servidor porque el nivel de mora lo calcula el frontend —el `nivelRiesgo` del
backend es el del CLIENTE— y filtrar por nivel sobre una página daría un filtro
que miente; mientras ese nivel no viva en el backend, el filtro necesita el
conjunto. **Quedan las otras siete.**

**Receta.** Lo ideal es paginación de servidor: mandar `pagina`, usar el `total`
del endpoint y quitar el `Math.ceil(x.length / N)`. Si algún filtro se calcula en
el frontend, primero hay que subirlo al backend o aceptar el camino de mora
(pedir un bloque grande y **decir** cuándo se queda corto). Lo que no vale es
dejarlo callado.

La centinela `__tests__/sin-techo-silencioso.test.ts` lleva la lista de las siete
en código: al arreglar una, se quita de ahí.

---

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

### P3 — El barrido de pantallas por rol nunca se ha podido validar

**Qué pasa.** `e2e/pantallas-por-rol.e2e.ts` abre las 112 pantallas con los 7
roles. Corrido en `next dev` devuelve ~50 «problemas» por rol, pero casi todos
son artefactos del modo desarrollo: `Internal Next.js error: Router action
dispatched before initialization` y `page.goto: Timeout 90000ms exceeded` en la
primera compilación de una ruta.

**Receta.** Correrlo contra una build de producción, que además es la única forma
de probar lo offline (el service worker se desactiva en desarrollo):

```bash
cd credito-sur_frontend
npm run build && npx next start -p 3000
E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/pantallas-por-rol.e2e.ts
```

Y **no editar ningún archivo mientras corre**: cada edición recompila y le rompe
las sesiones.

**Pista que sí merece revisión:** `/coordinador/revisiones [excepcion] Invalid or
unexpected token`. Los demás roles no la dan.

---

### P4 — 185 lugares donde el dinero de la API cae a cero

**Qué pasa.** `objeto.montoAlgo || 0` sobre un campo que viene de la API: si el
campo no llega —porque el endpoint no lo manda, o porque cambió de nombre—, la
pantalla escribe «$ 0» y eso se lee como «no debe nada». Es el mismo mecanismo
que escondió la tarjeta de mora durante meses.

Medido: **185 ocurrencias** en `.tsx`. Ejemplos:
`app/(auth)/cuentas-vencidas/page.tsx:193`, `app/admin/clientes/[id]/page.tsx:132`,
`app/admin/contable/page.tsx:223`.

**Receta.** No es un cambio masivo a ciegas. Por pantalla: comprobar si el campo
existe de verdad en la respuesta (§2.1); si existe y puede ser cero legítimo,
dejarlo; si no llega nunca, es un defecto como el de la tarjeta de mora; si
significa «no se sabe», `null` + esqueleto (regla 1.5). Empezar por las pantallas
de dinero: contable, cuentas vencidas, detalle de cliente.

---

### P5 — Consultas dentro de un `.map` (N+1)

Cada una multiplica las consultas por el número de filas. Con la cartera del
cliente esto es la diferencia entre una pantalla que abre y una que caduca.

- `src/accounting/accounting.service.ts:565` — `ruta.findMany` + `caja.findFirst`
- `src/reports/reports.service.ts:737` — `prestamo.findUnique` + `cuota.findFirst`
- `src/reports/reports.service.ts:1004` — `prestamo.aggregate` + `cliente.count`
- `src/routes/routes.service.ts:1212` — `asignacionRuta.findMany`
- `src/routes/routes.service.ts:3503` — `pago.findMany`

**Receta.** Sacar la consulta del `map`: una sola consulta con `in: [...ids]` y un
`Map` por id. Ya se hizo así en `getCobradores` (`01ab0f9`) y en los dos reportes
de mora y vencidas (`cdc47dd`).

---

### P6 — Variables que guardan un cálculo y nadie usa

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

**Receta.** Para cada una: o se usa, o se borra la consulta. Dejarla cuesta una
consulta por petición y engaña al siguiente que lea.

---

### P7 — Un campo que nadie produce

`components/dashboards/shared/NotificacionDetalleModal.tsx:1235-1236` lee
`editedDetails?.phone` y `safeMeta?.phone`. **`phone` no existe** ni en el
backend ni en el frontend: el proyecto usa `telefono`. Las dos lecturas valen
siempre `undefined`.

**Receta.** Ver qué debía mostrar y usar `telefono`, o quitar la lectura. Es el
único caso que quedó de esta clase (barrido completo: 2 usos, 1 campo).

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
- 64.091 pagos históricos, de los que solo 91 tienen `rutaId`.

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

1. **P1, el techo de las pantallas.** Es lo único de esta lista que se rompe
   solo el día de la importación y en silencio. Mora ya está hecha y sirve de
   modelo; siguen siete, y la más urgente es `admin/pagos/historial` (tope 500
   en pagos y otros 500 en gastos).
2. **P3, el barrido de pantallas sobre una build de producción.** Hasta que eso
   pase en verde no se puede afirmar que las 112 pantallas abren para los 7
   roles. Mira también la pista de `/coordinador/revisiones`.
3. **P5 y P6**, que son mecánicos y se verifican con la zona de pruebas del
   backend.
4. **P4**, pantalla por pantalla y empezando por las de dinero. No en masa.
5. **P7**, que es un minuto.
6. Y lo del dueño: lo offline contra una build (§10.3) y las capturas (§10.2).

Dos cosas que conviene hacer **antes** de tocar código, cada vez:

- Levantar los dos servidores y contrastar las cifras de la pantalla que vas a
  tocar contra la API (§2.1). Es como salieron casi todos estos defectos.
- Correr la zona de pruebas que cubre lo que vas a cambiar, para saber de qué
  verde partías.
