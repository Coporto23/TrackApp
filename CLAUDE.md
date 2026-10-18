Documento de Arquitectura y Especificaciones (Contexto para Claude Code)

0. Reglas de Trabajo (Obligatorias)

- Desarrollo exclusivamente en LOCAL. La configuración de QA y luego de Producción (Fase 6) se hace solo cuando todo lo demás esté terminado.
- Consultar al usuario cualquier decisión en la que no haya certeza (librerías, estructura, interpretación de la especificación, discrepancias). No asumir.
- Confirmar con el usuario al terminar cada paso antes de avanzar al siguiente.
- Next.js 16 tiene cambios incompatibles con versiones anteriores: antes de escribir código de Next.js, consultar la guía correspondiente en `node_modules/next/dist/docs/` (ver AGENTS.md).
- Prisma bloquea comandos destructivos (`migrate reset`, etc.) invocados por IA: requieren consentimiento explícito del usuario y solo se ejecutan contra la BD de desarrollo.

1. Descripción del Proyecto

Aplicación Web (PWA) orientada al registro rápido y eficiente de la sobrecarga progresiva en rutinas de hipertrofia (enfocado en un split de 5 días). La aplicación permite al usuario registrar ejercicios, rutinas y series diarias sin fricción desde el gimnasio.

2. Stack Tecnológico (Full-Stack Monorepo)

Framework Core: Next.js 16 (App Router, TypeScript, directorio `src/`, alias `@/*`, Turbopack).

Estilos / UI: Tailwind CSS v4.

Base de Datos: PostgreSQL 16 (en desarrollo: contenedor Docker `trackapp-db-dev`).

ORM: Prisma ORM 7.10.1 (versiones fijadas; NO actualizar a la 8.x sin consultar). Usa el generador `prisma-client` (cliente generado en `src/generated/prisma`, ignorado en git y regenerado en `postinstall`) y el driver adapter `@prisma/adapter-pg`. Configuración en `prisma7.config.ts` (nombre por defecto de Prisma 7.10).

Autenticación: Auth.js (NextAuth) con estrategia de sesión basada en JWT.

PWA: next-pwa (o solución nativa de Next.js) para manifest y service workers.

Infraestructura: Docker (Docker Compose) para despliegue en VPS (Hetzner) con Nginx como Reverse Proxy. Cloudflare manejará el DNS y protección (Proxy).

3. Alcance del MVP (Reglas de Negocio)

Gestión de Ejercicios (Aislamiento Total): No existen ejercicios "globales" compartidos en la base de datos. Cada ejercicio le pertenece exclusivamente a un usuario.

Regla: Al momento de que un nuevo usuario se registra, el sistema debe ejecutar un seeder/acción que copie una lista básica de ejercicios (Sentadilla, Press de Banca, etc.) y los guarde en la tabla de ejercicios asignando inmediatamente el userId de ese nuevo usuario. El usuario tiene libertad total para renombrarlos o eliminarlos.

- Definido: "eliminar" un ejercicio = ARCHIVAR (campo `archivedAt`). El ejercicio desaparece de listas y rutinas, pero sus series históricas y el dashboard se conservan. La BD impide borrar físicamente un ejercicio que tenga series.
- Definido: el nombre de un ejercicio y de una rutina es único por usuario (`@@unique([userId, name])`). Pendiente para Fase 3: si el usuario crea un ejercicio con el mismo nombre que uno archivado, ofrecer restaurar el archivado.
- Lista semilla: 26 ejercicios del split de 5 días (Pecho, Espalda, Piernas, Hombros, Brazos) en `src/lib/default-exercises.ts`.

Calendario y Rutinas: Las rutinas son plantillas (ej. "Día Pecho"). El usuario selecciona un día en el calendario, carga la plantilla y puede agregar/quitar ejercicios sobre la marcha durante la sesión.

Métricas de Registro: Solo se registra: Número de Serie, Repeticiones, y Peso. El peso puede ser en kg, lbs, o nivel.

Dashboard: Gráfico de línea simple que muestra la "Progresión de Carga Máxima" (peso máximo levantado en 1 serie) filtrado por ejercicio a lo largo del tiempo.

4. Modelo de Datos (Implementado en `prisma/schema.prisma`)

El esquema implementa las siguientes entidades y relaciones (todas con id `cuid()` y `createdAt`):

User: id, email (único), password (hashed), createdAt.

Exercise: id, name, userId (Relación requerida al User - Aislamiento total), archivedAt (opcional). Único (userId, name).

Routine: id, name, userId. Único (userId, name).

RoutineExercise: id, routineId, exerciseId, order (Entero para ordenar). Se borra en cascada con su rutina o ejercicio.

WorkoutSession: id, userId, date (solo fecha, `@db.Date`), originRoutineId (Opcional, null si es entrenamiento libre; al borrar la rutina queda en null).

