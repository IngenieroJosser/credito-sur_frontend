# Estado del sistema — Créditos del Sur

> **Para quién es esto.** Para el siguiente agente o desarrollador que retome el
> trabajo sin haber estado en las sesiones anteriores. No hace falta leer nada
> más para empezar: aquí están las reglas, el método que encontró los defectos,
> lo que ya está arreglado (para no repetirlo) y lo que queda, con evidencia
> medida y la receta de cada arreglo.
>
> **Última actualización:** 2026-11-19.
> **Alcance:** los dos repos, `credito-sur_backend` (NestJS + Prisma 7 +
> PostgreSQL) y `credito-sur_frontend` (Next.js 16, App Router).
> **Objetivo del dueño:** dejar el sistema al 100% para que el cliente empiece
> pruebas e importación de datos. Se puede tocar backend, base de datos o lo que
> haga falta.

---

## 0a. PUBLICADO Y VERIFICADO (2026-11-24)

**Publicado.** `credito-sur_backend` `3682c45..8cceef4` y `credito-sur_frontend`
`fad92848..ef1ed1e6`. Eran 29 y 57 commits sin publicar; el despliegue de este
proyecto **es** publicar.

**Producción responde y sirve el código nuevo.** Comprobado sin credenciales:
se bajó el chunk del login de `creditos-del-sur.vercel.app` y **ya no contiene
la URL de Render escrita a mano** que arregló §P13. El backend de Render contestó
`200` en 0,53 s —el primer intento se agotó a los 90 s: es el arranque en frío
del plan gratuito, que es exactamente para lo que existe el *ping* del login—.

### Varios usuarios a la vez: medido con límites de PRODUCCIÓN

Sin subir ningún límite (300 peticiones/min por usuario, 10 de autenticación),
frontend servido por `next build` + `next start`:

| prueba | resultado |
|---|---|
| **los siete roles entran a la vez** | **pasa**: 1,5–2,0 s cada uno |
| **los siete roles trabajan a la vez** (`jornada-simultanea`) | **pasa**: 50 acciones, **0 hallazgos, 0 respuestas 429, 0 tiempos agotados** |
| **el dinero bajo caos** (`caos-dinero`, 7 pruebas) | **pasa**, incluidas «cinco cobros de la deuda entera a la vez no cobran de más» y «cinco pagos parciales a la vez: no se pierde ninguno» |

**Y el límite de autenticación resultó estar bien diseñado**, no ser un riesgo:
14 logins **correctos** seguidos desde la misma IP → los 14 a `200`; 14 con
contraseña **incorrecta** → 10 pasan y del 11.º en adelante `429`. O sea que la
oficina entera puede entrar a la vez por una sola IP y la fuerza bruta sí se
frena.

### Lo offline, probado por primera vez de verdad (`bf4a181c`)

No existía ninguna prueba y no se puede hacer en desarrollo (el service worker
se desactiva ahí). Con un build de producción:

- el service worker **llega a controlar la página**;
- tras **cortar la red y recargar** —el arranque en frío, que es el caso que de
  verdad se rompe— **la app vuelve a aparecer**: ni pantalla de error de Next ni
  error del navegador;
- y **dice que está sin conexión tras 1,0 s**. Esa ventana importa: en ella el
  cobrador podría registrar un pago creyendo que ya llegó al servidor.

**Lo que primero parecía un hueco y no lo era.** La prueba empezó fallando con
`null` al recargar sin red, y parecía que la pantalla tenía que haberse cargado
antes como documento. Se midió con una sonda de cuatro casos y la conclusión es
otra:

| caso sin red | respuesta | qué se ve |
|---|---|---|
| **la pantalla del cobrador, F5** (llegando como llega él) | **200** | **la app con sus datos**: «CrediSur COBRADOR … Cobrador Principal» ✔ |
| `/contingencia` directa | 200 | «Modo contingencia…» ✔ |
| una URL que no es ruta de la app | 200 | «Modo contingencia…» ✔ **el respaldo funciona** |
| una ruta real **nunca abierta** (`/admin/sistema/backups`) | 200 | **en blanco** |

El `null` era de la **primerísima visita**, antes de que el service worker
terminara de tomar el control y de cachear. Lo que hacía falta era esperar, no
el `goto`: la prueba se reescribió para afirmar el escenario real y **pasa dos
corridas seguidas** (`bfafdee8`). Y `/contingencia` **sí está precacheada** —337
entradas en `sw.js`— y sí se entrega.

**El único residuo, acotado:** una ruta real que el usuario **nunca abrió**
devuelve 200 **en blanco** sin red, en vez de la página de contingencia. Para el
cobrador no aplica —sus pantallas son su trabajo diario y quedan cacheadas al
entrar— y para una pantalla de administración sin red no hay escenario. Queda
anotado, no es un bloqueo.

### Las trampas del entorno de prueba, para no repetirlas

- `jornada-simultanea` y `caos-dinero` **esperan `E2E_API` con formas
  distintas**: la primera quiere el origen a secas (`http://127.0.0.1:3007`) y
  la segunda **con** el prefijo (`.../api-credisur`). Pasar la equivocada falla
  con `ECONNREFUSED 127.0.0.1:3001`, que parece que el backend no está.
- Y `TZ=` desde Git Bash **no llega a jest**: ver §8.

---

## 0c. Volumen medido de verdad, y los 4 créditos resueltos (2026-11-24)

### Los 4 «créditos fantasma» NO eran fantasma: eran ventas de contado

Se pidió borrarlos. **No se borraron, y con razón.** Al mirar a qué estaban
enganchados, cada uno tiene:

- una **transacción** `INGRESO / CUOTA_INICIAL` de 100.000 a 200.000 → **ese
  dinero entró a caja**;
- un **asiento `VENTA_ARTICULO`** completo: ingreso por venta (cuenta `3.4`) y
  salida del artículo del inventario (`5.1` contra `1.5`, por 400.000 a
  2.000.000);
- una aprobación NUEVO_PRESTAMO APROBADO.

No tienen cuotas porque **no hay nada que cobrar**: el artículo se pagó al
contado. Borrar las filas habría quitado **600.000 de ingresos y 2.880.000 de
costo** de los libros y dejado 4 asientos apuntando a un crédito inexistente —
y el libro hoy cuadra exacto.

**El defecto no eran los datos, era el estado:** figuraban `ACTIVO`, o sea
créditos vivos con `$ 0`. El camino correcto de hoy (`POST /sales/cash`) ni
siquiera crea un `Prestamo`; estos 4 son de agosto, del camino viejo.

**Qué se hizo:** marcarlos `PAGADO` en una transacción, con una nota en cada uno
explicando por qué. Medido antes y después:

| | antes | después |
|---|---|---|
| cabecera: activos | 9 | **9** |
| filas en ACTIVO | **13** | **9** |
| pagados | 7 | 11 |
| asientos descuadrados | 0 | **0** |
| créditos vivos sin cuotas | 4 | **0** |

**Y eso cierra la discrepancia de §P18**: la cabecera decía 9 y la tabla 13.
Eran exactamente estos cuatro. Ahora coinciden.

### Volumen: medido con una base aparte, no proyectado

Se creó `credito_sur_carga` (base **separada**, para no contaminar las cifras de
desarrollo) con las 53 migraciones y **20 rutas, 2.000 clientes, 3.000 créditos,
90.000 cuotas y 30.000 pagos** — unas 55 veces las cuotas y 350 veces los pagos
de desarrollo.

| endpoint | desarrollo | carga | veredicto |
|---|---|---|---|
| `loans?limit=50` | 0,33 s / 47 KB | 0,38 s / 43 KB | **aguanta**: está paginado |
| `accounting/resumen` | 0,12 s / 1,3 KB | 0,26 s / 1,2 KB | **aguanta**: tamaño constante |
| `reports/financial/monthly` | 0,04 s | 0,27 s | **aguanta** |
| `dashboard` | 0,19 s | **1,33 s** | pasa el umbral de Doherty (400 ms), usable |
| `routes` | 0,29 s / 13 KB | **1,47 s / 635 KB** | **no aguantaba** |

**`/routes` arreglado** (`93a958f`): la fila se armaba con `{ ...ruta }` y eso
esparcía `asignaciones` entera — los 100 clientes de **cada** ruta, 33.764 bytes
por ruta. El listado solo necesita el número, y lo lee de `clientesAsignados`;
la lista la pide el detalle. **635 KB → 15 KB, un 97,6 % menos**, y la
comparación campo por campo dio **0 campos con valor distinto**.

**Lo que queda medido y NO arreglado, a propósito:**

- **El tiempo de `/routes` sigue en 1,34 s.** El coste es la consulta, que aún
  carga las 2.000 asignaciones para contarlas; `_count.asignaciones` ya viene en
  la respuesta, así que la vía es contar sin traer — pero las asignaciones
  también deciden qué rutas entran en la proyección, así que es un cambio más
  grande que el del tamaño.
- **El `dashboard` en 1,33 s.** Por encima del umbral de Doherty pero usable; la
  causa son sus ~25 agregados en paralelo.
- *Límite de la medición:* los 30.000 pagos sintéticos **no tienen asientos
  contables**, así que esto no mide el libro mayor con volumen. §P20/§P25 sigue
  siendo la proyección, no una medición.

### Sobre los paneles de Render y Vercel

**No son cuentas del dueño**, así que no hay acceso a los paneles — ni mío ni
suyo. Dos consecuencias prácticas:

1. Todo arreglo tiene que funcionar **solo publicando en el repo**, que es como
   se ha trabajado.
2. **`PG_DUMP_PATH` lo tiene que configurar quien administre el Render.** Es la
   variable que hace que el respaldo deje un volcado restaurable; sin ella el
   respaldo solo produce un `.xlsx`, que no restaura PostgreSQL. La pantalla ya
   lo dice (`5ee37579`). Es lo único de esta lista que no se puede cerrar desde
   el código.

---

## 0h. PARA LAS PRUEBAS DE MAÑANA (2026-11-25): lo que cambia y donde mirar

Lo que se cerró hoy por la tarde, en orden de lo que se va a notar probando.

### 1. El tablero decia 500 cuentas en mora habiendo 3.000  ← MIRAR ESTO

`delinquentAccounts` se calculaba con un `findMany` de hasta **500** creditos
(`take: 500`) y hasta **50** cuotas de cada uno (`take: 50`, sin orden), que se
contaban en memoria. El numero **no podia pasar de 500**.

```
antes:   500        (tope)
ahora: 3.000        (la verdad, contada en SQL)
```

**La cifra de mora del panel va a SUBIR.** No es un error nuevo: es que antes
estaba recortada. Si en las pruebas el numero parece mas alto de lo esperado,
esto es la razon.

De los 191 valores que devuelve `/dashboard` cambia exactamente uno, ese.
Vigilado por `src/dashboard/las-cuentas-en-mora-no-tienen-tope.spec.ts`.

### 2. Las pantallas ya no muestran ceros cuando algo falla  ← CAMBIO VISIBLE

Cuatro endpoints convertian un fallo de consulta en un dato falso:

| endpoint | lo que decia al fallar |
|---|---|
| `/dashboard` | negocio sin cartera, sin cobranza y sin mora |
| `getTrendData` | grafica vacia = «no hubo cobranza» (el incidente §P21) |
| `/clients` | «la financiera no tiene clientes» |
| `/loans` | cartera vacia y sin mora |

Ahora **fallan de verdad**, y las pantallas lo cuentan con un panel que dice el
motivo y ofrece reintentar (`components/ui/PanelDeError.tsx`).

**Qué puede verse en las pruebas:** si la base o la red fallan un momento, donde
antes salian ceros ahora saldra «No se pudo cargar…». **Eso es lo correcto**: un
`$ 0` se lee «no debe nada». Si aparece ese panel, hay un fallo real detras —
mirar los logs de Render, no la pantalla.

De paso se arreglaron dos cosas de las pantallas:

- `/admin` y `/coordinador` hacian `return null`: quedaban **en blanco**;
- el del coordinador no apagaba el `isLoading` salvo en un 401, asi que un
  fallo de red lo dejaba **cargando para siempre**.

### 3. Mas rapido, sin cambiar ningun numero

| endpoint | antes | ahora | comprobacion |
|---|---|---|---|
| `/clients` | 11,3-14,8 s | **0,71-1,41 s** | 54.000 campos comparados, 0 cambian |
| `/dashboard` | 4,4-5,2 s | **2,7-3,8 s** | 191 valores, cambia 1 (el que mentia) |
| `/routes` | 4,0-5,7 s | **3,6-4,4 s** | 660 campos, 0 cambian |

Todo con 2.000 clientes, 3.000 creditos, 90.000 cuotas y 30.000 pagos.

### 4. El build de produccion ya no puede fallar en silencio

Esta mañana fallaba con ocho errores de tipos y produccion seguia sirviendo el
codigo anterior sin decirlo. Arreglado (§0e), y ahora se comprueba con un
`curl`:

```
curl -s https://credito-sur-backend.onrender.com/api-credisur/health
curl -s https://creditos-del-sur.vercel.app/api/ping
```

Los dos devuelven `commit`; comparar con `git log --oneline -1`.

### 5. Cambiar de periodo ya no vacia la pantalla  ← CAMBIO VISIBLE

Lo pidio el dueño. Medido: de las **ocho** vistas con selector de periodo, solo
**dos** tenian problema, y cada una el contrario de la otra:

- **`/admin`** hacia `dashboardData: null` al cambiar de mes a año: la pantalla
  entera se iba al esqueleto varios segundos.
- **`/coordinador`** no vaciaba nada **ni avisaba**: se quedaba con las cifras
  del periodo anterior en silencio, con el selector ya en el nuevo.

