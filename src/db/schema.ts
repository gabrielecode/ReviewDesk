import { pgTable, text, integer, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  uid: text('uid').primaryKey(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value'), // Store as string or serialized JSON
});

export const pilotRequests = pgTable('pilot_requests', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  businessName: text('business_name').notNull(),
  businessType: text('business_type').notNull(),
  email: text('email').notNull(),
  status: text('status').notNull().default('in_attesa'),
  createdAt: timestamp('created_at').defaultNow(),
  notes: text('notes'),
});

export const businesses = pgTable('businesses', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.uid).notNull(),
  name: text('name').notNull(),
  category: text('category'),
  location: text('location'),
  signerName: text('signer_name'),
  tone: text('tone').default('caloroso'),
  defaultLanguage: text('default_language').default('it'),
  isConnected: boolean('is_connected').default(false),
  smsTemplate: text('sms_template'),
  phrasesToAvoid: text('phrases_to_avoid'),
  privateContact: text('private_contact'),
  googleUrl: text('google_url'),
  googlePlaceId: text('google_place_id'),
  googleAccountId: text('google_account_id'),
  googleLocationId: text('google_location_id'),
  googleApiKey: text('google_api_key'),
  syncFrequency: text('sync_frequency').default('daily'),
  autoSyncReviews: boolean('auto_sync_reviews').default(true),
  lastSyncAt: text('last_sync_at'),
});

export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  author: text('author').notNull(),
  stars: integer('stars').notNull().default(5),
  status: text('status').notNull().default('da_rispondere'),
  text: text('text'),
  date: text('date').notNull(),
  replyText: text('reply_text'),
  replyDate: text('reply_date'),
  draftText: text('draft_text'),
});

export const requests = pgTable('requests', {
  id: text('id').primaryKey(),
  businessId: text('business_id').references(() => businesses.id).notNull(),
  clientName: text('client_name').notNull(),
  phone: text('phone').notNull(),
  date: text('date').notNull(),
  status: text('status').notNull().default('inviata'),
  text: text('text'),
  consent: boolean('consent').default(false),
  consentAt: text('consent_at'),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  businesses: many(businesses),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, {
    fields: [businesses.userId],
    references: [users.uid],
  }),
  reviews: many(reviews),
  requests: many(requests),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  business: one(businesses, {
    fields: [reviews.businessId],
    references: [businesses.id],
  }),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  business: one(businesses, {
    fields: [requests.businessId],
    references: [businesses.id],
  }),
}));
