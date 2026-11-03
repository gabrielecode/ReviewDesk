import express from 'express';
import { db } from './src/db/index.ts';
import { users, businesses, reviews, requests, pilotRequests, appSettings } from './src/db/schema.ts';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import dns from 'dns';
import net from 'net';
import { URL } from 'url';
import { createHash } from 'crypto';

const app = express();
app.use(express.json());

// Rate limiting map
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  const userId = user?.uid || 'anonymous';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 60;

  let record = rateLimitMap.get(userId);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    rateLimitMap.set(userId, record);
  } else {
    record.count++;
    if (record.count > maxRequests) {
      return res.status(429).json({ error: 'Troppe richieste. Riprova tra un minuto.' });
    }
  }
  next();
}

function isAdminUser(userEmail?: string): boolean {
  if (!userEmail) return false;
  const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
  const adminEmails = adminEmailsEnv.split(',').map(e => e.toLowerCase().trim()).filter(Boolean);
  return adminEmails.includes(userEmail.toLowerCase().trim());
}

async function getSignupsOpen(): Promise<boolean> {
  try {
    const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, 'signups_open'));
    if (setting) {
      return setting.value !== 'false';
    }
  } catch {}
  return true;
}

async function setSignupsOpenDb(open: boolean): Promise<void> {
  try {
    await db.insert(appSettings)
      .values({ key: 'signups_open', value: String(open) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: String(open) }
      });
  } catch {}
}

app.get('/api/health', (req, res) => {
  const openRouterConfigured = !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== '';
  res.json({
    ok: true,
    openRouterConfigured,
  });
});

// Sync user on every auth request
app.use('/api/*', async (req, res, next) => {
  if (req.path === '/api/health' || req.path === '/api/request-access') return next();
  
  // requireAuth is handled in specific routes, but we need the user object
  // For routes that don't use requireAuth, we might not have a user
  next();
});

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 25000): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('Tempo scaduto durante la chiamata a OpenRouter.'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (err) {
    clearTimeout(timeoutHandle!);
    throw err;
  }
}

function buildSmartDraftReply(reviewText: string, author: string, stars: number, biz: any): string {
  const name = biz.name || 'Attività';
  const signer = biz.signerName || 'Staff';
  const privateContact = biz.privateContact || 'nostro contatto diretto';
  const tone = biz.tone || 'caloroso';
  const authorName = author || 'Cliente';

  if (stars <= 2) {
    if (tone === 'formale') {
      return `Gentile ${authorName}, La ringraziamo per aver espresso la Sua opinione. Ci rincresce profondamente apprendere che la Sua esperienza non abbia risposto alle aspettative. Desideriamo approfondire l'accaduto e La invitiamo a contattarci in via riservata presso ${privateContact}. Cordiali saluti, ${signer}`;
    } else {
      return `Gentile ${authorName}, ti ringraziamo per il riscontro. Ci dispiace davvero molto per l'inconveniente riscontrato durante la visita. La qualità del servizio è la nostra priorità: ti invitiamo a contattarci in privato a ${privateContact} così da poter approfondire insieme. Un caro saluto, ${signer}`;
    }
  } else if (stars === 3) {
    return `Gentile ${authorName}, grazie per la recensione! Apprezziamo molto la Sua visita e faremo tesoro delle Sue osservazioni per offrire un servizio ancora migliore la prossima volta. A presto, ${signer}`;
  } else {
    if (tone === 'diretto') {
      return `Grazie mille ${authorName}! Felici che ti sia trovato bene da ${name}. Alla prossima! Un saluto, ${signer}`;
    } else if (tone === 'formale') {
      return `Gentile ${authorName}, La ringraziamo vivamente per la splendida recensione. È un vero piacere sapere che il Suo soggiorno presso ${name} sia stato di Suo gradimento. La aspettiamo nuovamente con grande piacere. Cordiali saluti, ${signer}`;
    } else {
      return `Caro/a ${authorName}, grazie di cuore per le bellissime parole! Siamo felicissimi che tu abbia apprezzato la tua esperienza da ${name}. Non vediamo l'ora di riaccoglierti presto! Un caro saluto, ${signer}`;
    }
  }
}

