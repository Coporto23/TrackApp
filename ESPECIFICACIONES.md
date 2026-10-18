# TrackApp — Especificaciones Técnicas

> Especificación **vigente** del sistema. Se actualiza cada vez que cambia algo técnico (modelo de datos, componentes, convenciones, estilos). Las reglas de trabajo y restricciones están en `CLAUDE.md`; el historial de avance y decisiones, en `bitacora.md`.

---

## 1. Stack y Versiones

| Capa | Tecnología | Versión | Notas |
|---|---|---|---|
| Framework | Next.js (App Router, TypeScript, `src/`, alias `@/*`, Turbopack) | 16.4.2 | `cacheComponents: true`, `partialPrefetching: true`, `devIndicators.position: "top-right"`. `middleware` se llama `proxy.ts` y corre en Node.js. |
| UI | React | 19.3.0 | `useActionState`, `useFormStatus`, `<dialog>` nativo. |
| Estilos | Tailwind CSS (+ `@tailwindcss/turbopack`) | 4.x | Tema en `src/app/globals.css` con `@theme`. Clases propias usadas en `@apply` se declaran con `@utility`. |
| BD | PostgreSQL | 16 (alpine) | Dev: contenedor Docker `trackapp-db-dev`. |
| ORM | Prisma (`prisma`, `@prisma/client`, `@prisma/adapter-pg`, `pg`) | 7.10.1 (fijada) | Generador `prisma-client` → `src/generated/prisma` (ignorado en git; se regenera en `postinstall`). Driver adapter `pg`. Config en `prisma7.config.ts`. |
| Auth | Auth.js (`next-auth`) | 5.0.0-beta.32 (fijada) | Sesión JWT, provider Credentials. |
| Hash | `@node-rs/argon2` | 2.2.2 | Argon2id, parámetros OWASP: 19 MiB, t=2, p=1. |
| Validación | Zod | 4.6.7 | Esquemas en `src/lib/validation/`. |
| Drag & drop | `@dnd-kit/core` / `sortable` / `modifiers` / `utilities` | 6.3.1 / 10.0.0 / 9.0.0 / 3.2.2 (fijadas) | Reordenar ejercicios (puntero + teclado). |
| Dev | `tsx`, `dotenv`, ESLint 9 (`eslint-config-next`) | — | `tsx` ejecuta el seed. |
| PWA | next-pwa o solución nativa | — | Pendiente (paso 13). |
| Infra | Docker Compose + Nginx/Traefik (Hetzner), Cloudflare | — | Pendiente (Fase 6). |

---

## 2. Arquitectura

