# WSP Messenger

Aplicación web para enviar mensajes masivos de WhatsApp desde tu número personal. Permite gestionar contactos y listas, conectar tu cuenta de WhatsApp mediante código de vinculación, enviar un mensaje a toda una lista de una sola vez, y ver el estado de entrega por contacto en tiempo real.

## Funcionalidades

- **Registro y login** con email y contraseña
- **Gestión de contactos** — agregar, editar y eliminar contactos con nombre y número de teléfono
- **Listas de difusión** — agrupar contactos en listas para envíos masivos
- **Conexión de WhatsApp** — vincular tu número personal mediante código de 8 dígitos (sin escanear QR)
- **Envío masivo** — seleccionar una lista, escribir el mensaje y enviarlo a todos los contactos
- **Estado de entrega** — ver por contacto si el mensaje está pendiente, enviado, entregado o leído

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Base de datos | PostgreSQL 16 (Docker) |
| ORM | Prisma 7 |
| WhatsApp | Baileys (WebSocket nativo, sin Puppeteer) |
| Autenticación | NextAuth.js v4 con Credentials |
| Tiempo real | Server-Sent Events (SSE) |
| Estilos | Tailwind CSS |

## Requisitos

- Node.js 20+
- Docker y Docker Compose

## Instalación y uso local

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd massive-wsp-messages

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores si es necesario

# 4. Levantar la base de datos
docker compose up db -d

# 5. Crear las tablas
npx prisma migrate dev

# 6. Iniciar el servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Uso con Docker (producción)

```bash
docker compose up --build
```

La app queda disponible en [http://localhost:3000](http://localhost:3000).

## Flujo de uso

1. **Registrarse** en `/register` y luego iniciar sesión
2. **Agregar contactos** en `/contacts` usando formato E.164 para el teléfono (`+5491155556666`)
3. **Crear una lista** en `/lists` y agregar contactos a ella
4. **Conectar WhatsApp** en `/whatsapp`:
   - Ingresar el número de teléfono propio
   - Presionar "Obtener código"
   - En WhatsApp → Dispositivos vinculados → Vincular con número de teléfono → ingresar el código
5. **Enviar campaña** en `/send`: seleccionar una lista, escribir el mensaje y enviar
6. Ver el **estado de entrega** por contacto en la página de resultados (se actualiza cada 5 segundos)

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL | `postgresql://wsp:wsp@localhost:5433/wsp` |
| `NEXTAUTH_SECRET` | Secreto para firmar sesiones JWT | cualquier string largo |
| `NEXTAUTH_URL` | URL pública de la aplicación | `http://localhost:3000` |

## Notas importantes

- Este proyecto es un **proof of concept**. No está diseñado para uso en producción a gran escala.
- WhatsApp no permite el envío masivo desde números personales. Usar con moderación para evitar bloqueos (recomendado: menos de 200 mensajes por día).
- Los números deben estar guardados en formato E.164: `+` seguido del código de país y el número sin espacios ni guiones.
