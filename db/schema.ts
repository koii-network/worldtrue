import { pgTable, uuid, text, timestamp, integer, decimal, jsonb, boolean, index, primaryKey, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['viewer', 'contributor', 'moderator', 'admin']);
export const verificationStatusEnum = pgEnum('verification_status', ['unverified', 'contested', 'probable', 'verified']);
export const eventTypeEnum = pgEnum('event_type', ['conflict', 'discovery', 'cultural', 'political', 'technological']);
export const datePrecisionEnum = pgEnum('date_precision', ['day', 'month', 'year', 'decade', 'century']);
export const sourceTypeEnum = pgEnum('source_type', ['primary', 'secondary', 'tertiary', 'web']);
export const contributionTypeEnum = pgEnum('contribution_type', ['event', 'source', 'cultural_context', 'discussion']);
export const submissionStatusEnum = pgEnum('submission_status', ['pending', 'approved', 'rejected']);
export const threadStatusEnum = pgEnum('thread_status', ['open', 'resolved', 'archived']);

// ============================================
// Better Auth Required Tables
// ============================================

// User table (Better Auth compatible)
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // WorldTrue specific fields
  role: userRoleEnum('role').notNull().default('viewer'),
  reputationScore: integer('reputation_score').notNull().default(0),
  bio: text('bio'),
  location: text('location'),
  website: text('website'),
});

// Session table (Better Auth compatible)
export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

// Account table (Better Auth - for OAuth providers)
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Verification table (Better Auth - for email verification)
export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User Settings table (for API keys and preferences)
export const userSettings = pgTable('user_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  geminiApiKey: text('gemini_api_key'), // Encrypted API key
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('user_settings_user_id_idx').on(table.userId),
  };
});

// ============================================
// Legacy Users table (kept for backward compatibility)
// ============================================
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  githubId: text('github_id').unique(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default('viewer'),
  reputationScore: integer('reputation_score').notNull().default(0),
  bio: text('bio'),
  location: text('location'),
  website: text('website'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    githubIdIdx: index('users_github_id_idx').on(table.githubId),
    usernameIdx: index('users_username_idx').on(table.username),
    emailIdx: index('users_email_idx').on(table.email),
  };
});

// Events table
export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  longDescription: text('long_description'),
  year: integer('year').notNull(),
  month: integer('month'),
  day: integer('day'),
  datePrecision: datePrecisionEnum('date_precision').notNull().default('year'),
  endYear: integer('end_year'), // For events that span multiple years
  endMonth: integer('end_month'),
  endDay: integer('end_day'),
  lat: decimal('lat', { precision: 10, scale: 8 }).notNull(),
  lng: decimal('lng', { precision: 11, scale: 8 }).notNull(),
  locationName: text('location_name'),
  city: text('city'),
  country: text('country'),
  region: text('region'),
  eventType: eventTypeEnum('event_type').notNull(),
  categories: jsonb('categories').$type<string[]>().notNull().default([]),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  importance: integer('importance').notNull().default(5), // 1-10 scale
  verificationStatus: verificationStatusEnum('verification_status').notNull().default('unverified'),
  viewCount: integer('view_count').notNull().default(0),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  metadata: jsonb('metadata'), // Flexible field for additional data
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    yearIdx: index('events_year_idx').on(table.year),
    latLngIdx: index('events_lat_lng_idx').on(table.lat, table.lng),
    eventTypeIdx: index('events_event_type_idx').on(table.eventType),
    verificationStatusIdx: index('events_verification_status_idx').on(table.verificationStatus),
    createdByIdx: index('events_created_by_idx').on(table.createdBy),
  };
});

// Cultural Contexts table
export const culturalContexts = pgTable('cultural_contexts', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // artifact, movement, ideology, technology, social, economic, political
  name: text('name').notNull(),
  description: text('description').notNull(),
  sourceCulture: text('source_culture'),
  affectedCultures: jsonb('affected_cultures').$type<string[]>().notNull().default([]),
  significance: text('significance'),
  legacy: text('legacy'),
  relatedArtifacts: jsonb('related_artifacts'), // Links to museums, archives, etc.
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    eventIdIdx: index('cultural_contexts_event_id_idx').on(table.eventId),
    typeIdx: index('cultural_contexts_type_idx').on(table.type),
  };
});

