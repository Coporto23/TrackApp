# TrackApp — Documento de Arquitectura y Especificaciones (Contexto para Claude Code)

> Documento maestro del proyecto. Describe los requerimientos, la arquitectura, las convenciones y el estado actual del desarrollo para poder retomarlo en cualquier iteración. Mantenerlo actualizado al cerrar cada paso.

---

## 0. Reglas de Trabajo (Obligatorias)

- **Solo desarrollo LOCAL.** La configuración de QA y luego de Producción (Fase 6) se hace únicamente cuando todo lo demás esté terminado.
- **Consultar al usuario** cualquier decisión en la que no haya certeza (librerías, estructura, interpretación de la especificación, discrepancias, cambios al modelo de datos). No asumir.
- **Confirmar con el usuario al terminar cada paso** antes de avanzar al siguiente. Hacer commit + push solo cuando el usuario lo apruebe.
- **Next.js 16 tiene cambios incompatibles** con versiones anteriores: antes de escribir código de Next.js, leer la guía correspondiente en `node_modules/next/dist/docs/` (ver `AGENTS.md`).
- **Prisma bloquea comandos destructivos** (`migrate reset`, etc.) invocados por IA: requieren consentimiento explícito del usuario y solo se ejecutan contra la BD de desarrollo.
- **Validar la UI en `next dev` y en `next start`** (ver sección 9). El usuario prueba con `npm run dev`.
- Idioma: código (identificadores) en inglés; textos de la UI, comentarios y commits descriptivos en español/inglés según el archivo existente. Commits con prefijo convencional (`feat:`, `fix:`…).

---

## 1. Descripción del Proyecto

Aplicación Web (PWA) orientada al registro rápido y eficiente de la **sobrecarga progresiva** en rutinas de hipertrofia (enfocado en un split de 5 días). Permite al usuario registrar ejercicios, rutinas y series diarias sin fricción desde el gimnasio (mobile-first, uso con una mano).

Repositorio: https://github.com/Coporto23/TrackApp (rama `main`).

---

## 2. Stack Tecnológico (Full-Stack Monorepo)

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | **Next.js 16.4** (App Router, TypeScript, `src/`, alias `@/*`, Turbopack) | `cacheComponents: true` y `partialPrefetching: true` en `next.config.ts`. `middleware` ahora se llama `proxy.ts` y corre en Node.js. |
| UI | **Tailwind CSS v4** | Tema en `src/app/globals.css` (`@theme`). Clases propias reutilizables con `@apply` deben declararse como `@utility`. |
| BD | **PostgreSQL 16** | Dev: contenedor Docker `trackapp-db-dev`. |
| ORM | **Prisma 7.10.1** (fijada) | Generador `prisma-client` → `src/generated/prisma` (ignorado en git, se regenera en `postinstall`). Driver adapter `@prisma/adapter-pg`. Config en `prisma7.config.ts`. **No subir a Prisma 8 sin consultar** (la etiqueta `latest` del CLI apunta a una RC). |
| Auth | **Auth.js (next-auth) 5.0.0-beta.32** (fijada) | Sesión JWT, provider Credentials. |
| Hash | **Argon2id** (`@node-rs/argon2` 2.2.2) | Parámetros OWASP: 19 MiB, t=2, p=1. |
| Validación | **Zod 4.6** | Esquemas en `src/lib/validation/`. |
| Drag & drop | **@dnd-kit** core 6.3.1 / sortable 10.0.0 / modifiers 9.0.0 / utilities 3.2.2 (fijadas) | Reordenar ejercicios de una rutina (puntero + teclado). |
| PWA | next-pwa o solución nativa de Next.js | Pendiente (Fase 5). |
| Infra | Docker Compose + Nginx/Traefik en VPS Hetzner, Cloudflare DNS/Proxy | Pendiente (Fase 6). |

---

## 3. Alcance del MVP (Reglas de Negocio)