### 2.1 Estructura de carpetas
```
prisma/
  schema.prisma              Modelo de datos
  migrations/                init · routine_exercise_unique · session_exercises · set_level_text
  seed.ts                    `npx prisma db seed`: ejercicios base a usuarios sin ejercicios
prisma7.config.ts            Config de Prisma 7 (schema, migraciones, seed, DATABASE_URL)
docker-compose.yml           PostgreSQL 16 de desarrollo
src/
  proxy.ts                   Chequeo optimista del JWT en cada request
  auth.config.ts             Config Auth.js compartida (sin Prisma/argon2): páginas, callbacks
  auth.ts                    Auth.js completo: provider Credentials (Prisma + argon2)
  actions/                   Server Actions ("use server")
    auth.ts                  login, register, logout
    exercises.ts             createExercise (devuelve el creado), renameExercise, archiveExercise, restoreExercise
    routines.ts              createRoutine (devuelve la creada), renameRoutine, deleteRoutine,
                             addRoutineExercises, removeRoutineExercise, reorderRoutineExercises
    sessions.ts              createSession, deleteSession, addSessionExercises, removeSessionExercise,
                             reorderSessionExercises, saveSessionToRoutine
    sets.ts                  addSet, updateSet, deleteSet
  app/
    layout.tsx               Raíz: fuentes, metadata, viewport, LowPolyBackdrop
    globals.css              Tema (paleta, fuentes), utilidades facet, .field, .btn-*
    (auth)/                  Rutas públicas (layout centrado + emblema): login/, registro/
    (app)/                   Rutas autenticadas con BottomNav
      page.tsx               Inicio: "Entrenar hoy" + accesos a Ejercicios y Rutinas
      ejercicios/            Listado + modal crear/renombrar, archivar/restaurar
      rutinas/               Listado + modal de nombre
        [id]/                Detalle: lista ordenable, selector de ejercicios, eliminar
      calendario/            Semana vertical, tarjetas por día, detalle del día, registro de series
      dashboard/             Placeholder ("Sendero sellado") hasta el paso 12
      perfil/                Datos de la cuenta + cerrar sesión
    api/auth/[...nextauth]/  Handlers de Auth.js
    salir/route.ts           Cierra sesiones huérfanas (usuario borrado) sin bucle de redirección
  components/                UI reutilizable (ver sección 6)
  lib/
    prisma.ts                Cliente Prisma singleton (adapter pg; cacheado en globalThis en dev)
    dal.ts                   Data Access Layer: getCurrentUser()
    users.ts                 createUserWithDefaults(): único punto de creación de usuarios
    password.ts              hashPassword / verifyPassword (Argon2id)
    seed-user-exercises.ts   seedUserExercises(db, userId), idempotente, acepta transacción
    default-exercises.ts     Los 26 ejercicios semilla
    constants.ts             Compartidas cliente/servidor: FREE_SESSION_TITLE, WEIGHT_UNITS, WEIGHT_UNIT_LABELS
    dates.ts                 Fechas "YYYY-MM-DD" con aritmética UTC y formatos es-CL
    data/                    Lecturas (server-only): exercises.ts, routines.ts, sessions.ts
    validation/              Zod: auth.ts, common.ts (nameSchema, idSchema), set.ts
  generated/prisma/          Cliente generado (NO editar, NO versionar)
```

### 2.2 Autenticación y autorización (tres capas)
1. **Proxy** (`src/proxy.ts` + callback `authorized` en `auth.config.ts`): solo lee el JWT de la cookie, sin BD. Sin sesión → `/login?callbackUrl=…`; con sesión en `/login` o `/registro` → `/`; `/salir` siempre permitido. Debe tener un `export default` (Next 16 detecta la función estáticamente; no sirve un export desestructurado).
2. **DAL** (`getCurrentUser()`): verificación real. Lee la sesión y busca el usuario en la BD. Sin sesión → `/login`; usuario inexistente → `/salir`. Devuelve `{ id, email, createdAt }`.
3. **Server Actions y lecturas**: llaman a `getCurrentUser()` y filtran por `userId` en la consulta (`updateMany({ where: { id, userId } })`, `findFirst({ where: { id, session: { userId } } })`), de modo que un id ajeno no afecta nada.

### 2.3 Patrones con Cache Components (Next 16)
- La sesión, `params`, `searchParams` y `usePathname()` son datos de runtime: se leen **dentro de `<Suspense>`**. Patrón: la página renderiza el encabezado estático y un componente async interno dentro de `<Suspense fallback=…>`; las promesas `params`/`searchParams` se pasan a ese componente y se resuelven ahí.
- `BottomNav` lee el pathname dentro de su propio `<Suspense>` (fallback: barra sin pestaña activa).
- No se usa `'use cache'` (datos dinámicos por usuario). Tras una mutación, la acción llama a **`refresh()`** (`next/cache`). Si en el futuro se cachea con `'use cache'` + `cacheTag`, usar `updateTag` y no poner datos sensibles en claves/tags.
- "Hoy" solo se conoce en el navegador: se obtiene con `useSyncExternalStore(…, localToday, () => null)` (en el servidor es `null`).

