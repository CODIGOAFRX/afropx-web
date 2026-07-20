# AfroPX Web

Web oficial de **AfroPX**, con una sección independiente de servicios profesionales de audio en `/mixing/`.

Dominio de producción: **https://afropxmusic.com/**

## Estado del proyecto

- Web estática lista para producción: no requiere Node.js, base de datos ni servidor propio.
- Página principal de artista en `index.html`.
- Servicios de mezcla y mastering en `mixing/index.html`.
- Directorio de lanzamientos en `lanzamientos/index.html`.
- Smart link del álbum en `lanzamientos/a-la-gente-buena-le-pasan-cosas-malas/index.html`.
- Diseño adaptable a móvil, tablet y escritorio.
- Imágenes optimizadas en WebP.
- Enlaces externos a Spotify, YouTube e Instagram.
- Configuración de cabeceras para Cloudflare Pages en `_headers`.
- Sin rutas locales, direcciones `localhost`, claves ni dependencias privadas.

## Publicación recomendada

La combinación recomendada es:

1. **GitHub** para guardar el proyecto y su historial de cambios.
2. **Cloudflare Pages** para publicar automáticamente cada cambio enviado a GitHub.
3. **Cloudflare Registrar** para comprar y gestionar el dominio.

La guía completa está en [`GUIA-PUBLICACION.md`](GUIA-PUBLICACION.md).

## Estructura

- `index.html`: página de artista.
- `mixing/index.html`: servicios de Pedro como ingeniero de audio.
- `lanzamientos/index.html`: archivo y acceso a los lanzamientos.
- `lanzamientos/a-la-gente-buena-le-pasan-cosas-malas/index.html`: landing y enlaces editables de preguardado y estreno.
- `styles.css`: diseño y adaptación responsive.
- `script.js`: menú, transiciones y pequeños efectos.
- `assets/`: fotografías, arte, icono y vista previa social.
- `_headers`: seguridad y caché para Cloudflare Pages.
- `.gitignore`: exclusiones para Git.

## Revisar la web en el ordenador

Para una revisión rápida se puede abrir `index.html`. Antes de publicar, es preferible verla mediante un servidor web local para reproducir el comportamiento real del alojamiento.

## Datos públicos incluidos

- Instagram artístico: `@afrxpx`
- Correo artístico: `afropxoficial@gmail.com`
- Instagram del estudio: `@afrxstudios`
- Teléfono de reservas: `685 585 342`
- Correo de Mixing: publicado exclusivamente dentro de `/mixing/`
- Portfolio de audio: playlist de YouTube facilitada para el proyecto

El correo de Mixing solo aparece en el área `/mixing/`, y el correo artístico solo aparece en la web principal.

## Activar los enlaces del nuevo álbum

Abrir `lanzamientos/a-la-gente-buena-le-pasan-cosas-malas/index.html` y editar el atributo `href` del botón correspondiente. Mientras un botón no tenga `href`, la web lo muestra como "Disponible pronto" y evita dirigir al público a un enlace incorrecto.
