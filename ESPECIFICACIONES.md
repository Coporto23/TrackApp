# TrackApp — Especificaciones Técnicas

> **Estado (2026-10-19)**: MVP completo (pasos 1–12) y **en línea en QA** (https://qa.trackapp.jolscripts.com). Producción configurada pero **sin desplegar** por decisión del usuario.
>
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
| Gráficos | Recharts | 3.10.1 (fijada) | Dashboard. Prop `responsive` (sin `ResponsiveContainer`), animaciones desactivadas. |
| PWA | — | — | Descartada por el usuario (paso 13): app web que funciona solo con conexión. |
| Infra | Docker (`node:24.21.0-bookworm-slim`, `postgres:16.15-alpine`), Traefik, GitHub Actions + GHCR | Traefik 3.7.13 | Fase 6: QA y Prod en un VPS Hetzner. Ver 10.1. |

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
Dockerfile                   Imágenes de producción: `app` (standalone) y `migrate`
docker-compose.prod.yml      Un entorno (QA o Prod) en el VPS: db, migrate, app
.github/workflows/deploy.yml Pipeline: develop → QA, main → Prod
deploy/                      deploy.sh (despliegue en el VPS), traefik/ (proxy), README.md (guía del servidor)
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
    dashboard.ts             loadDayDetail (detalle de un día de la constancia)
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
      dashboard/             Filtros, 4 tarjetas de progresión (Recharts), constancia mensual y registro
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
    constants.ts             Compartidas cliente/servidor: FREE_SESSION_TITLE, WEIGHT_UNITS, WEIGHT_UNIT_LABELS, SERIES_COLORS
    progress.ts              Cálculos puros del dashboard (conversión, Epley, periodos, antes→ahora, constancia)
    hooks.ts                 Hooks cliente: useToday, useStoredChoice (localStorage con respaldo en memoria)
    dates.ts                 Fechas "YYYY-MM-DD" con aritmética UTC y formatos es-CL
    data/                    Lecturas (server-only): exercises.ts, routines.ts, sessions.ts, dashboard.ts
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
| `/dashboard?e=id1,,id3` | Progresión por ejercicio, constancia y registro. Ver 5.2. |
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

### 5.2 Dashboard

> Diseño acordado con el usuario el 2026-10-18 (maquetas revisadas en el navegador) e implementado en el paso 12. Las decisiones marcadas *(técnica)* son de Claude y el usuario puede revisarlas.

**Propósito**: responder "¿realmente estoy progresando en este ejercicio?" comparando gráficamente la carga de antes con la de ahora, por ejercicio y en distintos rangos de tiempo.

**Alcance**: cuatro tarjetas **por ejercicio** (carga máxima, 1RM estimado, volumen, series por semana), una vista **global** (constancia) y una **tabla de registro**. Queda fuera: récords personales (iteración futura) y graficar niveles (mejora futura).

**Diseño general — tarjetas apiladas (maqueta B)**: una sola página que se recorre bajando con el dedo, en este orden:
1. Filtros (fijos arriba de las tarjetas, no flotantes).
2. Carga máxima · 3. 1RM estimado · 4. Volumen · 5. Series por semana.
6. Constancia.
7. Registro (tabla).

#### Filtros (aplican a las tarjetas 2–5 y a la tabla)
- **Ejercicios**: fichas con un rombo de color y ✕ para quitarlas; "+ Agregar" abre un selector multi-selección con buscador. **Máximo 4 a la vez** (al llegar a 4, el resto queda deshabilitado con el motivo).
  - El selector lista solo ejercicios **con al menos una serie registrada**, incluidos los archivados (con la nota "archivado") *(técnica)*. Sin "crear nuevo" (no tiene sentido sin historial).
  - Un ejercicio cuyas series en el rango son **solo de nivel** se muestra con **rombo hueco** y la nota "nivel · sin carga": no dibuja línea en las tarjetas de carga (carga máxima, 1RM, volumen), pero **sí en series por semana** (cuenta series, no carga) y aparece en la tabla *(técnica)*.
  - **Sin selección predeterminada** (decisión del usuario): la primera vez el dashboard parte vacío, con el aviso "Elige uno o más ejercicios con «Agregar»…" (las tarjetas y la tabla no se muestran; la constancia sí).
  - **La selección se recuerda** (decisión del usuario): al recargar o volver desde otra pestaña quedan los mismos ejercicios. Se guarda en la cookie `trackapp-dashboard-exercises` (`path=/dashboard`, 1 año) que el servidor lee cuando la URL no trae `?e=`, así se muestra sin parpadeo *(técnica)*. Ids ajenos o inexistentes se descartan.
- **Rango**: control segmentado `1M · 6M · 1A · 2A · TODO · 📅` (por defecto **6M** *(técnica)*). Se calcula hacia atrás desde "hoy" del navegador; "Todo" parte de la primera serie de los ejercicios elegidos.
  - **Rango personalizado** (decisión del usuario, 2026-10-18): el botón con icono de calendario ("Fechas") abre un modal **Desde / Hasta** (selector de fecha nativo, Cancelar / Aceptar). Valida que ambas existan, Desde ≤ Hasta y Hasta ≤ hoy (error en el modal sin cerrarlo). Activo, bajo los botones se muestra "◆ 29 may – 11 sept 2026 ✕": tocar las fechas las edita y ✕ vuelve a 6M. Se recuerda en `localStorage` como `YYYY-MM-DD..YYYY-MM-DD` *(técnica)*.
  - Agrupa como el preset de largo similar *(técnica)*: hasta 45 días como 1M, hasta 200 días como 6M y más como 1A. "Antes → ahora" por periodo ignora un último periodo que el rango corte.
- **Unidad**: `KG · LBS` (por defecto kg), en la fila bajo el rango. Las series en lbs y kg se convierten con **1 lb = 0,45359237 kg** para compararse en la misma línea. Los valores se muestran con 1 decimal como máximo y coma decimal.
- Estado: los ejercicios elegidos viven en la URL (`/dashboard?e=id1,,id3`) y en la cookie de arriba; rango, fechas personalizadas y unidad se recuerdan en `localStorage` *(técnica)*.

#### Colores de las series (hasta 4 — decisión del usuario)
La paleta cálida aprobada al inicio (ember, oro, hueso, óxido) **no pasó la validación** de accesibilidad: ember y oro se confunden incluso con visión normal. El usuario eligió la paleta **validada y apagada** (pasa luminosidad, croma, daltonismo y contraste ≥ 3:1 sobre `stone`):

| Orden | Nombre | Hex |
|---|---|---|
| 1 | brasa | `#d06e24` |
| 2 | acero | `#4d8fd1` |
| 3 | oro viejo | `#a99236` |
| 4 | malva | `#b4659f` |

El color sigue al ejercicio (posición de su ficha); quitar una ficha no repinta las demás *(técnica: el color se asigna en el primer hueco libre)*. Se usan solo en gráficos y en el rombo de las fichas/tabla; los textos siguen en `bone`/`fog`. La leyenda son las propias fichas; el tooltip repite el color.

#### Tarjetas de progresión (por ejercicio)
Cada tarjeta: título (Cinzel), resumen **"antes → ahora"** por ejercicio en la cabecera y el gráfico. Al tocar un punto/barra aparece un tooltip con fecha y valores. Solo consideran series en **kg/lbs**.

| Tarjeta | Valor | Agregación | Gráfico |
|---|---|---|---|
| **Carga máxima** | Mayor peso de una serie | Por entrenamiento (día) | Línea por ejercicio |
| **1RM estimado** | Epley: `peso × (1 + reps/30)`; con 1 rep = el peso | Máximo del día, solo series de **1 a 12 reps** *(técnica: Epley pierde precisión con más reps)* | Línea por ejercicio |
| **Volumen** | Σ peso × reps | Por **semana** (lunes–domingo) en 1M; por **mes** en 6M, 1A, 2A y Todo *(técnica: legibilidad en el celular)* | Barras agrupadas por ejercicio |
| **Series por semana** | Nº de series (**incluye las de nivel**) | Por semana en 1M y 6M; en 1A, 2A y Todo, **promedio semanal por mes** *(técnica)* | Línea por ejercicio |

- **Eje temporal continuo** *(técnica)*: en volumen y series por semana, las semanas/meses sin series del ejercicio valen **0** (el descanso se ve como descanso) y el "promedio semanal por mes" divide por todas las semanas del mes (en el mes en curso, solo las transcurridas). Carga máxima y 1RM solo tienen puntos en los días con series (la línea une los puntos). Los gráficos por periodo parten del **primer periodo completo** del rango (uno cortado por el inicio se vería como una caída falsa); con "Todo", del periodo de la primera serie *(técnica)*.
- **"Antes → ahora"**: primer valor del rango → último valor del rango, con la variación en % (en brasa si sube, en `fog` si baja o se mantiene). Con menos de dos puntos: "—". En volumen y series compara el primer y el último periodo **completo** con datos (sin la semana/mes en curso) *(técnica)*.
- Estado vacío por tarjeta: "Sin series en este rango" (o "Elige un ejercicio" si no hay fichas).

#### Constancia (global, todos los entrenamientos)
- **Calendario mensual** de lunes a domingo (como el calendario de la app), con ‹ › para cambiar de mes; inicia en el mes actual.
- Estados del día (con leyenda bajo el calendario):
  - **Entrenado** (tiene al menos una serie): fondo brasa con rombo.
  - **Planificado** (hoy o futuro, con entrenamiento asignado sin series): borde punteado.
  - **No realizado** (día pasado con entrenamiento asignado y sin series) — decisión del usuario: punteado apagado con una marca propia (✕ pequeña en `fog`). Su detalle dice "No realizado · sin series" con el enlace al calendario.
  - **Descanso** (sin entrenamiento): apagado.
  - Hoy con el número en ember.
- Los indicadores cuentan **solo días entrenados** (con series).
- **Al tocar un día** se muestra su detalle debajo del calendario: "JUE 16 OCT · DÍA PECHO", "N ejercicios · M series", la lista de ejercicios con su nº de series y su carga máxima (o el nivel más alto registrado *(técnica: el último en registrarse)*), y el enlace "Abrir en el calendario ›" (`/calendario?d=…`). Al abrir, queda seleccionado hoy (o el último día entrenado del mes visible).
- Tres indicadores bajo el calendario: **entrenamientos en el mes**, **promedio por semana** (en el mes visible) y **semanas seguidas** con al menos un entrenamiento (contando hacia atrás desde la semana actual; si la semana actual aún no tiene, desde la anterior).
- No depende de los filtros de ejercicio, rango ni unidad.

#### Registro (tabla)
- Información "en duro" de los ejercicios elegidos dentro del rango, **agrupada por día** (más reciente primero): cabecera con la fecha y la rutina del día; una fila por ejercicio con su rombo de color, las series como `peso×reps` separadas por ` · ` y la carga máxima del día a la derecha.
- **Los niveles sí aparecen** (`B×12 · B×10 · C×8`) con la marca "nivel".
- Pesos en la unidad registrada por la serie (es información en duro, sin convertir) *(técnica)*. La "carga máxima del día" (aquí y en el detalle de la constancia) es la serie más pesada comparando en kg, **mostrada en su unidad registrada**; si el día solo tiene niveles, el último nivel registrado con la marca "nivel".
- Muestra 10 días y "Ver más" agrega 10 más.

#### Aviso de "nivel" en el registro de series (calendario)
Mientras la unidad elegida sea "nivel", bajo el formulario de la serie se muestra un texto breve y discreto: para qué sirve (máquinas con niveles o placas sin peso, como "5" o "B") y que esas series no aparecen en los gráficos de carga, sí en la tabla del dashboard. Sin ventana emergente.

#### Implementación *(técnica)*
- **Recharts 3.10.1** (fijada), aprobada por el usuario. Componentes de gráfico en el cliente (`"use client"`), tematizados con la paleta (ejes `fog`, grilla `stone-edge`, tooltip con `Panel`).
- Lecturas en `src/lib/data/dashboard.ts` (`server-only`, `getCurrentUser()`, filtro por `userId`): series crudas por sesión de los ejercicios elegidos (ids validados y filtrados por usuario) y resumen de sesiones para la constancia. El detalle de un día de la constancia se lee bajo demanda verificando la pertenencia.
- Cálculos (conversión, Epley, agrupación por semana/mes, "antes → ahora", rachas) en un módulo puro compartido `src/lib/progress.ts`, sin dependencias de servidor, para poder probarlos aislados.
- Sin cambios al modelo de datos ni migraciones.

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

Componentes de pantalla relevantes: `calendario/week-view.tsx` (semana + gestos), `session-details.tsx` (tarjeta desplegada), `set-logger.tsx` (registro de series + aviso de nivel), `assign-routine-dialog.tsx`, `delete-session-dialog.tsx`, `update-template-dialog.tsx`; `dashboard/dashboard-view.tsx` (filtros y tarjetas), `progress-chart.tsx` (línea y barras temáticas con tooltip), `exercise-select-dialog.tsx` (comparar, máx. 4), `custom-range-dialog.tsx` (Desde / Hasta), `consistency-card.tsx` (calendario mensual + detalle), `log-table.tsx` (registro por día).

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
- **Recharts y periodos parciales**: un periodo cortado por el inicio del rango o aún en curso se ve como caída; por eso los gráficos por periodo parten del primer periodo completo y "antes → ahora" ignora el periodo en curso.
- **Auth.js con `next start`/Nginx**: requiere `AUTH_TRUST_HOST=true` (si no, error `UntrustedHost`).
- **Auth.js detrás del proxy (Traefik)**: dentro del contenedor Next arma la URL de cada petición con su propia dirección (`0.0.0.0:3000`, respeta `X-Forwarded-Proto` pero no el host). Sin `AUTH_URL`, el `callbackUrl` y el redirect tras iniciar sesión apuntan a `https://0.0.0.0:3000/` y el login falla con "An unexpected response was received from the server". Solución: `AUTH_URL=https://<dominio>` en el entorno.
- **`package-lock.json` generado en Windows**: npm omitió dependencias opcionales de Linux (`@emnapi/*`) y `npm ci` falla en Docker/CI. Si vuelve a pasar, regenerar el lock dentro de un contenedor Linux (`npm install --package-lock-only --ignore-scripts` en `node:24.21.0-bookworm-slim`) y comprobar que solo agrega entradas.
- **`output: "standalone"`**: `next start` sigue funcionando para las pruebas locales, pero avisa que en producción se use `node .next/standalone/server.js` (lo hace la imagen).
- **Docker se salta UFW**: los puertos publicados por contenedores quedan abiertos aunque UFW no los permita. Solo Traefik publica puertos.
- **`tsc` en un checkout limpio (CI)**: los tipos globales `PageProps`/`LayoutProps` los genera Next en `.next/types`; sin build previo `tsc` falla con "Cannot find name 'PageProps'". Correr `next typegen` antes.
- **Next 16 conserva la página anterior oculta**: en las E2E puede haber dos `<main>`; usar `main:visible`.

---

## 10. Entorno Local

- `docker-compose.yml`: PostgreSQL 16 (`trackapp-db-dev`, volumen `trackapp_pgdata`, healthcheck). `docker compose up -d`.
- `.env` (copiar de `.env.example`):
  - `DATABASE_URL` — por defecto `postgresql://trackapp:trackapp@localhost:5432/trackapp_dev?schema=public`.
  - `AUTH_SECRET` — generar con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
  - `AUTH_TRUST_HOST=true` — obligatoria.
- Windows: si `docker` no está en el PATH, usar `C:\Users\copor\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`.

### 10.1 QA y Producción (Fase 6)

> Acordado con el usuario el 2026-10-18. Las decisiones marcadas *(técnica)* son de Claude.

| Entorno | URL | Rama | Carpeta en el VPS | Estado |
|---|---|---|---|---|
| QA | https://qa.trackapp.jolscripts.com | `develop` | `/opt/trackapp/qa` | En línea desde 2026-10-19 (certificado Let's Encrypt, renovación automática) |
| Producción | https://app.trackapp.jolscripts.com | `main` | `/opt/trackapp/prod` | `.env` y DNS listos; **sin desplegar** hasta que el usuario lo decida |

**Flujo de trabajo (decisión del usuario)**
1. Cada cambio se trabaja en local en una **rama propia** (`feat/…`, `fix/…`), creada desde `develop`.
2. Merge de la rama a **`develop`** → despliegue automático en **QA**, donde se valida.
3. Con QA aprobado, merge de `develop` a **`main`** → despliegue automático en **Producción**.
- `develop` existe desde 2026-10-18 (creada desde `main`). *(técnica)* Se recomienda proteger `main` en GitHub (solo merges vía Pull Request), configuración que hace el usuario.

**Servidor**: VPS Hetzner **x86_64** (`2.28.3.145`), Ubuntu 24.04, Docker + Compose plugin instalados, UFW con 22/80/443. Tamaño no informado: por eso **la imagen se construye en GitHub (solo `linux/amd64`) y el servidor solo la descarga** *(técnica)*.
- **Docker se salta UFW**: un puerto publicado por un contenedor queda expuesto aunque UFW no lo permita. Solo el proxy (Traefik) publica 80/443; la app y las bases no publican puertos.

**Pipeline (GitHub Actions, `.github/workflows/deploy.yml`)** — se dispara con push a `develop` (QA) o `main` (Prod):
1. **Validar**: `npm ci` (incluye `prisma generate`), `next typegen`, `tsc --noEmit`, `lint`; el `next build` ocurre al construir la imagen. Si algo falla, no se despliega.
2. **Construir y publicar** en GitHub Container Registry (`ghcr.io/coporto23/trackapp`), etiquetado con el SHA del commit: imagen `app` (`:<sha>`) e imagen `migrate` (`:<sha>-migrate`) *(técnica)*.
3. **Desplegar** por SSH con el usuario `deploy` (clave dedicada, verificación del host con `known_hosts`): copia `docker-compose.prod.yml` y `deploy/deploy.sh` a `/opt/trackapp/<entorno>/` y ejecuta el script, que escribe `image.env` (`IMAGE_TAG=<sha>`), inicia sesión en GHCR con el **token temporal del job** (llega por stdin; sin secretos extra, sirva la imagen pública o privada), descarga las imágenes, levanta la base, **corre las migraciones** (`compose run --rm migrate`) y levanta la app con `--wait`. Si la app no queda sana (healthcheck), el job falla.
- Un despliegue a la vez por entorno (`concurrency`). Los despliegues quedan registrados en los GitHub Environments `qa` y `production`. Secretos **del repositorio** (mismo servidor para ambos): `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_KNOWN_HOSTS`.
- **Prod reconstruye la imagen desde `main`** *(técnica)*: `main` recibe exactamente lo validado en `develop`, así que el código es el mismo de QA; promover la misma imagen exigiría reglas de merge más estrictas.
- **Volver atrás**: re-ejecutar el workflow de un commit anterior, o en el servidor `sudo -u deploy bash /opt/trackapp/<entorno>/deploy.sh <entorno> <sha-anterior>`.

**Imagen (`Dockerfile`, multi-stage, `node:24.21.0-bookworm-slim`)** *(técnica)*
- Next con `output: "standalone"`: la imagen `app` lleva solo el servidor mínimo, `public/` y `.next/static`; corre como usuario no root en el puerto 3000.
- La imagen `migrate` lleva las dependencias completas y `prisma/`, y ejecuta `prisma migrate deploy` (no destructivo). `deploy.sh` la corre una vez (`compose run --rm migrate`) antes de actualizar la app.
- La imagen base instala `openssl` (lo necesita el motor de migraciones de Prisma).
- Sin secretos dentro de la imagen; todo llega por variables de entorno en tiempo de ejecución.

**Composición por entorno (`docker-compose.prod.yml`, la misma para QA y Prod)** — en `/opt/trackapp/qa` y `/opt/trackapp/prod`, con proyecto `trackapp-qa` / `trackapp-prod`:
- `db`: `postgres:16.15-alpine`, volumen propio, healthcheck, sin puertos. **Cada entorno tiene su propia base** (QA nunca toca datos de Prod).
- `migrate`: corre las migraciones y termina (perfil `migrate`: `up` no lo levanta; el script lo ejecuta con `run`).
- `app`: la imagen del SHA desplegado, `AUTH_TRUST_HOST=true`, **`AUTH_URL=https://${APP_HOST}`** (ver Gotchas), healthcheck sobre `/login`, etiquetas de Traefik con `Host(${APP_HOST})` y HTTPS.
- `.env` del servidor (lo crea el usuario, nunca se versiona): `ENV_NAME`, `APP_HOST`, `POSTGRES_PASSWORD` (hex, sin caracteres especiales), `AUTH_SECRET` (distinto por entorno). `image.env` lo escribe el pipeline.

**Proxy (`deploy/traefik/docker-compose.yml`, `traefik:v3.7.13`)** — en `/opt/trackapp/traefik`, compartido por ambos entornos mediante la red Docker externa `web`:
- Publica 80 y 443; redirige HTTP → HTTPS; certificados automáticos de **Let's Encrypt** (desafío HTTP-01) guardados en `acme.json`; solo enruta contenedores con `traefik.enable=true`; sin dashboard expuesto.

**Decisiones del usuario**: QA **sin protección extra** (solo el login de la app). **Sin respaldos automáticos** de la base de producción por ahora.

**Dominio**: `jolscripts.com` con DNS en HostGator. Registros A `qa.trackapp` y `app.trackapp` → `2.28.3.145`. **Sin Cloudflare** (si se agregara con la nube naranja, su certificado gratuito `*.jolscripts.com` no cubre subdominios de dos niveles). Let's Encrypt emite cada certificado en la primera visita.

**Mantenimiento del servidor** (lo hace el usuario): las actualizaciones de la app y los reinicios del servidor se recuperan solos (`restart: unless-stopped`); los parches de Ubuntu se instalan solos pero un reinicio por kernel es manual (`/var/run/reboot-required`); cambios en `.env` o en Traefik requieren recrear el contenedor (relanzar el despliegue o `docker compose up -d`).

**Guía de instalación del servidor**: `deploy/README.md` (pasos que ejecuta el usuario: usuario `deploy`, carpetas, `.env`, red `web`, Traefik, secretos de GitHub; flujo diario y operación).

**Gotcha del primer despliegue**: `SSH_KNOWN_HOSTS` debe ser exactamente la línea de `ssh-keyscan -t ed25519 <IP>` contra el **mismo IP** de `SSH_HOST`; si no, `scp` falla con "Host key verification failed" (exit 255).

---

## 11. Pruebas

- **Estáticas**: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **E2E con Playwright** (navegador real, viewport 390×844), desde el directorio temporal de Claude (no versionadas ni dependencia del proyecto). Suites: auth, ejercicios, rutinas, calendario (asignación, plantillas, series, filtros de entrada, gestos, aislamiento entre usuarios con ids falsificados) y dashboard (siembra ~14 meses de historial directo en la BD: valores de cada tarjeta, kg/lbs, rangos, comparar/quitar fichas, niveles, tabla, constancia, aviso de nivel, aislamiento).
- **Cálculos del dashboard**: `src/lib/progress.ts` es puro; se prueba aislado con `npx tsx` (script en el scratchpad).
- **Paleta de series**: validarla con el validador de la skill `dataviz` (`validate_palette.js --mode dark --surface #1c1915`) antes de cambiarla.
  - Correr **en `next dev` y en `next start`**. Si el usuario tiene su dev server en el puerto 3000, usarlo (`BASE=http://localhost:3000`); el de producción se levanta en el 3100.
  - Esperar la hidratación (`waitForLoadState("networkidle")`) antes de interactuar tras un `goto`/`reload`.
  - Usuarios de prueba `e2e-…@trackapp.local`: **borrarlos al terminar** (primero sus `WorkoutSession`, luego el `User`).
  - En Windows, detener la tarea no siempre mata el proceso `node`: liberar el puerto 3100 matando el proceso que escucha.

---

## 12. Comandos

- Despliegue: push a `develop` (QA) / merge a `main` (Producción); seguimiento en GitHub → Actions. Operación del servidor: `deploy/README.md`.
- `docker compose up -d` / `docker compose down` — PostgreSQL local.
- `npm run dev` — desarrollo (http://localhost:3000).
- `npm run build` + `npm run start` — build y servidor de producción local.
- `npx prisma migrate dev --name <nombre>` — crear y aplicar una migración (ver Gotchas si no es interactivo).
- `npx prisma generate` — regenerar el cliente (también en `postinstall`).
- `npx prisma db seed` — asignar ejercicios base a usuarios sin ejercicios.
- `npx prisma studio` — explorar la BD.