Ahora en las dos: los datos se quedan, **atenuados y sin recibir clics**, con
una franja azul que dice «Actualizando a Año… las cifras de abajo son todavia
las del periodo anterior». El esqueleto queda solo para la primera carga.

**Que se vera en las pruebas:** al cambiar de periodo la pantalla no parpadea;
sale la franja un momento y las cifras se actualizan en su sitio. Si la
actualizacion falla, la franja se pone ambar y dice que lo que se ve es del
periodo anterior, **sin borrar nada**.

Las otras seis vistas con periodo ya estaban bien y no se tocaron.

### 6. La pantalla de respaldos decia que habia una copia en la nube  ← LEER

La tarjeta derecha decia **«Nube VPS · Respaldo remoto · Conectado»**, con punto
verde parpadeando, y bajo «Ultima sincronizacion» repetia la fecha del respaldo
**local**. No existe: el enum `BackupDestino` tiene **un solo valor**, `LOCAL`,
y no hay en todo el modulo una linea que suba un archivo a ningun sitio.

Le decia al dueño que tenia una copia **fuera del servidor** de su financiera.
Ahora dice la verdad: «Copia fuera del servidor · No configurada», con la ruta
real, el aviso de que el disco de Render es **efimero** y que hay que descargar
la copia en cuanto se genera, y que el plan de recuperacion real son las copias
automaticas del Postgres administrado.

Y al generar un respaldo, la pantalla **lo ofrece para descargar en el acto**
en vez de dejarlo en una fila del historial.

**`pg_dump` SI esta en produccion** (18.7, Debian): no hay que configurar
`PG_DUMP_PATH`. Lo unico que queda del asunto es el disco efimero.

### 7. Dos rotulos de estado mas que estaban escritos a mano

Barrido sobre los 471 archivos `.tsx` buscando palabras de estado como texto
fijo. De tres candidatos, **dos eran reales**:

- **El login** tenia un punto verde con «En linea» marcado en el codigo como
  «(Decorativo)». En la pantalla de entrar: con el servidor caido, quien no
  puede entrar lee «En linea» y culpa a su contraseña. Ahora sale de
  `useOnlineStatus`, que confirma con un ping real.
- **Respaldos** decia «Activo» aunque `GET /backup/status` fallara.

El tercero (`PushNotificationManager`) ya estaba bien y no se toco.

### Verificacion final antes de las pruebas

| comprobacion | resultado |
|---|---|
| 7 roles x 112 pantallas, en navegador | **las 7 pasan** |
| pruebas del frontend | **8.673 en 104 suites** |
| backend, zonas tocadas | dashboard, clientes, creditos, rutas, prisma, respaldos: **verde** |
| `tsc --noEmit` y `eslint` en los dos repos | **limpios** |
| build de los dos repos | **ok** |
| produccion == repo | comprobado por `commit` en `/health` y `/api/ping` |

### Lo que NO esta resuelto, dicho claro

1. **`/routes` y `/dashboard` siguen en 3-4 s** con 2.000 clientes. Usable,
   molesto. La causa esta medida (§0f, §0g) y lo que queda no tiene arreglo
   barato.
2. **`/clients` manda TODOS los clientes** en cada carga: 1 MB con 2.000, ~5 MB
   con 10.000. El tiempo ya esta arreglado, el tamaño no. **Y no es solo el
   endpoint:** la pantalla filtra y calcula sus estadisticas (mora, vencidas,
   niveles de riesgo) sobre el conjunto completo en el navegador, asi que
   paginar en el servidor obliga a mover tambien esas cifras. Es la razon por la
   que no se hizo deprisa: ahi es donde se rompen los numeros.
3. ~~Los respaldos~~ **— contestado (§0d-bis): `pg_dump` SI esta en
   produccion (18.7, Debian), no hay que configurar nada.** Lo que queda es que
   el disco de Render es **efimero**: la copia hay que **descargarla en cuanto
   se genera** o desaparece en el siguiente despliegue. La pantalla ya lo dice,
   y de paso se quito la tarjeta «Nube VPS · Conectado», que afirmaba una copia
   remota que no existe.
4. Las **88 cuotas a medianoche UTC** anteriores al arreglo de fechas (§P24) y
   **§P20** (el reporte financiero se baja el libro mayor al navegador).

### Barridos que salieron limpios (para no repetirlos)

- **`NOT` sobre columnas nulables**, la clase de defecto que escondio 7.883.331
  de cobranza: 165 columnas nulables en el esquema, 23 filtros `not` revisados,
  **0 sospechosos**. El barrido se comprobo al reves metiendo el patron malo y
  lo detecta.
- **Topes que alimentan una cifra**: 66 `take: N` en el codigo, **uno solo
  mentia** (el del tablero, arreglado). Los otros dos candidatos se midieron y
  se descartaron con el dato: la reconciliacion de aprobaciones -0 creditos sin
  fila de aprobacion en la base, y la importacion los crea ya APROBADOS- y la
  hoja de auditoria del Excel -256 registros contra un tope de 50.000-.

---

## 0g. `/clients` tardaba 12 segundos, y era la cuenta de la mora

El hallazgo mas gordo del dia, y el que de verdad habria molestado al cliente.

### Lo que se midio

Con la base de carga (20 rutas, 2.000 clientes, 3.000 creditos, 90.000 cuotas,
30.000 pagos):

```
/clients     11,3 · 14,8 · 12,0 · 13,1 · 11,3 · 12,0 s     (1.082.467 bytes)
/routes       4,0 ·  4,9 ·  4,3 s
/dashboard    5,8 ·  4,6 ·  5,0 s
/loans        0,09 s
/payments     0,03 s
```

Dos cosas de entrada:

1. **`/clients` no acepta paginacion de ningun tipo.** El controlador solo
   admite `nivelRiesgo`, `ruta`, `search` y `forCredit`: no hay `limit`, ni
   `page`, ni `skip`. Devuelve **siempre todos los clientes de la empresa**.
   `?limit=20` se ignora y llegan los 2.000.
2. Y tardaba doce segundos de forma **consistente**, con poca varianza —al
   contrario que `/routes`, donde el ruido de la maquina tapaba todo—.

### No era la base de datos

Las consultas, medidas con el mismo cliente que usa la aplicacion:

```
cliente.findMany (como en el servicio)        113 ms   2.000 filas
DISTINCT ON cuota mas vieja                   236 ms   3.000 filas
las 4 cuentas/agregados                         3 ms
```

**~350 ms de 12.000.** Con una sonda dentro de `getAllClients` salio donde
estaba:

```
SONDA /clients  5 consultas=435ms  2 consultas raw=269ms
                pegar relaciones=41ms  transformar=11891ms  ordenar=1ms
                TOTAL=12637ms
```

**El 94% en el `map` que transforma cada cliente**: ~6 ms por cliente, de JS
puro.

### La causa: la mora se contaba dia por dia

`calcularDiasMoraOperativos`, para la frecuencia **DIARIO** —la normal en este
negocio—, recorria **un dia a la vez** desde el vencimiento hasta hoy, y cada
vuelta llamaba a:

- `shiftBogotaKey` → construye una fecha **y formatea con `Intl`**,
- `buildBogotaNoon` otra vez,
- `getBogotaWeekday` → **formatea otra vez**.

Dos llamadas a `Intl` por cada dia de atraso. Con clientes de 160 a 264 dias
—los de la base de carga— son ~320 llamadas por cliente y **640.000 en una sola
peticion**. Y el coste **crece con la antiguedad de la cartera**, que es lo
unico que aumenta solo con el tiempo: cuanto mas vieja la mora, mas lento el
listado.

### El arreglo, y por que no cambia ningun numero

Forma cerrada: los dias del rango menos los domingos que caen dentro, con
aritmetica de enteros. Vale porque **Colombia no tiene horario de verano** —por
eso todo el repo ancla al mediodia de Bogota con `-05:00` fijo—, asi que una
clave `YYYY-MM-DD` se convierte a numero de dia y a dia de la semana sin
formateadores.

La equivalencia **no se razona, se comprueba**:
`src/loans/mora-sin-recorrer-los-dias.spec.ts` copia el bucle original como
implementacion de referencia y compara las dos sobre 6 vencimientos en dias de
la semana distintos x 204 dias x 6 frecuencias, mas rangos de ocho años. Y una
asercion **cuenta las llamadas reales a `Intl`**: de cientos a dos.

### Resultado medido

```
antes:    11,3 - 14,8 s
despues:   0,71 - 1,41 s        → entre 10x y 15x
```

Y la respuesta es **identica**: se compararon el antes y el despues campo por
campo, **54.000 campos, cero cambian**, mismas estadisticas, mismo tamaño exacto
(1.082.467 bytes).

`/routes` y `/dashboard` **siguen en 4-5 s**: su coste esta en otro sitio —las
90.000 cuotas de §0f— y queda abierto.

### Lo que sigue abierto aqui

- **`/clients` devuelve todos los clientes de la empresa.** Con 2.000 son 1 MB;
  con 10.000 seran ~5 MB en cada carga de la pantalla. El tiempo ya esta
  arreglado, el **tamaño no**. Hace falta paginacion de verdad en el
  controlador, y eso toca la pantalla que lo consume.
- `/routes` y `/dashboard`, 4-5 s (§0f).

---

## 0f. El tiempo de `/routes`: medido, y la correccion obvia NO sirve

Quedaba abierta «la otra mitad» del hallazgo de `/routes`: el payload ya se
recorto de 635 KB a 15 KB, pero el **tiempo** seguia anotado sin tocar. El plan
escrito era quitar el `include` de `asignaciones` y contar con
`_count.asignaciones`. **Medido, ese plan no sirve.** Esto es lo que se
encontro.

### Lo primero: el numero anterior era optimista

La base de carga se volvio a sembrar igual (20 rutas, 2.000 clientes, 3.000
creditos, 90.000 cuotas, 30.000 pagos) y `GET /routes` con el payload ya
recortado dio, en seis corridas:

```
10,56 s · 5,97 s · 5,64 s · 6,92 s · 7,97 s · 7,28 s      (15.277 bytes, http 200)
```

o sea **5,6–10,5 s**, no los **1,34 s** que decia §P20. Ese 1,34 no se
reprodujo. La pantalla del coordinador, que esta abierta todo el dia, tarda
entre seis y diez segundos en cargar con este volumen.

### Donde se va el tiempo (sonda en `findAll`, tres corridas)

```
consulta principal   447 /  44 /  56 ms
cierres pendientes    42 /  11 /   3 ms
activacion hoy         9 /   3 /   2 ms
proyectarRutas      5376 / 2155 / 6541 ms   <-- 97-99 % del total
recaudo contable      14 /   5 /   9 ms
mapeo final            2 /   1 /   2 ms
```

**La consulta que lleva el `include` de asignaciones cuesta 44–447 ms.**
Quitarlo ahorraria ~40 ms de una peticion de seis segundos: no cambia ningun
resultado, asi que **no se hace**. El plan escrito antes estaba equivocado, y lo
unico que lo demostro fue medirlo.

### Y dentro de `proyectarRutas`: las 90.000 cuotas

El trabajo esta en `cargarVisitas` (`src/routes/datos-visitas.ts`), en este
`findMany`: asignaciones activas → `cliente` con `include` (todas las columnas)
→ sus `prestamos` de la ruta → y las **`cuotas` de cada uno sin `select`**. Con
este volumen son **2.000 clientes y 90.000 filas de cuotas de 15 columnas**.

Medido por capas, con el mismo cliente que usa la aplicacion (adaptador `pg` +
Prisma):

```
asignaciones + cliente + prestamos + cuotas     1.458 ms   2.000 filas
asignaciones + cliente + prestamos (sin cuotas)   137 ms   2.000 filas
asignaciones + cliente (sin prestamos)             74 ms
solo asignaciones                                   9 ms
```

**El `include` de cuotas es el 91 % de esa consulta.**

### No es la base de datos, y ningun indice lo arregla

`explain (analyze, buffers)` sobre la lectura de las 90.000 cuotas:
**73 ms**, `shared hit=1985`, cero lecturas de disco. Y los indices estan todos
puestos: `cuotas_prestamoId_idx`, `cuotas_prestamoId_numeroCuota_key`,
`cuotas_fechaVencimiento_idx`, `cuotas_estado_idx`, mas
`Prestamo_rutaId_idx`.

O sea: Postgres tarda 73 ms y el resto —mas de un segundo— se va en **Prisma
materializando 90.000 objetos** y en el procesado en memoria posterior. **Un
indice nuevo no cambiaria nada**, y por eso no se propone.

### Las dos salidas obvias tampoco se pueden afirmar

Se midieron, cinco corridas cada una:

```
include completo (15 columnas)      mediana 3.981 ms   min 1.367 ms   (1367/1378/3981/5751/6080)
select de 7 columnas de cuota       mediana 3.316 ms   min 2.917 ms   (2917/3278/3316/3622/4801)
solo cuotas no pagadas              mediana 5.127 ms   min 3.762 ms   (3762/5118/5127/5280/5951)
```

**La dispersion de UNA misma configuracion (1.367 → 6.080 ms) es mayor que
cualquier diferencia entre configuraciones**, asi que en esta maquina no se
puede decidir. Lo que si se ve es que el `select` reducido **no salio mas
rapido** —probablemente porque Prisma cambia el plan de consultas anidadas— y
que filtrar las pagadas salio peor. **Conclusion honesta: la correccion barata
no esta demostrada; no se aplica sobre una medicion que no distingue.**

### Lo que queda, y por que no se toca hoy

