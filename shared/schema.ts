import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import auth and chat models
export * from "./models/auth";
export * from "./models/chat";

import { users } from "./models/auth";

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  googleBooksId: text("google_books_id"),
  title: text("title").notNull(),
  author: text("author").notNull(),
  coverUrl: text("cover_url"),
  status: text("status", { enum: ["read", "reading", "want_to_read"] }).notNull().default("want_to_read"),
  aiSummary: text("ai_summary"),
  chapterSummaries: jsonb("chapter_summaries"), // Array of { chapter: string, summary: string }
  chatHistory: jsonb("chat_history"), // Array of { role: 'user' | 'assistant', content: string }
  userNotes: text("user_notes"),
  rating: integer("rating"),
  dateRead: timestamp("date_read"),
  isFavorite: boolean("is_favorite").default(false),
  genre: text("genre"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User stats for gamification
export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  dailyStreak: integer("daily_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActiveDate: timestamp("last_active_date"),
  totalQuizzesCompleted: integer("total_quizzes_completed").default(0),
  totalBooksAdded: integer("total_books_added").default(0),
  totalBooksRead: integer("total_books_read").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Badges for achievements
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["daily_streak", "quizzes", "books_added", "books_read"] }).notNull(),
  tier: text("tier", { enum: ["bronze", "silver", "gold", "platinum", "diamond"] }).notNull(),
  milestone: integer("milestone").notNull(),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// Notifications for user feed
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["suggested_reading", "refresher_quiz", "new_author_book", "badge_earned", "streak_milestone", "book_club_activity"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  relatedBookId: integer("related_book_id"),
  relatedClubId: integer("related_club_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Book clubs
export const bookClubs = pgTable("book_clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  inviteCode: text("invite_code").notNull().unique(),
  currentBookId: integer("current_book_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Book club members
export const bookClubMembers = pgTable("book_club_members", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => bookClubs.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Book club messages
export const bookClubMessages = pgTable("book_club_messages", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull().references(() => bookClubs.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const quizzes = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull().references(() => books.id),
  difficulty: text("difficulty", { enum: ["beginner", "easy", "medium", "hard", "expert"] }).notNull().default("medium"),
  questions: jsonb("questions").notNull(), // Array of { question: string, options: string[], correctAnswer: number }
  userAnswers: jsonb("user_answers"), // Array of numbers (indices)
  score: integer("score"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author").notNull(),
  reason: text("reason").notNull(),
  isIgnored: boolean("is_ignored").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const booksRelations = relations(books, ({ one, many }) => ({
  user: one(users, {
    fields: [books.userId],
    references: [users.id],
  }),
  quizzes: many(quizzes),
}));

export const quizzesRelations = relations(quizzes, ({ one }) => ({
  book: one(books, {
    fields: [quizzes.bookId],
    references: [books.id],
  }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, {
    fields: [userStats.userId],
    references: [users.id],
  }),
}));

export const badgesRelations = relations(badges, ({ one }) => ({
  user: one(users, {
    fields: [badges.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const bookClubsRelations = relations(bookClubs, ({ one, many }) => ({
  owner: one(users, {
    fields: [bookClubs.ownerId],
    references: [users.id],
  }),
  members: many(bookClubMembers),
  messages: many(bookClubMessages),
}));

export const bookClubMembersRelations = relations(bookClubMembers, ({ one }) => ({
  club: one(bookClubs, {
    fields: [bookClubMembers.clubId],
    references: [bookClubs.id],
  }),
  user: one(users, {
    fields: [bookClubMembers.userId],
    references: [users.id],
  }),
}));

export const bookClubMessagesRelations = relations(bookClubMessages, ({ one }) => ({
  club: one(bookClubs, {
    fields: [bookClubMessages.clubId],
    references: [bookClubs.id],
  }),
  user: one(users, {
    fields: [bookClubMessages.userId],
    references: [users.id],
  }),
}));

export const insertBookSchema = createInsertSchema(books).omit({ id: true, userId: true, createdAt: true });
export const insertQuizSchema = createInsertSchema(quizzes).omit({ id: true, createdAt: true });
export const insertRecommendationSchema = createInsertSchema(recommendations).omit({ id: true, createdAt: true });
export const insertUserStatsSchema = createInsertSchema(userStats).omit({ id: true, createdAt: true });
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true, earnedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertBookClubSchema = createInsertSchema(bookClubs).omit({ id: true, createdAt: true });
export const insertBookClubMemberSchema = createInsertSchema(bookClubMembers).omit({ id: true, joinedAt: true });
export const insertBookClubMessageSchema = createInsertSchema(bookClubMessages).omit({ id: true, createdAt: true });

export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type UserStats = typeof userStats.$inferSelect;
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type BookClub = typeof bookClubs.$inferSelect;
export type InsertBookClub = z.infer<typeof insertBookClubSchema>;
export type BookClubMember = typeof bookClubMembers.$inferSelect;
export type InsertBookClubMember = z.infer<typeof insertBookClubMemberSchema>;
export type BookClubMessage = typeof bookClubMessages.$inferSelect;
export type InsertBookClubMessage = z.infer<typeof insertBookClubMessageSchema>;

export type CreateBookRequest = InsertBook;
export type UpdateBookRequest = Partial<InsertBook>;
