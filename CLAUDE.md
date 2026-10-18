# TrackApp — Contexto, Restricciones y Metodología (para Claude Code)

> Este archivo contiene solo lo **estable**: el contexto del proyecto, las reglas de trabajo, las restricciones y el plan. **No registra avance.**
>
> Documentos complementarios (leerlos al iniciar cualquier iteración):
> - **`ESPECIFICACIONES.md`**: especificación técnica vigente del sistema (stack, arquitectura, modelo de datos, componentes, estilos, convenciones, gotchas, pruebas y comandos).
> - **`bitacora.md`**: avance cronológico, estado de cada paso, decisiones tomadas (y quién las tomó), problemas encontrados y pendientes.
> - **`AGENTS.md`**: aviso de Next.js 16 (leer su documentación local antes de escribir código de Next).

---

## 1. Contexto del Proyecto

**TrackApp** es una aplicación web (PWA) para registrar de forma rápida y sin fricción la **sobrecarga progresiva** en rutinas de hipertrofia (orientada a un split de 5 días). Se usa desde el gimnasio, en el celular y con una mano: el usuario gestiona sus ejercicios y rutinas, planifica sus días en un calendario y registra series (repeticiones y peso) para ver su progresión.

- Repositorio: https://github.com/Coporto23/TrackApp (rama `main`).
- Idioma del producto y de la colaboración: **español** (textos de UI, documentación y comunicación). Identificadores de código en inglés.
- Entorno del usuario: Windows 11, Docker Desktop (instalado por usuario), Node 24. El usuario prueba la app con su propio `npm run dev` en `http://localhost:3000`.

---

## 2. Metodología de Trabajo (obligatoria)

1. **Orden estricto por pasos** según el plan (sección 6). **Al terminar cada paso, confirmar con el usuario** antes de avanzar.
2. **Consultar cualquier decisión con incertidumbre** (librerías, estructura, interpretación de la especificación, cambios al modelo de datos, UX no definida). Presentar opciones con una recomendación; no asumir.
3. **Validar antes de reportar** (ver `ESPECIFICACIONES.md` → Pruebas):
   - `npx tsc --noEmit`, `npm run lint`, `npm run build`.
   - Pruebas E2E con navegador real (Playwright en el directorio temporal de Claude, viewport móvil) **en `next dev` y en `next start`**.
   - Revisar capturas de pantalla para validar el diseño.
   - Borrar los usuarios de prueba (`e2e-…@trackapp.local`) al terminar.
4. **Reportar con honestidad**: qué se hizo, qué se validó, qué falló y cómo se corrigió, decisiones tomadas por iniciativa propia y pendientes.
5. **Commit + push solo con aprobación del usuario.** Mensajes con prefijo convencional (`feat:`, `fix:`, `docs:`…).
6. **Documentación al cerrar cada paso**:
   - `bitacora.md`: registrar avance, decisiones y problemas (siempre).
   - `ESPECIFICACIONES.md`: actualizar si cambió algo técnico (modelo, componentes, convenciones, estilos).
   - `CLAUDE.md`: **no se edita** salvo que cambien las reglas, las restricciones o el plan (y con acuerdo del usuario).
7. **El usuario itera sobre el diseño y la UX**: ante feedback, aplicar el cambio, volver a validar y mostrar el resultado. Las preferencias confirmadas pasan a ser convenciones (ver `ESPECIFICACIONES.md` → Convenciones UX).

---

## 3. Restricciones

### 3.1 Alcance y entorno
- **Solo desarrollo LOCAL.** QA y Producción (Fase 6) se configuran **únicamente al final**, cuando todo lo demás esté terminado.
- No hacer deploy, ni configurar servicios externos, ni agregar credenciales de terceros (p. ej. Google OAuth) sin pedido explícito.

### 3.2 Seguridad y datos
- **Aislamiento total por usuario**: no existen datos globales compartidos. Cada ejercicio, rutina, sesión y serie pertenece a un único usuario.
- **Toda lectura y Server Action verifica en el servidor** que los recursos pertenezcan al usuario autenticado (`getCurrentUser()` + filtro por `userId`). Nunca confiar en ids enviados por el cliente.
- **Comandos destructivos de BD** (`prisma migrate reset`, borrados masivos, etc.) requieren **consentimiento explícito del usuario** y solo se ejecutan contra la BD de desarrollo. Prisma además los bloquea si los invoca una IA.
- Las migraciones deben ser **no destructivas**; si una transforma datos, explicarlo antes.
- No versionar secretos (`.env` está en `.gitignore`; usar `.env.example`).

