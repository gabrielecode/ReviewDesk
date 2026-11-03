import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dns from 'dns';
import net from 'net';
import { URL } from 'url';
import { createHash } from 'crypto';

const app = express();
app.use(express.json());

function cleanSupabaseUrl(url: string | undefined | null): string {
  if (!url) return '';
  let cleaned = String(url).trim().replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/(rest|auth)(\/v1)?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

const rawSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const rawSupabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey = rawSupabaseAnonKey ? String(rawSupabaseAnonKey).trim() : '';
const supabaseServiceKey = rawSupabaseServiceKey ? String(rawSupabaseServiceKey).trim() : '';

const supabaseAdmin = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey || 'placeholder-key', {
  auth: { autoRefreshToken: false, persistSession: false }
});

function ensureServiceKey(res: express.Response): boolean {
  if (!supabaseServiceKey) {
    res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY mancante nelle variabili d\'ambiente.' });
    return false;
  }
  return true;
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token di autenticazione mancante.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Token non valido o scaduto.' });
    }
    (req as any).user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Errore di autenticazione.' });
  }
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  const userId = user?.id || 'anonymous';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30;

  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetTime) {
      rateLimitMap.delete(key);
    }
  }

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
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'signups_open')
      .single();
    if (!error && data) {
      if (data.value === false || data.value === 'false') return false;
    }
  } catch {}
  return true;
}

async function setSignupsOpenDb(open: boolean): Promise<void> {
  try {
    await supabaseAdmin
      .from('app_settings')
      .upsert({ key: 'signups_open', value: open });
  } catch {}
}

app.get('/api/health', (req, res) => {
  const openRouterConfigured = !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== '';
  res.json({
    ok: true,
    openRouterConfigured,
  });
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password sono obbligatori.' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return res.status(401).json({ error: error?.message || 'Credenziali non valide o errore di accesso.' });
    }
    return res.json({ success: true, session: data.session });
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Errore di autenticazione.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  if (!ensureServiceKey(res)) return;
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password sono obbligatori.' });
  }

  const signupsOpen = await getSignupsOpen();
  if (!signupsOpen) {
    return res.status(403).json({ error: 'Le registrazioni sono attualmente chiuse.' });
  }

  try {
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError) {
      return res.status(400).json({ error: createError.message });
    }

    const { data: loginData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    if (loginError || !loginData.session) {
      return res.status(401).json({ error: loginError?.message || 'Errore durante l\'accesso dopo la registrazione.' });
    }

    return res.json({ success: true, session: loginData.session });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Errore durante la registrazione.' });
  }
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

function buildSmartDraftReply(reviewText: string, author: string, stars: number, businessSettings: any): string {
  const name = businessSettings?.name || 'Attività';
  const signer = businessSettings?.signerName || 'Staff';
  const privateContact = businessSettings?.privateContact || 'nostro contatto diretto';
  const tone = businessSettings?.tone || 'caloroso';
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

async function verifyBusinessOwnership(req: express.Request, res: express.Response) {
  const user = (req as any).user;
  const businessId = req.body?.businessId || req.query?.businessId;
  if (!businessId) {
    res.status(400).json({ error: 'ID attività non specificato.' });
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      res.status(403).json({ error: 'Accesso negato o attività non trovata.' });
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      category: data.category,
      location: data.location,
      signerName: data.signer_name,
      tone: data.tone,
      defaultLanguage: data.default_language,
      phrasesToAvoid: data.phrases_to_avoid,
      privateContact: data.private_contact,
      googleUrl: data.google_url,
      isConnected: data.is_connected,
      smsTemplate: data.sms_template,
      googlePlaceId: data.google_place_id,
      googleApiKey: data.google_api_key
    };
  } catch (err) {
    res.status(403).json({ error: 'Accesso negato.' });
    return null;
  }
}