### 2.4 Convención para una funcionalidad nueva
1. Esquema Zod en `src/lib/validation/`.
2. Lecturas en `src/lib/data/<entidad>.ts` (`import "server-only"`, empiezan con `getCurrentUser()`, devuelven objetos planos serializables; `Decimal` → string).
3. Mutaciones en `src/actions/<entidad>.ts`: validar → `getCurrentUser()` → consulta filtrada por usuario → `refresh()`. Formularios con feedback: firma `(prevState, formData)` y tipo `XFormState` (`error`, `fieldErrors`, `ok`, valores para no perder lo escrito). Capturar `P2002` (único) como mensaje amigable. Acciones invocadas con argumentos (no `FormData`) validan la forma de los argumentos.
4. UI en `src/app/(app)/<ruta>/`: `page.tsx` (Server Component + Suspense) y componentes cliente con `useActionState`, siguiendo las convenciones de UX (sección 7).

### 2.5 Fechas
- Las fechas de calendario viajan como texto **`YYYY-MM-DD`** y se guardan como `@db.Date` (medianoche UTC). Toda la aritmética (`addDays`, `startOfWeek`, `weekDays`) se hace en UTC para que un día nunca se corra por la zona horaria.
- Semana de **lunes a domingo**. Formatos en `es-CL` (`formatLongDate`, `formatWeekRange`, `formatShortDate`).

---

## 3. Modelo de Datos (`prisma/schema.prisma`)

Todas las entidades usan id `cuid()`; las principales tienen `createdAt`.

| Entidad | Campos | Restricciones / relaciones |
|---|---|---|
| **User** | id, email, password (hash Argon2id), createdAt | email único |
| **Exercise** | id, name, userId, archivedAt?, createdAt | único (userId, name); cascada al borrar el User |
| **Routine** | id, name, userId, createdAt | único (userId, name); cascada al borrar el User |
| **RoutineExercise** | id, routineId, exerciseId, order | único (routineId, exerciseId); índice (routineId, order); cascada con su Routine o Exercise |
| **WorkoutSession** | id, userId, date (`@db.Date`), originRoutineId?, createdAt | **único (userId, date)**: un entrenamiento por día; originRoutineId null = libre (o rutina eliminada, `SetNull`) |
| **SessionExercise** | id, sessionId, exerciseId, order | único (sessionId, exerciseId); índice (sessionId, order); cascada con su sesión o ejercicio. Ejercicios del día, copiados de la rutina al asignarla |
| **Set** | id, sessionId, exerciseId, setNumber, reps, weight? (`Decimal(6,2)`), level? (`VarChar(10)`), weightUnit (enum `kg`/`lbs`/`level`, def. `kg`), createdAt | cascada con su sesión; **Set → Exercise `NoAction`** |

**Carga de una serie**: con `kg`/`lbs` se usa `weight` (numérico) y `level` es null; con `level` se usa `level` (texto corto: "5", "B", "A2") y `weight` es null. Los niveles con letras no son graficables como carga.

**Integridad y borrado**
- Borrar un User borra en cascada sus ejercicios, rutinas y sesiones.
- Un ejercicio con series **no se puede borrar** físicamente (solo archivar).
- Por lo anterior, un User con series no se puede borrar directo: si se implementa "eliminar cuenta", en una transacción borrar primero sus `WorkoutSession` y luego el `User`.
- `Set` y `SessionExercise` no tienen userId: la pertenencia se valida vía la sesión.
- El `order` puede tener huecos: ordenar siempre por `order` asc.

---

## 4. Reglas de Negocio Implementadas

### 4.1 Cuentas
- Registro: email (trim + minúsculas, formato válido) + contraseña (8–128) + confirmación. Email duplicado → error en el campo. **Auto-login** tras registrarse. Sin verificación de email.
- `createUserWithDefaults()` crea el User y sus **26 ejercicios semilla** en una sola transacción.