El camino real es cargar **menos filas**, no menos columnas: por ejemplo la
cuota que la jornada necesita por credito en vez de las treinta. Eso es un
cambio de diseño de `cargarVisitas`, y `cargarVisitas` **lo comparten dos
consumidores**: `proyectarRutas` (el listado) y `getDailyVisits`, que es la
pantalla del cobrador **y la copia offline**. Recortar ahi es tocar un valor
compartido que se interpreta distinto en cada pantalla, que es exactamente la
clase de cambio que en este proyecto ya salio mal varias veces.

Asi que queda **anotado y medido**, no hecho:

- el techo del arreglo es grande (de ~6 s a ~1 s si las cuotas dejan de
  cargarse enteras);
- hay que rastrear antes **que campos de `cuota` consume de verdad** cada
  camino: `proyectarVisitas`, `moraDelListado`, `estadisticas-listado.ts`,
  `ruta-operational-rules.ts`, y lo que el frontend guarda offline
  (`mapearPrestamoDescargado`);
- y hay que medirlo en una maquina menos ruidosa, o con muchas mas corridas,
  porque con esta varianza no se distingue una mejora de un ruido.

---

## 0e. El build de produccion se rompio y se arreglo (2026-11-24)

**Sintoma.** El build de Render fallo con **ocho errores TS2339**, todos el
mismo: `Property 'cantidadProducto' does not exist on type ...` en
`approvals.service.ts` (3), `loans.service.ts` (5).

**El campo si existe:** `src/prisma/schema.prisma:298`, con su migracion
`20261114120000_cantidad_producto_prestamo`. Lo que no lo tenia era el **cliente
generado**, que es contra lo que `nest build` comprueba los tipos.

**La causa, medida y no supuesta.** El comando de Render es
`pnpm install --frozen-lockfile && pnpm build`, y en el log **no hay ni una
linea `[prisma]`**. Reproducido en local: con `node_modules` al dia,
`pnpm install --frozen-lockfile` responde «Already up to date» en menos de un
segundo y **no ejecuta el `postinstall`**. Render conserva `node_modules` entre
builds, asi que el cliente se quedo en la version anterior al cambio de esquema
y nadie lo regeneraba antes de compilar.

`start:prod` si lo invocaba —se agrego en `4b23c3f` por una variante de esto—
pero corre **despues** del build, y el build ya habia fallado.

**Arreglo** (`b8e85bb`): encadenar `scripts/ensure-prisma-client.js` tambien al
`build`. No se paga dos veces: el script guarda el hash del esquema junto al
cliente y si coincide no hace nada. Medido: la regeneracion tarda **803 ms**.
Centinela en `src/prisma/el-build-genera-el-cliente.spec.ts`, comprobada al
reves.

**Verificado en produccion:** el despliegue entro y `/health` contesta
`commit: "e29b9ce"`, el mismo del repo, arrancado a las 19:23:38 UTC.

### De paso: ahora se sabe que version corre produccion

Hoy el build fallo y produccion siguio sirviendo el codigo anterior **sin que
nada lo dijera**. `/health` devolvia solo `ok`, `status`, `service` y la hora.
Con la consola de pago, la API es la unica via.

`e29b9ce` le agrega **`commit`** (`RENDER_GIT_COMMIT` abreviado a siete
caracteres, como `git log --oneline`) y **`arrancadoEn`**, que distingue «mi
despliegue entro» de «el commit es el mismo porque el build fallo». El endpoint
es publico, asi que no se expone nada mas del entorno; fuera de Render `commit`
sale `null`.

Como comprobar un despliegue de ahora en adelante:

```
curl -s https://credito-sur-backend.onrender.com/api-credisur/health
```

y comparar `commit` con `git log --oneline -1`.

---

## 0d-bis. RESUELTO: `pg_dump` SI esta, y la pantalla decia una mentira grave

### 1. La pregunta del `pg_dump` esta contestada (2026-11-25)

El dueño abrio la pantalla en produccion y dice:

```
Volcado SQL disponible · pg_dump (PostgreSQL) 18.7 (Debian 18.7-1.pgdg12+5)
```

**Esta disponible. NO hay que configurar `PG_DUMP_PATH`.** Todo lo que §0d
explica sobre rutas y versiones queda como referencia por si algun dia cambia
la imagen, pero el paso 2 y el 3 **no hacen falta**.

Lo que queda del asunto de los respaldos no es el binario: es **el disco**.

### 2. La pantalla decia que habia una copia en la nube, y no existe

La tarjeta derecha decia **«Nube VPS · Respaldo remoto · Conectado»**, con un
punto verde parpadeando y un escudo, y bajo «Ultima sincronizacion» repetia la
fecha del respaldo **local**.

Nada de eso existia. Comprobado en el codigo:

- el enum `BackupDestino` tiene **un solo valor**, `LOCAL`;
- y no hay en **todo** el modulo de respaldos una sola linea que suba un
  archivo a ningun sitio: ni S3, ni SFTP, ni rsync, ni VPS.

O sea que la pantalla le decia al dueño que tenia una copia **fuera del
servidor** de su financiera cuando no la tiene. Y se juntaba con que el disco de
Render es efimero: la copia que creia tener a salvo desaparece en cada
despliegue.

En una pantalla de respaldos esa es la frase mas cara de equivocar.

**Ahora la tarjeta dice lo que pasa:** «Copia fuera del servidor · No
configurada», con la ruta real donde se escribe el archivo, el aviso de que el
disco es efimero y hay que descargar la copia en cuanto se genera, y que el plan
de recuperacion real son **las copias automaticas del Postgres administrado de
Render**. El boton de «Verificar integridad» —que si es real, consulta
`/accounting/integridad`— se conserva bajo su propio titulo.

Verificado **en el navegador**, no solo leyendo:
`e2e/respaldos-dicen-la-verdad.e2e.ts`.

### 3. Un detalle de permisos que conviene saber

El endpoint lleva `@Permisos('backups')`. Medido contra la base de desarrollo:
**el permiso existe pero no lo tiene asignado ningun rol**. El guard exime al
SUPER_ADMINISTRADOR (`permisos.guard.ts:34`), asi que hoy **solo el
superadministrador puede abrir esta pantalla**. No es un defecto —es una
decision de permisos— pero si alguien con rol ADMIN dice que no la ve, es esto.

---

## 0d. Nota de operación: los respaldos y `PG_DUMP_PATH`

**Para quien administre el Render.** Las cuentas de Render y Vercel **no son del
dueño**, así que esto no se puede cerrar desde el repo: hay que hacerlo en el
panel.

### Qué es la variable

`PG_DUMP_PATH` es **la ruta al ejecutable `pg_dump`**. El código la pasa a
`execFileAsync` (`backup.service.ts:35`), así que vale un nombre que esté en el
`PATH` o una ruta absoluta. Por defecto es `'pg_dump'`, o sea «búscalo en el
PATH». Los argumentos que usa son `--format=c --file <ruta> <DATABASE_URL>`.

### Ya no hace falta la consola: la pantalla lo contesta (2026-11-24)

El dueño confirmo dos cosas: **`PG_DUMP_PATH` no esta en las variables de
entorno**, y **la consola (shell) de Render es de pago**, asi que nadie puede
entrar a escribir `pg_dump --version`.

Asi que la comprobacion se metio en la aplicacion (`ca258a5`):
`GET /backup/status` ejecuta `pg_dump --version` —que no toca la base de datos—
y contesta `pgDumpDisponible`, `pgDumpVersion` y `pgDumpError`. La pantalla de
respaldos lo pinta al abrirse, **sin generar ningun respaldo**.

Eso cambia el orden de abajo: **el paso 1 ya no pide consola**. Se abre
`/admin/sistema/backups` y la tarjeta de estado dice una de dos cosas:

- «Volcado SQL disponible · pg_dump (PostgreSQL) NN.N» → **no hay que configurar
  nada**, el valor por defecto ya funciona.
- «Este servidor no puede generar el volcado SQL: no encuentra `pg_dump` en
  `pg_dump`» → entonces sigue el paso 2.

Antes el aviso solo salia **despues** del primer respaldo (dependia de
`lastRun`), y el caso real es el contrario: una instalacion nueva dice «Sin
respaldos» y no avisa de nada, asi que el dueño se enteraria el dia que
necesite restaurar.

Dato medido que conviene tener presente: en la maquina de desarrollo hay
**PostgreSQL 18.1 instalado y `pg_dump` NO esta en el PATH** (ENOENT). «Esta
instalado» y «el servicio lo encuentra» no son lo mismo, ni aqui ni en Render.

### Los tres pasos, en orden

1. **Comprobar si ya está.** En la consola del servicio: `pg_dump --version`.
   Los entornos nativos de Render incluyen paquetes de cliente de PostgreSQL,
   pero **no garantizan que la versión case** con la base. Si responde y su
   versión mayor es **igual o superior** a la del servidor, **no hay que
   configurar nada**: el valor por defecto ya funciona.
2. **Si la versión es menor, falla:** `pg_dump` se niega a trabajar contra un
   servidor más nuevo que él. El valor sería entonces la ruta absoluta a un
   binario que case, en la ubicación estándar de Debian/Ubuntu:

   ```
   /usr/lib/postgresql/<MAJOR>/bin/pg_dump
   ```

   con `<MAJOR>` = la versión mayor del Postgres **de producción** (la de
   desarrollo es 18.1). En el entorno nativo **no se pueden instalar paquetes
   del sistema**, así que si ese binario no existe en la imagen, la vía es
   Docker — Render publica un ejemplo con los clientes instalados,
   `render-examples/pg-toolkit`.
3. **Y lo que de verdad hace falta además de la variable.** Verificado leyendo
   el código:

   - el volcado se escribe **en disco**, en `BACKUP_DIR` (por defecto
     `<cwd>/backups`);
   - el único destino posible es `LOCAL` —el enum `BackupDestino` tiene **un
     solo valor**— y **no se sube a ningún sitio**: no hay S3 ni equivalente;
   - la descarga (`GET /backup/:id/download`) lee del disco y devuelve **404**
     si el archivo no está;
   - **no hay respaldo programado**: no existe ningún `@Cron` de backup, solo el
     botón manual.

   En el entorno nativo de Render **el disco es efímero**: en cada despliegue o
   reinicio el archivo desaparece y la descarga pasa a dar 404. Así que el
   volcado solo sirve si **se descarga en el momento**, o si se monta un **disco
   persistente** y `BACKUP_DIR` apunta a él.

### Recomendación

- Si `pg_dump` está y la versión sirve: **no tocar nada**.
- Si no está: lo que resuelve no es la variable, es **el disco persistente** (o
  descargar el volcado al generarlo).
- Y tener presente que **el Postgres administrado de Render ya hace sus propias
  copias automáticas**, que son el plan de recuperación real. El respaldo de la
  aplicación es «llevarme una copia», no el seguro contra un desastre.

La pantalla ya no miente sobre esto (`5ee37579`): si el volcado no se generó, lo
dice junto al estado y nombra la variable.

---

## 0b. ¿Está listo para producción? Respuesta medida (2026-11-24)

**No todavía, y el motivo principal no es el código: es que nada de esto está
publicado.**

### Lo que SÍ está listo, comprobado

| comprobación | resultado |
|---|---|
| el backend compila para producción (`nest build`) | **sí**, exit 0 |
| el frontend compila (`next build --webpack`) | **sí**, «Compiled successfully» |
| `tsc --noEmit` en los dos repos | **limpio** |
| migraciones de Prisma | **53 aplicadas, base al día** |
| arranque sin variables críticas | **falla ruidosamente**: `env.validation.ts` exige `DATABASE_URL` y `JWT_SECRET` (≥32 caracteres) y explica cuál falta |
| pruebas | **8.645** frontend · backend verde en la zona tocada |
| barrido de 7 roles × 112 pantallas | **completado**, sin hallazgos tras los arreglos (§P3) |
| endpoints sin control de rol | **0 reales** de 228 (§P14) |
| libro contable | **0 asientos descuadrados**, 0 centavos (§P16) |
| pagos duplicados | **ninguno** (§P16) |

### Lo que lo impide, en orden

1. **NADA ESTÁ PUBLICADO.** `git status` dice **29 commits del backend y 57 del
   frontend por delante de `origin/main`**. Render y Vercel están sirviendo
   código anterior a todo este trabajo: sin los arreglos de dinero, sin el de la
   importación, sin el de las fechas. **Publicar es el despliegue** (§Despliegue
   sin acceso al panel), así que hasta que se empuje, en producción no hay nada
   de esto. *Esta decisión es del dueño: publicar dispara el despliegue.*

2. **Las copias de seguridad no dejan nada con que restaurar** si el servidor no
   tiene `pg_dump` —y Render no lo trae por defecto—. El respaldo es un `.xlsx`
   de las tablas, que **no restaura PostgreSQL**. La pantalla ya lo dice
   (`5ee37579`), pero el hecho sigue: para tener respaldo propio hay que
   configurar `PG_DUMP_PATH` en el servidor. *Atenuante:* el Postgres
   administrado de Render tiene sus propias copias automáticas; esto es el
   respaldo que el dueño se descarga.

3. **Decidir qué se hace con los datos sucios** antes de importar: los 4
   créditos fantasma (§P16) y las 88 cuotas a medianoche UTC (§P24), que son
   anteriores al arreglo.

4. **§P20 sigue abierto**: el reporte financiero se baja el libro mayor al
   navegador para sumarlo. No impide arrancar —hoy son 516 KB— pero con la
   cartera real crece sin tope (§P25 tiene la investigación hecha y el camino).

### Lo que NO se ha verificado nunca, y conviene saberlo