### 3.1 Ejercicios — Aislamiento total
- No existen ejercicios "globales". **Cada ejercicio pertenece exclusivamente a un usuario.**
- **Al registrarse**, se copian al usuario 26 ejercicios base del split de 5 días (Pecho, Espalda, Piernas, Hombros, Brazos) definidos en `src/lib/default-exercises.ts`. El usuario puede renombrarlos o "eliminarlos" libremente.
- **"Eliminar" = ARCHIVAR** (`archivedAt`). El ejercicio desaparece de listas y rutinas, pero conserva sus series históricas y su dashboard. Se puede restaurar. La BD impide borrar físicamente un ejercicio con series.
- **Nombre único por usuario**, sin distinguir mayúsculas (la BD tiene `@@unique([userId, name])`; la app además compara con `mode: "insensitive"`). Los espacios se normalizan (trim + colapsar). Máx. 60 caracteres.
- Si se intenta crear un ejercicio con el nombre de uno **archivado**, se ofrece **restaurarlo** en vez de duplicarlo.
- Sin grupo muscular (decisión del usuario: lista simple alfabética con buscador).

### 3.2 Rutinas y Calendario
- Las rutinas son **plantillas** (ej. "Día Pecho") con ejercicios ordenados. Nombre único por usuario (sin distinguir mayúsculas).
- Un ejercicio aparece **como máximo una vez por rutina** (`@@unique([routineId, exerciseId])`).
- Los ejercicios archivados se **ocultan** de las rutinas (el vínculo se conserva; al restaurarlos vuelven a su posición).
- **Eliminar una rutina** es definitivo y pide confirmación. Las sesiones ya entrenadas con ella y sus series se conservan (`originRoutineId` queda en null).
- Al armar una rutina se pueden **crear ejercicios nuevos** sin salir de ella (quedan en el arsenal del usuario).
- El usuario selecciona un día en el calendario, carga la plantilla y puede agregar/quitar ejercicios sobre la marcha durante la sesión.

### 3.3 Métricas de registro
- Solo se registra: **Número de Serie, Repeticiones y Peso**. El peso puede ser en **kg, lbs o nivel** (máquinas con niveles).

### 3.4 Dashboard
- Gráfico de línea simple: **"Progresión de Carga Máxima"** (peso máximo levantado en 1 serie) por ejercicio a lo largo del tiempo.

### 3.5 Cuentas
- Registro con email + contraseña (mín. 8, máx. 128) + confirmación, con **auto-login**. Email normalizado (trim + minúsculas). Sin verificación de email en el MVP.

---

## 4. Modelo de Datos (implementado en `prisma/schema.prisma`)

Todas las entidades usan id `cuid()` y `createdAt`. Migraciones aplicadas: `init`, `routine_exercise_unique`.

| Entidad | Campos | Restricciones / relaciones |
|---|---|---|
| **User** | id, email, password (hash Argon2id), createdAt | email único |
| **Exercise** | id, name, userId, archivedAt?, createdAt | único (userId, name); cascada al borrar User |
| **Routine** | id, name, userId, createdAt | único (userId, name); cascada al borrar User |
| **RoutineExercise** | id, routineId, exerciseId, order (Int) | único (routineId, exerciseId); cascada al borrar su Routine o Exercise; índice (routineId, order). El orden puede tener huecos: ordenar por `order` asc. |
| **WorkoutSession** | id, userId, date (`@db.Date`, solo fecha), originRoutineId?, createdAt | originRoutineId null = entrenamiento libre; al borrar la rutina queda en null |
| **Set** | id, sessionId, exerciseId, setNumber, reps, weight (`Decimal(6,2)`), weightUnit (enum `kg`/`lbs`/`level`, def. `kg`), createdAt | cascada al borrar su sesión; **Set → Exercise es `NoAction`** |

Reglas de borrado e integridad:
- Borrar un User borra en cascada sus ejercicios, rutinas y sesiones.
- Un ejercicio con series **no se puede borrar** (solo archivar).
- Consecuencia: un User con series **no se puede borrar directo** (PostgreSQL evalúa la cascada User→Exercise antes que User→Session→Set). Si se implementa "eliminar cuenta": en una transacción, borrar primero sus `WorkoutSession` y luego el `User`.
- `Set` no tiene userId: su pertenencia se valida vía la sesión. **Toda Server Action debe verificar que sesión, ejercicio y rutina pertenezcan al usuario autenticado.**
- `weight` es `Decimal`: llega a JS como `Prisma.Decimal`; convertir con `.toString()`/`Number()` antes de pasarlo a Client Components.

---

## 5. Arquitectura