### 4.2 Ejercicios
- Nombre: trim + espacios colapsados, 1–60 caracteres, **único por usuario sin distinguir mayúsculas** (BD `@@unique` + comparación `mode: "insensitive"`).
- "Eliminar" = **archivar** (`archivedAt`); los archivados se listan aparte y se restauran. Si se crea un nombre igual a uno archivado, se ofrece **restaurarlo**.
- Sin grupo muscular (lista alfabética con buscador).

### 4.3 Rutinas
- Nombre con las mismas reglas que los ejercicios.
- Un ejercicio **una sola vez por rutina**. Los archivados se ocultan de la rutina (el vínculo se conserva).
- Crear una rutina **no navega**: aparece en el listado. Eliminar pide confirmación; las sesiones ya creadas se conservan.

### 4.4 Calendario y sesiones
- Un entrenamiento por día (cualquier día, incluidos futuros). Al asignar una rutina se **copian sus ejercicios activos** al día (`SessionExercise`); también hay **entrenamiento libre**.
- Los cambios del día (agregar, quitar, reordenar) **no alteran la rutina**. Si el día difiere de su rutina, se ofrece "Actualizar plantilla «…» con este día…" (enlace secundario + confirmación). Reemplaza los ejercicios de la rutina por los del día; los archivados ocultos de la rutina se conservan al final. Solo afecta a los días que se asignen desde ese momento.
- Un ejercicio con series **no se puede quitar del día** (✕ deshabilitado con el motivo). Eliminar el día borra sus series y pide confirmación indicando cuántas.

### 4.5 Series
- Reps: entero 1–999 (solo dígitos).
- Carga con kg/lbs: número ≥ 0, máx. 9999,99 con hasta 2 decimales; acepta coma o punto. Con nivel: 1–10 caracteres, letras/números (y espacio `. + -`), debe empezar con letra o número.
- `setNumber` es correlativo por ejercicio y sesión; al borrar una serie se renumeran las siguientes.
- Tras agregar una serie el formulario queda **vacío**; solo se recuerda la **unidad** (la de la última serie del día, o de la vez anterior).
- "Última vez": por ejercicio, se muestran las series de la sesión anterior más reciente (por fecha) en que tuvo series.

---

## 5. Pantallas y Flujos

| Ruta | Contenido |
|---|---|
| `/login`, `/registro` | Formularios en un `Panel` bajo el emblema y el título "TRACKAPP". Errores por campo. |
| `/` (Inicio) | Tarjeta destacada **"Entrenar hoy"** → `/calendario` (hoy). Tarjetas **Ejercicios** y **Rutinas** con contador. |
| `/ejercicios` | Listado activo (alfabético, buscador sin tildes) con "+" → modal "Nuevo ejercicio"; lápiz → modal "Renombrar ejercicio"; cofre → archivar; sección plegable "Archivados" con restaurar. |
| `/rutinas` | Listado con nombre y nº de ejercicios; "+" → modal "Nueva rutina". |
| `/rutinas/[id]` | Título, renombrar (modal), eliminar (confirmación). Lista ordenable (manija ⠿ o teclado), ✕ para quitar, "+" → selector multi-selección con buscador y **"Crear ejercicio nuevo"** dentro del modal. |
| `/calendario?d=YYYY-MM-DD` | Ver 5.1. Sin `d` (o fecha inválida) redirige a hoy según el navegador. |
| `/dashboard` | Placeholder hasta el paso 12. |
| `/perfil` | Email, "Miembro desde", cerrar sesión. |

### 5.1 Calendario
- **Cabecera**: ‹ rango de la semana › ("12 – 18 oct 2026") e "Ir a hoy" si la semana no contiene hoy. También se cambia de semana **deslizando** horizontalmente (dedo o mouse); el gesto no se inicia sobre la manija de reordenar, campos ni modales.
- **Semana vertical** (lunes a domingo): cada fila muestra el día (abreviatura + número; hoy en ember) y a la derecha:
  - Día vacío: botón punteado **"+ Asignar"** → modal "Asignar · {fecha}" con "Entrenamiento libre", las rutinas y **"Crear rutina nueva"** (vista dentro del mismo modal; vuelve con la nueva seleccionada). Al asignar, ese día queda seleccionado y desplegado.
  - Día con entrenamiento: **tarjeta tipo evento** (borde ember) con el título y "N ejercicios · M series". Tocarla selecciona el día (`?d=`) y la despliega.
