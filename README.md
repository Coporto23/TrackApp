# TrackApp

Aplicación web **mobile-first** para registrar la **sobrecarga progresiva** en rutinas de hipertrofia. Está pensada para usarse en el gimnasio, desde el celular y con una mano: se gestionan ejercicios y rutinas, se planifican los entrenamientos en un calendario, se registran las series (repeticiones y carga) y se visualiza la progresión en un dashboard.

---

## Tabla de contenidos

- [Funcionalidades](#funcionalidades)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Modelo de datos](#modelo-de-datos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Puesta en marcha local](#puesta-en-marcha-local)
- [Scripts disponibles](#scripts-disponibles)
- [Variables de entorno](#variables-de-entorno)
- [Despliegue](#despliegue)
- [Diseño](#diseño)

---

## Funcionalidades

### Cuentas
- Registro con email y contraseña, con inicio de sesión automático.
- Cada cuenta recibe una lista base de ejercicios (26, orientados a un split de 5 días) que puede renombrar o archivar.
- **Aislamiento total por usuario**: ningún dato se comparte entre cuentas.

### Ejercicios
- Listado alfabético con buscador (ignora tildes y mayúsculas).
- Crear y renombrar en modal; nombres únicos por usuario.
- "Eliminar" un ejercicio lo **archiva**: su historial de series se conserva y se puede restaurar.

### Rutinas
- Plantillas de entrenamiento (p. ej. "Día Pecho") con ejercicios ordenados.
- Reordenamiento arrastrando (táctil, mouse o teclado).
- Se pueden crear ejercicios nuevos desde el propio selector de la rutina.

### Calendario
- Semana vertical (lunes a domingo) que se cambia deslizando; un entrenamiento por día, en cualquier fecha (también futuras, para planificar).
- Al asignar una rutina a un día, sus ejercicios se **copian como plantilla del día**: ese día se pueden agregar, quitar o reordenar ejercicios sin modificar la rutina. Opcionalmente, la rutina puede actualizarse con los cambios del día.
- También se admite un entrenamiento libre.

### Registro de series
- Dentro de cada ejercicio del día: número de serie, repeticiones y carga.
- La carga puede ser **peso en kg o lbs**, o **nivel** de máquina (número o texto corto, como "5" o "B").
- Muestra las series de la última vez que se hizo el ejercicio como referencia.

### Dashboard
- Progresión **por ejercicio**, comparando hasta 4 a la vez, con rangos de 1M, 6M, 1A, 2A, todo o fechas personalizadas, y unidad kg/lbs.
- Cuatro métricas con resumen "antes → ahora": **carga máxima**, **1RM estimado** (fórmula de Epley), **volumen** y **series por semana**.
- **Constancia**: calendario mensual con los días entrenados, planificados y no realizados, con el detalle de cada día.
- **Registro**: tabla con todas las series del rango, incluidas las registradas por nivel.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions, Turbopack) |
| UI | React 19 · Tailwind CSS 4 |
| Base de datos | PostgreSQL 16 |
| ORM | Prisma 7 (driver adapter `pg`) |
| Autenticación | Auth.js v5 (credenciales, sesión JWT) · Argon2id para contraseñas |
| Validación | Zod |
| Gráficos | Recharts |
| Drag & drop | dnd-kit |
| Infraestructura | Docker · Traefik (proxy inverso y HTTPS con Let's Encrypt) |
| CI/CD | GitHub Actions · GitHub Container Registry |

---

## Arquitectura

### Renderizado y datos
- **Server Components** para las lecturas: cada página obtiene sus datos en el servidor, desde funciones de lectura en `src/lib/data/`.
- **Server Actions** para las mutaciones (`src/actions/`): validan la entrada con Zod, verifican al usuario y refrescan la vista.
- **Cache Components** de Next.js 16: los datos de runtime (sesión, parámetros de ruta y de búsqueda) se leen dentro de límites `<Suspense>`.

### Autorización en tres capas
1. **Proxy** (`src/proxy.ts`): comprobación optimista del JWT en cada petición; sin sesión redirige a `/login`.
2. **Data Access Layer** (`getCurrentUser()` en `src/lib/dal.ts`): verificación real de la sesión contra la base de datos.
3. **Consultas filtradas por usuario**: toda lectura y mutación filtra por el `userId` autenticado, de modo que un identificador ajeno enviado por el cliente no tiene efecto.

### Fechas
Las fechas de calendario viajan como texto `YYYY-MM-DD` y se guardan como `DATE`. La aritmética se hace en UTC para que un día nunca se desplace por la zona horaria; "hoy" se calcula en el navegador.

---

## Modelo de datos

```
User ─┬─< Exercise
      ├─< Routine ──< RoutineExercise >── Exercise
      └─< WorkoutSession ─┬─< SessionExercise >── Exercise
                          └─< Set >── Exercise
```

| Entidad | Descripción |
|---|---|
| `User` | Cuenta (email único, contraseña con hash Argon2id). |
| `Exercise` | Ejercicio del usuario; nombre único por usuario; archivable (`archivedAt`). |
| `Routine` / `RoutineExercise` | Plantilla y sus ejercicios ordenados (sin repetidos). |
| `WorkoutSession` | Entrenamiento de un día (uno por usuario y fecha), opcionalmente originado en una rutina. |
| `SessionExercise` | Ejercicios del día, copiados de la rutina al asignarla y editables de forma independiente. |
| `Set` | Serie: número, repeticiones y carga (`weight` + unidad `kg`/`lbs`, o `level` como texto corto). |

Un ejercicio con series registradas no se puede borrar físicamente (solo archivar), para proteger el historial.

---

## Estructura del proyecto

```
prisma/
  schema.prisma          Modelo de datos
  migrations/            Migraciones SQL
  seed.ts                Asigna los ejercicios base a usuarios sin ejercicios
src/
  proxy.ts               Protección de rutas (JWT)
  auth.ts, auth.config.ts Configuración de Auth.js
  actions/               Server Actions (auth, ejercicios, rutinas, sesiones, series, dashboard)
  app/
    (auth)/              Login y registro
    (app)/               Rutas autenticadas: inicio, ejercicios, rutinas, calendario, dashboard, opciones
  components/            Componentes de UI reutilizables (modal, paneles, listas ordenables, iconos…)
  lib/
    data/                Lecturas del servidor, filtradas por usuario
    validation/          Esquemas Zod
    progress.ts          Cálculos del dashboard (conversión de unidades, 1RM, agregaciones)
    dates.ts             Utilidades de fechas en UTC
deploy/                  Script de despliegue y configuración de Traefik
Dockerfile               Imágenes de producción (app y migraciones)
docker-compose.yml       PostgreSQL para desarrollo
docker-compose.prod.yml  Stack de un entorno desplegado (base de datos, migraciones, app)
```

---

## Puesta en marcha local

### Requisitos
- Node.js 24
- Docker (para PostgreSQL)

### Pasos

```bash
# 1. Dependencias (genera también el cliente de Prisma)
npm install

# 2. Variables de entorno
cp .env.example .env
# Generar AUTH_SECRET y pegarlo en .env:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. Base de datos
docker compose up -d
npx prisma migrate deploy

# 4. Servidor de desarrollo
npm run dev
```

La aplicación queda disponible en <http://localhost:3000>. Al registrar una cuenta se le asignan automáticamente los ejercicios base.

---

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con Turbopack. |
| `npm run build` | Build de producción. |
| `npm run start` | Sirve el build de producción. |
| `npm run lint` | ESLint. |
| `npx tsc --noEmit` | Verificación de tipos. |
| `npx prisma migrate dev --name <nombre>` | Crea y aplica una migración en desarrollo. |
| `npx prisma migrate deploy` | Aplica las migraciones pendientes. |
| `npx prisma db seed` | Asigna los ejercicios base a usuarios que no tienen ninguno. |
| `npx prisma studio` | Explorador visual de la base de datos. |

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL. |
| `AUTH_SECRET` | Secreto para firmar y cifrar el JWT de sesión. |
| `AUTH_TRUST_HOST` | `true`: necesario con `next start` y detrás de un proxy. |
| `AUTH_URL` | URL pública de la aplicación (solo en entornos desplegados detrás de un proxy). |
| `POSTGRES_*` | Usuario, contraseña, base y puerto del contenedor de desarrollo. |

Consulta `.env.example` como referencia. Los archivos `.env` no se versionan.

---

## Despliegue

El proyecto se despliega con contenedores en un servidor propio, con dos entornos independientes (QA y Producción), cada uno con su propia base de datos.

- **Ramas**: `develop` despliega a QA y `main` despliega a Producción. Los cambios se desarrollan en ramas propias (`feat/…`, `fix/…`) que se integran en `develop`.
- **Pipeline** (`.github/workflows/deploy.yml`):
  1. **Validar**: instalación, tipos y lint.
  2. **Construir**: imágenes `app` (servidor standalone de Next.js, usuario no root) y `migrate` (migraciones de Prisma), publicadas en GitHub Container Registry con el SHA del commit.
  3. **Desplegar**: por SSH ejecuta `deploy/deploy.sh`, que descarga las imágenes, aplica las migraciones y levanta la aplicación esperando su healthcheck.
- **Proxy**: Traefik enruta por subdominio y gestiona los certificados HTTPS de Let's Encrypt. Solo el proxy expone puertos.
- **Volver atrás**: basta con volver a desplegar la imagen de un commit anterior.

---

## Diseño

- **Mobile-first**, pensado para usarse con una mano; objetivos táctiles de al menos 44 px y navegación inferior fija.
- Estética **grimdark low-poly**: paleta de piedra y ceniza con un único acento de brasa, esquinas biseladas, fondo de triángulos e iconografía propia.
- Tipografías Cinzel (títulos) y Alegreya Sans (texto). Solo tema oscuro.
- Interfaz en español con lenguaje neutro en género.
