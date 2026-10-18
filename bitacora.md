# TrackApp — Bitácora de Desarrollo

> Registro cronológico del avance: qué se hizo en cada paso, **decisiones tomadas** (marcadas como *Usuario* o *Técnica*), problemas encontrados y cómo se resolvieron, y pendientes. Se actualiza al cerrar cada paso. Las reglas están en `CLAUDE.md` y la especificación vigente en `ESPECIFICACIONES.md`.

---

## Estado actual

| Fase | Paso | Estado |
|---|---|---|
| 1. Inicialización y BD | 1. Next.js + Tailwind | ✅ Finalizado |
| | 2. Docker Compose (PostgreSQL dev) | ✅ Finalizado |
| | 3. Prisma + modelo de datos | ✅ Finalizado |
| | 4. Seeding de ejercicios | ✅ Finalizado |
| 2. Auth y Layout | 5. Auth.js con credenciales | ✅ Finalizado |
| | 6. Ejercicios semilla al registrarse | ✅ Finalizado |
| | 7. Layout mobile-first + navegación inferior | ✅ Finalizado |
| 3. Core CRUD | 8. CRUD de ejercicios | ✅ Finalizado |
| | 9. Creador de rutinas | ✅ Finalizado |
| 4. Tracker | 10. Calendario | ✅ Finalizado |
| | 11. Registro de series | ✅ Finalizado (integrado en el calendario) |
| 5. Dashboard y PWA | 12. Dashboard de progresión | ✅ Finalizado |
| | 13. PWA instalable | ⏭️ Siguiente |
| 6. Docker VPS | 14. Dockerfile de producción | Pendiente (solo al final) |
| | 15. `docker-compose.prod.yml` + Nginx/Traefik | Pendiente (solo al final) |

**Commits en `main`**: `b052645` init · `4d591c1` Prisma + seeding · `5afe2f0` auth + layout · `3d95d53` ejercicios · `7a3f369` rutinas · `035077e` calendario + series (pasos 10–11) · dashboard (paso 12).

---

## Pendientes y decisiones abiertas

- **Mejoras futuras acordadas**:
  - Dashboard: tarjeta de **récords personales** (excluida del paso 12 por el usuario).
  - Dashboard: alguna forma de **graficar la progresión en niveles** (hoy solo aparecen en la tabla).
  - Login con Google (próxima iteración): provider de Google, `password` opcional (migración) y creación con `createUserWithDefaults()` (buscar o crear por email).
  - Volver a la página solicitada (`callbackUrl`) tras el login; hoy siempre va a Inicio.
  - Límite de intentos de login (proponer junto al despliegue).
  - Selector de ejercicios: mostrar el recién creado al inicio de la lista.
  - Revisar las 5 vulnerabilidades "high" de `npm audit` en dependencias de terceros (sin `--force`).

---

## 2026-10-17

### Paso 1 — Inicialización Next.js + Tailwind
- `create-next-app` (Next 16.4.2, React 19, TypeScript, Tailwind v4, ESLint, `src/`, alias `@/*`, Turbopack). Se generó en una carpeta temporal y se movió a la raíz para no chocar con `CLAUDE.md`.
- Remoto `origin` → `github.com/Coporto23/TrackApp`, rama `main`.
- **Decisión (Usuario)**: trabajar **solo en local**; QA y Producción al final. El `docker-compose.yml` es solo de desarrollo (había ambigüedad con el pedido inicial de "QA y Producción").
- **Decisión (Usuario)**: consultar toda decisión con incertidumbre.
- Next 16 generó `AGENTS.md` (aviso de cambios incompatibles): se versiona.

### Paso 2 — Docker Compose de desarrollo
- PostgreSQL 16 alpine (`trackapp-db-dev`), volumen persistente, healthcheck; `.env.example` versionado.
- **Problema**: Docker Desktop instalado por usuario, sin `docker` en el PATH de la shell. **Solución**: ruta completa a `docker.exe`.
- Validado: `docker compose config`, `up --wait` (healthy), `select version()`.

