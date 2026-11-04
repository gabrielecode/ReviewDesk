import express from 'express';
import { db } from './src/db/index.ts';
import { users, businesses, reviews, requests, pilotRequests, appSettings } from './src/db/schema.ts';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import dns from 'dns';
import net from 'net';
import { URL } from 'url';
import { createHash } from 'crypto';
import { GoogleGenAI, Type } from "@google/genai";
import tripadvisorRoutes from './api/tripadvisorRoutes.ts';

const app = express();
app.use(express.json());
app.use('/api/tripadvisor', tripadvisorRoutes);

console.log('Database configuration check:');
console.log('SQL_HOST:', process.env.SQL_HOST ? 'Present' : 'Missing');
console.log('SQL_USER:', process.env.SQL_USER ? 'Present' : 'Missing');
console.log('SQL_DB_NAME:', process.env.SQL_DB_NAME ? 'Present' : 'Missing');

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

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

// Public registration route
app.post('/api/public/register', async (req, res) => {
  try {
    const { email, password, name, businessName, businessType } = req.body;
    
    if (!email || !password || !name || !businessName) {
      return res.status(400).json({ error: 'Tutti i campi sono obbligatori.' });
    }

    const signupsOpen = await getSignupsOpen();
    if (!signupsOpen) {
      return res.status(403).json({ error: 'Le registrazioni sono attualmente chiuse.' });
    }

    // 1. Create Firebase User
    const userRecord = await adminAuth.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      displayName: String(name).trim(),
    });

    const userId = userRecord.uid;

    // 2. Create User in our DB
    await getOrCreateUser(userId, userRecord.email || '');

    // 3. Create Business
    const businessId = 'biz-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    await db.insert(businesses).values({
      id: businessId,
      userId: userId,
      name: String(businessName).trim(),
      category: String(businessType || 'Altro').trim(),
      location: 'Ticino', // Default
      signerName: String(name).trim().split(' ')[0] || 'Staff',
      tone: 'caloroso',
      defaultLanguage: 'it',
      isConnected: false,
      smsTemplate: `Buongiorno {nome}, grazie per averci scelto! Lasciaci una recensione su Google qui: {link}`,
    });

    res.json({ 
      success: true, 
      message: 'Registrazione completata con successo! Ora puoi accedere.',
      userId 
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Errore durante la registrazione.' });
  }
});

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
    
    // Check if database is configured
    if (!process.env.SQL_HOST) {
      return res.status(503).json({ 
        error: 'Database non configurato', 
        message: 'Il database non è stato ancora inizializzato. Se hai appena pubblicato l\'app, attendi qualche istante o contatta l\'assistenza.' 
      });
    }
    
    const bizs = await db.select().from(businesses).where(eq(businesses.userId, user.uid));
    
    let revs: any[] = [];
    let reqs: any[] = [];
    
    if (bizs.length > 0) {
      const bizIds = bizs.map(b => b.id);
      revs = await db.select().from(reviews).where(inArray(reviews.businessId, bizIds)).catch(e => {
        console.error('Reviews fetch error:', e);
        return [];
      });
      reqs = await db.select().from(requests).where(inArray(requests.businessId, bizIds)).catch(e => {
        console.error('Requests fetch error:', e);
        return [];
      });
    }
    
    res.json({ businesses: bizs, reviews: revs, requests: reqs });
  } catch (error: any) {
    console.error('API Data error:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento dei dati.',
      message: error.message || 'Errore interno',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
        // googleApiKey: b.googleApiKey, // MODIFICATO: deprecato
        syncFrequency: b.syncFrequency || 'daily',
        autoSyncReviews: b.autoSyncReviews ?? true,
        lastSyncAt: b.lastSyncAt,
        notifyNegativeReviews: b.notifyNegativeReviews ?? true,
        notifyEmailEnabled: b.notifyEmailEnabled ?? true,
        notifyEmailAddress: b.notifyEmailAddress,
        notifyDashboardEnabled: b.notifyDashboardEnabled ?? true,
        notifyResponseTargetHours: b.notifyResponseTargetHours ?? 12,
        notifyAutoDraft: b.notifyAutoDraft ?? true,
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
          // googleApiKey: b.googleApiKey, // MODIFICATO: deprecato
          syncFrequency: b.syncFrequency,
          autoSyncReviews: b.autoSyncReviews,
          lastSyncAt: b.lastSyncAt,
          notifyNegativeReviews: b.notifyNegativeReviews,
          notifyEmailEnabled: b.notifyEmailEnabled,
          notifyEmailAddress: b.notifyEmailAddress,
          notifyDashboardEnabled: b.notifyDashboardEnabled,
          notifyResponseTargetHours: b.notifyResponseTargetHours,
          notifyAutoDraft: b.notifyAutoDraft,
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

app.delete('/api/businesses/:businessId/reviews', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { businessId } = req.params;
    
    // Ownership check
    const [biz] = await db.select().from(businesses).where(and(eq(businesses.id, businessId), eq(businesses.userId, req.user!.uid)));
    if (!biz) return res.status(403).json({ error: 'Non autorizzato' });
    
    await db.delete(reviews).where(eq(reviews.businessId, businessId));
    res.json({ success: true, message: 'Recensioni eliminate con successo.' });
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

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY || '',
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userContent,
        config: { systemInstruction: systemPrompt }
      });

      const draft = response.text?.trim();
      if (draft) return res.json({ draft });
    } catch (aiErr) {
      console.warn('Gemini draft failed:', aiErr);
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

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY || '',
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

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
  "strengths": ["punto di forza 1", "punto di forza 2", "punto di forza 3"],
  "improvements": ["area di miglioramento 1", "area di miglioramento 2"]
}
Scrivi in italiano chiaro e sintetico.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'Analizza le recensioni.',
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['strengths', 'improvements']
          }
        }
      });

      const content = response.text || '{}';
      const parsed = JSON.parse(content);
      return res.json(parsed);
    } catch (aiErr) {
      console.warn('Gemini insights failed:', aiErr);
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
    const businessName = body.businessName || dbBiz.name;
    const location = body.location || dbBiz.location;
    const force = body.force === true;

    // Cache logic: se lastSyncAt < 30 min e non è forzato, non chiamare il provider
    if (!force && dbBiz.lastSyncAt) {
      const lastSync = new Date(dbBiz.lastSyncAt).getTime();
      const now = Date.now();
      if (now - lastSync < 30 * 60 * 1000) {
        return res.json({
          success: true,
          count: 0,
          updatedCount: 0,
          alreadyPresent: 0,
          reviews: [],
          resolvedUrl: googleUrl,
          googlePlaceId: googlePlaceId,
          lastSyncAt: dbBiz.lastSyncAt,
          message: 'Recensioni già aggiornate pochi minuti fa'
        });
      }
    }

    let resolvedPlaceId = googlePlaceId;
    let resolvedUrl = googleUrl;
    let providerInput: any = {};

    if (resolvedPlaceId) {
      providerInput.placeId = resolvedPlaceId;
    } else if (googleUrl) {
      const urlInfo = await resolveGoogleShareUrl(googleUrl);
      resolvedPlaceId = urlInfo.extractedPlaceId || '';
      resolvedUrl = urlInfo.resolvedUrl || googleUrl;
      providerInput.googleUrl = resolvedUrl;
    } else {
      providerInput.query = `${businessName} ${location}`;
    }

    const { getReviewsFromProvider } = await import('./server/reviews-provider.ts');
    const providerResult = await getReviewsFromProvider(providerInput);
    
    resolvedPlaceId = providerResult.placeId || resolvedPlaceId;
    const rawReviews = providerResult.reviews || [];

    const existingRevs = await db.select().from(reviews).where(eq(reviews.businessId, businessId));

    const newRevs: any[] = [];
    let alreadyPresent = 0;
    let updatedCount = 0;
    const updatedReviewIds = new Set<string>();

    const formatReplyDate = (rawDate?: string): string => {
      const today = new Date().toISOString().split('T')[0];
      if (!rawDate) return today;
      const trimmed = String(rawDate).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        return trimmed.slice(0, 10);
      }
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
      return today;
    };

    const suspiciousNames = ['mario rossi', 'luisa verdi', 'john doe', 'jane doe', 'test user', 'cliente google'];
    for (const rev of rawReviews) {
      const author = rev.author || 'Cliente Google';
      const text = rev.text || '';
      const rating = rev.rating || 5;
      const publishTime = rev.publishedAt ? rev.publishedAt.split('T')[0] : new Date().toISOString().split('T')[0];
      
      // Filtra nomi sospetti che indicano allucinazione dell'AI
      if (suspiciousNames.includes(author.toLowerCase().trim()) && text.length < 100) {
        console.warn(`Filtro allucinazione AI: saltata recensione di "${author}"`);
        continue;
      }

      // Logica stableId: sha1 di autore+data+testo
      const contentForHash = `${author}|${publishTime}|${text}`;
      const stableId = `g-rev-${businessId}-${createHash('sha1').update(contentForHash).digest('hex').slice(0, 20)}`;

      const existingReview = existingRevs.find(r => 
        r.id === stableId || 
        (r.author === author && (r.text || '').slice(0, 80) === text.slice(0, 80))
      );

      const hasOwnerReply = Boolean(rev.ownerReply?.text && rev.ownerReply.text.trim().length > 0);

      if (existingReview) {
        alreadyPresent++;

        // TASK 3: Se una recensione già in DB ha status 'da_rispondere' o 'bozza_pronta' e il provider ora restituisce ownerReply.text,
        // aggiornala a 'pubblicata' con replyText e replyDate. Non toccare quelle già 'pubblicata'.
        if (
          hasOwnerReply &&
          !updatedReviewIds.has(existingReview.id) &&
          (existingReview.status === 'da_rispondere' || existingReview.status === 'bozza_pronta')
        ) {
          const replyText = rev.ownerReply!.text.trim();
          const replyDate = formatReplyDate(rev.ownerReply?.date);

          await db.update(reviews).set({
            status: 'pubblicata',
            replyText,
            replyDate
          }).where(eq(reviews.id, existingReview.id));

          existingReview.status = 'pubblicata';
          existingReview.replyText = replyText;
          existingReview.replyDate = replyDate;
          updatedReviewIds.add(existingReview.id);
          updatedCount++;
        }

        continue;
      }

      // TASK 2: nuove recensioni
      // Se ownerReply.text esiste: status 'pubblicata', replyText = testo, replyDate = data (YYYY-MM-DD, oggi se manca). Altrimenti resta 'da_rispondere'.
      const status = hasOwnerReply ? 'pubblicata' : 'da_rispondere';
      const newReviewData: any = {
        id: stableId,
        businessId: businessId,
        author,
        stars: rating,
        text,
        date: publishTime,
        status
      };

      if (hasOwnerReply) {
        newReviewData.replyText = rev.ownerReply!.text.trim();
        newReviewData.replyDate = formatReplyDate(rev.ownerReply?.date);
      } else if (rating <= 2 && dbBiz.notifyAutoDraft !== false) {
        // Pre-genera bozza diplomatica per recensioni 1-2 stelle per velocizzare la risposta
        const autoDraft = buildSmartDraftReply(text, author, rating, dbBiz);
        if (autoDraft) {
          newReviewData.status = 'bozza_pronta';
          newReviewData.draftText = autoDraft;
        }
      }

      newRevs.push(newReviewData);
    }

    const newNegativeCount = newRevs.filter(r => r.stars <= 2 && r.status !== 'pubblicata').length;
    if (newNegativeCount > 0 && dbBiz.notifyNegativeReviews !== false) {
      console.log(`[ALERT NOTIFICHE 1-2★] Rilevate ${newNegativeCount} nuove recensioni critiche per "${dbBiz.name}". Canale Email: ${dbBiz.notifyEmailEnabled !== false ? (dbBiz.notifyEmailAddress || req.user?.email || 'Attivo') : 'Disattivato'}, Dashboard: ${dbBiz.notifyDashboardEnabled !== false ? 'Attivo' : 'Disattivato'}`);
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

    let message = '';
    if (newRevs.length > 0 && updatedCount > 0) {
      message = `Sincronizzazione completata! Importate ${newRevs.length} nuove recensioni e aggiornate ${updatedCount} con risposta del titolare.`;
    } else if (newRevs.length > 0) {
      message = `Sincronizzazione completata! Importate ${newRevs.length} nuove recensioni.`;
    } else if (updatedCount > 0) {
      message = `Sincronizzazione completata! Aggiornate ${updatedCount} recensioni con risposta del titolare.`;
    } else {
      message = `Tutte le recensioni recenti sono già presenti.`;
    }

    return res.json({
      success: true,
      count: newRevs.length,
      updatedCount,
      alreadyPresent,
      newNegativeCount,
      reviews: newRevs,
      resolvedUrl,
      googlePlaceId: resolvedPlaceId,
      lastSyncAt,
      message
    });

  } catch (err: any) {
    console.error('Sync error:', err);
    return res.status(502).json({ success: false, message: err.message || 'Errore durante la sincronizzazione con il provider.' });
  }
});

