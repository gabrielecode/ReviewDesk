import { pgTable, text, jsonb, boolean, timestamp, integer, unique } from 'drizzle-orm/pg-core';
import { businesses } from './schema';

export const tripAdvisorSources = pgTable('tripadvisor_sources', {
  id: text('id').primaryKey(),
  placeId: text('place_id').notNull(),
  placeUrl: text('place_url').notNull(),
  placeName: text('place_name').notNull(),
  apifyTaskId: text('apify_task_id').notNull(),
  apifyScheduleId: text('apify_schedule_id'),
  apifyWebhookId: text('apify_webhook_id'),
  lastRunAt: timestamp('last_run_at'),
  createdAt: timestamp('created_at').defaultNow(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
});

export const tripAdvisorReviews = pgTable('tripadvisor_reviews', {
  id: text('id').primaryKey(),
  source: text('source').default('tripadvisor'),
  sourceReviewId: text('source_review_id').notNull(),
  placeId: text('place_id').notNull(),
  placeName: text('place_name').notNull(),
  rating: integer('rating'),
  title: text('title'),
  text: text('text'),
  language: text('language'),
  publishedAt: timestamp('published_at'),
  reviewerName: text('reviewer_name'),
  tripType: text('trip_type'),
  stayDate: text('stay_date'),
  subRatings: jsonb('sub_ratings'),
  ownerResponse: text('owner_response'),
  canReply: boolean('can_reply'),
  replyMode: text('reply_mode').default('draft'),
  directReplyUrl: text('direct_reply_url'),
  rawPayload: jsonb('raw_payload'),
  status: text('status').default('new'), // 'new', 'drafted', 'published_manually'
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  unique_source_review: unique().on(t.source, t.sourceReviewId),
}));

export const responseDrafts = pgTable('response_drafts', {
  id: text('id').primaryKey(),
  reviewId: text('review_id').references(() => tripAdvisorReviews.id).notNull(),
  text: text('text'),
  language: text('language'),
  status: text('status').default('pending'), // 'pending', 'approved', 'published'
  createdAt: timestamp('created_at').defaultNow(),
});