### Paso 3 — Prisma y modelo de datos
- **Decisión (Técnica)**: Prisma **7.10.1** fijado (la etiqueta `latest` del CLI apuntaba a una RC de la 8.0). Generador `prisma-client` + adapter `pg`; `prisma init` usa `prisma7.config.ts`.
- **Decisiones (Usuario)**:
  - Eliminar un ejercicio = **archivar** (`archivedAt`).
  - Peso como `Decimal(6,2)`.
  - Nombre de ejercicio/rutina **único por usuario**.
  - Lista semilla de **26 ejercicios** del split de 5 días.
- **Decisión (Usuario)**: borrar las carpetas de "skills" para IA que creó `prisma init` (`.agents/`, `.claude/skills/`, `.windsurf/`, `skills-lock.json`).
- **Problema**: borrar un User con series fallaba (la cascada User→Exercise se evalúa antes que User→Session→Set, y Set→Exercise protege el historial). Se probó `Restrict` y luego `NoAction`. **Decisión (Usuario)**: mantener la protección en la BD; si se implementa "eliminar cuenta", borrar primero las sesiones.
- `prisma migrate reset` ejecutado con **consentimiento explícito** del usuario (BD dev con datos de prueba) para regenerar la migración `init`.

### Paso 4 — Seeding
- `seedUserExercises(db, userId)` (idempotente, acepta transacción) + `prisma/seed.ts`.
- Verificado: 26 ejercicios, re-seed sin duplicados, nombre duplicado rechazado, serie Decimal exacta (82.5).
- Commits `b052645` y `4d591c1`; primer push. `CLAUDE.md` actualizado.

### Paso 5 — Auth.js (credenciales)
- **Decisiones (Usuario)**:
  - Auth.js **v5 beta.32** (diseñado para App Router).
  - **Argon2id** para las contraseñas.
  - Registro email + contraseña + confirmación con **auto-login**, lo más simple posible.
  - **Login con Google** como mejora futura, dejando listo el punto único de creación de usuarios.
- **Decisión (Técnica)**: tres capas de autorización: proxy (JWT), DAL `getCurrentUser()` y verificación en cada acción. Ruta `/salir` para sesiones huérfanas.
- **Problemas**:
  - El proxy de Next 16 no aceptaba un export desestructurado; se resolvió con `export default`.
  - `next start` rechazaba el login con `UntrustedHost`; se resolvió con `AUTH_TRUST_HOST=true`.
  - El login mostraba "credenciales incorrectas" ante cualquier `AuthError`; ahora solo lo dice cuando las credenciales realmente fallan (`CredentialsSignin`).
  - Detener la tarea no mataba el `node` hijo en Windows; se libera el puerto manualmente.

### Paso 6 — Ejercicios semilla al registrarse
- `createUserWithDefaults()`: User + 26 ejercicios en una transacción.
- E2E de auth: 13 comprobaciones OK.

### Paso 7 — Layout y estilo
- **Decisión (Usuario)**: estilo **grimdark low-poly** (Dark Souls / RPG), no tosco ni chocante. Implementado: paleta piedra/ceniza + brasa, Cinzel + Alegreya Sans, esquinas biseladas, fondo de triángulos, iconos propios.
- Rutas `(auth)` y `(app)`, `BottomNav` (Inicio, Calendario, Dashboard, Perfil).
- **Problema**: Tailwind v4 no permitía `@apply` de clases propias; se declararon como `@utility`.
- Usuario probó el login y aprobó el diseño. Commit `5afe2f0`.

---

## 2026-10-18

### Paso 8 — CRUD de ejercicios
- **Decisiones (Usuario)**: acceso a Ejercicios y Rutinas **desde Inicio**; **sin grupo muscular**.
- Primera versión con un input de creación visible en la página. **Feedback (Usuario)**: parecía que la sección era solo para ingresar ejercicios. **Cambio**: listado protagonista + "+" → **modal** con Cancelar/Aceptar, igual para renombrar. Pasa a ser convención de UX.
- **Problema**: el modal no abría en `npm run dev` (en producción sí). **Causa**: en Strict Mode, el cleanup del efecto llamaba `dialog.close()`, que disparaba `onClose`. **Solución**: no cerrar en el cleanup. **Lección**: validar siempre también en `next dev`.
- E2E: 19 comprobaciones OK en dev y prod. `CLAUDE.md` reescrito como documento completo. Commit `3d95d53`.

