/**
 * Fuente única de verdad para contenido editable y reglas operativas.
 *
 * IMPORTANTE:
 * - Los valores marcados como `provisional` requieren confirmación de Pedro.
 * - Nunca se guardan secretos en este archivo. Las claves viven en Cloudflare.
 * - Los importes se expresan en céntimos para evitar errores de coma flotante.
 */
export const SITE_CONFIG = {
  site: {
    name: "AfroPX",
    legalBrand: "Afro Px",
    origin: "https://afropxmusic.com",
    locale: "es-ES",
    language: "es",
    timezone: "Europe/Madrid",
    themeColor: "#050505",
    accentColor: "#ff2d23",
    contactEmail: "contacto@afropxmusic.com",
    mixingEmail: "itsafrxpx@gmail.com",
    phoneDisplay: "685 585 342",
    phoneE164: "+34685585342"
  },

  artist: {
    name: "AfroPX",
    instagramHandle: "@afrxpx",
    description:
      "Artista urbano español que cruza trap, melodía y una escritura íntima para hablar de ambición, pérdida, vínculos y todo lo que cuesta decir en voz alta.",
    tagline: "Trap emocional, contraste y una identidad que no pide permiso.",
    image: "/assets/images/afropx-front.webp",
    imageAlt:
      "Retrato en blanco y negro de AfroPX con gafas oscuras y abrigo de pelo"
  },

  social: {
    instagram: {
      label: "Instagram",
      handle: "@afrxpx",
      url: "https://www.instagram.com/afrxpx/"
    },
    studioInstagram: {
      label: "Instagram del estudio",
      handle: "@afrxstudios",
      url: "https://www.instagram.com/afrxstudios/"
    },
    spotify: {
      label: "Spotify",
      url: "https://open.spotify.com/artist/0fYfgpQ71vAIvt8QoRjwd7"
    },
    youtube: {
      label: "YouTube",
      handle: "@afropxoficial",
      url: "https://www.youtube.com/@afropxoficial"
    },
    tiktok: {
      label: "TikTok",
      url: "",
      enabled: false
    },
    appleMusic: {
      label: "Apple Music",
      url: "",
      enabled: false
    }
  },

  releases: [
    {
      id: "a-la-gente-buena-le-pasan-cosas-malas",
      title: "A la gente buena le pasan cosas malas",
      artist: "AfroPX",
      type: "Álbum",
      year: 2026,
      status: "Próximamente",
      trackCount: 12,
      featured: true,
      description:
        "Duelo, deseo, contradicción y supervivencia en doce canciones.",
      cover: "/assets/images/algblpcm-cover-final.webp",
      socialImage: "/assets/images/algblpcm-og-final.jpg",
      path: "/lanzamientos/a-la-gente-buena-le-pasan-cosas-malas/",
      links: {
        presave: "https://orcd.co/algblpcm",
        spotify: "",
        youtube: "",
        appleMusic: "",
        instagram: "https://www.instagram.com/afrxpx/"
      },
      tracks: [
        "A la gente buena le pasan cosas malas",
        "No me digas que me quieres",
        "Iceberg",
        "Invierno — feat. Martzz",
        "Morir — feat. Martzz",
        "Te veo",
        "Vivir — feat. Martzz",
        "Lux",
        "Colores — feat. Torla",
        "Sé que estás",
        "Ya no sé amar — feat. Martzz",
        "Presagio"
      ]
    },
    {
      id: "iktdchm",
      title: "IKTDCHM",
      subtitle: "I Know That Death Can't Heal Me · con Martzz",
      artist: "AfroPX",
      type: "Álbum",
      year: 2025,
      featured: false,
      links: {
        spotify: "https://open.spotify.com/album/4RWGZYEn5nMYwJbGcXeRUL"
      }
    },
    {
      id: "adicto",
      title: "ADICTO",
      artist: "AfroPX",
      type: "Álbum",
      year: 2024,
      featured: false,
      links: {
        spotify: "https://open.spotify.com/album/1f6l71iGt3VIqVHM8Yi9Ky"
      }
    },
    {
      id: "evolve",
      title: "EVOLVE",
      subtitle: "con VAIN",
      artist: "AfroPX",
      type: "Álbum",
      year: 2023,
      featured: false,
      links: {
        spotify: "https://open.spotify.com/album/3RKhzVVDDIFuijJc8HMTfA"
      }
    }
  ],

  mixing: {
    engineer: {
      name: "Pedro",
      title: "Ingeniero de audio titulado",
      activeSince: 2018
    },
    services: [
      {
        id: "recording-mix-master",
        name: "Grabación + Mix + Master",
        shortName: "Grabación + Mix + Master",
        priceCents: 8000,
        currency: "EUR",
        priceSuffix: "/ canción",
        bookable: true,
        durationMinutes: 60,
        durationLabel: "Duración de la cita: a confirmar",
        provisionalDuration: true,
        includes: [
          "Sesión de grabación",
          "Mezcla completa",
          "Master final preparado para distribución"
        ],
        description:
          "Sesión de grabación, mezcla completa y master final preparado para distribución."
      },
      {
        id: "remote-mix-master",
        name: "Mix + Master",
        shortName: "Mix + Master (remoto)",
        priceCents: 6000,
        currency: "EUR",
        priceSuffix: "/ canción",
        bookable: true,
        durationMinutes: 60,
        durationLabel: "Duración de la cita: a confirmar",
        provisionalDuration: true,
        includes: [
          "Revisión técnica previa",
          "Mix y master coordinados",
          "Entrega lista para distribución"
        ],
        description:
          "Trabajo a distancia a partir de pistas bien exportadas, con entrega final lista para publicar."
      },
      {
        id: "mix",
        name: "Mix",
        shortName: "Mix",
        priceCents: null,
        currency: "EUR",
        priceLabel: "Presupuesto personalizado",
        bookable: true,
        durationMinutes: 60,
        durationLabel: "Duración de la cita: a confirmar",
        provisionalDuration: true,
        includes: [
          "Mezcla estéreo",
          "Revisiones acordadas",
          "Entrega WAV de alta resolución"
        ],
        description:
          "Balance, edición fina, tratamiento vocal, espacio, impacto y automatización."
      },
      {
        id: "master",
        name: "Master",
        shortName: "Master",
        priceCents: null,
        currency: "EUR",
        priceLabel: "Presupuesto personalizado",
        bookable: true,
        durationMinutes: 60,
        durationLabel: "Duración de la cita: a confirmar",
        provisionalDuration: true,
        includes: [
          "Master para streaming",
          "Versión instrumental si se solicita",
          "Entrega WAV + referencia"
        ],
        description:
          "Control final de tono, dinámica, nivel, imagen estéreo y compatibilidad con plataformas."
      },
      {
        id: "project-pack",
        name: "Pack de más de 5 canciones",
        shortName: "EP / Mixtape / Álbum",
        priceCents: null,
        currency: "EUR",
        priceLabel: "Presupuesto personalizado",
        bookable: true,
        durationMinutes: 60,
        durationLabel: "Duración de la cita: a confirmar",
        provisionalDuration: true,
        includes: [
          "Plan adaptado al número de temas",
          "Dirección sonora conjunta",
          "Calendario y presupuesto acordados antes de empezar"
        ],
        description:
          "Pack adaptado al número de canciones y al estado real del proyecto."
      }
    ],
    faq: [
      {
        question: "¿Cómo preparo las pistas?",
        answer:
          "Exporta todas las pistas desde el mismo punto de inicio, sin limitador en el master y con nombres claros. Si algo necesita otra preparación, te lo indicaré antes de comenzar."
      },
      {
        question: "¿Cuántas revisiones incluye?",
        answer:
          "Las revisiones se acuerdan antes de empezar según el estado y alcance del proyecto; no se aplica una cifra fija a todos los trabajos."
      },
      {
        question: "¿Puedo trabajar a distancia?",
        answer:
          "Sí. El servicio Mix + Master remoto está pensado para recibir las pistas y referencias mediante un enlace de descarga."
      },
      {
        question: "¿La solicitud queda confirmada al enviarla?",
        answer:
          "No. La solicitud queda pendiente hasta que Pedro revise el material y confirme la sesión por correo o teléfono."
      },
      {
        question: "¿Cómo funcionan los proyectos de más de cinco temas?",
        answer:
          "Se prepara un pack a medida según el número de canciones, el material disponible y el calendario del proyecto."
      }
    ],
    portfolioUrl:
      "https://www.youtube.com/playlist?list=PLzR8aKU-OlakUtH8rULCFA4Pr3e8dzuwP"
  },

  booking: {
    timezone: "Europe/Madrid",
    slotIntervalMinutes: 60,
    defaultDurationMinutes: 60,
    bufferMinutes: 0,
    maxMonthsAhead: 12,
    rateLimit: {
      maxRequests: 5,
      windowMinutes: 15
    },
    weeklyAvailability: [
      {
        day: 0,
        label: "Domingo",
        enabled: true,
        start: "09:00",
        lastStart: "17:00"
      },
      {
        day: 1,
        label: "Lunes",
        enabled: true,
        start: "17:00",
        lastStart: "21:00",
        provisionalLastStart: true
      },
      {
        day: 2,
        label: "Martes",
        enabled: true,
        start: "17:00",
        lastStart: "21:00",
        provisionalLastStart: true
      },
      {
        day: 3,
        label: "Miércoles",
        enabled: true,
        start: "17:00",
        lastStart: "21:00",
        provisionalLastStart: true
      },
      {
        day: 4,
        label: "Jueves",
        enabled: true,
        start: "17:00",
        lastStart: "21:00",
        provisionalLastStart: true
      },
      {
        day: 5,
        label: "Viernes",
        enabled: true,
        start: "17:00",
        lastStart: "21:00",
        provisionalLastStart: true
      },
      {
        day: 6,
        label: "Sábado",
        enabled: true,
        start: "09:00",
        lastStart: "17:00"
      }
    ],
    conditions: [
      "La solicitud queda pendiente de confirmación.",
      "El precio mostrado corresponde a una canción cuando así se indica.",
      "El alcance, las revisiones y la fecha de entrega se acuerdan antes de comenzar.",
      "No se realiza ningún cobro desde esta versión de la web."
    ]
  },

  smartLinks: {
    path: "/escuchar/",
    title: "Escucha AfroPX",
    description:
      "Lanzamientos, plataformas y enlaces oficiales de AfroPX en un solo lugar.",
    utm: {
      source: "afropxmusic",
      medium: "artist_site",
      campaign: "algblpcm"
    },
    platforms: [
      {
        id: "presave",
        label: "Preguardar el álbum",
        note: "A la gente buena le pasan cosas malas",
        url: "https://orcd.co/algblpcm",
        enabled: true,
        featured: true
      },
      {
        id: "spotify",
        label: "Spotify",
        note: "Perfil oficial de AfroPX",
        url: "https://open.spotify.com/artist/0fYfgpQ71vAIvt8QoRjwd7",
        enabled: true
      },
      {
        id: "youtube",
        label: "YouTube",
        note: "Canal oficial",
        url: "https://www.youtube.com/@afropxoficial",
        enabled: true
      },
      {
        id: "instagram",
        label: "Instagram",
        note: "@afrxpx",
        url: "https://www.instagram.com/afrxpx/",
        enabled: true
      },
      {
        id: "apple-music",
        label: "Apple Music",
        note: "Pendiente de enlace oficial",
        url: "",
        enabled: false
      },
      {
        id: "tiktok",
        label: "TikTok",
        note: "Pendiente de enlace oficial",
        url: "",
        enabled: false
      }
    ]
  },

  integrations: {
    spotify: {
      enabled: false,
      mode: "manual",
      mockData: false
    },
    youtube: {
      enabled: false,
      mode: "manual",
      mockData: false
    },
    stripe: {
      enabled: false
    }
  },

  analytics: {
    endpoint: "/api/events",
    respectDoNotTrack: true,
    allowedEvents: [
      "page_view",
      "platform_click",
      "share_open",
      "link_copy",
      "booking_start",
      "booking_step",
      "booking_abandon",
      "booking_complete",
      "booking_error",
      "qr_generate",
      "qr_download",
      "card_generate",
      "card_download"
    ]
  },

  legal: {
    controllerName: "[PENDIENTE: nombre completo o razón social]",
    taxId: "[PENDIENTE: NIF/CIF]",
    postalAddress: "[PENDIENTE: domicilio o dirección a efectos legales]",
    contactEmail: "contacto@afropxmusic.com",
    bookingRetention:
      "[PENDIENTE: plazo de conservación de solicitudes y reservas]",
    jurisdiction:
      "[PENDIENTE: localidad y órganos jurisdiccionales aplicables]"
  }
};

export function getBookableServices() {
  return SITE_CONFIG.mixing.services.filter((service) => service.bookable);
}

export function getServiceById(serviceId) {
  return SITE_CONFIG.mixing.services.find((service) => service.id === serviceId);
}

export function getFeaturedRelease() {
  return SITE_CONFIG.releases.find((release) => release.featured);
}

export function formatPrice(service, locale = SITE_CONFIG.site.locale) {
  if (service.priceCents == null) {
    return service.priceLabel || "Consultar";
  }

  const value = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: service.currency || "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(service.priceCents / 100);

  return service.priceSuffix ? `${value} ${service.priceSuffix}` : value;
}

export default SITE_CONFIG;