async function verifyBusinessOwnership(req: AuthRequest, res: express.Response) {
  const user = req.user;
  if (!user) return null;

  const businessId = req.body?.businessId || req.query?.businessId;
  if (!businessId) {
    res.status(400).json({ error: 'ID attività non specificato.' });
    return null;
  }

  try {
    const [biz] = await db.select().from(businesses).where(and(eq(businesses.id, businessId), eq(businesses.userId, user.uid)));
    if (!biz) {
      res.status(403).json({ error: 'Accesso negato o attività non trovata.' });
      return null;
    }
    return biz;
  } catch (err) {
    res.status(403).json({ error: 'Accesso negato.' });
    return null;
  }
}

// Data fetching route (replacement for client-side Supabase calls)
app.get('/api/data', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    await getOrCreateUser(user.uid, user.email || '');
    
    const bizs = await db.select().from(businesses).where(eq(businesses.userId, user.uid));
    
    let revs: any[] = [];
    let reqs: any[] = [];
    
    if (bizs.length > 0) {
      const bizIds = bizs.map(b => b.id);
      revs = await db.select().from(reviews).where(inArray(reviews.businessId, bizIds));
      reqs = await db.select().from(requests).where(inArray(requests.businessId, bizIds));
    }
    
    res.json({ businesses: bizs, reviews: revs, requests: reqs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/businesses', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user!;
    const b = req.body;
    const id = b.id || 'biz-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    
    await db.insert(businesses)
      .values({
        id,
        userId: user.uid,
        name: b.name,
        category: b.category,
        location: b.location,
        signerName: b.signerName,
        tone: b.tone,
        defaultLanguage: b.defaultLanguage,
        isConnected: b.isConnected || false,
        smsTemplate: b.smsTemplate,
        phrasesToAvoid: b.phrasesToAvoid,
        privateContact: b.privateContact,
        googleUrl: b.googleUrl,
        googlePlaceId: b.googlePlaceId,
        googleAccountId: b.googleAccountId,
        googleLocationId: b.googleLocationId,
        googleApiKey: b.googleApiKey,
        syncFrequency: b.syncFrequency || 'daily',
        autoSyncReviews: b.autoSyncReviews ?? true,
        lastSyncAt: b.lastSyncAt
      })
      .onConflictDoUpdate({
        target: businesses.id,
        set: {
          name: b.name,
          category: b.category,
          location: b.location,
          signerName: b.signerName,
          tone: b.tone,
          defaultLanguage: b.defaultLanguage,
          isConnected: b.isConnected,
          smsTemplate: b.smsTemplate,
          phrasesToAvoid: b.phrasesToAvoid,
          privateContact: b.privateContact,
          googleUrl: b.googleUrl,
          googlePlaceId: b.googlePlaceId,
          googleAccountId: b.googleAccountId,
          googleLocationId: b.googleLocationId,
          googleApiKey: b.googleApiKey,
          syncFrequency: b.syncFrequency,
          autoSyncReviews: b.autoSyncReviews,
          lastSyncAt: b.lastSyncAt
        }
      });
      
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/reviews/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const [rev] = await db.select().from(reviews).where(eq(reviews.id, id));
    if (!rev) return res.status(404).json({ error: 'Recensione non trovata' });
    
    // Ownership check via business
    const [biz] = await db.select().from(businesses).where(and(eq(businesses.id, rev.businessId), eq(businesses.userId, req.user!.uid)));
    if (!biz) return res.status(403).json({ error: 'Non autorizzato' });
    
    await db.update(reviews).set(updates).where(eq(reviews.id, id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/requests', requireAuth, async (req: AuthRequest, res) => {
  try {
    const r = req.body;
    const id = r.id || 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    
    // Check ownership of business
    const [biz] = await db.select().from(businesses).where(and(eq(businesses.id, r.businessId), eq(businesses.userId, req.user!.uid)));
    if (!biz) return res.status(403).json({ error: 'Non autorizzato' });
    
    await db.insert(requests).values({
      id,
      businessId: r.businessId,
      clientName: r.clientName,
      phone: r.phone,
      date: r.date,
      status: r.status || 'inviata',
      text: r.text,
      consent: r.consent || false,
      consentAt: r.consentAt
    });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/draft-reply', requireAuth, rateLimiter, async (req: AuthRequest, res) => {
  try {
    const business = await verifyBusinessOwnership(req, res);
    if (!business) return;

    const { reviewText, author, stars } = req.body || {};
    const authorName = author || 'Cliente';
    const ratingStars = typeof stars === 'number' ? stars : 5;

    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== '') {
      try {
        const { name, category, location, signerName, tone, privateContact, defaultLanguage } = business;
        const langInstruction = 
          defaultLanguage === 'de' ? 'Scrivi rigorosamente in lingua tedesca.' :
          defaultLanguage === 'en' ? 'Scrivi rigorosamente in lingua inglese.' :
          defaultLanguage === 'it' ? 'Scrivi rigorosamente in lingua italiana.' :
          'Rispondi nella stessa lingua in cui è scritta la recensione (auto).';

        const systemPrompt = `Sei l'assistente virtuale di "${name || 'Attività'}" (${category || ''}, a ${location || ''}).
Devi scrivere una bozza di risposta professionale per una recensione Google lasciata da ${authorName} (${ratingStars} stelle).

Regole tassative:
1. ${langInstruction}
2. Tono: ${tone || 'caloroso'}.
3. Massimo 70 parole.
4. Cita un dettaglio concreto della recensione.
5. Firma tassativamente con il nome: "${signerName || 'Staff'}".
6. ${ratingStars <= 2 ? 'ATTENZIONE: Recensione negativa. Ringrazia per il feedback, mostra empatia, non cercare scuse e invita gentilmente a contattare l\'attività in privato (' + (privateContact || 'contatto privato') + ').' : 'Ringrazia calorosamente il cliente.'}
7. Restituisci SOLO il testo della risposta pronto per essere pubblicato, senza virgolette e senza commenti extra.`;

        const userContent = `<recensione>\nAutore: ${authorName}\nStelle: ${ratingStars}\nTesto: ${reviewText || '(Nessun testo, solo votazione a stelle)'}\n</recensione>`;

        const response = await withTimeout(
          fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://reviewdesk.app',
              'X-Title': 'ReviewDesk',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'openai/gpt-4o-mini',
              max_tokens: 300,
              temperature: 0.7,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
              ]
            })
          })
        );

        if (response.ok) {
          const data = await response.json();
          const draft = data.choices?.[0]?.message?.content?.trim();
          if (draft) return res.json({ draft });
        }
      } catch (orErr) {
        console.warn('OpenRouter draft failed:', orErr);
      }
    }

    const draft = buildSmartDraftReply(reviewText || '', authorName, ratingStars, business);
    return res.json({ draft });
  } catch (error: any) {
    console.error('Draft error:', error);
    return res.status(500).json({ error: error.message || 'Errore generazione bozza' });
  }
});