### Paso 9 — Creador de rutinas
- **Decisiones (Usuario)**:
  - Reordenar **arrastrando** (`@dnd-kit`).
  - Eliminar una rutina con **confirmación**; las sesiones pasadas se conservan.
  - **Sin ejercicios repetidos** en una rutina.
- Migración `routine_exercise_unique`.
- **Feedback (Usuario)**:
  1. Crear una rutina **no debe navegar** a su detalle.
  2. Poder **crear ejercicios desde el selector** de la rutina, sin volver a Ejercicios.
  Ambos implementados (el segundo como vista "crear" dentro del modal) y convertidos en convenciones de UX.
- **Problemas**:
  - **Migración interactiva**: `migrate dev` no funciona en una shell no interactiva cuando hay advertencias. Se resolvió generando el SQL con `migrate diff` y aplicándolo con `migrate deploy`.
  - **`usePathname()` en ruta dinámica**: se leía fuera de `<Suspense>` (error de build). Se envolvió en `<Suspense>`.
  - **Selector desplazado**: el modal se movía al marcar una casilla, porque los checkbox `sr-only` no tenían una fila `relative` como ancla.
  - **Caché de Turbopack**: clases Tailwind nuevas no se aplicaban en dev; se resolvió borrando `.next`.
  - **Prueba de teclado intermitente**: el script presionaba teclas antes de la hidratación; se agregó la espera.
- E2E: 32 comprobaciones de rutinas OK. Commit `7a3f369`.

### Paso 10 — Calendario
- **Decisiones (Usuario)**:
  - Semana deslizable.
  - **Cualquier día, incluidos futuros** (planificación).
  - **Un entrenamiento por día**.
  - Abrir y eliminar desde el calendario.
  - Al crear, **quedarse en el calendario**.
- **Decisión (Usuario)**: la rutina asignada es una **plantilla del día**; los cambios del día **no alteran la rutina**, con la opción de "guardar en la rutina". Para eso se creó la tabla **`SessionExercise`** (copia de los ejercicios al asignar) y la restricción única (userId, date). Migración `session_exercises`.
- **Decisión (Usuario)**: desde el calendario se deben poder **crear y editar rutinas y ejercicios** sin salir. Se agregó "Crear rutina nueva" dentro del modal de asignar.
- **Decisión (Técnica)**: el día seleccionado vive en la URL (`?d=YYYY-MM-DD`); "hoy" se calcula en el navegador (el servidor no conoce la zona horaria). Fechas en UTC.
- **Rediseño (Usuario)**: la semana completa en **vertical**, con cada entrenamiento como **tarjeta dentro de su día** (estilo Google Calendar). Implementado con detalle desplegable en la misma fila.
- **Problemas**:
  - **Deslizar con mouse**: no funcionaba por el drag nativo de los enlaces (`dragstart` → `pointercancel`). Se previno el drag nativo.
  - **Deslizar sobre días vacíos**: no funcionaba porque el gesto se ignoraba sobre botones. Ahora solo se excluyen la manija, los campos y los modales.
  - **Constante server-only**: una constante importada desde un módulo `server-only` rompía el cliente; se movió a `lib/constants.ts`.
- **Incidente**: se borró `.next` mientras corría el `npm run dev` del usuario (puerto 3000). Se verificó que siguiera sano. Desde entonces: **no tocar su servidor** y usarlo para las pruebas en dev.

### Paso 11 — Registro de series (integrado en el calendario)
- **Feedback (Usuario)**: el botón "Guardar en la rutina" parecía obligatorio. **Cambio**: pasó a enlace discreto "Actualizar plantilla «…» con este día…" con confirmación.
- **Feedback (Usuario)**: las series se registran **desplegando cada ejercicio**, no con un botón aparte. **Cambio**: `SortableExerciseList` con detalle desplegable y `SetLogger`.
  - Funciones: agregar, editar y eliminar series (con renumeración), "Última vez" y totales en la tarjeta.
  - Restricción: un ejercicio con series no se puede quitar del día.
  - El paso 11 ("sesión activa") queda **cumplido dentro del calendario**, sin pantalla aparte.