### 5.1 Estructura de carpetas
```
prisma/
  schema.prisma            Modelo de datos
  migrations/              Migraciones (init)
  seed.ts                  `npx prisma db seed`: ejercicios base a usuarios sin ejercicios
prisma7.config.ts          Config de Prisma 7 (schema, migraciones, seed, DATABASE_URL)
src/
  proxy.ts                 Chequeo optimista del JWT en cada request (Next 16 "proxy")
  auth.config.ts           Config Auth.js compartida (sin Prisma/argon2): páginas, callbacks
  auth.ts                  Auth.js completo: provider Credentials (usa Prisma + argon2)
  actions/                 Server Actions ("use server")
    auth.ts                login, register, logout
    exercises.ts           createExercise (devuelve el ejercicio creado), renameExercise, archiveExercise, restoreExercise
    routines.ts            createRoutine, renameRoutine, deleteRoutine, addRoutineExercises,
                           removeRoutineExercise, reorderRoutineExercises(routineId, orderedIds)
  app/
    layout.tsx             Raíz: fuentes, metadata, viewport, LowPolyBackdrop
    globals.css            Tema (paleta, fuentes), utilidades facet, .field, .btn-*
    (auth)/                Rutas públicas con layout centrado + emblema
      login/, registro/
    (app)/                 Rutas autenticadas con BottomNav
      page.tsx             Inicio (accesos a Ejercicios/Rutinas, "Entrenar hoy" pendiente)
      ejercicios/          CRUD de ejercicios (lista + modal)
      rutinas/             Listado de rutinas + modal de nombre (crear/renombrar)
        [id]/              Detalle: lista ordenable (dnd-kit), selector de ejercicios con
                           "crear nuevo", eliminar con confirmación
      calendario/, dashboard/   Placeholders ("Sendero sellado") hasta Fases 4/5
      perfil/              Datos de la cuenta + cerrar sesión
    api/auth/[...nextauth]/route.ts   Handlers de Auth.js
    salir/route.ts         Cierra sesiones huérfanas (usuario borrado) sin bucle de redirección
  components/              UI reutilizable (ver 6.3)
  lib/
    prisma.ts              Cliente Prisma singleton (adapter pg)
    dal.ts                 Data Access Layer: getCurrentUser()
    users.ts               createUserWithDefaults(): único punto de creación de usuarios
    password.ts            hashPassword / verifyPassword (Argon2id)
    seed-user-exercises.ts seedUserExercises(db, userId) idempotente (acepta transacción)
    default-exercises.ts   Lista de los 26 ejercicios semilla
    data/exercises.ts      Lecturas de ejercicios del usuario (getMyExercises, findExerciseByName)
    data/routines.ts       getMyRoutines, getMyRoutine(id) (solo ejercicios activos), findRoutineByName
    validation/            Esquemas Zod: auth.ts, common.ts (nameSchema, idSchema compartidos)
  generated/prisma/        Cliente generado (NO editar, NO versionar)
```

### 5.2 Autenticación y autorización (tres capas)
1. **Proxy** (`src/proxy.ts` + `authorized` en `auth.config.ts`): solo lee el JWT de la cookie (sin BD). Sin sesión → redirige a `/login?callbackUrl=…`. Con sesión en `/login` o `/registro` → redirige a `/`. `/salir` siempre permitido. Debe exportar `default` (Next 16 exige detectar la función estáticamente; no usar export desestructurado).
2. **DAL** (`getCurrentUser()` en `src/lib/dal.ts`): verificación real. Lee la sesión, busca el usuario en BD; sin sesión → `/login`; usuario inexistente → `/salir`. Devuelve `{ id, email, createdAt }`.
3. **Server Actions**: cada acción llama a `getCurrentUser()` y filtra por `userId` en la consulta (`updateMany({ where: { id, userId } })`), de modo que un id ajeno simplemente no afecta nada.

### 5.3 Patrones obligatorios con Cache Components (Next 16)
- `params` de rutas dinámicas y `usePathname()` también son datos de runtime: pasar la promesa `params` a un componente dentro de `<Suspense>` y hacer `await` ahí; `BottomNav` lee el pathname dentro de su propio `<Suspense>` (fallback: barra sin pestaña activa).
- Leer la sesión **siempre dentro de un `<Suspense>`**, nunca en el nivel superior de un layout/página (sería error de build y bloquearía el shell estático). Patrón: la página renderiza el encabezado estático y un componente async interno dentro de `<Suspense fallback=…>`.
- No se usa `'use cache'` por ahora: los datos son dinámicos por usuario. Tras una mutación, la acción llama a **`refresh()`** (`next/cache`) para refrescar el router. Si en el futuro se cachean datos con `'use cache'` + `cacheTag`, usar `updateTag` en las acciones y nunca poner datos sensibles en claves/tags.