- **Tarjeta desplegada** (día seleccionado): título, eliminar, "Ejercicios · N" con "+" (selector con "crear nuevo"), lista ordenable. **Tocar un ejercicio despliega su registro de series**:
  - "Última vez (17 oct): 82,5×8 · 82,5×6 kg".
  - Series registradas ("1 · 8 reps × 82,5 kg"); tocar una la abre para editar o eliminar.
  - Formulario "Serie N": Reps · Peso/Nivel · Unidad (`<select>` kg/lbs/nivel) · "+".
  - Al pie, si difiere de la rutina: enlace discreto "Actualizar plantilla «…» con este día…".

---

## 6. Componentes Reutilizables (`src/components/`)

| Componente | Uso |
|---|---|
| `Panel` | Tarjeta biselada con borde (capa exterior color borde + interior fondo, ambas con `facet`). |
| `PageHeader` | Título dorado (Cinzel) + subtítulo + separador con rombo ember. |
| `FormField` | Label + input `.field` + error accesible (`aria-invalid`, `aria-describedby`). |
| `Modal` | Sobre `<dialog>` nativo (`showModal`): foco atrapado, Esc, clic fuera. Se monta solo mientras está abierto. |
| `IconButton` | Botón de 44px solo con icono (`aria-label` + `title`); se deshabilita mientras su formulario se envía o con `disabled`. Tonos `default`/`ember`/`danger`. |
| `BackLink` | Enlace "‹ Volver" en mayúsculas pequeñas. |
| `BottomNav` | Barra inferior fija (Inicio, Calendario, Dashboard, Perfil), pestaña activa con rombo luminoso. Ejercicios/Rutinas cuentan como Inicio. |
| `ComingSoon` | Placeholder "Sendero sellado" para secciones futuras. |
| `LowPolyBackdrop` | Fondo fijo: malla de triángulos determinista + resplandor de brasa inferior + viñeta. |
| `SortableExerciseList` | Lista ordenable genérica (dnd-kit): manija, posición, nombre/nota, ✕ (con `removeBlockedReason` opcional) y **detalle desplegable** opcional (`renderDetail`). El orden es estado local optimista; los datos de cada fila vienen de las props. |
| `ExercisePickerDialog` | Selector multi-selección con buscador y vista "Crear ejercicio nuevo"; recibe la acción (`addAction`) y los campos ocultos del destino (`{ routineId }` o `{ sessionId }`). |
| `icons.tsx` | Iconos facetados propios: hoguera, calendario, gráfico, yelmo, emblema, +, editar, archivar, restaurar, buscar, atrás, check, cerrar, papelera, manija, chevron. |

Componentes de pantalla relevantes: `calendario/week-view.tsx` (semana + gestos), `session-details.tsx` (tarjeta desplegada), `set-logger.tsx` (registro de series), `assign-routine-dialog.tsx`, `delete-session-dialog.tsx`, `update-template-dialog.tsx`.

---

## 7. Sistema de Diseño

### 7.1 Estilo
**Grimdark low-poly** inspirado en Dark Souls / RPG: piedra y ceniza, una sola fuente de luz (la brasa de una hoguera), formas facetadas. Sobrio y legible, sin efectos chocantes. **Solo tema oscuro** (`color-scheme: dark`).

