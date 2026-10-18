Documento de Arquitectura y Especificaciones (Contexto para Claude Code)

1. Descripción del Proyecto

Aplicación Web (PWA) orientada al registro rápido y eficiente de la sobrecarga progresiva en rutinas de hipertrofia (enfocado en un split de 5 días). La aplicación permite al usuario registrar ejercicios, rutinas y series diarias sin fricción desde el gimnasio.

2. Stack Tecnológico (Full-Stack Monorepo)

Framework Core: Next.js (App Router).

Estilos / UI: Tailwind CSS.

Base de Datos: PostgreSQL.

ORM: Prisma ORM.

Autenticación: Auth.js (NextAuth) con estrategia de sesión basada en JWT.

PWA: next-pwa (o solución nativa de Next.js) para manifest y service workers.

Infraestructura: Docker (Docker Compose) para despliegue en VPS (Hetzner) con Nginx como Reverse Proxy. Cloudflare manejará el DNS y protección (Proxy).

3. Alcance del MVP (Reglas de Negocio)

Gestión de Ejercicios (Aislamiento Total): No existen ejercicios "globales" compartidos en la base de datos. Cada ejercicio le pertenece exclusivamente a un usuario.

Regla: Al momento de que un nuevo usuario se registra, el sistema debe ejecutar un seeder/acción que copie una lista básica de ejercicios (Sentadilla, Press de Banca, etc.) y los guarde en la tabla de ejercicios asignando inmediatamente el userId de ese nuevo usuario. El usuario tiene libertad total para renombrarlos o eliminarlos.

Calendario y Rutinas: Las rutinas son plantillas (ej. "Día Pecho"). El usuario selecciona un día en el calendario, carga la plantilla y puede agregar/quitar ejercicios sobre la marcha durante la sesión.

Métricas de Registro: Solo se registra: Número de Serie, Repeticiones, y Peso. El peso puede ser en kg, lbs, o nivel.

Dashboard: Gráfico de línea simple que muestra la "Progresión de Carga Máxima" (peso máximo levantado en 1 serie) filtrado por ejercicio a lo largo del tiempo.

4. Modelo de Datos (Esquema Prisma Propuesto)

El esquema debe implementar las siguientes entidades y relaciones:

User: id, email, password (hashed), createdAt.

Exercise: id, name, userId (Relación requerida al User - Aislamiento total).

Routine: id, name, userId.

RoutineExercise: id, routineId, exerciseId, order (Entero para ordenar).

WorkoutSession: id, userId, date, originRoutineId (Opcional, null si es entrenamiento libre).

Set: id, sessionId, exerciseId, setNumber, reps, weight (Decimal/Float), weightUnit (Enum: 'kg', 'lbs', 'level').

5. Infraestructura y Despliegue (QA y Producción)

Servidor: Hetzner Cloud VPS.

Entornos: Ambos entornos (QA y Prod) vivirán en el mismo VPS utilizando contenedores Docker separados.

Proxy: Configurar Nginx o Traefik dentro de Docker para enrutar el tráfico basado en subdominios (ej. qa.dominio.com va al contenedor de pruebas, app.dominio.com al de producción).

Cloudflare: Actuará solo como DNS y Proxy de seguridad (HTTPS).

6. Plan de Ejecución (Instrucciones para Claude Code)

Claude, por favor sigue este orden estricto de implementación. Confirma conmigo al terminar cada paso antes de avanzar al siguiente:

Fase 1: Inicialización y Base de Datos

Inicializa el proyecto Next.js (App Router) con Tailwind CSS.

Configura el archivo docker-compose.yml de desarrollo para levantar una instancia de PostgreSQL local.

Instala e inicializa Prisma. Traduce el modelo de datos (Sección 4) a schema.prisma.

Crea el script de Seeding que contiene los ejercicios básicos, y la lógica para que al crear un usuario (Fase 2) se inserten estos ejercicios con su userId.

Fase 2: Autenticación y Layout
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

Fase 6: Dockerización para VPS
14. Crea el Dockerfile de producción para Next.js.
15. Crea un docker-compose.prod.yml que estructure el entorno para Hetzner (incluyendo Nginx/Traefik para gestionar los subdominios de QA y Producción en el mismo host).