### 5.4 Convenciones para agregar una funcionalidad CRUD
1. Esquema Zod en `src/lib/validation/<entidad>.ts`.
2. Lecturas en `src/lib/data/<entidad>.ts` (`import "server-only"`, empiezan con `getCurrentUser()`, devuelven objetos planos y serializables).
3. Mutaciones en `src/actions/<entidad>.ts` (`"use server"`): validar → `getCurrentUser()` → consulta filtrada por `userId` → `refresh()`. Para formularios con feedback, firma `(prevState, formData)` + tipo `XFormState` (error, ok, valores para no perder lo escrito); capturar `P2002` (único) como mensaje amigable.
4. UI en `src/app/(app)/<ruta>/`: `page.tsx` (Server Component con Suspense) + componentes cliente (`useActionState`). Seguir la convención UX de 6.4.

### 5.5 Registro de usuario
`register` (Server Action) → valida → `hashPassword` → `createUserWithDefaults(email, hash)` (User + 26 ejercicios en **una transacción**) → `signIn("credentials")` (auto-login, redirige a `/`). Email duplicado → error en el campo email.

---

## 6. Diseño Visual y UX (aprobado por el usuario)

### 6.1 Estilo
**Grimdark low-poly** inspirado en Dark Souls / RPG: sobrio, elegante, no tosco ni chocante. **Solo tema oscuro.**