- **Feedback (Usuario)**: limpiar el formulario tras cada serie. Ahora queda vacío y solo se recuerda la unidad.
- **Feedback (Usuario)**: reps solo números; peso solo números; con **nivel**, permitir letras o texto corto ("A", "B"…).
  - **Decisión (Técnica)**: nuevo campo `Set.level` (`VarChar(10)`) y `weight` opcional. Migración `set_level_text` (incluye la conversión de niveles numéricos existentes; no había ninguno).
  - Filtros de entrada en vivo + validación Zod en el servidor (13 casos probados).
- **Problemas**:
  - **Unidades aplastadas**: los botones de unidad (kg/lbs/nivel) no cabían en la tarjeta en el celular (31 px). Se reemplazaron por un `<select>` compacto y se igualó la altura de los campos.
  - **Dev server tras migrar**: el `npm run dev` del usuario quedó con el cliente Prisma viejo en memoria ("Unknown field `level`"). Se le pidió reiniciarlo y se validó en producción mientras tanto.
- E2E del calendario: **42 comprobaciones OK** (semana, asignación, plantilla, series, filtros, "última vez", gestos, aislamiento de sesiones y series entre usuarios). Rutinas y ejercicios sin regresiones.
- Documentación reorganizada: `CLAUDE.md` (reglas y contexto), `ESPECIFICACIONES.md` (técnica) y `bitacora.md` (este archivo).

### Paso 12 — Dashboard (planificación)
- **Decisión (Usuario)**: **no** agregar un botón "Editar rutina" en la tarjeta del día por ahora (cierra la pregunta del paso 10).
- **Objetivo (Usuario)**: ver gráficamente si se progresa en cada ejercicio, comparando la carga de antes con la de ahora, con rangos de **1 mes, 6 meses, 1 año, 2 años** y más.
- **Decisiones (Usuario)**:
  - Vistas: **carga máxima**, **1RM estimado**, **volumen**, **series por semana** y **constancia**. **Récords personales** queda fuera por ahora.
  - Gráficos **por ejercicio**, con la posibilidad de **comparar varios** a la vez (p. ej. Press de Banca + Press Inclinado).
  - Selector de unidad **kg / lbs** con conversión.
  - Las series en **nivel** no se grafican (no son una medida comparable). Al elegir "nivel" en el registro se muestra un aviso que lo explica. Graficar niveles queda como mejora futura.
  - **Tabla de registro** al final con la información en duro, donde **sí se ven los niveles**.
  - **Constancia** como calendario mensual ordenado (lunes a domingo) con el **detalle del día al tocarlo**.
  - Diseño de **tarjetas apiladas** (maqueta B), aprobado tras revisar dos rondas de maquetas en el navegador.
  - **Recharts** como librería de gráficos (fijada en 3.10.1).
  - Hasta **4 ejercicios** a la vez. La paleta cálida propuesta (ember, oro, hueso, óxido) no pasó la validación de accesibilidad (ember y oro se confunden); el usuario eligió una **paleta validada apagada**: brasa `#d06e24`, acero `#4d8fd1`, oro viejo `#a99236`, malva `#b4659f`.
- **Decisiones (Técnica)**, detalladas en `ESPECIFICACIONES.md` § 5.2: 1RM con Epley y solo series de 1–12 reps; volumen por semana (1M) o por mes (resto); rango por defecto 6M; ejercicios elegidos en la URL (`?e=`); rango y unidad en `localStorage`; la tabla muestra cada peso en su unidad registrada; el selector lista solo ejercicios con historial (incluidos los archivados); sin cambios al modelo de datos.
- **Revisión de la especificación** (revisor independiente): se resolvieron como *Técnica* los ejercicios solo con niveles (sí dibujan línea en "series por semana"), los periodos sin series (valen 0) y la carga máxima de un día con unidades mezcladas (la más pesada en kg, mostrada en su unidad).
- **Decisión (Usuario)**: en la constancia, un día pasado con entrenamiento asignado y sin series tiene un estado propio **"no realizado"**.
- El usuario aprobó la especificación y pidió proceder con el desarrollo.