app.post('/api/insights', requireAuth, rateLimiter, async (req: AuthRequest, res) => {
  try {
    const business = await verifyBusinessOwnership(req, res);
    if (!business) return;

    const revs = await db.select().from(reviews).where(eq(reviews.businessId, business.id)).limit(30);

    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== '') {
      try {
        const reviewsSummary = revs.map((r: any) => {
          const txt = typeof r.text === 'string' ? r.text.substring(0, 400) : '';
          return `[${r.stars || 5} stelle] ${txt || 'Solo stelle'}`;
        }).join('\n');

        const systemPrompt = `Analizza le seguenti recensioni Google per l'attività "${business.name}" (${business.category}):
<recensioni>
${reviewsSummary}
</recensioni>

Restituisci un oggetto JSON con questa esatta struttura:
{
  \"strengths\": [\"punto di forza 1\", \"punto di forza 2\", \"punto di forza 3\"],
  \"improvements\": [\"area di miglioramento 1\", \"area di miglioramento 2\"]
}
Scrivi in italiano chiaro e sintetico.`;

        const response = await withTimeout(
          fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
              'HTTP-Referer': 'https://reviewdesk.app',
              'X-Title': 'ReviewDesk',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'openai/gpt-4o-mini',
              max_tokens: 500,
              temperature: 0.7,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Restituisci l\'analisi JSON richiesta.' }
              ]
            })
          })
        );

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '{}';
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.strengths) && Array.isArray(parsed.improvements)) {
            return res.json(parsed);
          }
        }
      } catch (orErr) {
        console.warn('OpenRouter insights failed:', orErr);
      }
    }

    return res.json({ strengths: [], improvements: [] });
  } catch (error: any) {
    console.error('Insights error:', error);
    return res.json({ strengths: [], improvements: [] });
  }
});

async function isPrivateIp(hostname: string): Promise<boolean> {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  if (net.isIP(hostname)) {
    return isIpPrivate(hostname);
  }
  try {
    const addresses = await dns.promises.resolve4(hostname);
    for (const ip of addresses) {
      if (isIpPrivate(ip)) return true;
    }
  } catch {}
  return false;
}

function isIpPrivate(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  return false;
}