### 6.2 Tokens (`src/app/globals.css`)
- Colores: `abyss` (#0b0a09, fondo), `ash`/`stone` (superficies), `stone-edge` (bordes), `bone` (texto), `fog` (texto secundario), **`ember`/`ember-bright`/`ember-deep` (acento único: brasa de hoguera)**, `gold` (títulos), `blood` (errores).
- Tipografías: **Cinzel** (`font-display`: títulos y etiquetas en mayúsculas con tracking amplio) y **Alegreya Sans** (texto).
- Formas: utilidades `facet` / `facet-sm` (esquinas biseladas por clip-path). Inputs `.field` rectos con foco ember. Botones `.btn-ember` (gradiente brasa) y `.btn-ghost`.
- Fondo `LowPolyBackdrop`: malla de triángulos determinista + resplandor de brasa inferior.

### 6.3 Componentes (`src/components/`)
`Panel` (tarjeta biselada con borde), `PageHeader` (título dorado + separador con rombo), `FormField`, `Modal` (sobre `<dialog>` nativo), `IconButton` (44px táctil, se deshabilita al enviar), `BackLink`, `BottomNav`, `ComingSoon`, `LowPolyBackdrop`, `icons.tsx` (iconos facetados propios: hoguera, calendario, gráfico, yelmo, emblema, +, editar, archivar, restaurar, buscar, atrás, check, cerrar, papelera, manija, chevron). Botones: `.btn-ember` (principal), `.btn-ghost` (secundario/cancelar), `.btn-danger` (acciones destructivas). Checkbox temático: rombo ember (ver selector de ejercicios).

### 6.4 Convenciones UX
- **Pantallas de gestión: el listado es protagonista.** Botón "+" en la cabecera del listado; **crear y editar se hacen en un modal con botones Cancelar / Aceptar** (no inputs incrustados en la página). El modal cierra con Cancelar, Esc o clic fuera; en error se mantiene abierto mostrando el mensaje y conservando lo escrito.
- Acciones reversibles (archivar, quitar un ejercicio de una rutina) son de un toque, sin confirmación; lo archivado queda en una sección plegable "Archivados" con opción de restaurar.
- Acciones irreversibles (eliminar rutina) piden confirmación en un modal con `.btn-danger`.
- Crear un elemento **no navega** a otra pantalla: el modal se cierra y el elemento aparece en el listado (decisión del usuario).
- Dentro de un modal de selección se puede crear el elemento faltante sin salir (vista "crear" dentro del mismo modal, precargada con lo buscado; al aceptar vuelve a la selección con el nuevo ya marcado).
- Reordenar: arrastrar desde la manija ⠿ (solo la manija tiene `touch-action: none`, así no choca con el scroll); también con teclado (espacio + flechas).
- Buscadores ignoran tildes y mayúsculas; orden alfabético con `Intl.Collator("es")`.
- Objetivos táctiles ≥ 44px. Navegación inferior fija con safe-area (`env(safe-area-inset-bottom)`).
- Textos en español, con un toque temático leve ("Sendero sellado", "Avivando las brasas…", "Tu arsenal") sin sacrificar claridad. Lenguaje neutro en género hacia el usuario ("Saludos", no "Bienvenido").
- Navegación: barra inferior con **Inicio, Calendario, Dashboard, Perfil**. Ejercicios y Rutinas se abren **desde Inicio** (tarjetas con contador) y marcan la pestaña Inicio como activa.

### 6.5 Gotchas de UI
- `Modal`: no cerrar el `<dialog>` en el cleanup del efecto. En Strict Mode (dev) React monta/desmonta/remonta y ese `close()` dispara `onClose`, cerrando el modal al abrirlo. Se abre con `if (!dialog.open) dialog.showModal()` y se cierra desmontándolo.
- El modal se monta solo mientras está abierto (estado `dialog` en el padre), así su formulario parte limpio cada vez.
- Inputs `sr-only` (checkbox oculto) dentro de listas con scroll: el contenedor de la fila debe ser `relative`; si no, el input absoluto se posiciona respecto del `<dialog>`, alarga su scroll y lo desplaza al enfocarlo.
- Si una clase Tailwind nueva no se aplica en `next dev` (el `className` está pero la regla CSS no existe), es caché persistente de Turbopack: detener el servidor, borrar `.next` y reiniciar.

---

## 7. Infraestructura y Despliegue

### 7.1 Desarrollo local (implementado)
- `docker-compose.yml`: solo PostgreSQL 16 (`docker compose up -d`), volumen `trackapp_pgdata`, healthcheck.
- Copiar `.env.example` a `.env`. Variables:
  - `DATABASE_URL` (por defecto `postgresql://trackapp:trackapp@localhost:5432/trackapp_dev`)
  - `AUTH_SECRET` (generar: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
  - `AUTH_TRUST_HOST=true` (**obligatoria**: sin ella Auth.js rechaza el login con `next start` y detrás de Nginx — error `UntrustedHost`).
- En Windows, Docker Desktop está instalado por usuario y `docker` puede no estar en el PATH de la terminal: usar `C:\Users\copor\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`.

### 7.2 QA y Producción — POSPUESTO (Fase 6)
- Servidor: Hetzner Cloud VPS. QA y Prod en el mismo VPS con contenedores Docker separados.
- Proxy: Nginx o Traefik en Docker enrutando por subdominio (ej. `qa.dominio.com` → QA, `app.dominio.com` → Prod).
- Cloudflare: solo DNS y proxy de seguridad (HTTPS).
- Recordar: `AUTH_TRUST_HOST=true`, `AUTH_SECRET` distinto por entorno, `prisma migrate deploy` en el arranque.

---

## 8. Plan de Ejecución y Estado

Seguir este orden estricto. Confirmar con el usuario al terminar cada paso.

### Fase 1: Inicialización y Base de Datos — ✅ COMPLETADA
- [x] 1. Proyecto Next.js (App Router) con Tailwind CSS.
- [x] 2. `docker-compose.yml` de desarrollo con PostgreSQL local.
- [x] 3. Prisma inicializado y modelo de datos (sección 4) en `schema.prisma`; migración `init`.
- [x] 4. Seeding: `seedUserExercises()` + `prisma/seed.ts`.

### Fase 2: Autenticación y Layout — ✅ COMPLETADA
- [x] 5. Auth.js con credenciales (email/contraseña), JWT, Argon2id; proxy + DAL.
- [x] 6. Asignación de ejercicios semilla al registrarse (`createUserWithDefaults`, transacción) + auto-login.
- [x] 7. Layout mobile-first con navegación inferior (Inicio, Calendario, Dashboard, Perfil) y estilo grimdark low-poly.

### Fase 3: Core CRUD y UI — ✅ COMPLETADA
- [x] 8. CRUD de Ejercicios (`/ejercicios`): listado alfabético con buscador, "+" abre modal "Nuevo ejercicio", lápiz abre modal "Renombrar ejercicio", archivar/restaurar, oferta de restaurar al crear un nombre archivado, aislamiento por usuario verificado.
- [x] 9. Creador de Rutinas (`/rutinas`, `/rutinas/[id]`): crear/renombrar/eliminar (con confirmación), agregar ejercicios desde un selector multi-selección con buscador (y crear ejercicios nuevos desde ahí), quitar, reordenar arrastrando o con teclado. Aislamiento por usuario verificado.

### Fase 4: Tracker de Entrenamiento — SIGUIENTE
- [ ] 10. Interfaz del Calendario.
- [ ] 11. Vista de "Sesión Activa": instanciar una rutina en el día actual y registrar rápidamente las series (serie, repeticiones, peso + unidad).

### Fase 5: Dashboard y PWA
- [ ] 12. Gráfico de Progresión de Carga Máxima (agrupar por sesión y extraer el MAX de peso por ejercicio).
- [ ] 13. PWA instalable (manifest, iconos, service worker).

### Fase 6: Dockerización para VPS (pospuesta hasta terminar el desarrollo local)
- [ ] 14. Dockerfile de producción para Next.js.
- [ ] 15. `docker-compose.prod.yml` para Hetzner con Nginx/Traefik para los subdominios de QA y Producción.

### Mejoras futuras acordadas (fuera del MVP actual)
- **Login con Google** (próxima iteración): agregar provider, hacer `password` opcional (migración) y crear el usuario con `createUserWithDefaults()` (find-or-create por email).
- Volver a la página solicitada (`callbackUrl`) tras el login; hoy siempre redirige a Inicio.
- Límite de intentos de login (proponer junto al despliegue).
- Selector de ejercicios: mostrar el ejercicio recién creado al inicio de la lista (hoy queda marcado en su posición alfabética).
- Revisar las 5 vulnerabilidades "high" que reporta `npm audit` en dependencias de terceros (no aplicar `--force` sin revisar).

---

## 9. Verificación y Pruebas

- Antes de dar un paso por terminado: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Pruebas E2E con Playwright** (navegador real, viewport móvil 390×844): se ejecutan desde el directorio temporal de Claude (no están en el repo ni son dependencia del proyecto). Cubren registro/login/logout, CRUD de ejercicios con modales y aislamiento entre usuarios (un usuario B no puede modificar ejercicios de A falsificando el id).
  - Levantar el servidor en el puerto 3100 y correr la suite **en `next dev` y en `next start`** (hay bugs que solo aparecen en uno de los dos, p. ej. Strict Mode).
  - Antes de interactuar tras un `reload()`/`goto()`, esperar la hidratación (`waitForLoadState("networkidle")`): el HTML del servidor ya muestra los datos, pero los eventos (teclado, arrastre) solo funcionan cuando React tomó el control.
  - Usuarios de prueba con email `e2e-…@trackapp.local`; **borrarlos al terminar** (primero sus `WorkoutSession`, luego el `User`).
  - En Windows, detener la tarea no siempre mata el proceso `node` hijo: liberar el puerto 3100 matando el proceso que escucha en él.
- Si en el futuro se quiere una suite E2E versionada, proponerlo al usuario (agregaría Playwright como devDependency).

---

## 10. Comandos Útiles (Desarrollo)

- `docker compose up -d` / `docker compose down`: levantar / detener PostgreSQL local.
- `npm run dev`: servidor de desarrollo (http://localhost:3000).
- `npm run build` + `npm run start`: build y servidor de producción local.
- `npx prisma migrate dev --name <nombre>`: crear y aplicar una migración.
  - Si falla con "environment is non-interactive" (pasa cuando hay advertencias, p. ej. agregar un `@@unique`): verificar que la advertencia no aplica, crear `prisma/migrations/<UTC yyyymmddHHMMSS>_<nombre>/migration.sql` con `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` y aplicar con `npx prisma migrate deploy` + `npx prisma generate`.
- `npx prisma generate`: regenerar el cliente (también corre en `postinstall`).
- `npx prisma db seed`: asignar ejercicios base a usuarios sin ejercicios.
- `npx prisma studio`: explorar la BD.
- `npm run lint`, `npx tsc --noEmit`: verificación estática.
