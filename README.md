# VexPixel (JORDVEX)

Plataforma de fondos de pantalla (estáticos y videos animados) para móvil y PC.

- **Marca:** VexPixel · **Proyecto:** JORDVEX
- **Sitio:** https://pixelwalls.jordvex.xyz (y https://jordvex.xyz)
- **API:** https://api.jordvex.xyz (Cloudflare Tunnel desde Termux)

## Arquitectura

```
Navegador ──► Cloudflare Pages (pixelwalls.jordvex.xyz)
                 │  public/             → sitio estático
                 │  public/_redirects   → proxy de /api/*, /wallpapers/*, /videos/*, /media/*…
                 ▼
          Cloudflare Tunnel (api.jordvex.xyz)
                 ▼
          Servidor Express (Node.js) en Termux
                 │  server/             → API, galería, videos, Instagram
                 ▼
          Cloudflare R2 → imágenes y videos
```

El navegador siempre habla con el mismo dominio, así que no hay problemas de CORS.

## Estructura

```
├── public/              ← sitio estático (Cloudflare Pages, directorio de salida)
│   ├── index.html       ← página principal
│   ├── _redirects       ← proxy hacia el servidor Express
│   ├── css/, js/        ← estilos y scripts del frontend
│   └── manifest.webmanifest, icon.svg, sitemap.xml, robots.txt
├── server/              ← servidor Express (Termux)
│   ├── index.js         ← arranque, cabeceras de seguridad, estáticos
│   ├── config.js        ← lee variables de entorno
│   ├── routes/          ← api.js (rutas), instagram.js
│   ├── services/        ← R2, wallpapers, videos, chat, generación…
│   └── middleware/      ← autenticación
├── package.json
├── .env.example         ← plantilla de variables (copia a .env)
└── _obsoleto/           ← archivos antiguos conservados para revisión (no se usan)
```

## Puesta en marcha local (Termux)

```
pkg install nodejs git
git clone https://github.com/<tu-usuario>/<tu-repo>.git
cd <tu-repo>
git checkout <rama>
npm install
cp .env.example .env     # edita .env con tus valores
npm start
```

El servidor queda en `http://localhost:3000`. Para exponerlo, usa el túnel de Cloudflare apuntando a ese puerto.

## Variables de entorno

La lista completa está en `.env.example`. Las más importantes:

| Variable | Para qué |
|---|---|
| `ACCESS_CODE` | Código de acceso a la app. Recomendado. |
| `ADMIN_CODE` | Código del panel de administrador. |
| `TRUST_PROXY=1` | Obligatorio detrás del túnel, para que el límite por IP funcione. |
| `R2_*` | Credenciales y bucket de Cloudflare R2. |
| `R2_PUBLIC_URL` | URL pública del bucket (sin barra final). |

Nunca subas `.env` a GitHub. El `.gitignore` ya lo excluye.

## Despliegue del sitio (Cloudflare Pages)

1. En Cloudflare: **Workers y páginas → Crear → Pages → Conectar a Git**.
2. Elige este repositorio y la rama de producción.
3. Configuración de compilación: **sin comando de compilación**, **directorio de salida: `public`**.
4. Asigna el dominio personalizado `pixelwalls.jordvex.xyz`.

Cada cambio en la rama de producción redespliega el sitio.

## Notas

- `public/_redirects` envía `/api/*` al túnel, así que el frontend usa rutas relativas.
- Los archivos de `_obsoleto/` no forman parte de la aplicación.
