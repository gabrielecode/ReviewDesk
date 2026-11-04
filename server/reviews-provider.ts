export interface ProviderReview {
  id?: string;
  author: string;
  rating: number;
  text: string;
  publishedAt: string; // ISO string
  ownerReply?: {
    text: string;
    date?: string;
  };
}

function extractOwnerReply(item: any): { text: string; date?: string } | undefined {
  if (!item || typeof item !== 'object') return undefined;

  const candidateKeys = ['owner_response', 'owner_reply', 'response', 'reply', 'ownerReply'];
  for (const key of candidateKeys) {
    const val = item[key];
    if (!val) continue;

    // Se è stringa diretta
    if (typeof val === 'string' && val.trim().length > 0) {
      const dateVal = item[`${key}_date`] || item.owner_response_date || item.owner_reply_date || item.response_date || item.reply_date;
      return {
        text: val.trim(),
        date: typeof dateVal === 'string' && dateVal.trim() ? dateVal.trim() : undefined
      };
    }

    // Se è un oggetto annidato (es. { text: "...", date: "..." })
    if (typeof val === 'object') {
      const text = typeof val.text === 'string' 
        ? val.text.trim() 
        : (typeof val.content === 'string' 
            ? val.content.trim() 
            : (typeof val.snippet === 'string' ? val.snippet.trim() : ''));

      const rawDate = val.date || val.iso_date || val.published_at || val.isoDate || item[`${key}_date`];
      const date = rawDate ? String(rawDate).trim() : undefined;

      if (text) {
        return {
          text,
          date
        };
      }
    }
  }

  return undefined;
}

export interface ReviewsProvider {
  fetchReviews(input: { 
    placeId?: string; 
    googleUrl?: string; 
    query?: string 
  }): Promise<{ placeId: string; reviews: ProviderReview[] }>;
}

/**
 * Provider recensioni tramite SerpKite API.
 */
export class SerpKiteReviewsProvider implements ReviewsProvider {
  private apiKey: string;
  private baseUrl = 'https://api.serpkite.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(endpoint: string, params: Record<string, string>): Promise<any> {
    const url = new URL(endpoint, this.baseUrl);
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        url.searchParams.set(key, String(val));
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      let response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      // Se risponde 401 riprova con X-API-Key
      if (response.status === 401) {
        response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
            'Accept': 'application/json'
          },
          signal: controller.signal
        });
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`SerpKite error (${response.status} ${response.statusText}): ${errorText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async fetchReviews(input: { placeId?: string; googleUrl?: string; query?: string }): Promise<{ placeId: string; reviews: ProviderReview[] }> {
    let placeId = input.placeId?.trim();

    // Recupero Place ID se non fornito
    if (!placeId) {
      const q = input.query || input.googleUrl || '';
      if (!q) {
        throw new Error('Attività non trovata su Google Maps');
      }

      const placesData = await this.request('/v1/places', { q });
      const placesList = Array.isArray(placesData)
        ? placesData
        : (placesData?.places || placesData?.results || placesData?.data || []);

      const firstPlace = placesList[0];
      if (!firstPlace) {
        throw new Error('Attività non trovata su Google Maps');
      }

      placeId = firstPlace.place_id || firstPlace.placeId || firstPlace.cid || firstPlace.fid || firstPlace.id;
      if (!placeId) {
        throw new Error('Attività non trovata su Google Maps');
      }
    }

    // GET /v1/reviews con place_id, num=10
    const reviewsData = await this.request('/v1/reviews', {
      place_id: placeId,
      num: '10',
      sort: 'most_relevant'
    });

    const rawReviewsList = Array.isArray(reviewsData)
      ? reviewsData
      : (reviewsData?.reviews || reviewsData?.data || reviewsData?.results || []);

    if (rawReviewsList.length > 0) {
      console.log('Object.keys(rawReviewsList[0]):', Object.keys(rawReviewsList[0]));
    }
    const itemWithReply = rawReviewsList.find((item: any) =>
      item && typeof item === 'object' && Object.keys(item).some(k => /owner|respon|reply|answer/i.test(k))
    );
    if (itemWithReply) {
      console.log(JSON.stringify(itemWithReply, null, 2));
    } else {
      console.log(`NESSUN CAMPO RISPOSTA nelle ${rawReviewsList.length} recensioni`);
    }

    const reviews: ProviderReview[] = rawReviewsList.map((item: any) => {
      const author = item.author || item.user?.name || item.author_name || item.name || item.reviewer?.name || '';

      let rating = 0;
      if (typeof item.rating === 'number') {
        rating = item.rating;
      } else if (item.stars !== undefined) {
        rating = Number(item.stars) || 0;
      } else if (item.score !== undefined) {
        rating = Number(item.score) || 0;
      } else if (item.rating) {
        rating = Number(item.rating) || 0;
      }

      const text = item.text || item.snippet || item.content || item.review_text || '';

      let publishedAt = '';
      const rawDate = item.iso_date || item.published_at || item.publishedAt || item.isoDate || item.date || item.timestamp;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          publishedAt = d.toISOString();
        } else if (typeof rawDate === 'string') {
          publishedAt = rawDate;
        }
      }

      const ownerReply = extractOwnerReply(item);

      const mapped: ProviderReview = {
        author,
        rating,
        text,
        publishedAt
      };

      if (ownerReply) {
        mapped.ownerReply = ownerReply;
      }

      return mapped;
    });

    const repliesCount = reviews.filter(r => Boolean(r.ownerReply?.text)).length;
    console.log(`SerpKite ownerReply trovate: ${repliesCount} su ${reviews.length} recensioni`);

    return {
      placeId,
      reviews
    };
  }
}

export async function getReviewsFromProvider(input: { placeId?: string; googleUrl?: string; query?: string }): Promise<{ placeId: string; reviews: ProviderReview[] }> {
  const apiKey = process.env.SERPKITE_API_KEY;

  if (!apiKey) {
    throw new Error('Chiave SERPKITE_API_KEY mancante. Configurala nelle variabili d\'ambiente per la sincronizzazione tramite SerpKite.');
  }

  const provider = new SerpKiteReviewsProvider(apiKey);
  return await provider.fetchReviews(input);
}

/**
 * Utilizza TomTom Search API per trovare attività.
 */
export async function searchTomTom(query: string) {
  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    console.warn('TOMTOM_API_KEY mancante.');
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const baseUrl = 'https://api.tomtom.com/search/2/fuzzySearch';
    const params = new URLSearchParams({
      key: apiKey,
      language: 'it-IT',
      limit: '5'
    });

    const response = await fetch(`${baseUrl}/${encodeURIComponent(query)}.json?${params.toString()}`, {
      signal: controller.signal
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error('TomTom search error:', err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