- **Lo offline contra un build de producción.** El service worker se desactiva
  en desarrollo, así que todo lo offline que se ha arreglado está probado por
  pruebas unitarias y por lectura, **no con el teléfono sin señal sobre un
  `next start`**. Es un requisito explícito del dueño y está sin tocar (§10.3).
- **Volumen real.** Todas las mediciones son sobre 39 clientes, 67 créditos y
  1.629 cuotas. Las proyecciones de §P20 son lineales sobre bytes medidos, no
  pruebas de carga.
- **El límite de peticiones con los siete roles a la vez.** El barrido se corrió
  con los límites subidos a propósito; con los de producción salían 429 (§P3).

### Veredicto *(actualizado tras publicar y verificar — ver §0a)*

**Publicado y verificado.** Ya no aplica el punto 1: producción sirve el código
nuevo. La concurrencia de los siete roles está medida con límites de producción y
sale limpia, el dinero aguanta cinco cobros simultáneos, y lo offline se probó
por primera vez contra un build real.

**Lo que impide decir «al 100% sin problemas», y es corto:**

1. ~~Un F5 sin señal solo funciona en pantallas ya cargadas como documento~~
   **— medido y descartado:** la pantalla del cobrador sobrevive al F5 sin red
   con sus datos, y el respaldo funciona. Lo único que queda es que una ruta
   nunca abierta sale en blanco (§0a), que no es un escenario del cobrador.
2. **Los respaldos no dejan volcado** si el servidor no tiene `pg_dump`.
   **Depende de quien administre el Render**, que no es el dueño (§0c).
3. ~~Decidir qué hacer con los datos sucios~~ **— los 4 créditos resueltos**
   (§0c): eran ventas de contado y se cerraron como PAGADO sin tocar los libros.
   Quedan las 88 cuotas a medianoche UTC (§P24), anteriores al arreglo.
4. ~~El volumen real no se ha medido~~ **— medido con 90.000 cuotas y 30.000
   pagos** (§0c): todo aguanta salvo `/routes`, ya arreglado (635 KB → 15 KB).
   Queda el tiempo de `/routes` y del `dashboard`, ~1,3 s, usable.

### Actualizacion del 2026-11-24, por la tarde: lo que cambio

Dos cosas invalidan parte de lo de arriba, y conviene leerlas antes que nada.

**1. El punto 4 estaba equivocado.** Decia «queda el tiempo de `/routes` y del
`dashboard`, ~1,3 s, usable». Ese 1,3 **no se reprodujo**. Sembrada otra vez la
misma base de carga:

| endpoint | medido hoy | estado |
|---|---|---|
| `/clients` | 11,3-14,8 s → **0,71-1,41 s** | **arreglado** (§0g) |
| `/routes` | **4,0-5,7 s** | abierto, causa medida (§0f) |
| `/dashboard` | **4,1-5,8 s** | abierto, misma causa |
| `/loans` | 0,09 s | bien |
| `/payments` | 0,03 s | bien |

El de clientes era el peor y ya esta: la mora se contaba dia por dia con dos
llamadas a `Intl` por dia de atraso (§0g). Los otros dos siguen en cuatro o
cinco segundos, con la causa localizada y escrita.

**2. El build de produccion estaba roto y nadie lo sabia** (§0e). Fallaba con
ocho errores de tipos y produccion seguia sirviendo el codigo anterior **sin
decirlo**. Ya esta arreglado, y ahora `/health` y `/api/ping` publican el
`commit` que corre cada uno, asi que esto se comprueba con un `curl`.

### Veredicto, a esta hora

**Se puede poner a funcionar, y hay dos cosas que conviene arreglar antes de
meter la cartera entera.**

Lo que esta bien y comprobado: el dinero (transacciones, idempotencia, libro
cuadrado, cinco cobros simultaneos), los roles, lo offline del cobrador contra
un build real, la concurrencia de los siete roles con limites de produccion, y
los dos repos publicados y verificados por `commit`.

Lo que queda, en orden de lo que mas se va a notar:

1. **`/routes` y `/dashboard`, 4-5 s con 2.000 clientes.** Son las dos pantallas
   que el coordinador tiene abiertas todo el dia. Usable, molesto, y la causa
   esta medida: las 90.000 filas de cuotas que `cargarVisitas` materializa
   enteras (§0f). **No hay arreglo barato**: lo probado no mejora nada y
   `cargarVisitas` lo comparten el listado y la pantalla del cobrador.
2. **`/clients` manda TODOS los clientes de la empresa** en cada carga: 1 MB con
   2.000, unos 5 MB con 10.000. El tiempo ya esta arreglado; el tamaño pide
   paginacion de verdad en el controlador (§0g).
3. **Los respaldos**, que dependen de `pg_dump` en el servidor. Ya no hace falta
   la consola de pago para saberlo: la pantalla de respaldos lo dice al abrirse
   (§0d).
4. **Las 88 cuotas a medianoche UTC** anteriores al arreglo de fechas (§P24), y
   **§P20**: el reporte financiero se baja el libro mayor al navegador.

Ninguno de los cuatro impide operar. Los dos primeros se notan con volumen
real, y por eso se dicen primero.

---

## 0. Si retomas ahora, empieza por aquí

Última verificación: barrido por rol completado en dos corridas (§P3).
El backend suma todas las solicitudes de base pendientes, no solo las que
aparecen entre las cinco revisiones más recientes. Medición del relevo: nueve
solicitudes por $450.000 en desarrollo. Al forzar el resultado a cero solo en
el módulo compilado de Jest, falló exactamente la prueba que esperaba 450000.
Sin la mutación pasaron las nueve pruebas de dashboard. Esto verifica el dato
de la API; no implica que exista una tarjeta que lo muestre.

> ### El refactor del listado de rutas quedo TERMINADO (2026-11-19, commit `af52be0`)
>
> Estaba a medias y sin commitear: **−764 / +68 lineas** en
> `routes.service.ts`, dos modulos nuevos sin seguir en git
> (`datos-visitas.ts`, `estadisticas-listado.ts`), **el arbol sin compilar** y
> **15 pruebas de `src/routes` en rojo**. Ahora: `tsc` limpio, `eslint` limpio,
> **83 pruebas de rutas y 433 de la zona tocada, todas pasando**.
>
> **Compila.** Faltaba el tipo del cliente de Prisma en los dos modulos nuevos:
> llevaban `Prisma.TransactionClient`, que es el cliente SIN extender. El de
> este proyecto es `TransaccionPrisma`, y el comentario de
> `prisma.service.ts:170` describe exactamente ese error. Si vuelve a aparecer
> un `TS2345` con `PrismaService` no asignable a `TransactionClient`, es esto.
>
> **Cambia UNA cifra, y es una correccion.** Se levanto el codigo refactorizado
> en un puerto aparte y se comparo `GET /routes` contra el codigo viejo campo
> por campo: **340 campos, uno solo cambia** — `porcentajeMora`, 71,41 -> 67,91.
>
> | la cartera de la ruta son... | creditos | saldo | vencido | mora% |
> |---|---|---|---|---|
> | todos los creditos de los clientes asignados | 34 | 15.254.990 | 10.893.913 | **71,41** (viejo) |
> | solo los creditos CUYA RUTA es esta | 31 | 13.589.990 | 9.228.913 | **67,91** (refactor) |
>
> Los 3 de diferencia tienen **`rutaId` nulo**: no son de ninguna ruta.
> Contarlos ahi contradice la invariante §3 y su centinela
> `ruta-del-credito-no-del-cliente.spec.ts`. El viejo 71,41 inflaba la mora con
> 1.665.000 que nadie va a cobrar en esa ruta.
>
> **Las pruebas, y lo que se aprendio.** Nueve de las quince fallaban por datos
> que el doble no decia: el codigo viejo consultaba POR ruta, asi que toda fila
> devuelta era de esa ruta y no hacia falta decirlo; la carga por lotes pide una
> vez con `rutaId: { in: ids }` y luego AGRUPA por ese campo. Se rellena en la
> factoria `makeService`, y **solo cuando la consulta pide UNA ruta**: con dos o
> mas no hay forma de saber de cual es cada fila, y rellenar con la primera las
> mete todas en esa ruta.
>
> Lo que costo encontrar: `datos-visitas.ts` vuelve a filtrar en memoria los
> creditos de la asignacion con `p.rutaId === rutaId`. En produccion sobra pero
> es correcto —el `include` de Prisma trae todos los escalares—; en las pruebas
> los descartaba TODOS y la visita salia vacia. Lo mostro una sonda de seis
> lineas: `asignaciones=1 prestamos=[0]`.
>
> Las otras seis afirmaban consultas que el refactor elimina a proposito (el
> espia de `getDailyVisits` por ruta, `asignacionRuta.findMany` no llamado, la
> meta por lista de clientes). Se **reescribieron contra el mecanismo nuevo
> conservando la intencion de cada una**; ninguna asercion se relajo.
>
> **Y una leccion de §1.4, cobrada otra vez:** la prueba de la ausencia
> compartida —la que vigila que una ausencia no se cruce entre rutas— **pasaba
> en verde con el agrupado roto**. El registro de visita era de la PRIMERA ruta,
> asi que el defecto «todo a la primera» (`agrupar(registros, () => ids[0])`)
> daba el mismo resultado que el codigo correcto. Movido el registro a la
> SEGUNDA ruta, ahora si lo caza. Las tres comprobaciones al reves que se
> hicieron: sin alcance del actor, sin deduplicar, y con el agrupado cruzado.

> ### Y la revision del propio refactor encontro 4 defectos mas (`6a65323`)
>
> Se corrio **`/code-review high`** sobre el commit del refactor. Encontro cuatro
> cosas, todas reales, en codigo recien commiteado. **Esto es la leccion: una
> revision de diff ve lo que la investigacion dirigida no mira.**
>
> 1. **La mora estaba corregida a medias.** `findAll` acota la cartera a los
>    creditos DE LA RUTA y `findOne` no: la misma ruta daba **67,91 en la lista y
>    71,41 en el detalle**, y con ella `totalDeuda` y `prestamosActivos`. Y habia
>    mas de lo que decia el informe: los pagos del dia del detalle iban por la
>    asignacion del CLIENTE, asi que un pago sobre un credito del mismo cliente
>    en OTRA ruta entraba en esta cobranza. Medido campo por campo con los dos
>    backends en marcha: de **2.113 campos del detalle, 3 cambian**, y los tres
>    quedan de acuerdo con la lista; los otros 2.110 identicos, asi que no se
>    oculta nada en pantalla.
> 2. **`proyectarRutas` recupera la tolerancia por ruta.** El batch anterior
>    tenia un `try/catch` por ruta con el motivo escrito y el refactor lo
>    perdio: el permiso se resuelve en el `where`, pero cualquier OTRO fallo de
>    una sola ruta rechazaba la peticion entera, y el listado pide todas sus
>    rutas de una vez. Una ruta con datos raros dejaba TODAS las tarjetas en
>    blanco.
> 3. **La cifra que el refactor cambia ya no esta sin vigilar.**
>    `mora-de-la-ruta.spec.ts` (11 pruebas) fija lo vencido sobre el saldo, que
>    una cuota futura o PAGADA no cuenta, el ausente de hoy —que si cuenta si
>    pago—, el deduplicado por credito, que un PAGADO no pesa, el recorte por
>    ruta en `datos-visitas.ts` y que el include del detalle lo acote.
> 4. **`supervisorId` es anulable** y el DTO de crear ruta lo deja opcional: una
>    ruta sin supervisor se puede crear, y entonces NINGUN supervisor ve su
>    jornada. Hoy no ocurre (1 ruta viva, con supervisor) y el alcance es
>    coherente con `findOne`, que ya acotaba igual. **Queda escrito, sin tocar**:
>    si la importacion crea rutas sin supervisor, volver aqui.
>
> **Dos de mis propias centinelas pasaban en verde con el defecto puesto**, y las
> dos por el mismo tipo de error de §1.4:
>
> - `rutaId: id` aparece **nueve veces** dentro de `findOne` —cajas, jornadas,
>   registros—, asi que buscarlo suelto nunca miraba el include. Ahora se recorta
>   el trozo que empieza en `prestamos: {` y se exige que llegue a los estados.
> - el caso del deduplicado era **simetrico**: el mismo credito dos veces dobla
>   saldo Y vencido, asi que el porcentaje salia identico. Ahora es asimetrico
>   (12,5 % con deduplicado, 16,67 % sin el).

Por orden. Lo de arriba es lo que está a medias; lo de abajo, lo que nadie ha
mirado todavía.

| # | Qué | Dónde |
|---|---|---|
| 1 | **§P24 cerrado** (`8cceef4`): la importación ya ancla los vencimientos a mediodía de Bogotá. **Lo que queda es decidir** si hay que migrar cuotas ya importadas antes del arreglo | §P24 |
| 2 | **Investigar el timeout de login si reaparece.** Los siete roles ya completaron el recorrido tras el arreglo de URL, aunque no en una sola corrida. No se ha demostrado la causa de las esperas fallidas. | §P3 |
| 3 | **Decidir qué se hace con 4 créditos fantasma** de la base: ACTIVO, aprobados, dicen tener cuotas y no tienen ninguna. No es un defecto vivo —no se repiten desde agosto— pero el cliente los va a ver | §P16 |
| 4 | **§P22 cerrado:** evolución mensual, agrupación de la gráfica y año de la exportación en calendario de Bogotá. | §P22 |
| 5 | **§P20: el reporte financiero se baja el libro mayor para sumarlo.** Investigado a fondo en **§P25**: el arreglo es seguro —las fórmulas coinciden por construcción— y lo que falta es la variante por día del resumen (516 KB con 1.202 asientos; ~20 MB proyectados con 50.000). Es el riesgo de escala real y se arregla en el servidor | §P20 |
| 6 | **§P5 cerrado en el listado** (`af52be0`): cierres, estadísticas y visitas se leen por página, no por ruta. Lo que queda de §P5 son los 3 métodos multi-modelo que nadie ha revisado | §P5 |
| 7 | **§P8: las 8 pantallas bifurcadas por rol.** Es la deuda que hace que cada arreglo haya que hacerlo dos o tres veces. Ya se pagó ese precio varias veces | §P8 |
| 8 | **§P9: la deuda técnica para hablar con el dueño** (archivos de 4.300 líneas, 6 copias del formateo de pesos, 8 colores de botón primario) | §P9 |