### 3.3 Técnicas
- **Versiones fijadas** (ver `ESPECIFICACIONES.md`): no actualizar dependencias mayores (Next, Prisma, Auth.js, Tailwind, dnd-kit) sin consultar. En particular **no pasar a Prisma 8** (la etiqueta `latest` del CLI apunta a una RC).
- **Next.js 16 tiene cambios incompatibles**: antes de escribir código de Next, consultar `node_modules/next/dist/docs/`. Con `cacheComponents: true`, la sesión, `params`, `searchParams` y `usePathname()` se leen **dentro de `<Suspense>`**.
- **No agregar librerías** sin consultar.
- **No matar el servidor de desarrollo del usuario** (puerto 3000). Si hay que probar en dev y ya está corriendo, usar ese servidor. Tras una migración de Prisma, pedirle que lo reinicie (conserva el cliente viejo en memoria).

### 3.4 Producto y diseño
- **Mobile-first**, uso con una mano, objetivos táctiles ≥ 44px.
- **Estilo aprobado**: grimdark low-poly (Dark Souls / RPG), sobrio, elegante, no tosco ni chocante. Solo tema oscuro. Cualquier cambio de estilo general se consulta.
- Textos en español con lenguaje **neutro en género** hacia el usuario.

---

## 4. Reglas de Negocio (MVP)

### 4.1 Ejercicios — aislamiento total
- Al **registrarse**, se copia al usuario una lista básica de ejercicios (Sentadilla, Press de Banca, etc.) asignándoles su `userId`. El usuario puede renombrarlos o eliminarlos libremente.
- "Eliminar" un ejercicio = **archivarlo**: se conserva su historial de series. Nombre único por usuario.

### 4.2 Rutinas y calendario
- Las rutinas son **plantillas** (ej. "Día Pecho") con ejercicios ordenados.
- En el **calendario** el usuario asigna una rutina (o un entrenamiento libre) a un día. Los ejercicios de la rutina **se copian al día como plantilla**: ese día se pueden agregar, quitar o reordenar ejercicios **sin modificar la rutina**. Actualizar la plantilla con los cambios del día es una **opción secundaria** y explícita.
- Desde el calendario se pueden **crear y editar rutinas y ejercicios** sin salir de él.
- Un entrenamiento por día. Se puede asignar a cualquier día (también futuros, para planificar).

### 4.3 Métricas de registro
- Por serie solo se registra: **número de serie, repeticiones y carga**. La carga es **peso en kg o lbs**, o **nivel** de máquina (número o texto corto, p. ej. "5", "B").
- Las series se registran **dentro de cada ejercicio del día** en el calendario.

### 4.4 Dashboard
- Gráfico de línea simple: **"Progresión de Carga Máxima"** (peso máximo levantado en una serie) filtrado por ejercicio a lo largo del tiempo.

### 4.5 Cuentas
- Registro con email y contraseña (Auth.js, sesión JWT), con auto-login. Login con Google: mejora futura planificada.

---

## 5. Stack Objetivo

Next.js (App Router) · Tailwind CSS · PostgreSQL · Prisma ORM · Auth.js (credenciales, JWT) · PWA (next-pwa o solución nativa) · Docker Compose · VPS Hetzner con Nginx/Traefik como reverse proxy · Cloudflare (DNS + proxy HTTPS).

Detalle de versiones y decisiones técnicas: `ESPECIFICACIONES.md`.

---

## 6. Plan de Ejecución

> El estado de cada paso y su detalle se registran en **`bitacora.md`**.

**Fase 1 — Inicialización y Base de Datos**
1. Proyecto Next.js (App Router) con Tailwind CSS.
2. `docker-compose.yml` de desarrollo con PostgreSQL local.
3. Prisma y modelo de datos en `schema.prisma`.
4. Seeding de ejercicios básicos y su asignación a cada usuario nuevo.

**Fase 2 — Autenticación y Layout**
5. Auth.js con credenciales (email/contraseña).
6. Asignación de los ejercicios semilla al registrarse.
7. Layout principal mobile-first con navegación inferior (Inicio, Calendario, Dashboard, Perfil).

**Fase 3 — Core CRUD y UI**
8. Gestión de Ejercicios (CRUD).
9. Creador de Rutinas (asignar ejercicios y ordenarlos).

**Fase 4 — Tracker de Entrenamiento**
10. Calendario (semana, asignar rutinas a los días).
11. Registro de series (repeticiones, carga y unidad) por ejercicio del día.

**Fase 5 — Dashboard y PWA**
12. Gráfico de Progresión de Carga Máxima (MAX de peso por ejercicio y sesión).
13. PWA instalable (manifest, iconos, service worker).

**Fase 6 — Dockerización para VPS** *(solo al final)*
14. Dockerfile de producción para Next.js.
15. `docker-compose.prod.yml` para Hetzner con Nginx/Traefik enrutando los subdominios de QA (`qa.dominio.com`) y Producción (`app.dominio.com`) en el mismo host; Cloudflare solo como DNS y proxy de seguridad.