app.post('/api/draft-reply', requireAuth, rateLimiter, async (req, res) => {
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

app.post('/api/insights', requireAuth, rateLimiter, async (req, res) => {
  try {
    const business = await verifyBusinessOwnership(req, res);
    if (!business) return;

    const { data: revRows } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('business_id', business.id)
      .limit(30);

    const reviews = revRows || [];

    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== '') {
      try {
        const reviewsSummary = reviews.map((r: any) => {
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

app.post('/api/sync-google-reviews', requireAuth, rateLimiter, async (req, res) => {
  try {
    const dbBusiness = await verifyBusinessOwnership(req, res);
    if (!dbBusiness) return;

    const body = req.body || {};
    const businessId = body.businessId;
    const googlePlaceId = (body.googlePlaceId || dbBusiness.googlePlaceId || '').replace(/^places\//, '');
    const googleUrl = body.googleUrl || dbBusiness.googleUrl || '';
    const mapsApiKey = body.apiKey || dbBusiness.googleApiKey || process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
    const businessName = body.businessName || dbBusiness.name;
    const location = body.location || dbBusiness.location;

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

    const { data: existingReviews } = await supabaseAdmin
      .from('reviews')
      .select('id, author, text')
      .eq('business_id', businessId);

    const existingMap = new Map<string, { author: string, text: string }>();
    (existingReviews || []).forEach(r => {
      existingMap.set(r.id, { author: r.author, text: r.text });
    });

    const newReviews: any[] = [];
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

      newReviews.push({
        id: stableId,
        business_id: businessId,
        author,
        stars: rating,
        text,
        date: publishTime,
        status: 'da_rispondere',
        reply_text: null,
        reply_date: null,
        draft_text: null
      });
    }

    if (newReviews.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('reviews').insert(newReviews);
      if (insertError) {
        return res.status(500).json({ success: false, message: `Errore salvataggio recensioni: ${insertError.message}` });
      }
    }

    const lastSyncAt = new Date().toISOString();
    try {
      await supabaseAdmin.from('businesses').update({
        is_connected: true,
        last_sync_at: lastSyncAt,
        google_place_id: resolvedPlaceId,
        google_url: resolvedUrl
      }).eq('id', businessId);
    } catch (err) {
      console.error('Error updating business status:', err);
    }

    const message = newReviews.length === 0 
      ? `Tutte le recensioni recenti sono già presenti. Nota: Google Places API fornisce solo le 5 recensioni più recenti.`
      : `Sincronizzazione completata! Importate ${newReviews.length} nuove recensioni.`;

    return res.json({
      success: true,
      count: newReviews.length,
      alreadyPresent,
      reviews: newReviews.map(r => ({
        id: r.id,
        businessId: r.business_id,
        author: r.author,
        stars: r.stars,
        text: r.text,
        date: r.date,
        status: r.status,
        replyText: r.reply_text,
        replyDate: r.reply_date,
        draftText: r.draft_text
      })),
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
  if (!ensureServiceKey(res)) return;
  try {
    const { name, businessName, businessType, email } = req.body;
    if (!name || !businessName || !email) {
      return res.status(400).json({ error: 'Nome, nome attività ed email sono obbligatori.' });
    }

    const newRequest = {
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: String(name).trim(),
      business_name: String(businessName).trim(),
      business_type: String(businessType || 'Altro').trim(),
      email: String(email).trim().toLowerCase(),
      status: 'in_attesa',
      created_at: new Date().toISOString(),
      notes: 'Richiesta ricevuta da modulo Landing Page'
    };

    const { error } = await supabaseAdmin.from('pilot_requests').insert(newRequest);
    if (error) throw error;

    res.json({
      success: true,
      message: 'Richiesta registrata con successo! Ti invieremo un\'email di conferma con le credenziali di accesso.',
      request: {
        id: newRequest.id,
        name: newRequest.name,
        businessName: newRequest.business_name,
        businessType: newRequest.business_type,
        email: newRequest.email,
        status: newRequest.status,
        createdAt: newRequest.created_at,
        notes: newRequest.notes
      }
    });
  } catch (err: any) {
    console.error('Error in /api/request-access:', err);
    res.status(500).json({ error: err.message || 'Errore durante la registrazione della richiesta.' });
  }
});

app.get('/api/admin/pilot-requests', requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (!isAdminUser(user?.email)) {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
  }
  if (!ensureServiceKey(res)) return;

  try {
    const { data, error } = await supabaseAdmin.from('pilot_requests').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const mapped = (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      businessName: r.business_name || r.businessName,
      businessType: r.business_type || r.businessType,
      email: r.email,
      status: r.status,
      createdAt: r.created_at || r.createdAt,
      notes: r.notes
    }));
    return res.json({ requests: mapped });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/pilot-requests/:id', requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (!isAdminUser(user?.email)) {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
  }
  if (!ensureServiceKey(res)) return;

  const { id } = req.params;
  const { status, notes } = req.body;

  if (!['in_attesa', 'approvato', 'rifiutato'].includes(status)) {
    return res.status(400).json({ error: 'Stato non valido.' });
  }

  try {
    const updateObj: any = { status };
    if (notes !== undefined) updateObj.notes = notes;
    const { error } = await supabaseAdmin.from('pilot_requests').update(updateObj).eq('id', id);
    if (error) throw error;
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/create-user', requireAuth, async (req, res) => {
  const adminUser = (req as any).user;
  if (!isAdminUser(adminUser?.email)) {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
  }
  if (!ensureServiceKey(res)) return;

  const { email, password, businessName, businessCategory, businessLocation } = req.body;

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email e password (minimo 6 caratteri) sono obbligatori.' });
  }

  try {
    const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (createError) throw createError;

    const newUser = data?.user;
    const userId = newUser?.id;

    if (businessName && userId) {
      const newBizId = 'biz-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      await supabaseAdmin.from('businesses').insert({
        id: newBizId,
        user_id: userId,
        name: businessName,
        category: businessCategory || 'Attività',
        location: businessLocation || 'Ticino',
        signer_name: 'Direzione',
        tone: 'caloroso',
        default_language: 'it',
        is_connected: false,
        sms_template: `Buongiorno {nome}, grazie per averci scelto a ${businessLocation || 'Ticino'}! Lasciaci una recensione su Google: {link}`
      });
    }

    res.json({
      success: true,
      user: {
        id: userId,
        email: email
      },
      message: `Account attivato con successo per ${email}!`
    });
  } catch (err: any) {
    console.error('Error in /api/admin/create-user:', err);
    res.status(500).json({ error: err.message || 'Errore nella creazione dell\'utente.' });
  }
});

app.get('/api/admin/config', requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (!isAdminUser(user?.email)) {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
  }
  const signupsOpen = await getSignupsOpen();
  res.json({ signupsOpen });
});

app.post('/api/admin/config', requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (!isAdminUser(user?.email)) {
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
