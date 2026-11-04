import { normalizeReview } from '../src/lib/tripadvisor/normalizer.ts';
import assert from 'assert';

const mockItem = {
  reviewId: '123',
  locationId: 'loc456',
  name: 'Restaurant',
  rating: 5,
  title: 'Great!',
  text: 'Amazing food.',
  language: 'it',
  publishedDate: '2026-11-04T10:00:00Z',
  reviewerName: 'John',
  tripType: 'Couple',
  stayDate: '2026-10',
  subratings: { food: 5 },
  mgmtResponse: null,
  mgmtResponseUrl: 'https://tripadvisor.com/reply/123'
};

const normalized = normalizeReview(mockItem);
assert.strictEqual(normalized.sourceReviewId, '123');
assert.strictEqual(normalized.placeId, 'loc456');
assert.strictEqual(normalized.rating, 5);
console.log('Normalizer test passed!');