Set: id, sessionId, exerciseId, setNumber, reps, weight (`Decimal(6,2)`), weightUnit (Enum: 'kg', 'lbs', 'level'; por defecto 'kg'). Se borra en cascada con su sesión.

Reglas de borrado relevantes:
- Borrar un User borra en cascada sus ejercicios, rutinas y sesiones.
- Set → Exercise es `NoAction`: un ejercicio con series no se puede borrar (solo archivar).
- Consecuencia: un User con series NO se puede borrar directo. Si se implementa "eliminar cuenta", hacerlo en una transacción: primero borrar sus WorkoutSession (y con ellas sus Set) y luego el User.
- Aislamiento: Set no tiene userId; la pertenencia se valida vía su sesión. Toda Server Action debe verificar que sesión, ejercicio y rutina pertenezcan al usuario autenticado.

5. Infraestructura y Despliegue (QA y Producción)

Estado: POSPUESTO hasta terminar el desarrollo local (ver sección 0).

Servidor: Hetzner Cloud VPS.

Entornos: Ambos entornos (QA y Prod) vivirán en el mismo VPS utilizando contenedores Docker separados.

Proxy: Configurar Nginx o Traefik dentro de Docker para enrutar el tráfico basado en subdominios (ej. qa.dominio.com va al contenedor de pruebas, app.dominio.com al de producción).

Cloudflare: Actuará solo como DNS y Proxy de seguridad (HTTPS).

Desarrollo local (implementado):
- `docker-compose.yml`: solo PostgreSQL 16 de desarrollo (`docker compose up -d`). Credenciales por defecto en `.env.example`; copiar a `.env`.
- En Windows, Docker Desktop está instalado por usuario y `docker` puede no estar en el PATH de la terminal: usar `C:\Users\copor\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`.

6. Plan de Ejecución (Instrucciones para Claude Code)

Claude, por favor sigue este orden estricto de implementación. Confirma conmigo al terminar cada paso antes de avanzar al siguiente:

Fase 1: Inicialización y Base de Datos — COMPLETADA

[x] 1. Inicializa el proyecto Next.js (App Router) con Tailwind CSS.

[x] 2. Configura el archivo docker-compose.yml de desarrollo para levantar una instancia de PostgreSQL local.

[x] 3. Instala e inicializa Prisma. Traduce el modelo de datos (Sección 4) a schema.prisma. (Migración `init` aplicada.)

[x] 4. Crea el script de Seeding que contiene los ejercicios básicos, y la lógica para que al crear un usuario (Fase 2) se inserten estos ejercicios con su userId.
   - `src/lib/seed-user-exercises.ts` → `seedUserExercises(db, userId)`: idempotente, acepta un cliente de transacción. Usarla en la MISMA transacción que crea el User.
   - `prisma/seed.ts` (`npx prisma db seed`): asigna los ejercicios a usuarios existentes sin ejercicios.
   - Cliente Prisma singleton: `src/lib/prisma.ts`.

Fase 2: Autenticación y Layout — SIGUIENTE
5. Configura Auth.js (NextAuth) con credenciales (Email/Password).
6. Asegúrate de implementar el trigger (vía API route o Server Action) que asigne los ejercicios semilla al momento de un registro exitoso.
7. Crea el Layout principal (Mobile-first, diseño limpio para gimnasio) con la navegación inferior (Inicio, Calendario, Dashboard, Perfil).

Fase 3: Core CRUD y UI
8. Desarrolla las Server Actions y la interfaz (Páginas/Componentes) para gestionar los Ejercicios (CRUD).
9. Desarrolla el creador de Rutinas (asignar ejercicios y ordenarlos).

Fase 4: Tracker de Entrenamiento
10. Construye la interfaz del Calendario.
11. Desarrolla la vista de "Sesión Activa": Interfaz que permita instanciar una rutina en el día actual y registrar rápidamente las series (set, repeticiones, peso).

Fase 5: Dashboard y PWA
12. Implementa el gráfico de Progresión de Carga Máxima (consulta SQL/Prisma que agrupe por sesión y extraiga el MAX de peso por ejercicio).
13. Configura next-pwa para asegurar que la app es instalable y los iconos del manifest son correctos.

Fase 6: Dockerización para VPS (pospuesta hasta terminar el desarrollo local)
14. Crea el Dockerfile de producción para Next.js.
15. Crea un docker-compose.prod.yml que estructure el entorno para Hetzner (incluyendo Nginx/Traefik para gestionar los subdominios de QA y Producción en el mismo host).

7. Comandos Útiles (Desarrollo)

- `docker compose up -d` / `docker compose down`: levantar / detener PostgreSQL local.
- `npm run dev`: servidor de desarrollo.
- `npx prisma migrate dev --name <nombre>`: crear y aplicar una migración.
- `npx prisma generate`: regenerar el cliente (también corre en `postinstall`).
- `npx prisma db seed`: asignar ejercicios base a usuarios sin ejercicios.
- `npx prisma studio`: explorar la BD.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`: verificación.