### 7.2 Paleta (`@theme` en `globals.css`)
| Token | Hex | Uso |
|---|---|---|
| `abyss` | #0b0a09 | Fondo de la app |
| `ash` | #14120f | Superficies hundidas (inputs, tarjetas internas) |
| `stone` | #1c1915 | Superficies (paneles) |
| `stone-edge` | #2f2a23 | Bordes y divisores |
| `bone` | #e6ddcc | Texto principal |
| `fog` | #968c7e | Texto secundario |
| `ember` / `ember-bright` / `ember-deep` | #d9782b / #f2a55a / #7a3510 | **Acento único** (acciones, selección, hoy) |
| `gold` | #c8a35e | Títulos y números destacados |
| `blood` | #c25247 | Errores y acciones destructivas |

### 7.3 Tipografía
- **Cinzel** (`font-display`): títulos, etiquetas y botones, en mayúsculas con tracking amplio (0.1–0.2em).
- **Alegreya Sans** (`font-sans`): texto (400/500/700).
- Cargadas con `next/font/google`.

### 7.4 Formas y clases
- `facet` / `facet-sm` (`@utility`): esquinas biseladas por `clip-path` (10px / 6px).
- `.field`: input rectangular `bg-ash`, borde `stone-edge`, foco ember (borde + línea inferior); `aria-invalid` → borde blood.
- `.btn-ember` (principal, gradiente brasa, texto oscuro), `.btn-ghost` (secundario/cancelar), `.btn-danger` (destructivo).
- Checkbox/radio temático: rombo (cuadrado rotado 45°) con relleno ember al marcar.
- Tarjeta de evento del calendario: `facet` + borde izquierdo ember de 2px sobre `ash`.

### 7.5 Iconografía y textos
- Iconos de trazo recto con uniones en ángulo (low-poly), 24×24, `currentColor`.
- Textos en español con un toque temático leve ("Sendero sellado", "Avivando las brasas…", "Tu arsenal personal") sin sacrificar claridad. Lenguaje neutro en género ("Saludos").

---

## 8. Convenciones de UX (confirmadas por el usuario)

- **Pantallas de gestión: el listado es protagonista.** "+" en la cabecera; **crear y editar en modal con Cancelar / Aceptar** (no inputs sueltos en la página). En error el modal sigue abierto, muestra el mensaje y conserva lo escrito.
- **Crear no navega**: el modal se cierra y el elemento aparece en su listado.
- **Dentro de un modal de selección se puede crear lo que falta** (vista "crear" en el mismo modal, precargada con lo buscado; al aceptar vuelve con lo nuevo seleccionado).
- **Acciones reversibles** (archivar, quitar de una rutina/día): un toque, sin confirmación. **Irreversibles** (eliminar rutina, eliminar día): modal de confirmación con `.btn-danger`.
- **Opciones secundarias** (p. ej. actualizar la plantilla) se muestran como **enlace discreto**, nunca como botón principal.
- **Calendario estilo agenda**: semana completa en vertical, cada entrenamiento como tarjeta dentro de su día; el detalle se despliega en la misma fila.
- **Registro de series dentro de cada ejercicio** (despliegue), no en una pantalla o botón aparte. Formulario vacío tras cada serie.
- **Entradas filtradas**: reps solo dígitos; peso solo números con un decimal; nivel acepta texto corto.
- Reordenar: arrastrar desde la manija ⠿ (solo la manija tiene `touch-action: none`) o con teclado (espacio + flechas).
- Buscadores ignoran tildes y mayúsculas; orden alfabético con `Intl.Collator("es")`.
- Objetivos táctiles ≥ 44px; navegación inferior fija con `env(safe-area-inset-bottom)`.

---

## 9. Gotchas Conocidos