**Lo que ya NO hay que volver a mirar** (medido y escrito, con el límite de cada
medición): el dinero escrito sin transacción (§P11, 7 de 7 revisadas), la
idempotencia de la cola (§P10 y §P15), el alcance por rol en caja y rutas
(§P12), los endpoints sin `@Roles` (§P14, 228 revisados), los botones mudos, los
techos del servidor y la atomicidad de la importación (§P17), el estado
contable de la base (§P16), las cifras del panel contra sus listas (§P18) y el
listado de rutas por página (§0, `af52be0`).

**Y una herramienta que se evaluó y se descartó, para no repetir la búsqueda:**
los plugins comunitarios *anti-slop* y *thermos*. Ninguno es de Anthropic.
«Thermos» son dos cosas: un plugin de revisión que **duplica** `/code-review`
—que ya viene de fábrica, con nivel `ultra` multi-agente— y cuya «regla de las
1.000 líneas» dispararía sobre `routes.service.ts` y `VistaCobrador.tsx`, que ya
están medidos en §P9; y `claude-thermos`, un proxy de caché de prompts, que no
resuelve ningún cuello de botella medido aquí. «Anti-slop» no es un plugin sino
una docena con ese nombre, y casi todos van contra «comentarios obsoletos e
identificadores verbosos»: **eso choca con la convención de este repo**, que
lleva la medición escrita dentro del comentario y es justo lo que permite el
relevo entre agentes. Además son plugins de Claude Code: **Codex no los lee**,
así que no sirven como configuración compartida. Lo compartido es este md.
Si se quiere algo que se cumpla *siempre*, el mecanismo correcto es un hook de
`settings.json` que corra `tsc` + `eslint` + la zona de pruebas tocada.

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

#### Pasada del 2026-11-19: los siete roles, y UN solo defecto en todo el sistema

Corrida completa contra `next build --webpack` + `next start`, apuntando a un
backend levantado aparte. **Resultado: en 7 roles x 112 pantallas apareció un
único hallazgo distinto**, repetido en seis de los siete roles:

```
/login [consola] Access to fetch at 'https://credito-sur-backend.onrender.com/api-credisur'
                 from origin 'http://localhost:3100' has been blocked by CORS policy
/login [consola] Failed to load resource: net::ERR_FAILED
```

Era real y está arreglado: §P13, la URL del backend escrita a mano en el login.
SUPER_ADMINISTRADOR pasó limpio porque entra antes de que empiece la vigilancia.

**Verificación posterior (19 de noviembre).** En 14,7 minutos pasaron seis
roles sin hallazgos ni 429. Punto de Venta agotó 180 s esperando la respuesta
del login, también en el primer reintento individual. En una nueva corrida
aislada con los servidores locales 3101/3003 pasó en 1,4 min: 22 pantallas
cargadas, 89 redirecciones y cero 429. Esto cubre navegación, no exactitud
de saldos ni funcionamiento offline. La captura del timeout no demostraba que
el servidor estuviera arrancando ni que la contraseña fuera incorrecta.

#### Tres trampas más del entorno, de esa misma pasada

3. **`npx next build` a secas FALLA.** Next 16 usa Turbopack por defecto y este
   proyecto tiene configuración de webpack (la mete el PWA). El error es
   `Build error occurred / Error: Call retries were exceeded`, y **sale con
   código 0**, así que parece que funcionó: luego `next start` dice «Could not
   find a production build». Hay que usar el script del repo, que ya lo trae:
   `npm run build` (= `next build --webpack`).

4. **En modo desarrollo este barrido no decide nada.** La primera pasada se hizo
   con `next dev` y salieron decenas de `ERR_CONNECTION_REFUSED` y `ERR_ABORTED`
   repartidos por todos los roles: era el servidor de desarrollo recompilando y
   cayéndose, no la aplicación. Tiene que ser build de producción.

5. **Si no se pueden matar procesos, no hace falta.** Puertos ocupados por
   servidores viejos se esquivan levantando **todo en puertos nuevos**: un
   backend más con `PORT=3003` y `CORS_ORIGINS=http://localhost:3101`, y el
   frontend compilado con `NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3003` sirviendo
   en 3101. Varios backends contra la misma base conviven sin problema para un
   barrido, que es casi todo lectura.

**Receta corta para retomar (la que funcionó):**

```bash
# backend nuevo, en un puerto libre, con el origen del frontend permitido
cd credito-sur_backend
PORT=3003 CORS_ORIGINS=http://localhost:3101   RATE_LIMIT_DEFAULT_MAX=20000 RATE_LIMIT_HEAVY_MAX=20000 RATE_LIMIT_AUTH_MAX=2000   npx nest start

# frontend compilado CONTRA ESE backend, servido en otro puerto libre
cd credito-sur_frontend
NEXT_PUBLIC_BASE_URL=http://127.0.0.1:3003 npx next build --webpack
npx next start -p 3101

# el barrido (tarda ~15 min; conviene dejarlo en segundo plano)
E2E_BASE_URL=http://localhost:3101 npx playwright test e2e/pantallas-por-rol.e2e.ts --retries=0
```

Las credenciales de los siete roles están en `e2e/sesion.ts`, dentro del repo:
el barrido corre sin configurar nada más.

---

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

Listado de rutas: la consulta de registros de visita del día pasa de una por
ruta con clientes a una por página (ninguna si no hay asignaciones). La prueba
con dos rutas y un cliente compartido midió dos llamadas antes y una después;
la ausencia solo excluye al cliente de la meta de su ruta. No se modificaron
la conciliación de cierres ni las llamadas internas de `getDailyVisits`.

En la siguiente tanda se separó el **resumen de cierres** de la regularización.
Antes, por ruta con caja activa, el listado hacía al menos cinco lecturas Prisma
y un `updateMany`, además de recalcular deudas si encontraba pendientes. Ahora
ejecuta un solo SELECT por página no vacía, sin actualizar jornadas ni deudas.
Una jornada abierta de ayer sigue apareciendo como pendiente. Consultar el
detalle de cierre o regularizar sigue usando el flujo operativo anterior.
Las pruebas cuentan llamadas para 0, 1 y 50 rutas; el caso de PostgreSQL con
datos sintéticos se activa con `PROBAR_CIERRES_POSTGRES=1` y `DATABASE_URL` local.
Medición de solo lectura en desarrollo (1 ruta, 4 pendientes): 31,64 ms en la
primera consulta y 1,81–2,26 ms en cinco repeticiones. No mide todo el endpoint.

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

### P11 — Dinero escrito sin transacción *(CERRADO: 6 arregladas, 1 descartada con medición)*

**La clase.** Un método que escribe en dos o más modelos de dinero sin
`$transaction`: si falla a mitad, la mitad queda escrita. Medido con un lector
que recorre el cuerpo real de cada método por profundidad de llaves: **7
métodos**. Se revisaron los siete.

| método | qué dejaba a medias | decisión | commit |
|---|---|---|---|
| `updateLoan` | `cuota.deleteMany` → cálculo → `createMany`: un fallo tras el borrado dejaba el crédito con **CERO cuotas**, y el borrado ya confirmado | transacción | `eb5914b` |
| `approveLoan` | bucle de hasta 45 `cuota.update` + `prestamo.update`: medio calendario movido, y como el estado seguía PENDIENTE el reintento volvía a moverlo | transacción | `5d5fd09` |
| `deleteLoan` | prestamo archivado + su `aprobacion` PENDIENTE sin cerrar | transacción | `79242fc` |
| `rejectLoan` | prestamo RECHAZADO + su `aprobacion` PENDIENTE sin cerrar | transacción | `79242fc` |
| `fixInterestCalculations` | interés subido en el crédito y repartido solo en algunas cuotas | transacción por crédito | `79242fc` |
| `regularizarCentavos` | crédito descuadrado por el resto, o asiento con unas líneas redondeadas y otras no | transacción por crédito y por asiento | `79242fc` |
| `procesarMoraAutomatica` | — | **no hace falta**, ver abajo | — |

Un crédito sin cuotas no es un crédito a medias: no tiene meta, no entra en la
jornada de ninguna ruta y no hay nada que cobrarle. Desaparece de la operación
con su saldo intacto.

**Por qué archivar y rechazar eran dinero, no cosmética.**
`confirmarPrestamoProvisional` (`approvals.service.ts`) actualiza el préstamo
**por id, sin comprobar `eliminadoEn` ni `estadoAprobacion`**. Una solicitud
huérfana —préstamo archivado, aprobación todavía PENDIENTE— aprobada devuelve el
crédito a ACTIVO y desembolsa. Y `archiveLoan`, el *otro* camino de archivado,
ya hacía ese mismo par de escrituras dentro de una transacción: era el mismo
par, decidido de dos maneras distintas.

**Medido contra la base de desarrollo (2026-11-19):** 39 aprobaciones
PENDIENTE, 4 de ellas de NUEVO_PRESTAMO, y **cero** sobre un préstamo borrado o
rechazado, con 65 préstamos archivados y 65 rechazados en la tabla. El camino
feliz cierra bien; lo que quedaba abierto era la ventana de fallo parcial.
*Límite de la medición:* mira el estado de HOY, no si alguna vez ocurrió y se
corrigió a mano.

**Por qué `fixInterestCalculations` no se arreglaba solo.** La condición de
entrada compara el interés correcto con `interesTotal`. Si el préstamo ya quedó
actualizado y las cuotas no, el crédito **no vuelve a entrar nunca** y la
diferencia se queda para siempre. Lo mismo en `regularizarCentavos`: `objetivo`
se recalcula desde `totalAntes`, que ya sería el estado a medio escribir, así
que la segunda corrida cuadraría el crédito contra un total distinto del
original.

**La que se descartó, y por qué.** `procesarMoraAutomatica` (6 escrituras):
cada una es una fila suelta e independiente —una cuota a VENCIDA, un préstamo a
EN_MORA, otro de vuelta a ACTIVO—, cada paso se recalcula desde su propia
consulta y repetir la corrida converge al mismo estado. **No hay ninguna
invariante que una dos escrituras**, así que una transacción no cambiaría ningún
resultado y solo mantendría un bloqueo largo sobre miles de filas. Además cada
fallo se anota en `resultado.errores` y la corrida sigue, que es justo lo que
hace segura la ausencia de transacción. Queda escrito en una prueba para que
nadie lo "arregle" sin volver a medir.

**Centinelas.** `src/loans/editar-credito-no-borra-el-calendario.spec.ts` (18
pruebas) y `src/accounting/regularizar-centavos-no-descuadra.spec.ts` (7). Las
dos nuevas **se comprobaron al revés**: metiendo el defecto a mano (devolver un
`tx.` a `this.prisma.`) fallan exactamente 2 de 22, una por defecto. Cada
extractor de cuerpo de método lleva su piso medido (`expect(cuerpo.length)
.toBeGreaterThan(...)`), que es lo que impide que pasen en verde por no mirar
nada.

**El lector está en el método §2.2** y vale la pena rehacerlo tal cual: recorre
cada `async` por profundidad de llaves y cuenta las escrituras a modelos de
dinero. Una ventana de caracteres fija —lo que probé primero— cruza al método
siguiente y reporta lo que no es.

---

### P10 — La solicitud de base no tenía clave de idempotencia *(CERRADO)*

`solicitarBase` creaba una aprobación SOLICITUD_BASE_EFECTIVO sin mirar ninguna
clave, y `base_solicitar` era **el único de los 49 tipos que encola la cola
offline que mueve dinero y no estaba en `idempotentTypes`** — no lo estaba
precisamente porque el backend no la miraba.

**Por qué era dinero.** Aprobar esa solicitud no es un trámite: saca el monto de
CAJA-OFICINA con una transacción de EGRESO, lo ingresa a la caja de ruta con otra
de INGRESO y registra el asiento de partida doble (`approvals.service.ts`). Dos
solicitudes aprobadas entregan la base dos veces, y el descuadre aparece al
cierre, lejos de su causa.

**Qué se hizo** (`262849c` backend, `f3ed7228` frontend): el patrón del registro
de gasto —buscar la aprobación por `idempotencyKey` antes de crearla, y
guardarla con su clave—, el campo declarado en el `@Body()` del controlador (sin
declararlo no habría llegado: la whitelist descarta lo no declarado), y
`'base_solicitar'` añadido a `idempotentTypes`, que es donde se estampa la clave
**una sola vez, al encolar**.

Sin clave no se pregunta nada, a propósito: el coordinador que pide base dos
veces en el día lo hace queriendo. La protección es contra el reintento de la
cola.

Guardado por `src/accounting/base-no-se-pide-dos-veces.spec.ts` (5 pruebas,
comprobadas al revés).

---

### P12 — El alcance por rol se aplicaba en unos sitios y en otros no *(2 cerrados)*

**La clase.** El sistema tiene reglas de alcance escritas y probadas —un cobrador
solo ve su ruta, un supervisor solo las que supervisa— pero aplicadas **método a
método**. Donde faltan, el guard de roles deja pasar: sabe que eres SUPERVISOR,
no si *esa* ruta es tuya.