// Sources table
export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  url: text('url'),
  sourceType: sourceTypeEnum('source_type').notNull(),
  author: text('author'),
  publicationDate: text('publication_date'),
  publisher: text('publisher'),
  description: text('description'),
  credibilityScore: integer('credibility_score').notNull().default(50), // 0-100
  language: text('language').default('en'),
  archived: boolean('archived').notNull().default(false),
  archiveUrl: text('archive_url'), // Internet Archive link
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    eventIdIdx: index('sources_event_id_idx').on(table.eventId),
    sourceTypeIdx: index('sources_source_type_idx').on(table.sourceType),
  };
});

// Discourse Threads table
export const discourseThreads = pgTable('discourse_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').references(() => events.id, { onDelete: 'cascade' }), // nullable for general discussions
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: threadStatusEnum('status').notNull().default('open'),
  resolutionSummary: text('resolution_summary'),
  isPinned: boolean('is_pinned').notNull().default(false),
  isLocked: boolean('is_locked').notNull().default(false),
  viewCount: integer('view_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  upvotes: integer('upvotes').notNull().default(0),
  downvotes: integer('downvotes').notNull().default(0),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    eventIdIdx: index('discourse_threads_event_id_idx').on(table.eventId),
    statusIdx: index('discourse_threads_status_idx').on(table.status),
    createdByIdx: index('discourse_threads_created_by_idx').on(table.createdBy),
  };
});

// Discourse Comments table
export const discourseComments = pgTable('discourse_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').notNull().references(() => discourseThreads.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references((): any => discourseComments.id), // Self-referencing for nested comments
  content: text('content').notNull(),
  isEdited: boolean('is_edited').notNull().default(false),
  editedAt: timestamp('edited_at'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at'),
  deletedBy: uuid('deleted_by').references(() => users.id),
  upvotes: integer('upvotes').notNull().default(0),
  downvotes: integer('downvotes').notNull().default(0),
  evidence: jsonb('evidence'), // Links to sources, documents
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    threadIdIdx: index('discourse_comments_thread_id_idx').on(table.threadId),
    parentIdIdx: index('discourse_comments_parent_id_idx').on(table.parentId),
    createdByIdx: index('discourse_comments_created_by_idx').on(table.createdBy),
  };
});

// Event Submissions table
export const eventSubmissions = pgTable('event_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventData: jsonb('event_data').notNull(), // Full event data as JSON
  sources: jsonb('sources').notNull().default([]), // Array of source objects
  culturalContexts: jsonb('cultural_contexts').notNull().default([]), // Array of cultural context objects
  status: submissionStatusEnum('status').notNull().default('pending'),
  aiVerificationScore: integer('ai_verification_score'), // 0-100
  aiVerificationReport: jsonb('ai_verification_report'),
  communityVotes: jsonb('community_votes').notNull().default({ upvotes: 0, downvotes: 0 }),
  submittedBy: uuid('submitted_by').notNull().references(() => users.id),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewNotes: text('review_notes'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at'),
}, (table) => {
  return {
    statusIdx: index('event_submissions_status_idx').on(table.status),
    submittedByIdx: index('event_submissions_submitted_by_idx').on(table.submittedBy),
  };
});

// User Contributions table (for reputation tracking)
export const userContributions = pgTable('user_contributions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  contributionType: contributionTypeEnum('contribution_type').notNull(),
  entityId: uuid('entity_id').notNull(), // Polymorphic reference to event, source, cultural_context, or discussion
  entityTable: text('entity_table').notNull(), // Name of the table (events, sources, etc.)
  action: text('action').notNull(), // created, edited, verified, etc.
  reputationChange: integer('reputation_change').notNull().default(0),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('user_contributions_user_id_idx').on(table.userId),
    entityIdIdx: index('user_contributions_entity_id_idx').on(table.entityId),
    contributionTypeIdx: index('user_contributions_type_idx').on(table.contributionType),
  };
});

