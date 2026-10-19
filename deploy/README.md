# Despliegue de TrackApp en el VPS (QA y Producción)

Guía de configuración **única** del servidor y de GitHub. Después, cada push a `develop` despliega QA y cada merge a `main` despliega Producción, sin pasos manuales.

```
GitHub (push)                          VPS Hetzner (Ubuntu 24.04)
 develop ─┐                             /opt/trackapp/traefik   proxy 80/443 + HTTPS
 main ────┴─ Actions: validar →         /opt/trackapp/qa        app + base de QA
             imagen (GHCR) → SSH ─────▶ /opt/trackapp/prod      app + base de Producción
```

Cada bloque indica dónde se ejecuta: **🖥️ servidor** (conectado como `root`) o **💻 tu PC** (Git Bash).

---

## 1. Usuario `deploy` (el que usa el pipeline)

🖥️ servidor:

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
```

> Estar en el grupo `docker` equivale a tener permisos de administrador en el servidor. Por eso la clave de este usuario se usa **solo** para el pipeline.

💻 tu PC — crea la clave del pipeline (sin contraseña, porque la usa GitHub):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/trackapp_deploy -N "" -C "github-actions-trackapp"
```

🖥️ servidor — pega el contenido de `~/.ssh/trackapp_deploy.pub` (la clave **pública**):

```bash
nano /home/deploy/.ssh/authorized_keys   # pega la línea .pub y guarda
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
```

💻 tu PC — comprueba que entra y que puede usar Docker:

```bash
ssh -i ~/.ssh/trackapp_deploy deploy@IP_DEL_SERVIDOR "docker ps"
```

## 2. Carpetas y red de Docker

🖥️ servidor:

```bash
install -d -o deploy -g deploy /opt/trackapp /opt/trackapp/traefik /opt/trackapp/qa /opt/trackapp/prod
docker network create web
```

## 3. Traefik (proxy y certificados HTTPS)

Copia `deploy/traefik/docker-compose.yml` del repositorio a `/opt/trackapp/traefik/` (por ejemplo, con `scp` o pegándolo con `nano`) y luego, 🖥️ servidor:

```bash
cd /opt/trackapp/traefik
echo "ACME_EMAIL=tu-correo@ejemplo.com" > .env
install -d -m 700 letsencrypt
docker compose up -d
docker compose logs --tail 20   # no debe haber errores
```

`ACME_EMAIL` es el correo al que Let's Encrypt avisa si un certificado está por vencer (se renuevan solos).

## 4. Secretos de cada entorno

Crea un `.env` en **cada** carpeta. Las contraseñas se generan en el servidor; usa valores **distintos** para QA y Producción. 🖥️ servidor:

```bash
cd /opt/trackapp/qa
cat > .env <<EOF
ENV_NAME=qa
APP_HOST=qa.trackapp.jolscripts.com
POSTGRES_PASSWORD=$(openssl rand -hex 24)
AUTH_SECRET=$(openssl rand -base64 32)
EOF
chown deploy:deploy .env && chmod 600 .env

cd /opt/trackapp/prod
cat > .env <<EOF
ENV_NAME=prod
APP_HOST=app.trackapp.jolscripts.com
POSTGRES_PASSWORD=$(openssl rand -hex 24)
AUTH_SECRET=$(openssl rand -base64 32)
EOF
chown deploy:deploy .env && chmod 600 .env
```

> **No cambies `POSTGRES_PASSWORD` después del primer despliegue**: la base se crea con esa contraseña. Si cambias `AUTH_SECRET`, se cierran todas las sesiones.

## 5. Secretos en GitHub

En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**.

| Secreto | Valor |
|---|---|
| `SSH_HOST` | IP del servidor |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | Contenido completo de `~/.ssh/trackapp_deploy` (la clave **privada**, incluidas las líneas `-----BEGIN…` y `-----END…`) |
| `SSH_KNOWN_HOSTS` | Salida de `ssh-keyscan -t ed25519 IP_DEL_SERVIDOR` (ejecútalo en tu PC) |

Los entornos `qa` y `production` aparecen solos en **Settings → Environments** tras el primer despliegue.

## 6. Primer despliegue

Al hacer push a `develop` se ejecuta el pipeline (pestaña **Actions** del repositorio). Al terminar, 🖥️ servidor:

```bash
docker ps   # trackapp-qa-app-1 (healthy), trackapp-qa-db-1 y traefik-traefik-1
```

QA será accesible en `https://qa.trackapp.jolscripts.com` cuando el dominio apunte al servidor (siguiente etapa).

## 7. Recomendado: proteger `main`

**Settings → Branches → Add branch ruleset** sobre `main`: exigir Pull Request antes de hacer merge. Así a Producción solo llega lo que pasó por `develop` y QA.

---

## Flujo de trabajo diario

1. `git switch develop && git pull`, luego `git switch -c feat/mi-cambio`.
2. Trabajar y probar en local; commit.
3. Merge a `develop` (o Pull Request) y push → **QA se despliega solo**. Validar en QA.
4. Pull Request de `develop` a `main` y merge → **Producción se despliega sola**.

## Operación

| Tarea | Comando (en el servidor) |
|---|---|
| Ver estado | `docker ps` |
| Logs de la app | `cd /opt/trackapp/qa && docker compose -p trackapp-qa --env-file .env --env-file image.env -f docker-compose.prod.yml logs -f app` |
| Versión desplegada | `cat /opt/trackapp/qa/image.env` |
| Volver a una versión anterior | `sudo -u deploy bash /opt/trackapp/qa/deploy.sh qa <sha-anterior>` (el SHA se ve en GitHub → Actions) |

(En Producción, cambia `qa` por `prod`.)

> Si el repositorio o la imagen fueran privados, volver atrás a mano requiere `docker login ghcr.io` antes (el pipeline lo hace solo).