- **Modal y Strict Mode**: no llamar `dialog.close()` en el cleanup del efecto; en dev React monta/desmonta/remonta y ese `close()` dispararía `onClose`. Abrir con `if (!dialog.open) dialog.showModal()`.
- **`sr-only` en listas con scroll dentro de un `<dialog>`**: la fila contenedora debe ser `relative`; si no, el input oculto se posiciona respecto del dialog, alarga su scroll y lo desplaza al enfocarse.
- **Gestos sobre enlaces con mouse**: arrastrar sobre un `<a>` inicia el drag nativo (`dragstart` → `pointercancel`); se previene con `onDragStart={e => e.preventDefault()}`.
- **Proxy de Next 16**: necesita `export default` (función detectable estáticamente).
- **`usePathname()` en rutas dinámicas** con Cache Components: debe ir dentro de `<Suspense>`.
- **Server-only en el cliente**: los módulos de `lib/data/*` son `server-only`; las constantes que use el cliente van en `lib/constants.ts`.
- **Caché de Turbopack**: si una clase Tailwind nueva no se aplica en dev, detener el servidor, borrar `.next` y reiniciar.
- **Cliente Prisma tras una migración**: el `npm run dev` en curso conserva el cliente viejo (singleton en `globalThis`) y falla con "Unknown field": hay que reiniciarlo.
- **Migraciones no interactivas**: `prisma migrate dev` falla con "environment is non-interactive" si hay advertencias. Generar el SQL con `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` en `prisma/migrations/<UTC yyyymmddHHMMSS>_<nombre>/migration.sql` y aplicar con `npx prisma migrate deploy` + `npx prisma generate`.
- **Auth.js con `next start`/Nginx**: requiere `AUTH_TRUST_HOST=true` (si no, error `UntrustedHost`).

---

## 10. Entorno Local

- `docker-compose.yml`: PostgreSQL 16 (`trackapp-db-dev`, volumen `trackapp_pgdata`, healthcheck). `docker compose up -d`.
- `.env` (copiar de `.env.example`):
  - `DATABASE_URL` — por defecto `postgresql://trackapp:trackapp@localhost:5432/trackapp_dev?schema=public`.
  - `AUTH_SECRET` — generar con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
  - `AUTH_TRUST_HOST=true` — obligatoria.
- Windows: si `docker` no está en el PATH, usar `C:\Users\copor\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`.

### 10.1 QA y Producción (Fase 6, pendiente)
VPS Hetzner con QA y Prod en contenedores separados; Nginx o Traefik enruta por subdominio; Cloudflare como DNS y proxy HTTPS. Recordar: `AUTH_TRUST_HOST=true`, `AUTH_SECRET` distinto por entorno y `prisma migrate deploy` al arrancar.

---

## 11. Pruebas

- **Estáticas**: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **E2E con Playwright** (navegador real, viewport 390×844), desde el directorio temporal de Claude (no versionadas ni dependencia del proyecto). Suites: auth, ejercicios, rutinas y calendario (asignación, plantillas, series, filtros de entrada, gestos, aislamiento entre usuarios con ids falsificados).
  - Correr **en `next dev` y en `next start`**. Si el usuario tiene su dev server en el puerto 3000, usarlo (`BASE=http://localhost:3000`); el de producción se levanta en el 3100.
  - Esperar la hidratación (`waitForLoadState("networkidle")`) antes de interactuar tras un `goto`/`reload`.
  - Usuarios de prueba `e2e-…@trackapp.local`: **borrarlos al terminar** (primero sus `WorkoutSession`, luego el `User`).
  - En Windows, detener la tarea no siempre mata el proceso `node`: liberar el puerto 3100 matando el proceso que escucha.

---

## 12. Comandos

- `docker compose up -d` / `docker compose down` — PostgreSQL local.
- `npm run dev` — desarrollo (http://localhost:3000).
- `npm run build` + `npm run start` — build y servidor de producción local.
- `npx prisma migrate dev --name <nombre>` — crear y aplicar una migración (ver Gotchas si no es interactivo).
- `npx prisma generate` — regenerar el cliente (también en `postinstall`).
- `npx prisma db seed` — asignar ejercicios base a usuarios sin ejercicios.
- `npx prisma studio` — explorar la BD.