**Cómo se mide, y es lo que vale la pena repetir.** Con un doble de Prisma cuyo
`findFirst` **respeta el `where`** que recibe, en vez de devolver siempre la
misma fila. Así la prueba ejecuta el código en lugar de releerlo: si la consulta
no acota, la fila ajena aparece y la escritura sigue. Un doble que devuelve
siempre lo mismo pasa en verde con el defecto puesto.

| caso | qué permitía | commit |
|---|---|---|
| `resolveActiveRouteCashContext` (accounting) | un COBRADOR pedía base y **cargaba un gasto a la caja de otra ruta**. El `where` salía `{id, eliminadoEn}` a secas; la guarda existía solo para SUPERVISOR | `3c06955` |
| `update`, `remove`, `toggleActive`, `assignClient`, `removeClient` (routes) | un SUPERVISOR **leía** solo sus rutas (`findOne` sí acota) pero **escribía** sobre las de cualquiera: ni recibían el actor | `6f59d9d` |

Editar una ruta no es cosmético: `UpdateRouteDto` admite `cobradorId`, o sea
cambiar quién cobra una ruta ajena — y el dinero entra a la caja de quien cobra.
Un gasto cargado a la caja de otro la deja corta, y el descuadre aparece en el
cierre de quien no hizo nada.

**El COORDINADOR y la oficina siguen sin filtro a propósito** y las dos pruebas
lo comprueban: atienden cualquier ruta, y es regla del negocio (el cliente que
paga en la sede).

**Lo que queda por mirar de esta clase:** se listaron 27 escrituras que reciben
un id del cliente sin pasar el actor; las dos de arriba eran las únicas que
admitían un rol de campo. Las otras 25 son CRUD de oficina, donde operar sobre
cualquier id es el objetivo. Conviene rehacer ese cruce cuando se añadan
endpoints.

---

### P13 — La URL del backend escrita a mano *(CERRADO)*

Lo encontró el barrido de pantallas (§P3) corriendo contra un build de
producción apuntado a otro backend: `/login` salía con dos errores de CORS en la
consola, en la pantalla por la que entra todo el mundo.

- **El login** hacía `fetch('https://credito-sur-backend.onrender.com/...')` con
  la URL fija, para despertar la instancia dormida de Render. En **cualquier**
  build de producción llamaba a ese servidor en vez de al suyo. `lib/api/baseUrl.ts`
  existe justo para esto y su comentario ya decía que había ocho archivos
  calculándola por su cuenta: el login era el noveno.
- **La CSP** (`lib/seguridad/csp.ts`) escribía los mismos orígenes a mano en
  `connect-src`. No se nota mientras el sistema viva en Render y en local
  —`localhost:*` y `127.0.0.1:*` ya están permitidos—, pero **el día que el
  backend esté en otro dominio la CSP bloquea TODAS las llamadas de la app a su
  propio backend**, y una pantalla sin datos no se parece en nada a esa causa.
  Ahora añade el origen configurado y su equivalente de socket, y una variable
  mal escrita no tumba la cabecera.

Commit `51dfbf6c`, con 5 pruebas nuevas en `__tests__/seguridad/csp.test.ts`.

---

### P14 — Endpoints sin control de rol: medido, está limpio *(NO HAY QUE HACER NADA)*

`RolesGuard` devuelve `true` cuando el método no tiene metadatos de `@Roles`
(`if (!rolesRequeridos) return true`), así que un endpoint sin anotar queda
abierto a los siete roles. Se barrieron los **228** endpoints: **215 acotados**,
y los 13 restantes están justificados uno a uno — login y recuperación de
contraseña (`@Publico`), push y notificaciones por usuario, el receptor del
espejo (que tiene su propia firma HMAC con nonce y caducidad), `health`, y dos
lecturas que se acotan dentro del servicio.

**Y la lección del barrido, que vale más que el resultado:** el lector falló
**tres veces** antes de decir la verdad, y cada vez pasaba o acusaba en silencio.

1. Ventana de 25 líneas hacia abajo → un comentario de 25 líneas la agotó y
   declaré abierto el `@Post()` de pagos, que sí tiene `@Roles`.
2. Mirando solo hacia abajo → en `auth.controller.ts` el `@Roles` va **encima**
   del verbo; los seis salieron como huecos y no lo eran.
3. Parando la caminata hacia arriba en cualquier `)` → ese paréntesis cierra un
   `@Roles(` de varias líneas, así que volvía a perderlo.

La forma que sí funciona: recortar el miembro **desde el cierre del anterior
(`^  \}$`, solo la llave) hasta la firma de verdad**, y mirar ese bloque entero.
Y antes de creerse un «0 hallazgos», imprimir lo que el lector SÍ vio: cuando
salió «26 de 27 sin ningún rol leído», el cero anterior quedó claro que no valía
nada.

---

### P15 — La cola sin conexión: medida entera, está sana *(NO HAY QUE HACER NADA)*

Dos comprobaciones que conviene rehacer cuando se añadan operaciones.

**1. Ningún endpoint encolado es un fantasma.** Se cruzaron las **52 llamadas a
`enqueueOperation`** (49 tipos distintos) contra las **228 rutas reales** del
backend, normalizando las interpolaciones y los `:param` a comodín: **0 que no existan**. Importa
porque un endpoint inventado se reintenta para siempre y el trabajo del cobrador
no llega nunca.

Dos cosas que parecían defectos y no lo son, comprobadas:

- Varios endpoints van **sin barra inicial** (`'loans'`, `loans/<id>/restore`).
  Axios une `baseURL` y `url` insertando la barra, así que no rompe. No hace
  falta tocarlo.
- `arqueo_registrar` se encola con **dos endpoints distintos**, y los dos
  existen: `POST /accounting/cajas/:id/arqueos` (`registrarArqueo`, solo roles de
  oficina) y `POST /cajas/:cajaId/arqueos` (`confirmarArqueo`, que incluye
  COBRADOR y SUPERVISOR: es la entrega de efectivo al cierre). **Son dos
  operaciones distintas compartiendo nombre de tipo.** Hoy no cambia ningún
  resultado —nada se comporta distinto según el tipo salvo la lista de
  idempotentes, que no incluye ninguna— pero si algún día se les da trato por
  tipo, hay que separarlas primero.

**2. P10b contestado: duplicar un arqueo o un cierre NO puede duplicar dinero.**

| operación | qué lo impide | qué pasa en el reintento |
|---|---|---|
| `arqueo_registrar` (cierre del cobrador) | índice único `cajaId_fechaOperativa` + comprobación explícita | 400 «Ya existe un arqueo para esta caja y fecha» |
| `cierre_jornada_ruta` | máquina de estados: exige `PENDIENTE_CIERRE` | 409 «La jornada ya fue cerrada o regularizada» |

Añadirles clave de idempotencia **no cambiaría ningún resultado**: la base y la
máquina de estados ya los frenan. Es el caso contrario al de `solicitarBase`
(§P10), donde nada los frenaba.

**Lo que sí queda, y es ruido, no dinero.** La cola trata 400/409 como fallo
**definitivo**: lo reporta a `/sync-conflicts/report-failed` y lo borra
(`syncManager.ts:459-490`). Así que una respuesta perdida en una operación que
SÍ se guardó deja un **conflicto de sincronización falso**, y alguien investiga
un fallo que no ocurrió. Para arreglarlo de verdad haría falta que el backend
distinguiera «409 porque ya está hecho» de «409 porque hay un conflicto real»;
mientras tanto no se toca, porque ninguna cifra se mueve.

---

### P16 — Estado de la base antes de la importación *(medido, y hay 4 filas que avisar)*

Medido contra la base de desarrollo el 2026-11-19, porque es justo lo que el
dueño necesita saber antes de meter datos reales.

**Lo que cuadra** (y conviene volver a correr después de importar):

| comprobación | resultado |
|---|---|
| cuotas con centavos | **0** de 1.629 |
| cuotas donde `capital + interés ≠ monto` | **0** |
| líneas de asiento con centavos | **0** de 1.202 |
| **asientos descuadrados** (debe ≠ haber) | **0** |
| préstamos / pagos / cajas con centavos | **0** |
| créditos vivos donde la suma de las cuotas ≠ la deuda | **0** de 57 |

O sea: `regularizarCentavos` es hoy una herramienta sin nada que reparar, y el
libro cuadra. *Límite:* son 1.629 cuotas de datos de desarrollo; esto hay que
repetirlo con los datos del cliente.

**Los pagos no tienen duplicados, comprobado uno por uno.** Se buscaron grupos
con el MISMO crédito y el MISMO monto: salieron 7 grupos, y los tres que
parecían un doble envío —5 pagos de 72.000 en el mismo segundo, 2 de 195.000 a
un segundo de distancia, 2 de 165.000— **todos tienen claves de idempotencia
distintas**, de las pruebas e2e (`e2e-parcial-…`) y de un script de simulación
(`sim-roles-…`). O sea que son pagos deliberados y la idempotencia hizo su
trabajo. Solo **2 de 85** pagos no llevan clave.

**El resumen contable «de hoy» en ceros es correcto:** no hay pagos ni
transacciones del 19 de noviembre (los últimos son del 17). Se comprobó porque
un tablero en ceros es indistinguible de un tablero roto.

**Lo que NO cuadra, y son datos, no código: 4 créditos fantasma.**

`ART-000034`, `ART-000042`, `ART-000047` y `ART-000048`, todos creados el
2026-08-28: están **ACTIVO y APROBADO**, dicen `cantidadCuotas` 4, 12 y 24, y
**no tienen ni una cuota**. Su `monto` es 0 con una cuota inicial de 100.000 a
200.000. Son créditos que afirman un calendario que no existe.

Se ven en las pantallas como créditos activos con **$ 0**, que por la regla de
la casa se lee «activo y no debe nada» — y ahí se quedan para siempre, porque
sin cuotas no hay nada que cobrar ni nada que los cierre.

**No se han vuelto a producir:** de los 19 créditos creados desde septiembre,
ninguno tiene esta forma; los 4 `monto = 0` son exactamente esos cuatro de
agosto. Por eso **no se tocó el código**: no hay defecto activo que arreglar.
Lo que hay que decidir es qué hacer con esas cuatro filas antes de que el
cliente las vea. *Límite:* el DTO acepta `@Min(0)` para el monto, así que un
crédito de monto 0 sigue siendo aceptable; lo que no se pudo reproducir es cómo
quedó sin cuotas.

---

### P17 — Tres barridos más que salieron limpios *(NO HAY QUE HACER NADA)*

Se escriben para que nadie los repita a ciegas.

**Botones que no hacen nada: 0 de 671.** Se leyeron todas las etiquetas
`<button>` equilibrando llaves (una etiqueta JSX lleva `{}` dentro, así que
cortar en el primer `>` parte la etiqueta). Los 5 candidatos eran falsos: tres
`disabled` a propósito, uno envuelto en `Tooltip` —que es quien lleva el
manejador— y uno que mi lector encontró **dentro de un comentario**, por no
filtrar comentarios teniendo `lib/testing/sin-comentarios.ts` justo para eso.
Las Fases 1 y 2 del plan de UX están hechas, cada arreglo con su motivo escrito
en el sitio.

**Techos de datos en el servidor: ninguno muerde.** Hay 23 `take:` con número
literal mayor que 20. El que parecía peligroso es el `take: 100` sobre las
cuotas pendientes de cada crédito en la pantalla de ruta
(`routes.service.ts:792` y `:1859`), **sin `orderBy`**. Dos mediciones lo
cierran: el máximo real de cuotas por crédito es **30**, y
`resolveCuotaObjetivoOperativa` **ordena en memoria** por fecha efectiva antes
de elegir, así que el orden de la consulta no decide nada. *Límite:* un plan
DIARIO pasa de 100 cuotas a partir de ~3,3 meses y nada lo prohíbe (`@Min(1)`,
sin `@Max`). Si la importación trae planes diarios largos, hay que volver aquí.

**La importación es atómica y tiene plazo de sobra.** Las cuatro transacciones
de `importaciones.service.ts` llevan `{ maxWait: 60_000, timeout: 600_000 }`:
diez minutos, y o entra el archivo entero o no entra nada.

---

### P18 — El panel decía 1 aprobación pendiente habiendo 39 *(CERRADO)*

**Salió de contrastar el panel contra la API**, que es el método de §2.1 y el que
más defectos ha dado.

`GET /dashboard` → `metrics.pendingApprovals = 1`.
`GET /approvals/pending` → `total: 39`.

**La causa.** El contador y la lista de pendientes llevaban
`creadoEn: { gte: startDate, lte: endDate }`: el período que el usuario elige
arriba, por defecto «mes». Pero una solicitud pendiente es un **estado actual**,
no un suceso del período — la que entró el mes pasado sigue esperando hoy. Con
«hoy» seleccionado el panel habría dicho **0** teniendo 39.

**La regla ya estaba escrita dos líneas más abajo**, en el mismo método, para la
mora: *«sin filtro de período porque la mora es un estado ACTUAL del préstamo,
no depende de cuándo se creó»*. Es el patrón de §1.6: la lógica correcta ya
existía al lado y no se había aplicado aquí.

**Por qué importa.** No es una cifra de estadística: se pinta como la
**insignia** de una tarjeta de acceso rápido (`app/admin/page.tsx:319` y
`app/coordinador/page.tsx:203`), donde un «1» se lee «tienes una cosa
esperando». Las 39 eran 20 clientes nuevos, **9 solicitudes de base** (efectivo),
4 créditos, 4 gastos, una reprogramación y un pago por transferencia.

