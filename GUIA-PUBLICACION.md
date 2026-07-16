# Guía para publicar AfroPX Web

Esta guía deja la web publicada con **GitHub + Cloudflare Pages + dominio propio**. No hace falta contratar un servidor ni pagar Vercel. Cloudflare Pages es suficiente para esta web y publicará automáticamente cada cambio que se suba a GitHub.

## 1. Elegir y comprar el dominio

La recomendación principal es **`afropx.art`**.

La extensión `.artist` no existe actualmente como dominio de primer nivel, por lo que `afropx.artist` no se puede registrar. Sí existen `.art` y `.audio`. Orden recomendado:

1. `afropx.art`
2. `afropx.com`
3. `afropx.es`
4. `afropx.audio`

La disponibilidad y el precio pueden cambiar en cualquier momento. Compruébalos justo antes de pagar:

1. Entra en el panel de Cloudflare.
2. Abre **Domain Registration**.
3. Pulsa **Register Domains**.
4. Busca `afropx.art` y las alternativas que quieras comparar.
5. Revisa tanto el precio inicial como el precio anual de renovación.
6. Compra el dominio elegido.

No es obligatorio comprar el dominio antes de publicar: Cloudflare Pages dará primero una dirección gratuita parecida a `afropx-web.pages.dev`.

## 2. Crear el repositorio en GitHub

1. Inicia sesión en GitHub.
2. Crea un repositorio nuevo llamado `afropx-web`.
3. Puede ser público o privado. Si no quieres que otras personas vean el código, elige privado.
4. Déjalo vacío: no marques la creación automática de README, `.gitignore` o licencia, porque esos archivos ya están en el proyecto.

## 3. Subir la carpeta del proyecto a GitHub

Abre PowerShell y ejecuta estos comandos uno a uno. Sustituye `TU-USUARIO` por tu nombre de usuario real de GitHub.

```powershell
Set-Location "E:\MUSICA\AfroPX Web"
git init -b main
git add .
git commit -m "Publica la web oficial de AfroPX"
git remote add origin https://github.com/TU-USUARIO/afropx-web.git
git push -u origin main
```

Si Git pide iniciar sesión, completa el acceso a GitHub en la ventana que se abra. No introduzcas ni subas contraseñas o claves dentro de esta carpeta.

Al terminar, recarga el repositorio en GitHub y comprueba que aparecen `index.html`, `mixing`, `assets`, `styles.css` y el resto de archivos.

## 4. Conectar GitHub con Cloudflare Pages

1. Entra en el panel de Cloudflare.
2. Ve a **Workers & Pages**.
3. Pulsa **Create application**.
4. Abre la pestaña **Pages**.
5. Selecciona **Import an existing Git repository** o **Connect to Git**.
6. Conecta tu cuenta de GitHub y autoriza el acceso al repositorio `afropx-web`.
7. Selecciona ese repositorio y pulsa **Begin setup**.

Usa esta configuración:

| Campo | Valor |
|---|---|
| Project name | `afropx-web` |
| Production branch | `main` |
| Framework preset | Ninguno / `None` |
| Build command | `exit 0` |
| Build output directory | `.` |
| Root directory | Déjalo vacío |
| Environment variables | Ninguna |

Pulsa **Save and Deploy**. Cuando finalice, abre la dirección `*.pages.dev` que muestre Cloudflare.

## 5. Comprobar la publicación

Revisa estas direcciones desde ordenador y móvil:

- `https://afropx-web.pages.dev/`
- `https://afropx-web.pages.dev/mixing/`

El nombre exacto de `pages.dev` puede variar si `afropx-web` ya estuviera ocupado.

Comprueba además:

- El menú móvil se abre y se cierra.
- Las imágenes cargan.
- Spotify, Instagram y YouTube se abren en otra pestaña.
- La tarjeta del portfolio abre la playlist de YouTube sin reproductor incrustado.
- El correo artístico aparece solo en la web principal.
- El correo de Mixing aparece solo en `/mixing/`.
- El teléfono abre la opción de llamada en móvil.

## 6. Conectar el dominio comprado

Cuando la web de `pages.dev` funcione:

1. En Cloudflare abre **Workers & Pages**.
2. Entra en el proyecto `afropx-web`.
3. Abre **Custom domains**.
4. Pulsa **Set up a domain**.
5. Escribe el dominio comprado, por ejemplo `afropx.art`.
6. Confirma la configuración.

Si el dominio se ha comprado o ya se gestiona en la misma cuenta de Cloudflare, Cloudflare creará el registro DNS necesario. No añadas manualmente un CNAME antes de asociar el dominio desde **Custom domains**.

Después añade también `www.afropx.art` como segundo dominio personalizado si quieres que funcione con `www`. El dominio principal puede ser la versión corta, sin `www`.

Cloudflare emitirá el certificado HTTPS. Espera a que el estado del dominio y del certificado aparezca como activo antes de anunciar la dirección.

## 7. Ajustes finales de posicionamiento

Cuando se conozca el dominio definitivo, conviene hacer una última edición en `index.html` y `mixing/index.html`:

- Añadir una etiqueta `canonical` con la dirección definitiva de cada página.
- Convertir `og:image` en una dirección HTTPS absoluta.
- Crear `sitemap.xml` con `/` y `/mixing/`.
- Añadir la propiedad `og:url`.

No se han fijado todavía esas direcciones para evitar publicar metadatos incorrectos antes de comprar el dominio.

## 8. Cómo actualizar la web después

Cada vez que hagas un cambio en la carpeta:

```powershell
Set-Location "E:\MUSICA\AfroPX Web"
git add .
git commit -m "Describe aquí el cambio"
git push
```

Cloudflare Pages detectará el nuevo envío a la rama `main` y publicará automáticamente la nueva versión. En **Workers & Pages > afropx-web > Deployments** podrás comprobar si terminó correctamente o volver a una versión anterior.

## 9. Lista final antes del lanzamiento

- [ ] Dominio comprado y renovación anual revisada.
- [ ] Repositorio de GitHub creado sin archivos iniciales.
- [ ] Proyecto subido a la rama `main`.
- [ ] Primera publicación de `pages.dev` comprobada.
- [ ] Dominio añadido desde **Custom domains**.
- [ ] HTTPS activo.
- [ ] Página principal revisada en móvil y ordenador.
- [ ] `/mixing/` revisado en móvil y ordenador.
- [ ] Correos, teléfono y perfiles sociales comprobados.
- [ ] Metadatos finales añadidos cuando el dominio sea definitivo.

## Si algo falla

- **Cloudflare muestra 404:** comprueba que `index.html` está en la raíz del repositorio y que el directorio de salida es `.`.
- **No aparece la rama `main`:** comprueba en GitHub que el primer `git push` terminó correctamente.
- **El dominio queda verificando:** espera unos minutos y revisa que lo añadiste primero desde **Custom domains**.
- **Un cambio no aparece:** confirma que `git push` terminó y revisa el último despliegue en Cloudflare Pages.
- **Git dice que `origin` ya existe:** ejecuta `git remote -v` y comprueba que apunta al repositorio correcto antes de modificarlo.