app.post('/api/notifications/test-negative-alert', requireAuth, async (req: AuthRequest, res) => {
  try {
    const business = await verifyBusinessOwnership(req, res);
    if (!business) return;

    const email = (req.body?.email || business.notifyEmailAddress || req.user?.email || '').trim();
    const targetHours = business.notifyResponseTargetHours || 12;

    const simulatedSample = {
      author: 'Cliente Verificato (Test)',
      stars: 1,
      date: new Date().toISOString().split('T')[0],
      text: 'Purtroppo l\'esperienza non ha risposto alle aspettative. Tempi di attesa eccessivi e scarsa disponibilità.',
      suggestedAction: `Rispondere entro ${targetHours} ore per contenere il disservizio e invitare a un chiarimento privato.`,
      draftReply: buildSmartDraftReply('Purtroppo l\'esperienza non ha risposto alle aspettative.', 'Cliente Verificato (Test)', 1, business)
    };

    console.log(`[TEST ALERT 1-2★] Inviato test notifica per "${business.name}" a ${email}. Canali: ${business.notifyEmailEnabled ? 'Email' : ''} ${business.notifyDashboardEnabled ? 'Dashboard' : ''}`);

    res.json({
      success: true,
      message: `Simulazione completata con successo! Notifica di allerta per recensione negativa (1 stella) generata per "${business.name}".`,
      sentToEmail: email,
      emailEnabled: business.notifyEmailEnabled !== false,
      dashboardEnabled: business.notifyDashboardEnabled !== false,
      targetHours,
      sample: simulatedSample
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Errore durante il test delle notifiche.' });
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

app.post('/api/tomtom/search', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query di ricerca mancante.' });

    const { searchTomTom } = await import('./server/reviews-provider.ts');
    const results = await searchTomTom(query);

    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Errore interno del server',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

export default app;