Commit `39fa520`, con 3 pruebas comprobadas al revés. La tercera vigila lo
contrario: que el período siga mandando donde sí es un período (capital
prestado, recaudo), para que el arreglo no se pase de ancho.

**Lo que este contraste dejó medido, de paso:** la cabecera de `GET /loans` dice
9 activos y la tabla trae 13 filas en ACTIVO. **No es un defecto de código**: la
cabecera cuenta ACTIVO con saldo pendiente mayor que cero y sin cuota vencida, y
los 4 de diferencia son exactamente los 4 créditos fantasma de §P16. Es la
consecuencia visible de esas filas.

---

### P19 — Los 19 principios de UX/UI: qué se puede aplicar aquí, medido

Se pidió evaluar 19 conceptos de animación y UX, con la condición de que no
generen problemas de rendimiento «porque esto va a tener muchos clientes y
créditos» y es offline-first.

**Lo que hay hoy, medido:**

| qué | medición |
|---|---|
| librería de animación | **ninguna** (0 `framer-motion`; 33 dependencias en total) |
| transiciones a mano | **1.028** (`transition-all` 564, `transition-colors` 464, `transform` 58, `opacity` 22) |
| `prefers-reduced-motion` | **4** archivos, contra **34** que usan `motion-reduce` |
| virtualización de listas | **ninguna** (0 `react-window`, `react-virtual`, `useVirtualizer`) |
| peticiones de 1.000+ filas | 14 de `limit: 1000`, 10 de 500, 8 de 5.000, **5 de 10.000** |
| la peor pantalla al pintar | **ninguna pinta miles de filas.** Se comprobó: la auditoría usa `LIMITE = 5` por página y «Mostrando N de TOTAL»; los `limit: 1000+` son todos *traer para sumar*, no para pintar |

**`transition-all` NO es un problema: medido, no lo toques.** De 500 atributos
`className` con `transition-all`, **uno solo** tiene un `hover` que dispara
layout —`app/not-found.tsx:283`, la página 404—. Los otros 499 solo cambian
color, sombra, escala u opacidad, y ahí `transition-all` no cuesta nada.
Barrerlos para poner la propiedad concreta no cambiaría ningún resultado.

**El riesgo de rendimiento no es la animación: son las listas.** Sin
virtualización y con peticiones de 1.000 a 10.000 filas, el coste está en el DOM
que ya se pinta. Hoy no se nota porque la base de desarrollo tiene ~100
clientes; con los datos del cliente sí. *Límite de la medición:* no se midió el
tiempo de pintado real con miles de filas, solo el número de filas pedidas y
que no se recortan antes de pintar.

#### Los 19, en tres grupos

**A. Cuestan cero en ejecución y es donde está el valor** (son leyes de
información y de alcance, no movimiento):

| # | principio | por qué aquí, con el dato |
|---|---|---|
| 8 | **Ley de Fitts** | **El de más valor del lote.** Ya está medido como defecto: 430 botones por debajo de 44px, y «Pago» y «Abono» del cobrador a ~27px, **pegados y haciendo cosas distintas**. Es el pulgar del cobrador en la calle: un toque errado registra dinero en el sitio equivocado |
| 13 | **Von Restorff** | Hoy el sistema hace lo CONTRARIO: 8 colores distintos de botón primario y 60 sitios con el hex a mano teniendo el token. Si todo destaca, nada destaca |
| 6 | **Umbral de Doherty** (<400 ms) | Es lo que ha venido guiando §P5: el listado hacía 6 consultas por ruta. Ya hay números que sirven de base (login 0,2 s) |
| 10 | **Ley de Hick** | 140 `<select>` y el formulario de crear crédito; menos opciones visibles a la vez |
| 18 | **Frecuencia de uso** | El cobrador hace Pago/Abono todo el día: van donde llega el pulgar, no en un menú |
| 19 | **Regla del pico y el final** | El final de la jornada es el cierre, y hoy un reintento de arqueo produce un «conflicto» falso (§P15) |
| 2 | **Conciencia del origen** | Que un modal parezca salir de donde se pulsó. Es `transform-origin` + escala/opacidad: compositor puro, gratis |

**B. Son animación y son baratos SI tocan solo `transform` y `opacity`:**

- **9 slow in/slow out** y **14 timing**: son la curva y la duración. Gratis, y
  es lo que separa una transición tosca de una cuidada.
- **15 movimiento interrumpible**: las transiciones CSS **ya lo dan gratis**
  —interpolan desde el valor actual—. Lo que lo rompería es pasarse a
  keyframes en JS. Aquí la recomendación es *no* cambiar de herramienta.
- **7 anticipación**, **11 follow-through**, **16 acción secundaria**, **12
  arcos**: correctos, pero solo en una o dos interacciones protagonistas
  (registrar un pago). Repartidos por 112 pantallas son ruido.

**C. Riesgosos o inapropiados para este producto:**

- **3 staggering** — es el que choca con la medición: sin virtualización y con
  listas de 1.000 filas, un escalonado son 1.000 animaciones. **Solo sobre
  conjuntos acotados (≤12 elementos visibles), nunca en rutas, clientes,
  créditos o auditoría.**
- **5 rubber banding** — en web exige secuestrar el scroll; sobre una lista de
  1.000 filas en el teléfono del cobrador es la receta para perder cuadros. Lo
  nativo (`overscroll-behavior`) sí, el efecto imitado no.
- **4 squash and stretch** y **1 exageración** — baratos pero **inapropiados**:
  una cifra de dinero que rebota lee a juguete, y este producto necesita que la
  cifra parezca exacta. No es rendimiento, es confianza.
- **17 solid drawing** — es un principio de dibujo con volumen; en una interfaz
  solo se traduce a mantener la luz y las sombras coherentes, que es asunto de
  tokens y entra en Von Restorff.

#### El orden que sale de la medición

1. **Fitts** (430 botones, los de dinero primero) — es corrección de defectos,
   no decoración.
2. **Von Restorff** unificando el botón primario con el token que ya existe.
3. ~~`prefers-reduced-motion` global~~ **— ya estaba hecho.** `globals.css`
   tiene cuatro bloques `prefers-reduced-motion`; los «4 archivos» de la
   medición eran archivos, no cobertura: uno de ellos es el global.
4. ~~Curva y duración como variables CSS~~ **— ya estaba hecho.** Existen
   `--mov-rapido: 120ms`, `--mov-normal: 180ms` y
   `--mov-suave: cubic-bezier(0.2, 0, 0, 1)`, aplicadas globalmente a los
   botones, y las microinteracciones también (su comentario dice que de ~686
   botones solo 73 llevaban `active:scale`).
5. ~~Virtualizar las listas que piden 1.000+~~ **— medido, no hace falta y la
   recomendación estaba mal fundada.** Ninguna pantalla pinta miles de filas:
   la auditoría muestra 5 por página con su total, y todos los `limit: 1000+`
   son `getMovimientosLedger` / `obtenerPagos` para **sumar**, no para pintar.
   El riesgo de escala real está en §P20, y se arregla en el servidor.
6. Y entonces, si se quiere, 2/7/11/16 en la pantalla de registrar pago.

**Offline-first:** la animación no afecta a la sincronización, pero sí al primer
pintado, que en arranque frío ya carga la copia local. La regla es la misma que
rige los artefactos: la pantalla tiene que estar legible **en reposo**, sin
esperar a que nada entre.

---

### P20 — El riesgo de escala real: sumar en el navegador *(ABIERTO)*

Buscando qué virtualizar salió otra cosa, y es la que de verdad importa cuando
entren los datos del cliente.

**Qué pasa.** El reporte financiero y la pantalla contable **se bajan el libro
mayor al navegador para sumarlo**: `getMovimientosLedger({ ..., limit: 10000 })`.
No es para pintar filas —ninguna pantalla pinta miles— es para calcular totales
en el cliente.

**Medido contra `GET /accounting/ledger/movimientos`** con los 1.202 asientos que
hay hoy:

| `limit` | lo que baja el navegador |
|---|---|
| 100 | 108 KB |
| 1.000 | **516 KB** |
| 10.000 | 516 KB (topa en los asientos que existen) |

Unos **430 bytes por movimiento**. Y `app/admin/reportes/financieros/page.tsx`
dispara **hasta siete** de esas peticiones por carga (cuatro en paralelo en las
líneas 292-295, tres más en 426-428, además de la 175 y las 392-405).

**La proyección.** Con 50.000 líneas de asiento —un año de operación con miles de
créditos— esa sola pantalla bajaría del orden de **20 MB**, y en el móvil de
quien la abra. Hoy no se nota porque la base de desarrollo tiene 1.202 líneas,
39 clientes y 67 créditos.

**Lo que ya se hizo y por qué no basta.** Antes en esta sesión se arregló que el
reporte sumaba **solo los primeros 10.000** movimientos y mentía en silencio:
ahora `getTodosLosMovimientosLedger` pagina hasta agotarlos. Eso corrigió la
cifra, pero **empeora el volumen**: antes se cortaba en 10.000, ahora se los
trae todos.

**El arreglo correcto es del servidor, no del navegador:** un endpoint que
devuelva los agregados del período (por prefijo de cuenta y por tipo) en vez de
los movimientos. El patrón ya existe en el repo —`journalLine.aggregate` se usa
en el panel— y es la misma decisión que §P5: calcular donde están los datos.

*Límite de la medición:* la proyección es lineal sobre los bytes por movimiento
medidos; no se midió con 50.000 filas reales, ni el tiempo de parseo en un
teléfono.

---

### P21 — El gráfico mensual mostraba ingresos CERO los doce meses *(CERRADO)*

**Salió de preguntar si los reportes cuadran con el libro**, que es lo primero
que va a comprobar el cliente al importar.

`getMonthlyEvolution` —la evolución mensual del reporte financiero, que la
pantalla **sí** usa (`app/admin/reportes/financieros/page.tsx:170`)— filtraba
así:

```ts
NOT: { origenGestion: 'CIERRE_PENDIENTE' }
```

En SQL `NOT (columna = 'X')` vale **UNKNOWN** cuando la columna es NULL, y una
fila UNKNOWN no pasa el `WHERE`. Y `origenGestion` es nulo en el cobro normal de
la calle: **medido, 84 de 85 pagos**. Así que ese `NOT` dejaba fuera casi todos.

**Medido contra la API, antes y después:**

| mes | antes | después |
|---|---|---|
| may | 0 / 10.000 egresos | 521.666 |
| jun | 0 / 1.000 | 109.165 |
| ago | 0 / 45.000 | 4.490.000 |
| sept | 0 / 64.000 | 105.000 |
| oct | — | 27.500 |
| nov | — | **2.630.000** |
| **año** | **0** | **7.883.331** |

O sea que el dueño veía **ingresos cero todos los meses y solo egresos**: un
negocio que pierde dinero siempre. Y los 2.630.000 de noviembre coinciden con el
`recaudo` del panel, que sale del libro contable por otro camino — eso es lo que
confirma la cifra.

**La clase, barrida entera.** 25 usos de `NOT` sobre columna anulable en el
backend; 9 excluyen un valor concreto de `origenGestion`. **Los otros ocho ya
usaban la forma correcta** —`OR: [{ origenGestion: null }, { origenGestion: {
not: X } }]`—: alguien ya había aprendido esto y arregló siete sitios en
`payments`, `routes` (×3), `datos-visitas` y `users` (×2). Este se quedó atrás y
nada lo vigilaba. Los `{ not: null }` restantes están bien: Prisma los traduce a
`IS NOT NULL`.

**Medido además que las DOS formas pierden los NULL igual:** `NOT: { campo: X }`
y `campo: { not: X }` devuelven 0 donde deben devolver 84. No hay una segura.

Guardado por `src/reports/evolucion-mensual-no-pierde-pagos.spec.ts` (4
pruebas), que vigila las dos cosas: la evolución, y que **ningún** filtro de
`origenGestion` del backend se quede sin su alternativa — con **piso de 8** para
que el barrido no pase en verde por no encontrar nada. Comprobadas al revés: con
el `NOT` suelto caen 3 de 4, y quitando la guarda en `users.service` la
centinela nombra el archivo. Commit `2ef841b`.

**Y dos tropiezos propios que vale la pena no repetir:** la prueba acusaba
**siete sitios correctos** porque derivaba la raíz de `__dirname` (jest corre
desde la raíz del proyecto: ahora es explícita), y **se contaba a sí misma**
porque el comentario cita el `NOT` que prohíbe (ahora lee sin comentarios, como
`lib/testing/sin-comentarios.ts` en el frontend). Es la cuarta vez en la sesión
que un `
` de un script de Python entra como salto de línea real dentro de un
literal de expresión regular de TypeScript: se arregla construyendo el patrón
con `new RegExp('...')`.

**Lo que se midió y NO se tocó:** `reports/financial/summary` da `egresos: 0` y
`margen: 100` porque suma pagos (cobranza, que incluye el capital que vuelve)
contra gastos operativos aprobados, y en noviembre hay 12 transacciones EGRESO
por 5.000.000 que no entran. Es una cifra falsa, pero **ninguna pantalla llama a
ese endpoint** —solo `e2e/caos-dinero`—; la pantalla usa `getResumenFinanciero`
del módulo contable, que sí tiene `utilidadOperativa`, `utilidadReal` y
`gananciaNeta`. Si alguien lo cablea algún día, hay que rehacer la fórmula
primero.

---

### P22 — El gráfico mensual contaba los meses en UTC, no en Bogotá *(cerrado)*

**Es el mismo método que §P21 y sale del mismo sitio.** Una vez que la evolución
mensual ya devuelve cifras, la pregunta siguiente es si están en el mes
correcto.

