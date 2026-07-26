/**
 * Adaptadores desacoplados para datos musicales.
 *
 * La web usa el proveedor manual por defecto. Los adaptadores externos no se
 * activan hasta que existan credenciales de servidor y endpoints propios; las
 * claves de Spotify o YouTube nunca deben vivir en el navegador.
 */
export class ManualMusicProvider {
  constructor(config) {
    this.config = config;
  }

  async getArtist() {
    return {
      source: "manual",
      loading: false,
      error: null,
      artist: this.config.artist,
      releases: this.config.releases
    };
  }
}

export class SpotifyMusicProvider {
  constructor(endpoint = "/api/integrations/spotify") {
    this.endpoint = endpoint;
  }

  async getArtist() {
    const response = await fetch(this.endpoint, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      throw new Error("SPOTIFY_PROVIDER_UNAVAILABLE");
    }
    return response.json();
  }
}

export class YouTubeMusicProvider {
  constructor(endpoint = "/api/integrations/youtube") {
    this.endpoint = endpoint;
  }

  async getChannel() {
    const response = await fetch(this.endpoint, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) {
      throw new Error("YOUTUBE_PROVIDER_UNAVAILABLE");
    }
    return response.json();
  }
}

export async function withManualFallback(primary, fallback) {
  try {
    return await primary();
  } catch (error) {
    const manual = await fallback();
    return {
      ...manual,
      source: "manual-fallback",
      error:
        error instanceof Error
          ? error.message
          : "EXTERNAL_PROVIDER_UNAVAILABLE"
    };
  }
}
