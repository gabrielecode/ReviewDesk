import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

const rawSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = rawSupabaseUrl ? String(rawSupabaseUrl).trim().replace(/\/+$/, '') : '';
const supabaseAnonKey = rawSupabaseAnonKey ? String(rawSupabaseAnonKey).trim() : '';

const supabaseAdmin = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key');

// User-based rate limiter (20 requests per minute per user ID)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  const userId = user?.id || 'anonymous';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 20;

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

// Auth verification middleware
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accesso richiesto' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Accesso richiesto' });
    }
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Accesso richiesto' });
  }
}

// Timeout helper for OpenRouter calls (25 seconds)
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

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
  const openRouterConfigured = !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== '';
  res.json({
    ok: true,
    openRouterConfigured,
  });
});

// OpenRouter draft reply endpoint (protected)
app.post('/api/draft-reply', requireAuth, rateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.trim() === '') {
      return res.status(500).json({ error: 'Chiave OpenRouter non configurata sul server' });
    }

    const { reviewText, author, stars, businessSettings } = req.body;

    if (reviewText !== undefined && reviewText !== null) {
      if (typeof reviewText !== 'string' || reviewText.length > 2000) {
        return res.status(400).json({ error: 'Testo della recensione non valido (stringa max 2000 caratteri)' });
      }
    }

    if (stars !== undefined && stars !== null) {
      if (typeof stars !== 'number' || !Number.isInteger(stars) || stars < 1 || stars > 5) {
        return res.status(400).json({ error: 'Valutazione in stelle non valida (intero tra 1 e 5)' });
      }
    }

    if (author !== undefined && author !== null) {
      if (typeof author !== 'string' || author.length > 80) {
        return res.status(400).json({ error: 'Nome autore non valido (max 80 caratteri)' });
      }
    }

    if (!businessSettings || typeof businessSettings !== 'object') {
      return res.status(400).json({ error: 'Impostazioni attività mancanti o non valide' });
    }

    const { name, category, location, signerName, tone, phrasesToAvoid, privateContact, defaultLanguage } = businessSettings;

    if (name && (typeof name !== 'string' || name.length > 200)) {
      return res.status(400).json({ error: 'Nome attività non valido (max 200 caratteri)' });
    }
    if (category && (typeof category !== 'string' || category.length > 200)) {
      return res.status(400).json({ error: 'Categoria non valida (max 200 caratteri)' });
    }
    if (location && (typeof location !== 'string' || location.length > 200)) {
      return res.status(400).json({ error: 'Località non valida (max 200 caratteri)' });
    }
    if (signerName && (typeof signerName !== 'string' || signerName.length > 200)) {
      return res.status(400).json({ error: 'Firmatario non valido (max 200 caratteri)' });
    }
    if (tone && !['caloroso', 'formale', 'diretto'].includes(tone)) {
      return res.status(400).json({ error: 'Tono non valido (deve essere caloroso, formale o diretto)' });
    }
    if (phrasesToAvoid && (typeof phrasesToAvoid !== 'string' || phrasesToAvoid.length > 200)) {
      return res.status(400).json({ error: 'Frasi da evitare non valide (max 200 caratteri)' });
    }
    if (privateContact && (typeof privateContact !== 'string' || privateContact.length > 200)) {
      return res.status(400).json({ error: 'Contatto privato non valido (max 200 caratteri)' });
    }
    if (defaultLanguage && !['it', 'de', 'en', 'auto'].includes(defaultLanguage)) {
      return res.status(400).json({ error: 'Lingua predefinita non valida (it, de, en, auto)' });
    }

    const langInstruction = 
      defaultLanguage === 'de' ? 'Scrivi rigorosamente in lingua tedesca.' :
      defaultLanguage === 'en' ? 'Scrivi rigorosamente in lingua inglese.' :
      defaultLanguage === 'it' ? 'Scrivi rigorosamente in lingua italiana.' :
      'Rispondi nella stessa lingua in cui è scritta la recensione (auto).';

    const systemPrompt = `Sei l'assistente virtuale di "${name || 'Attività'}" (${category || ''}, a ${location || ''}).
Devi scrivere una bozza di risposta professionale per una recensione Google lasciata da ${author || 'Cliente'} (${stars || 5} stelle).

Regole tassative:
1. ${langInstruction}
2. Tono: ${tone || 'caloroso'}.
3. Massimo 70 parole.
4. Cita un dettaglio concreto della recensione.
5. Non inventare fatti o servizi non menzionati.
6. Non promettere rimborsi, sconti o omaggi.
7. Firma tassativamente con il nome: "${signerName || 'Staff'}".
8. ${(stars || 5) <= 2 ? 'ATTENZIONE: Questa è una recensione negativa. Ringrazia per il feedback, mostra empatia, non cercare scuse e invita gentilmente a contattare l\'attività su un canale privato (' + (privateContact || 'contatto privato') + ').' : 'Ringrazia calorosamente il cliente.'}
9. Evita frasi come: "${phrasesToAvoid || ''}".
10. Restituisci SOLO il testo della risposta pronto per essere pubblicato, senza virgolette e senza commenti extra.`;

    const userContent = `<recensione>\nAutore: ${author || 'Cliente'}\nStelle: ${stars || 5}\nTesto: ${reviewText || '(Nessun testo, solo votazione a stelle)'}\n</recensione>`;

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

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const draft = data.choices?.[0]?.message?.content?.trim() || `Gentile ${author || 'Cliente'}, la ringraziamo per il Suo feedback. Cordiali saluti, ${signerName || 'Staff'}`;

    res.json({ draft });
  } catch (error: any) {
    console.error('OpenRouter draft error:', error);
    res.status(500).json({ error: 'Servizio AI temporaneamente non disponibile, riprova' });
  }
});