`reports.service.ts:108-109` arma la ventana del año con `new Date(year, 0, 1)`
y `new Date(year, 11, 31, 23, 59, 59)`, y reparte por mes con
`p.fechaPago.getMonth()`. Las tres cosas leen la zona horaria **del proceso**.

**Por qué no se ve aquí y sí en producción.** Medido: esta máquina corre en
**UTC-5**, o sea hora de Bogotá, así que localmente el cálculo es correcto y
**ningún pago cambia de mes**. El servidor de Render corre en **UTC**. Forzando
`TZ=UTC` sobre el mismo código:

| | esta máquina (UTC-5) | el servidor (UTC) |
|---|---|---|
| inicio del año | `2026-01-01T05:00Z` = 1 ene 00:00 Bogotá ✔ | `2026-01-01T00:00Z` = **31 dic 19:00 Bogotá** |
| fin del año | `2027-01-01T04:59Z` ✔ | `2026-12-31T23:59Z` = **31 dic 18:59 Bogotá** |
| un pago del 30 nov 23:30 Bogotá | `getMonth() = 10` (nov) ✔ | `getMonth() = 11` (**DICIEMBRE**) |

**El tamaño del problema, medido.** De 85 pagos, **32 (38 %) ocurren entre las
19:00 y medianoche** de Bogotá — en esta operación el cobro de la tarde es la
norma, no la excepción. Solo se desplazan si también es el último día del mes. *Lo que hoy no
ocurre:* ninguno de ellos cae el último día de un mes, así que la cifra actual
no está mal; el defecto espera el primer cierre de mes con cobro nocturno.

**El arreglo.** Los ayudantes ya existen y el resto del backend los usa:
`getBogotaDayKey`, `getBogotaStartEndOfDayFromKey`, `formatBogotaOffsetIso`
(`src/utils/date-utils.ts`). Es la regla de §3 del dominio —todo en hora de
Bogotá— y estos tres `new Date(year, ...)` son **los únicos** del backend que la
rompen: el barrido de `new Date(year,` no encontró ningún otro.

Seguimiento de P22 (antes de corregir): con `TZ=UTC`, el instante
`2027-01-01T04:59:59.999Z` da año 2027 en el proceso y 2026 en Bogotá.
Además del servicio mensual, el controlador elige el año y el mes inicial
con el reloj local. La exportación usa el año local de su fecha inicial.
La pantalla financiera solicita la evolución pero no lee su respuesta:
agrupa ingresos, cobros y egresos del libro por el mes local del dispositivo.
Por eso arreglar solo la API no arregla la gráfica que ve el usuario.

**Verificado:** se corrigieron el servicio, los consumidores del año y los
rangos de la pantalla. Se eliminó la petición mensual sin consumidor. El lote
de reportes pasó con `TZ=UTC` (17 pruebas) y el de `rutas-core` con
`TZ=Asia/Tokyo` (48). La regresión prueba tanto pagos como gastos a cada lado
de medianoche y genera un Excel para el último instante del año operativo.
No se cambió ningún asiento ni se recalculó la base.

---

### P23 — Lo que se barrió en esta tanda y salió limpio

- **`notIn` sobre columna anulable: 0 usos.** Tiene la misma trampa de tres
  valores que §P21 (`NOT (col IN (...))` es UNKNOWN con NULL), así que se buscó;
  no hay ninguno.
- **`in: <variable>`: 81 usos, NO barridos, y el motivo.** El riesgo sería un
  arreglo vacío, pero en Prisma `{ in: [] }` **no casa nada**, que es el lado
  seguro: devuelve vacío en vez de todo. Revisar los 81 para confirmar que cada
  variable puede o no estar vacía es mucho trabajo para un fallo que, si ocurre,
  se ve como «no hay datos» y no como una cifra falsa. Queda anotado por si
  alguien busca el origen de un listado vacío.
- **Los pagos no tienen duplicados** y **el resumen contable «de hoy» en ceros
  es correcto**: ver §P16.

---

### P24 — La importación metía cada cuota en mora el día que toca pagarla *(CERRADO, `8cceef4`)*

**El hallazgo más importante de esta tanda, y toca justo lo que viene: la
importación de los datos del cliente.**

**Dos convenciones conviviendo.** Medido sobre las 1.629 cuotas de la base:

| hora UTC del vencimiento | cuotas | en Bogotá es… |
|---|---|---|
| 17:00 | 1.541 | **mediodía del mismo día** ✔ |
| 00:00 | **88** | **19:00 del día ANTERIOR** |

Las 88 son de 7 créditos, y **4 de ellos vienen de la importación**
(`IMP-…`, con `loteImportacionId`).

**La consecuencia, comprobada fila por fila** (¿se lee ya vencida contra el
inicio de su propio día en Bogotá?):

```
IMP-1032435189-1 | día UTC 2026-08-07 | día Bogotá 2026-08-06 | vencida su propio día: TRUE
IMP-1032435189-1 | día UTC 2026-08-14 | día Bogotá 2026-08-13 | vencida su propio día: TRUE
… las 88, todas TRUE
cuotas a 17:00 UTC                                            | vencida su propio día: FALSE
```

O sea: **una cuota importada está en mora el día en que toca pagarla.** Eso mueve
la mora, la meta del día y el semáforo del cliente, y pone al cobrador a
perseguir a alguien que no está atrasado. Con la cartera real del cliente serían
todas sus cuotas, no 88.

**La causa**, en `importaciones.service.ts:2121`:

```ts
const fechaVencimiento = new Date(cred.fechaPrimerCobro || fechaCredito);
```

Un `"2026-08-07"` del Excel se interpreta como **medianoche UTC**. La app no lo
hace así: la convención del repo es `T12:00:00-05:00` —mediodía de Bogotá, 17:00
UTC— y está en `loans.service.ts` (cinco sitios) y `mora.service.ts:80`. La
importación se quedó fuera.

**Arreglado** (`8cceef4`): se anclan las **tres** ramas de `leerFecha` —texto,
`Date` que ya viene de Excel y serial de Excel— a mediodía de Bogotá. A esa hora
el día UTC coincide con el de Bogotá, así que **todo lo que ya leía estas fechas
con `getUTCDate()` o `toISOString().slice(0,10)` sigue viendo el mismo día**: es
la dirección segura del arreglo, y hay una prueba que lo fija.

7 pruebas nuevas en `cell-value.fecha.spec.ts`, **comprobadas al revés en las dos
zonas** (local y UTC): con la medianoche de vuelta caen 6 de 13. Las 6 que ya
existían pasaban igual antes y después, así que no fijaban nada de esto — por eso
el defecto llevaba ahí tanto tiempo.

**Lo que queda por decidir, y no es código:** las 88 cuotas que ya están en la
base. Son datos de desarrollo, así que probablemente no haya que migrarlas; **si
el cliente ya importó algo antes de este arreglo, sí hay que migrarlas**, porque
el arreglo no toca lo ya escrito.

---

### P23b — Lo demás del reloj local: medido y descartado

El barrido completo dio **174 lecturas del reloj local** (31 backend, 143
frontend), 14 constructores locales y 135 `toLocale*` sin `timeZone`. **No se
barren**, y el motivo de cada grupo:

- `setDate(d.getDate() + n)` **es seguro**: sumar días a un instante da el mismo
  instante más 24 h en cualquier zona, y Colombia no tiene horario de verano.
  Eso es la mayoría del backend.
- Las que construyen una clave de día parten de un instante **ya anclado**
  —`dayStartBogota` (05:00Z) o `T12:00:00-05:00`— y a esas horas el día UTC
  coincide con el de Bogotá. Comprobado uno a uno en `dashboard.service.ts` y en
  el contador de días hábiles de `reports.service.ts:283-286`, que además lleva
  el motivo escrito en el código.
- Los `toLocale*` sin `timeZone` son de **formato**: desplazan como mucho una
  etiqueta, y el usuario real está en Colombia.

Lo que sí había eran los tres sitios de `reports.service.ts` (§P22, cerrado),
`lib/rutas-core.ts` en el frontend (cerrado) y §P24.

---

### P25 — §P20 investigado a fondo: el arreglo es seguro, y por qué

Antes de construir nada se comprobó lo único que podía hacerlo peligroso: **si
la fórmula de la pantalla y la del backend dan el mismo número.** Si no
coincidieran, cambiar la pantalla movería una cifra sin saber cuál es la buena.

**Lo que hace la pantalla hoy.** Baja hasta 10.000 movimientos del libro para
producir **21 números** (7 días × 3 series), agrupándolos por día de Bogotá. Las
llamadas del período (`limit: 10000`) hacen lo mismo sobre un mes o un año.

**Coinciden, y no por casualidad.** Medido para el 17 de noviembre:

| serie | fórmula de la pantalla | `accounting/resumen` |
|---|---|---|
| ingresos | 462.000 | 462.000 |
| cobros | 2.630.000 | 2.630.000 |
| egresos | 0 | 0 |

Y coinciden **por construcción**, que es lo que importa: el `where` del backend
que alimenta `cobranzaHoy` es `ledgerCobranzaNoRegularizadaWhere` —cuentas
`1.1`/`1.2`, débito > 0, `referenceType: 'PAGO'` y **excluyendo los pagos
regularizados**—, que es exactamente la regla del gráfico (solo PAGO, sin
CIERRE_PENDIENTE).

**Una alarma que resultó ser mía, y queda escrita para que nadie la repita.**
Primero comparé contra `ledgerCashIncomeWhere` (PAGO + INGRESO +
VENTA_ARTICULO) y salió una diferencia de **22 veces** en el año —174.846.664
contra 7.946.664—; parecía que el panel contaba las ventas de artículo como
cobranza. Era falso: ese constructor alimenta **`entradasCajaHoy`**, que está
bien llamado, no `cobranzaHoy`. El error fue contar la posición en un
`Promise.all` de 25 agregados en vez de mapear cada campo con su `where`. **Si
hay que atribuir un número a una consulta en ese método, hay que mapearlo, no
contarlo.**

**El coste, medido, y lo que cambia el diseño:**

| | hoy | cómo escala |
|---|---|---|
| `accounting/resumen` (1 día) | 1.262 B, 0,13 s | **constante** |
| bajarse el libro de 7 días | 32.441 B, 0,055 s | **lineal**: ~430 B por movimiento |

O sea que **para el gráfico de 7 días el cambio es marginal hoy** y hasta algo
más lento. El problema está en las llamadas del **período**, cuyo tamaño no
tiene tope: con 50.000 asientos, ~20 MB.

**Lo que falta construir**, y es el trabajo de §P20: una variante **por día** de
esas tres cifras sobre un rango, con los mismos `where` que ya usa el resumen.
No hay que inventar reglas: hay que agrupar por día de Bogotá lo que ya está
escrito. Y conviene que la prueba compare el total del nuevo endpoint contra el
`resumen` del mismo rango: eso ata las dos implementaciones y evita que
divergan.

**Un detalle latente, anotado y sin tocar:** el «ingreso operativo» de la
pantalla suma las líneas `3.1` y `3.2`, y el del backend es `3.` excluyendo
`3.3` y `3.4`. Los prefijos que existen en la base son **`3.1`, `3.3` y `3.4`**
—no hay `3.2`—, así que ambos dan hoy lo mismo: solo `3.1`. El día que aparezca
una cuenta `3.2` o `3.5`, divergirán.

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

### `TZ=x npx jest` NO cambia la zona horaria en este equipo

**La más peligrosa de todas, porque no falla: pasa en verde.** Desde Git Bash en
Windows, el prefijo `TZ=Asia/Tokyo npx jest` **no llega a jest**. Medido con una
sonda de tres líneas dentro de una prueba:

```
TZ= undefined    offset= 300     <- UTC-5, la zona del equipo
```

O sea que toda corrida «en Tokio» o «en UTC» hecha así se ejecutó en hora de
Bogotá y **no comprobó nada**. Nos engañó a los dos: un relevo reportó «48
pruebas del frontend con la zona de Tokio» y «17 del backend en UTC», y yo
intenté comprobar un arreglo de zona metiendo el defecto a mano y las pruebas
siguieron pasando — concluí que la prueba era débil, y lo que fallaba era mi
forma de invocarla.

**La forma que sí funciona, desde PowerShell:**

```powershell
$env:TZ = 'Asia/Tokyo'   # o 'UTC', que es la de Render
npx jest __tests__/lib/rutas-core.test.ts
$env:TZ = $null
```

Comprobado: con eso la sonda dice `TZ= Asia/Tokyo  offset= -540`, y las dos
comprobaciones al revés de los arreglos de zona **sí fallan** con el defecto
puesto:

- frontend, en Tokio: cae `inicia MENSUAL en Bogotá aunque el dispositivo ya
  esté en enero`;
- backend, en UTC: cae `cuenta noviembre y diciembre y consulta los límites
  colombianos completos`.

**Regla:** cualquier prueba de zona horaria se corre con `$env:TZ` desde
PowerShell, y antes de creerse el verde se mete el defecto a mano. Si pasa igual,
lo primero que hay que dudar es si la zona llegó.



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

**El orden está en §0, al principio del documento.** Esta sección solo añade lo
que conviene hacer *antes de tocar código*, cada vez.

Para el detalle de los dos primeros puntos de §0: §P3 (timeout intermitente) y
§P16 (los 4 créditos fantasma). Luego P5, P8 y lo del dueño —lo offline contra
una build (§10.3) y las capturas (§10.2)—.

Dos cosas que conviene hacer **antes** de tocar código, cada vez:

- Levantar los dos servidores y contrastar las cifras de la pantalla que vas a
  tocar contra la API (§2.1). Es como salieron casi todos estos defectos.
- Correr la zona de pruebas que cubre lo que vas a cambiar, para saber de qué
  verde partías.