async function resolveGoogleShareUrl(rawUrl: string): Promise<{ resolvedUrl: string; extractedPlaceId?: string; extractedName?: string }> {
  if (!rawUrl) return { resolvedUrl: '' };
  try {
    let currentUrl = rawUrl.trim();
    if (!currentUrl.startsWith('http')) currentUrl = 'https://' + currentUrl;
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== 'https:') throw new Error('Solo protocollo HTTPS consentito');
    
    const allowedHosts = ['share.google', 'g.page', 'maps.app.goo.gl', 'google.com', 'goo.gl'];
    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = allowedHosts.some(h => hostname === h || hostname.endsWith('.' + h));
    if (!isAllowed) throw new Error('Host non consentito');

    if (await isPrivateIp(hostname)) throw new Error('IP privato non consentito');

    let redirectCount = 0;
    let resUrl = parsed.toString();

    while (redirectCount < 3) {
      const res = await fetch(resUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        const location = res.headers.get('location')!;
        const nextUrl = new URL(location, resUrl);
        if (nextUrl.protocol !== 'https:') throw new Error('Redirect non HTTPS');
        if (await isPrivateIp(nextUrl.hostname)) throw new Error('Redirect verso IP privato');
        resUrl = nextUrl.toString();
        redirectCount++;
      } else {
        resUrl = res.url || resUrl;
        break;
      }
    }

    let extractedPlaceId: string | undefined;
    const placeIdMatch = resUrl.match(/placeid=([^&]+)/i) || resUrl.match(/!1s(ChIJ[^!&]+)/) || resUrl.match(/(ChIJ[a-zA-Z0-9_-]{20,})/);
    if (placeIdMatch && placeIdMatch[1]) {
      extractedPlaceId = placeIdMatch[1];
    }

    let extractedName: string | undefined;
    const nameMatch = resUrl.match(/\/maps\/place\/([^\/@]+)/i);
    if (nameMatch && nameMatch[1]) {
      extractedName = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
    }

    return { resolvedUrl: resUrl, extractedPlaceId, extractedName };
  } catch (err) {
    console.warn('URL resolution error:', err);
    return { resolvedUrl: rawUrl };
  }
}