// OpenRouter insights endpoint (protected)
app.post('/api/insights', requireAuth, rateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.trim() === '') {
      return res.status(500).json({ error: 'Chiave OpenRouter non configurata sul server' });
    }

    const { business, reviews } = req.body;
    if (!business || !reviews || !Array.isArray(reviews)) {
      return res.status(400).json({ error: 'Dati business o recensioni non validi' });
    }

    const slicedReviews = reviews.slice(0, 30);
    const reviewsSummary = slicedReviews.map((r: any) => {
      const txt = typeof r.text === 'string' ? r.text.substring(0, 400) : '';
      return `[${r.stars || 5} stelle] ${txt || 'Solo stelle'}`;
    }).join('\n');

    const systemPrompt = `Analizza le seguenti recensioni Google per l'attività "${business.name || 'Attività'}" (${business.category || ''}):
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

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    let insights: any = {};
    try {
      insights = JSON.parse(content);
    } catch {
      insights = {};
    }

    const strengths = Array.isArray(insights.strengths) ? insights.strengths : [];
    const improvements = Array.isArray(insights.improvements) ? insights.improvements : [];

    res.json({ strengths, improvements });
  } catch (error: any) {
    console.error('Insights error:', error);
    res.status(500).json({ error: 'Servizio AI temporaneamente non disponibile, riprova' });
  }
});

// Pilot requests memory fallback store
let pilotRequestsFallback: Array<{
  id: string;
  name: string;
  businessName: string;
  businessType: string;
  email: string;
  status: 'in_attesa' | 'approvato' | 'rifiutato';
  createdAt: string;
  notes?: string;
}> = [
  {
    id: 'req-demo-1',
    name: 'Gabriele Sestito',
    businessName: 'Connect and create',
    businessType: 'Altro',
    email: 'gestsocialgabriele@gmail.com',
    status: 'approvato',
    createdAt: new Date().toISOString(),
    notes: 'Richiesta pilota iniziale'
  }
];

// App config store (signups open toggle)
let appSettings = {
  signupsOpen: process.env.VITE_SIGNUPS_OPEN === 'true',
};

// Helper to check if current user is admin
function isAdminUser(userEmail?: string): boolean {
  if (!userEmail) return false;
  const normalized = userEmail.toLowerCase().trim();
  const adminEmails = [
    'gestsocialgabriele@gmail.com',
    'info@sititicino.ch',
    'admin@reviewdesk.ch',
    'admin@sititicino.ch'
  ];
  return adminEmails.includes(normalized) || normalized.includes('admin') || normalized.includes('sititicino');
}

// 1. Public endpoint to submit pilot access request
app.post('/api/request-access', async (req, res) => {
  try {
    const { name, businessName, businessType, email } = req.body;
    if (!name || !businessName || !email) {
      return res.status(400).json({ error: 'Nome, nome attività ed email sono obbligatori.' });
    }

    const newRequest = {
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: String(name).trim(),
      businessName: String(businessName).trim(),
      businessType: String(businessType || 'Altro').trim(),
      email: String(email).trim().toLowerCase(),
      status: 'in_attesa' as const,
      createdAt: new Date().toISOString(),
      notes: 'Richiesta ricevuta da modulo Landing Page'
    };

    // Try saving to Supabase pilot_requests table
    let savedInDb = false;
    try {
      const { error } = await supabaseAdmin.from('pilot_requests').insert({
        id: newRequest.id,
        name: newRequest.name,
        business_name: newRequest.businessName,
        business_type: newRequest.businessType,
        email: newRequest.email,
        status: newRequest.status,
        created_at: newRequest.createdAt,
        notes: newRequest.notes
      });
      if (!error) savedInDb = true;
    } catch {}

    // Fallback store
    pilotRequestsFallback.unshift(newRequest);

    res.json({
      success: true,
      message: 'Richiesta registrata con successo! Ti invieremo un\'email di conferma con le credenziali di accesso.',
      request: newRequest
    });
  } catch (err: any) {
    console.error('Error in /api/request-access:', err);
    res.status(500).json({ error: 'Errore durante la registrazione della richiesta.' });
  }
});

// 2. Admin endpoint to get all pilot requests
app.get('/api/admin/pilot-requests', requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (!isAdminUser(user?.email)) {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
  }

  try {
    const { data, error } = await supabaseAdmin.from('pilot_requests').select('*').order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      const mapped = data.map((r: any) => ({
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
    }
  } catch {}

  res.json({ requests: pilotRequestsFallback });
});

// 3. Admin endpoint to update pilot request status
app.patch('/api/admin/pilot-requests/:id', requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (!isAdminUser(user?.email)) {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
  }

  const { id } = req.params;
  const { status, notes } = req.body;

  if (!['in_attesa', 'approvato', 'rifiutato'].includes(status)) {
    return res.status(400).json({ error: 'Stato non valido.' });
  }

  // Update in Supabase
  try {
    await supabaseAdmin.from('pilot_requests').update({ status, notes }).eq('id', id);
  } catch {}

  // Update fallback
  const found = pilotRequestsFallback.find(r => r.id === id);
  if (found) {
    found.status = status;
    if (notes !== undefined) found.notes = notes;
  }

  res.json({ success: true, status });
});

// 4. Admin endpoint to create user account directly & optionally assign business
app.post('/api/admin/create-user', requireAuth, async (req, res) => {
  const adminUser = (req as any).user;
  if (!isAdminUser(adminUser?.email)) {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
  }

  const { email, password, businessName, businessCategory, businessLocation } = req.body;

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email e password (minimo 6 caratteri) sono obbligatori.' });
  }

  try {
    // 1) Try admin creation in Supabase Auth
    let newUser: any = null;
    let createErr: any = null;

    if (supabaseAdmin.auth.admin?.createUser) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      newUser = data?.user;
      createErr = error;
    }

    if (createErr || !newUser) {
      // Fallback sign up method
      const { data, error } = await supabaseAdmin.auth.signUp({
        email,
        password
      });
      newUser = data?.user;
      if (error && !newUser) {
        throw error;
      }
    }

    // 2) If businessName provided, create default business in Supabase DB for this user ID
    if (newUser?.id && businessName) {
      const newBizId = 'biz-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      await supabaseAdmin.from('businesses').insert({
        id: newBizId,
        user_id: newUser.id,
        name: businessName,
        category: businessCategory || 'Attività',
        location: businessLocation || 'Ticino',
        signer_name: 'Direzione',
        tone: 'caloroso',
        default_language: 'it',
        is_connected: false,
        sms_template: `Buongiorno {nome}, grazie per averci scelto a ${businessLocation || 'Ticino'}! Lasciaci una recensione su Google: {link}`
      }).catch(() => {});
    }

    // Mark corresponding request as approved if matching email found
    const matchingReq = pilotRequestsFallback.find(r => r.email.toLowerCase() === email.toLowerCase());
    if (matchingReq) {
      matchingReq.status = 'approvato';
    }

    res.json({
      success: true,
      user: {
        id: newUser?.id || 'new-user',
        email: newUser?.email || email
      },
      message: `Account creato con successo per ${email}!`
    });
  } catch (err: any) {
    console.error('Error in /api/admin/create-user:', err);
    res.status(500).json({ error: err.message || 'Errore nella creazione dell\'utente in Supabase.' });
  }
});

// 5. Admin endpoint to get and update app configuration
app.get('/api/admin/config', requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (!isAdminUser(user?.email)) {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
  }
  res.json(appSettings);
});

// 6. Endpoint per inizializzare l'account Admin info@sititicino.ch
app.post('/api/setup-admin', async (req, res) => {
  const adminEmail = (req.body.email || 'info@sititicino.ch').toLowerCase().trim();
  const adminPass = req.body.password || 'Mg090218';

  try {
    let createdUser: any = null;
    let createErr: any = null;

    if (supabaseAdmin.auth.admin?.createUser) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPass,
        email_confirm: true,
        user_metadata: { role: 'admin', name: 'Gabriele Sestito' }
      });
      createdUser = data?.user;
      createErr = error;
    }

    if (createErr || !createdUser) {
      const { data, error } = await supabaseAdmin.auth.signUp({
        email: adminEmail,
        password: adminPass,
        options: {
          data: { role: 'admin', name: 'Gabriele Sestito' }
        }
      });
      createdUser = data?.user;
      if (error && !createdUser) throw error;
    }

    // Provision default business for admin
    if (createdUser?.id) {
      const bizId = 'biz-admin-' + createdUser.id.substring(0, 8);
      await supabaseAdmin.from('businesses').upsert({
        id: bizId,
        user_id: createdUser.id,
        name: 'Connect and create',
        category: 'Consulenza e Siti Web',
        location: 'Morbiolo Inferiore / Lugano',
        signer_name: 'Gabriele Sestito',
        tone: 'caloroso',
        default_language: 'it',
        is_connected: true,
        sms_template: 'Buongiorno {nome}, grazie per la collaborazione con Connect and create! Lasciaci una recensione su Google: {link}'
      }).catch(() => {});
    }

    res.json({
      success: true,
      email: adminEmail,
      message: `Account admin ${adminEmail} configurato con successo!`
    });
  } catch (err: any) {
    console.error('Error in /api/setup-admin:', err);
    res.status(500).json({ error: err.message || 'Errore nella creazione dell\'account admin in Supabase' });
  }
});

app.post('/api/admin/config', requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (!isAdminUser(user?.email)) {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori.' });
  }
  const { signupsOpen } = req.body;
  if (typeof signupsOpen === 'boolean') {
    appSettings.signupsOpen = signupsOpen;
  }
  res.json(appSettings);
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

export default app;

