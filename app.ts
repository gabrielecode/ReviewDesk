import express from 'express';

const app = express();
app.use(express.json());

// Simple in-memory IP rate limiter (e.g. 20 requests per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const rawIp = req.headers['x-forwarded-for'];
  const ip = (typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : req.socket.remoteAddress) || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 20;

  // Clean expired entries
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetTime) {
      rateLimitMap.delete(key);
    }
  }

  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    rateLimitMap.set(ip, record);
  } else {
    record.count++;
    if (record.count > maxRequests) {
      return res.status(429).json({ error: 'Troppe richieste. Riprova tra un minuto.' });
    }
  }
  next();
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  const openRouterConfigured = !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== '';
  res.json({
    ok: true,
    openRouterConfigured,
  });
});

// OpenRouter draft reply endpoint
app.post('/api/draft-reply', rateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.trim() === '') {
      return res.status(500).json({ error: 'Chiave OpenRouter non configurata sul server' });
    }

    const { reviewText, author, stars, businessSettings } = req.body;

    // Validation
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
      'Rispondi nella stessa lingua in cui è scritta la recensione (auto). Se la recensione è in tedesco rispondi in tedesco, se in inglese in inglese, altrimenti in italiano.';

    const systemPrompt = `Sei l'assistente virtuale di "${name || 'Attività'}" (${category || ''}, a ${location || ''}).
Devi scrivere una bozza di risposta professionale per una recensione Google lasciata da ${author || 'Cliente'} (${stars || 5} stelle).

Regole tassative:
1. ${langInstruction}
2. Tono: ${tone || 'caloroso'} (caloroso / formale / diretto).
3. Massimo 70 parole.
4. Cita un dettaglio concreto della recensione (se presente, altrimenti fai riferimento all'esperienza generale).
5. Non inventare fatti o servizi non menzionati.
6. Non promettere rimborsi, sconti o omaggi.
7. Firma tassativamente con il nome: "${signerName || 'Staff'}".
8. ${(stars || 5) <= 2 ? 'ATTENZIONE: Questa è una recensione negativa. Ringrazia per il feedback, mostra empatia, non cercare scuse e non accusare il cliente, e invita gentilmente a contattare l\'attività su un canale privato (' + (privateContact || 'contatto privato') + ').' : 'Ringrazia calorosamente il cliente.'}
9. Evita frasi come: "${phrasesToAvoid || ''}".
10. Restituisci SOLO il testo della risposta pronto per essere pubblicato, senza virgolette iniziali o finali e senza commenti extra.`;

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

// OpenRouter insights endpoint
app.post('/api/insights', rateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY.trim() === '') {
      return res.status(500).json({ error: 'Chiave OpenRouter non configurata sul server' });
    }

    const { business, reviews } = req.body;
    if (!business || !reviews || !Array.isArray(reviews)) {
      return res.status(400).json({ error: 'Dati business o recensioni non validi' });
    }

    // Massimo 30 recensioni, testi troncati a 400 caratteri
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

    // Valida che la risposta abbia strengths e improvements (altrimenti liste vuote)
    const strengths = Array.isArray(insights.strengths) ? insights.strengths : [];
    const improvements = Array.isArray(insights.improvements) ? insights.improvements : [];

    res.json({ strengths, improvements });
  } catch (error: any) {
    console.error('Insights error:', error);
    res.status(500).json({ error: 'Servizio AI temporaneamente non disponibile, riprova' });
  }
});

// 404 for any other /api/* route
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

export default app;