app.post('/api/sync-google-reviews', requireAuth, rateLimiter, async (req: AuthRequest, res) => {
  try {
    const dbBiz = await verifyBusinessOwnership(req, res);
    if (!dbBiz) return;

    const body = req.body || {};
    const businessId = body.businessId;
    const googlePlaceId = (body.googlePlaceId || dbBiz.googlePlaceId || '').replace(/^places\//, '');
    const googleUrl = body.googleUrl || dbBiz.googleUrl || '';
    const mapsApiKey = body.apiKey || dbBiz.googleApiKey || process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    const businessName = body.businessName || dbBiz.name;
    const location = body.location || dbBiz.location;

    if (!mapsApiKey) {
      return res.status(400).json({ success: false, message: 'Chiave API Google Maps mancante. Inseriscila nelle impostazioni.' });
    }

    let resolvedPlaceId = googlePlaceId;
    let resolvedUrl = googleUrl;

    if (!resolvedPlaceId) {
      if (googleUrl) {
        const urlInfo = await resolveGoogleShareUrl(googleUrl);
        resolvedPlaceId = urlInfo.extractedPlaceId || '';
        resolvedUrl = urlInfo.resolvedUrl || googleUrl;
      }
      
      if (!resolvedPlaceId) {
        const searchQuery = `${businessName} ${location}`;
        const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': mapsApiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName'
          },
          body: JSON.stringify({ textQuery: searchQuery })
        });
        
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.places && searchData.places.length > 0) {
            resolvedPlaceId = searchData.places[0].id;
          }
        }
      }
    }

    if (!resolvedPlaceId) {
      return res.status(400).json({ success: false, message: 'Impossibile trovare il Place ID per questa attività. Inseriscilo manualmente nelle impostazioni.' });
    }

    const placesApiUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(resolvedPlaceId)}`;
    const pRes = await fetch(placesApiUrl, {
      headers: {
        'X-Goog-Api-Key': mapsApiKey,
        'X-Goog-FieldMask': 'displayName,rating,reviews'
      }
    });

    if (!pRes.ok) {
      const pErr = await pRes.json();
      return res.status(502).json({ success: false, message: pErr.error?.message || 'Errore durante la chiamata alle API di Google.' });
    }

    const pData = await pRes.json();
    const rawReviews = pData.reviews || [];

    const existingRevs = await db.select().from(reviews).where(eq(reviews.businessId, businessId));
    const existingMap = new Map<string, { author: string, text: string }>();
    existingRevs.forEach(r => {
      existingMap.set(r.id, { author: r.author, text: r.text || '' });
    });

    const newRevs: any[] = [];
    let alreadyPresent = 0;

    for (const rev of rawReviews) {
      const author = rev.authorAttribution?.displayName || 'Cliente Google';
      const text = rev.text?.text || '';
      const rating = rev.rating || 5;
      const publishTime = rev.publishTime ? rev.publishTime.split('T')[0] : new Date().toISOString().split('T')[0];
      
      const contentForHash = `${rev.name || author}|${publishTime}|${text}`;
      const stableId = `g-rev-${businessId}-${createHash('sha1').update(contentForHash).digest('hex').slice(0, 20)}`;

      const isDuplicate = existingMap.has(stableId) || Array.from(existingMap.values()).some(e => e.author === author && e.text.slice(0, 80) === text.slice(0, 80));

      if (isDuplicate) {
        alreadyPresent++;
        continue;
      }

      newRevs.push({
        id: stableId,
        businessId: businessId,
        author,
        stars: rating,
        text,
        date: publishTime,
        status: 'da_rispondere'
      });
    }

    if (newRevs.length > 0) {
      await db.insert(reviews).values(newRevs);
    }

    const lastSyncAt = new Date().toISOString();
    await db.update(businesses).set({
      isConnected: true,
      lastSyncAt,
      googlePlaceId: resolvedPlaceId,
      googleUrl: resolvedUrl
    }).where(eq(businesses.id, businessId));

    const message = newRevs.length === 0 
      ? `Tutte le recensioni recenti sono già presenti. Nota: Google Places API fornisce solo le 5 recensioni più recenti.`
      : `Sincronizzazione completata! Importate ${newRevs.length} nuove recensioni.`;

    return res.json({
      success: true,
      count: newRevs.length,
      alreadyPresent,
      reviews: newRevs,
      resolvedUrl,
      googlePlaceId: resolvedPlaceId,
      lastSyncAt,
      message
    });

  } catch (err: any) {
    console.error('Sync error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Errore interno.' });
  }
});

app.post('/api/request-access', async (req, res) => {
  try {
    const { name, businessName, businessType, email } = req.body;
    if (!name || !businessName || !email) {
      return res.status(400).json({ error: 'Nome, nome attività ed email sono obbligatori.' });
    }

    const id = 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    await db.insert(pilotRequests).values({
      id,
      name: String(name).trim(),
      businessName: String(businessName).trim(),
      businessType: String(businessType || 'Altro').trim(),
      email: String(email).trim().toLowerCase(),
      status: 'in_attesa',
      notes: 'Richiesta ricevuta da modulo Landing Page'
    });

    res.json({
      success: true,
      message: 'Richiesta registrata con successo! Ti invieremo un\'email di conferma con le credenziali di accesso.'
    });
  } catch (err: any) {
    console.error('Error in /api/request-access:', err);
    res.status(500).json({ error: err.message || 'Errore durante la registrazione della richiesta.' });
  }
});

app.get('/api/admin/pilot-requests', requireAuth, async (req: AuthRequest, res) => {
  if (!isAdminUser(req.user?.email)) {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
  }
  try {
    const reqs = await db.select().from(pilotRequests).orderBy(desc(pilotRequests.createdAt));
    return res.json({ requests: reqs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/pilot-requests/:id', requireAuth, async (req: AuthRequest, res) => {
  if (!isAdminUser(req.user?.email)) {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
  }
  const { id } = req.params;
  const { status, notes } = req.body;
  try {
    await db.update(pilotRequests).set({ status, notes }).where(eq(pilotRequests.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/config', requireAuth, async (req: AuthRequest, res) => {
  if (!isAdminUser(req.user?.email)) {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
  }
  const signupsOpen = await getSignupsOpen();
  res.json({ signupsOpen });
});

app.post('/api/admin/config', requireAuth, async (req: AuthRequest, res) => {
  if (!isAdminUser(req.user?.email)) {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
  }
  const { signupsOpen } = req.body;
  if (typeof signupsOpen === 'boolean') {
    await setSignupsOpenDb(signupsOpen);
  }
  const current = await getSignupsOpen();
  res.json({ signupsOpen: current });
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

export default app;
