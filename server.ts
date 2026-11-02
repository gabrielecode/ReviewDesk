import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize Google GenAI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Simple in-memory IP rate limiter (e.g. 20 requests per minute per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 20;

  let record = rateLimitMap.get(ip as string);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    rateLimitMap.set(ip as string, record);
  } else {
    record.count++;
    if (record.count > maxRequests) {
      return res.status(429).json({ error: 'Troppe richieste. Riprova tra un minuto.' });
    }
  }
  next();
}

// Timeout helper for Gemini calls (25 seconds)
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 25000): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('Tempo scaduto durante la generazione con Gemini (timeout 25s).'));
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
  const geminiConfigured = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '';
  res.json({
    ok: true,
    geminiConfigured,
  });
});

// Gemini draft reply endpoint
app.post('/api/draft-reply', rateLimiter, async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
      return res.status(500).json({ error: 'Chiave Gemini non configurata sul server' });
    }

    const { reviewText, author, stars, businessSettings } = req.body;

    if (!businessSettings || !businessSettings.name) {
      return res.status(400).json({ error: 'Dati dell\'attività mancanti o non validi' });
    }

    if (reviewText && typeof reviewText === 'string' && reviewText.length > 5000) {
      return res.status(400).json({ error: 'Testo della recensione troppo lungo (max 5000 caratteri)' });
    }

    const prompt = `Sei l'assistente virtuale di "${businessSettings.name}" (${businessSettings.category}, a ${businessSettings.location}).
Devi scrivere una bozza di risposta professionale per una recensione Google lasciata da ${author || 'Cliente'} (${stars || 5} stelle).
Testo della recensione: "${reviewText || '(Nessun testo, solo votazione a stelle)'}".

Regole tassative:
1. Rispondi in italiano (o nella lingua della recensione se è tedesco o inglese, es. tedesco per recensioni in tedesco).
2. Tono: ${businessSettings.tone || 'caloroso'} (caloroso / formale / diretto).
3. Massimo 70 parole.
4. Cita un dettaglio concreto della recensione (se presente, altrimenti fai riferimento all'esperienza generale).
5. Non inventare fatti o servizi non menzionati.
6. Non promettere rimborsi, sconti o omaggi.
7. Firma tassativamente con il nome: "${businessSettings.signerName || 'Staff'}".
8. ${(stars || 5) <= 2 ? 'ATTENZIONE: Questa è una recensione negativa. Ringrazia per il feedback, mostra empatia, non cercare scuse e non accusare il cliente, e invita gentilmente a contattare l\'attività su un canale privato (' + (businessSettings.privateContact || 'contatto privato') + ').' : 'Ringrazia calorosamente il cliente.'}
9. Evita frasi come: "${businessSettings.phrasesToAvoid || ''}".
10. Restituisci SOLO il testo della risposta pronto per essere pubblicato, senza virgolette iniziali o finali e senza commenti extra.`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      })
    );

    const draft = response.text?.trim() || `Gentile ${author || 'Cliente'}, la ringraziamo per il Suo feedback. Cordiali saluti, ${businessSettings.signerName || 'Staff'}`;

    res.json({ draft });
  } catch (error: any) {
    console.error('Gemini draft error:', error);
    res.status(500).json({ error: error.message || 'Errore durante la generazione della bozza con Gemini' });
  }
});

// Gemini insights endpoint
app.post('/api/insights', rateLimiter, async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
      return res.status(500).json({ error: 'Chiave Gemini non configurata sul server' });
    }

    const { business, reviews } = req.body;
    if (!business || !reviews || !Array.isArray(reviews)) {
      return res.status(400).json({ error: 'Dati business o recensioni non validi' });
    }

    const reviewsSummary = reviews.map((r: any) => `[${r.stars} stelle] ${r.text || 'Solo stelle'}`).join('\n');

    const prompt = `Analizza le seguenti recensioni Google per l'attività "${business.name}" (${business.category}):
${reviewsSummary}

Restituisci un oggetto JSON con questa esatta struttura:
{
  "strengths": ["punto di forza 1", "punto di forza 2", "punto di forza 3"],
  "improvements": ["area di miglioramento 1", "area di miglioramento 2"]
}
Scrivi in italiano chiaro e sintetico.`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      })
    );

    const jsonText = response.text || '{"strengths": [], "improvements": []}';
    const insights = JSON.parse(jsonText);
    res.json(insights);
  } catch (error: any) {
    console.error('Insights error:', error);
    res.status(500).json({ error: error.message || 'Errore generazione analisi' });
  }
});

// Vite middleware for development or static serving in production (when not on Vercel)
if (!process.env.VERCEL) {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const numericPort = Number(PORT) || 3000;
  app.listen(numericPort, '0.0.0.0', () => {
    console.log(`ReviewDesk server running on port ${numericPort}`);
  });
}

export default app;