### Paso 12 — Dashboard (desarrollo)
- Implementado según `ESPECIFICACIONES.md` § 5.2: filtros (hasta 4 ejercicios, rango 1M–Todo, kg/lbs), tarjetas de carga máxima, 1RM estimado, volumen y series por semana con "antes → ahora", constancia mensual con detalle del día y estados (entrenado, planificado, no realizado, descanso), tabla de registro con niveles y aviso de "nivel" en el registro de series. Sin cambios al modelo de datos.
- **Problema**: la paleta cálida aprobada (ember, oro, hueso, óxido) **no pasó la validación** de accesibilidad (ember y oro se confunden incluso con visión normal). Se mostró la comparación al usuario y eligió una **paleta validada apagada** (brasa, acero, oro viejo, malva).
- **Problema**: la selección inicial elegía el último ejercicio registrado aunque fuera solo de niveles (sin gráficos de carga). **Solución (Técnica)**: el último con series de peso; si no hay, el último en general.
- **Problema**: en las capturas, volumen y series mostraban caídas y variaciones falsas (+159%) por periodos incompletos (el primero, cortado por el rango, y el mes en curso). **Solución (Técnica)**: los gráficos por periodo parten del primer periodo completo y "antes → ahora" compara solo periodos completos.
- **Refactor**: `useToday` pasó de `week-view.tsx` a `src/lib/hooks.ts` para compartirlo con el dashboard.
- **Entorno**: Docker Desktop y la BD estaban apagados; se iniciaron (`docker compose up -d`). El dev server del usuario (puerto 3000) no estaba corriendo, así que las pruebas en dev usaron un `next dev` propio en el 3100, ya detenido.
- **Validación**: `tsc`, `lint` y `build` OK. Cálculos: 27 comprobaciones unitarias (`tsx`). E2E del dashboard (viewport 390×844, ~14 meses de historial sembrado): **todas OK en `next dev` y en `next start`**. E2E del calendario sin regresiones. Capturas revisadas. Usuarios `e2e-…` borrados.
- Revisado por el usuario en su `npm run dev`.

### Paso 12 — Ajustes tras la revisión del usuario
- **Feedback (Usuario)**: "1 issue" en el indicador de Next.js. **No se pudo reproducir**: se recorrieron todas las páginas en `next dev` (usuario vacío, con ~14 meses de historial y con datos como los de su cuenta) sin issues en el indicador ni advertencias en consola o servidor. *Pendiente*: que el usuario comparta el texto del issue.
- **Feedback (Usuario)**: agregar un **rango de fechas personalizado**. **Decisión (Usuario)**: 6.º botón "Fechas" en el rango que abre un modal Desde / Hasta. Implementado (ver `ESPECIFICACIONES.md` § 5.2); la unidad pasó a la fila de abajo para que los 6 botones tengan ≥ 44 px *(técnica)*.
- **Decisión (Usuario)**: datos de prueba en su cuenta (`viper.9936@…`), con un 3.er ejercicio para cubrir las 3 tendencias: **Press de Banca sube** (60 → 75 kg), **Cruce de Poleas baja** (30 → 15 kg) y **Press Inclinado con Mancuernas se mantiene** (24 kg). Lunes y jueves del 20 abr al 15 oct 2026: **51 sesiones, 459 series**, como "Entrenamiento libre". Se omitió el 12 oct (ya tenía un entrenamiento suyo). El script `seed-demo.mjs` (scratchpad de Claude) guarda los ids y con `--undo` borra solo lo insertado.
- **Validación**: `tsc`, `lint`, `build` OK; 36 comprobaciones unitarias; E2E del dashboard (con rango personalizado) **OK en `next dev` y `next start`**; usuarios `e2e-…` borrados.
- **Feedback (Usuario)**: al cambiar de pestaña volvía Press de Banca como predeterminado y se perdían los gráficos elegidos. **Causa**: la selección vivía solo en la URL (`?e=`), que la barra inferior no conserva, y sin `?e=` se elegía un ejercicio por defecto. **Decisión (Usuario)**: sin ejercicio predeterminado y recordar la selección junto con el rango y las opciones. **Solución (Técnica)**: cookie `trackapp-dashboard-exercises` leída por el servidor; se eliminó la selección por defecto. E2E nuevas: sin selección inicial, volver desde Calendario y recargar conservan ejercicios, rango y unidad. OK en dev (contra el `npm run dev` del usuario en :3000) y en `next start`; el indicador de Next no mostró issues.
- **Cierre**: el usuario aprobó el paso 12 y pidió commit + push.