// Votes table (for tracking upvotes/downvotes)
export const votes = pgTable('votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  entityId: uuid('entity_id').notNull(),
  entityTable: text('entity_table').notNull(), // discourse_threads, discourse_comments, event_submissions
  voteType: integer('vote_type').notNull(), // 1 for upvote, -1 for downvote
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    userEntityIdx: index('votes_user_entity_idx').on(table.userId, table.entityId, table.entityTable),
    entityIdx: index('votes_entity_idx').on(table.entityId, table.entityTable),
  };
});

// User Sessions table (for auth)
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull().unique(),
  expires: timestamp('expires').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    sessionTokenIdx: index('sessions_token_idx').on(table.sessionToken),
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
  };
});

// Event Comments table (direct comments on events)
export const eventComments = pgTable('event_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').notNull(),
  parentId: uuid('parent_id'), // For nested replies
  content: text('content').notNull(),
  authorName: text('author_name').notNull().default('Anonymous'),
  authorId: text('author_id'), // Optional - for logged-in users
  isEdited: boolean('is_edited').notNull().default(false),
  editedAt: timestamp('edited_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => {
  return {
    eventIdIdx: index('event_comments_event_id_idx').on(table.eventId),
    parentIdIdx: index('event_comments_parent_id_idx').on(table.parentId),
    authorIdIdx: index('event_comments_author_id_idx').on(table.authorId),
  };
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // submission_approved, comment_reply, event_verified, etc.
  title: text('title').notNull(),
  message: text('message').notNull(),
  entityId: uuid('entity_id'),
  entityTable: text('entity_table'),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => {
  return {
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    isReadIdx: index('notifications_is_read_idx').on(table.isRead),
  };
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  events: many(events),
  culturalContexts: many(culturalContexts),
  sources: many(sources),
  threads: many(discourseThreads),
  comments: many(discourseComments),
  submissions: many(eventSubmissions),
  contributions: many(userContributions),
  votes: many(votes),
  notifications: many(notifications),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, {
    fields: [events.createdBy],
    references: [users.id],
  }),
  verifier: one(users, {
    fields: [events.verifiedBy],
    references: [users.id],
  }),
  culturalContexts: many(culturalContexts),
  sources: many(sources),
  threads: many(discourseThreads),
}));

export const culturalContextsRelations = relations(culturalContexts, ({ one }) => ({
  event: one(events, {
    fields: [culturalContexts.eventId],
    references: [events.id],
  }),
  creator: one(users, {
    fields: [culturalContexts.createdBy],
    references: [users.id],
  }),
}));

export const sourcesRelations = relations(sources, ({ one }) => ({
  event: one(events, {
    fields: [sources.eventId],
    references: [events.id],
  }),
  creator: one(users, {
    fields: [sources.createdBy],
    references: [users.id],
  }),
}));

export const discourseThreadsRelations = relations(discourseThreads, ({ one, many }) => ({
  event: one(events, {
    fields: [discourseThreads.eventId],
    references: [events.id],
  }),
  creator: one(users, {
    fields: [discourseThreads.createdBy],
    references: [users.id],
  }),
  resolver: one(users, {
    fields: [discourseThreads.resolvedBy],
    references: [users.id],
  }),
  comments: many(discourseComments),
}));

export const discourseCommentsRelations = relations(discourseComments, ({ one, many }) => ({
  thread: one(discourseThreads, {
    fields: [discourseComments.threadId],
    references: [discourseThreads.id],
  }),
  parent: one(discourseComments, {
    fields: [discourseComments.parentId],
    references: [discourseComments.id],
  }),
  creator: one(users, {
    fields: [discourseComments.createdBy],
    references: [users.id],
  }),
  replies: many(discourseComments),
}));