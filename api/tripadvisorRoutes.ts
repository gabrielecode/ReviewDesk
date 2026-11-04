import express from 'express';
import { db } from '../src/db/index.ts';
import { tripAdvisorSources, tripAdvisorReviews, responseDrafts } from '../src/db/tripadvisor.schema.ts';
import { eq, and } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../src/middleware/auth.ts';
import { apifyClient } from '../src/lib/apifyClient.ts';
import { normalizeReview } from '../src/lib/tripadvisor/normalizer.ts';

const router = express.Router();

router.post('/sources', requireAuth, async (req: AuthRequest, res) => {
  const { placeUrl, businessId } = req.body;
  // TODO: Verify business ownership
  // TODO: Extract placeId from placeUrl (basic validation)
  const task = await apifyClient.createTask(`TA-${businessId}`, 'epctex~tripadvisor-scraper', {
    startUrls: [{ url: placeUrl }],
    languages: ['it', 'de', 'fr', 'en'],
    maxItems: 50,
  });
  
  const sourceId = `tas-${Date.now()}`;
  await db.insert(tripAdvisorSources).values({
    id: sourceId,
    placeId: 'temp', // TODO: extract from URL
    placeUrl,
    placeName: 'Temp',
    apifyTaskId: task.id,
    businessId,
  });
  
  res.json({ success: true, sourceId });
});

router.delete('/sources/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const [source] = await db.select().from(tripAdvisorSources).where(eq(tripAdvisorSources.id, id));
  if (source) {
    await apifyClient.deleteTask(source.apifyTaskId);
    await db.delete(tripAdvisorSources).where(eq(tripAdvisorSources.id, id));
  }
  res.json({ success: true });
});

router.post('/webhooks/apify/tripadvisor', async (req, res) => {
  const token = req.headers['x-webhook-token'];
  if (token !== process.env.WEBHOOK_SECRET) return res.status(401).send('Unauthorized');
  
  res.status(200).send('OK');
  
  const { actorRunId } = req.body;
  // Async job
  (async () => {
    const items = await apifyClient.fetchDataset(actorRunId);
    for (const item of items) {
      const normalized = normalizeReview(item);
      await db.insert(tripAdvisorReviews)
        .values(normalized)
        .onConflictDoNothing();
      
      // TODO: Queue AI draft generation
    }
  })();
});

router.get('/reviews', requireAuth, async (req: AuthRequest, res) => {
  const { status } = req.query;
  const reviews = await db.select().from(tripAdvisorReviews).where(eq(tripAdvisorReviews.status, status as string));
  res.json(reviews);
});

router.post('/reviews/:id/publish-confirm', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  await db.update(tripAdvisorReviews).set({ status: 'published_manually' }).where(eq(tripAdvisorReviews.id, id));
  await db.update(responseDrafts).set({ status: 'published' }).where(eq(responseDrafts.reviewId, id));
  res.json({ success: true });
});

export default router;
