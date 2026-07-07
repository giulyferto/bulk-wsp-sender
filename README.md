# WSP Messenger

Aplicación web para enviar mensajes masivos de WhatsApp desde tu número personal. Permite gestionar contactos y listas, conectar tu cuenta de WhatsApp mediante código de vinculación, enviar un mensaje a toda una lista de una sola vez, y ver el estado de entrega por contacto en tiempo real.

## Funcionalidades

- **Registro y login** con email y contraseña
- **Gestión de contactos** — agregar, editar y eliminar contactos con nombre y número de teléfono
- **Listas de difusión** — agrupar contactos en listas para envíos masivos
- **Conexión de WhatsApp** — vincular tu número personal mediante código de 8 dígitos (sin escanear QR)
- **Envío masivo** — seleccionar una lista, escribir el mensaje y enviarlo a todos los contactos, con intervalo aleatorio entre envíos
- **Estado de entrega en tiempo real** — ver por contacto si el mensaje está pendiente, enviado, entregado o leído, vía Server-Sent Events
- **Aviso de errores** — si el envío se interrumpe de forma inesperada (por ejemplo, se pierde la conexión con el servidor), la interfaz lo muestra con un aviso visual en lugar de quedarse congelada en silencio

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) — API routes y UI en un solo proceso |
| WhatsApp | `@whiskeysockets/baileys` 7.x (WebSocket nativo, sin Puppeteer) |
| Autenticación | NextAuth.js v4, Credentials provider, verifica contra Firebase Auth |
| Base de datos | Firebase Firestore |
| Backend de auth | Firebase Admin SDK |
| Tiempo real | Server-Sent Events (SSE) |
| Estilos | Tailwind CSS |

## Requisitos

- Node.js 20+
- Un proyecto de Firebase (Firestore + Authentication habilitados — ver más abajo)

## Instalación y uso local

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd bulk-wsp-sender

# 2. Instalar dependencias
npm install

# 3. Crear .env.local con las variables de entorno (ver tabla más abajo)

# 4. Iniciar el servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

## Configuración de Firebase (una sola vez)

1. **Authentication** → Sign-in method → habilitar **Email/Password**
2. **Firestore Database** → crear la base (modo de prueba está bien para un PoC)
3. **Índices de Firestore** — la actualización de estado de entrega hace una consulta de tipo *collection group* sobre `deliveries` / `waMessageId`. Firestore ya mantiene un índice de campo simple para `waMessageId`, pero por defecto con alcance `COLLECTION`; hay que ampliarlo a `COLLECTION_GROUP` (esto se hace con un *field override*, no con un índice compuesto). Desplegarlo con:
   ```bash
   firebase deploy --only firestore:indexes
   ```
   (definido en [firestore.indexes.json](firestore.indexes.json)). Si el override no existe, el envío de campañas puede fallar a mitad de camino — ver la nota en "Problemas conocidos" más abajo.

## Flujo de uso

1. **Registrarse** en `/register` y luego iniciar sesión
2. **Agregar contactos** en `/contacts` usando formato E.164 para el teléfono (`+5491155556666`)
3. **Crear una lista** en `/lists` y agregar contactos a ella
4. **Conectar WhatsApp** en `/whatsapp`:
   - Ingresar el número de teléfono propio
   - Presionar "Obtener código"
   - En WhatsApp → Dispositivos vinculados → Vincular con número de teléfono → ingresar el código
5. **Enviar campaña** en `/send`: seleccionar una lista, escribir el mensaje y enviar
6. Ver el **estado de entrega** por contacto en tiempo real, o después en `/campaigns`

## Variables de entorno

Crear un archivo `.env.local` con:

| Variable | Descripción |
|---|---|
| `NEXTAUTH_SECRET` | Secreto para firmar sesiones JWT (cualquier string largo y aleatorio) |
| `NEXTAUTH_URL` | URL pública de la aplicación (`http://localhost:3000` en desarrollo) |
| `FIREBASE_PROJECT_ID` | Desde Project Settings → Service accounts |
| `FIREBASE_CLIENT_EMAIL` | Desde Project Settings → Service accounts → Generate new private key |
| `FIREBASE_PRIVATE_KEY` | Ídem — clave privada del service account (mantener los `\n` literales entre comillas) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Desde Project Settings → General → Web API Key |

## Problemas conocidos

- **Falta el índice de Firestore** (`FAILED_PRECONDITION: The query requires a COLLECTION_GROUP_ASC index...`): pasa si nunca se desplegó el índice descrito arriba. Antes de que existiera el manejo de errores actual, esto podía tirar abajo todo el proceso de Node a mitad de una campaña (el envío se veía "congelado", sin más actualizaciones de estado). Ahora ese error se loguea y no interrumpe el envío, pero conviene desplegar el índice igual para que el estado de entrega (`SENT`/`DELIVERED`/`READ`) se actualice correctamente.
- Si el envío se corta de forma inesperada por cualquier otro motivo, la interfaz muestra un aviso en la parte inferior de la pantalla en vez de quedar esperando en silencio.

## Notas importantes

- Este proyecto es un **proof of concept**. No está diseñado para uso en producción a gran escala.
- WhatsApp no permite el envío masivo desde números personales. Usar con moderación para evitar bloqueos (recomendado: menos de 200 mensajes por día).
- Los números deben estar guardados en formato E.164: `+` seguido del código de país y el número sin espacios ni guiones.
- En Apple Silicon, si se construye una imagen Docker, agregar `--platform linux/amd64` al build (Baileys usa prebuilds nativos de `libsignal`).
