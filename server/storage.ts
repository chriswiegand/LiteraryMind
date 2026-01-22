import { db } from "./db";
import {
  books,
  quizzes,
  recommendations,
  userStats,
  badges,
  notifications,
  bookClubs,
  bookClubMembers,
  bookClubMessages,
  type Book,
  type InsertBook,
  type Quiz,
  type InsertQuiz,
  type Recommendation,
  type InsertRecommendation,
  type UpdateBookRequest,
  type UserStats,
  type InsertUserStats,
  type Badge,
  type InsertBadge,
  type Notification,
  type InsertNotification,
  type BookClub,
  type InsertBookClub,
  type BookClubMember,
  type InsertBookClubMember,
  type BookClubMessage,
  type InsertBookClubMessage,
} from "@shared/schema";
import { eq, and, desc, sql, ilike, or, inArray } from "drizzle-orm";

export interface IStorage {
  // Books
  getBooks(userId: string): Promise<Book[]>;
  getBook(id: number): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: number, updates: UpdateBookRequest): Promise<Book>;
  deleteBook(id: number): Promise<void>;
  searchBooks(userId: string, query: string): Promise<Book[]>;

  // Quizzes
  getQuiz(id: number): Promise<Quiz | undefined>;
  getQuizByBookId(bookId: number): Promise<Quiz | undefined>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  updateQuizScore(id: number, score: number, userAnswers: any[]): Promise<Quiz>;

  // Recommendations
  getRecommendations(userId: string): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  deleteAllRecommendations(userId: string): Promise<void>;
  getQuizStats(userId: string): Promise<any>;

  // User Stats
  getUserStats(userId: string): Promise<UserStats | undefined>;
  createOrUpdateUserStats(userId: string, updates: Partial<InsertUserStats>): Promise<UserStats>;
  incrementStat(userId: string, field: 'totalQuizzesCompleted' | 'totalBooksAdded' | 'totalBooksRead'): Promise<UserStats>;
  updateStreak(userId: string): Promise<UserStats>;

  // Badges
  getBadges(userId: string): Promise<Badge[]>;
  createBadge(badge: InsertBadge): Promise<Badge>;
  hasBadge(userId: string, type: string, tier: string): Promise<boolean>;

  // Notifications
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;

  // Book Clubs
  getBookClub(id: number): Promise<BookClub | undefined>;
  getBookClubByInviteCode(code: string): Promise<BookClub | undefined>;
  getUserBookClubs(userId: string): Promise<BookClub[]>;
  createBookClub(club: InsertBookClub): Promise<BookClub>;
  updateBookClub(id: number, updates: Partial<InsertBookClub>): Promise<BookClub>;
  deleteBookClub(id: number): Promise<void>;

  // Book Club Members
  getBookClubMembers(clubId: number): Promise<BookClubMember[]>;
  getBookClubMember(clubId: number, userId: string): Promise<BookClubMember | undefined>;
  addBookClubMember(member: InsertBookClubMember): Promise<BookClubMember>;
  removeBookClubMember(clubId: number, userId: string): Promise<void>;
  isClubMember(clubId: number, userId: string): Promise<boolean>;

  // Book Club Messages
  getBookClubMessages(clubId: number, limit?: number): Promise<BookClubMessage[]>;
  createBookClubMessage(message: InsertBookClubMessage): Promise<BookClubMessage>;
}

export class DatabaseStorage implements IStorage {
  async getBooks(userId: string): Promise<Book[]> {
    return await db.select().from(books).where(eq(books.userId, userId)).orderBy(desc(books.createdAt));
  }

  async getBook(id: number): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book;
  }

  async createBook(book: InsertBook): Promise<Book> {
    const [newBook] = await db.insert(books).values(book).returning();
    return newBook;
  }

  async updateBook(id: number, updates: UpdateBookRequest): Promise<Book> {
    const [updatedBook] = await db
      .update(books)
      .set(updates)
      .where(eq(books.id, id))
      .returning();
    return updatedBook;
  }

  async deleteBook(id: number): Promise<void> {
    await db.delete(books).where(eq(books.id, id));
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, id));
    return quiz;
  }

  async getQuizByBookId(bookId: number): Promise<Quiz | undefined> {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.bookId, bookId)).orderBy(desc(quizzes.createdAt)).limit(1);
    return quiz;
  }

  async createQuiz(quiz: InsertQuiz): Promise<Quiz> {
    const [newQuiz] = await db.insert(quizzes).values(quiz).returning();
    return newQuiz;
  }

  async updateQuizScore(id: number, score: number, userAnswers: number[]): Promise<Quiz> {
    const [updatedQuiz] = await db
      .update(quizzes)
      .set({ score, userAnswers })
      .where(eq(quizzes.id, id))
      .returning();
    return updatedQuiz;
  }

  async getRecommendations(userId: string): Promise<Recommendation[]> {
    return await db.select().from(recommendations).where(eq(recommendations.userId, userId));
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const [newRec] = await db.insert(recommendations).values(recommendation).returning();
    return newRec;
  }

  async getQuizStats(userId: string): Promise<any> {
    const userQuizzes = await db
      .select({
        id: quizzes.id,
        score: quizzes.score,
        difficulty: quizzes.difficulty,
        createdAt: quizzes.createdAt,
        bookTitle: books.title
      })
      .from(quizzes)
      .innerJoin(books, eq(quizzes.bookId, books.id))
      .where(eq(books.userId, userId))
      .orderBy(desc(quizzes.createdAt));

    const totalQuizzes = userQuizzes.length;
    const completedQuizzes = userQuizzes.filter(q => q.score !== null);
    const averageScore = completedQuizzes.length > 0
      ? completedQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / completedQuizzes.length
      : 0;

    const difficultyBreakdown = {
      easy: userQuizzes.filter(q => q.difficulty === 'easy').length,
      medium: userQuizzes.filter(q => q.difficulty === 'medium').length,
      hard: userQuizzes.filter(q => q.difficulty === 'hard').length,
    };

    return {
      history: userQuizzes,
      stats: {
        total: totalQuizzes,
        averageScore: Math.round(averageScore * 10), // 10 questions now, so score * 10 = percentage
        difficultyBreakdown
      }
    };
  }

  async searchBooks(userId: string, query: string): Promise<Book[]> {
    return await db.select().from(books)
      .where(and(
        eq(books.userId, userId),
        or(
          ilike(books.title, `%${query}%`),
          ilike(books.author, `%${query}%`)
        )
      ))
      .orderBy(desc(books.createdAt));
  }

  async deleteAllRecommendations(userId: string): Promise<void> {
    await db.delete(recommendations).where(eq(recommendations.userId, userId));
  }

  // User Stats
  async getUserStats(userId: string): Promise<UserStats | undefined> {
    const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    return stats;
  }

  async createOrUpdateUserStats(userId: string, updates: Partial<InsertUserStats>): Promise<UserStats> {
    const existing = await this.getUserStats(userId);
    if (existing) {
      const [updated] = await db.update(userStats)
        .set(updates)
        .where(eq(userStats.userId, userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userStats)
      .values({ userId, ...updates })
      .returning();
    return created;
  }

  async incrementStat(userId: string, field: 'totalQuizzesCompleted' | 'totalBooksAdded' | 'totalBooksRead'): Promise<UserStats> {
    const stats = await this.getUserStats(userId);
    if (!stats) {
      const initial = { userId, [field]: 1 };
      const [created] = await db.insert(userStats).values(initial).returning();
      return created;
    }
    const [updated] = await db.update(userStats)
      .set({ [field]: sql`${userStats[field]} + 1` })
      .where(eq(userStats.userId, userId))
      .returning();
    return updated;
  }

  async updateStreak(userId: string): Promise<UserStats> {
    const stats = await this.getUserStats(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!stats) {
      const [created] = await db.insert(userStats)
        .values({ userId, dailyStreak: 1, longestStreak: 1, lastActiveDate: today })
        .returning();
      return created;
    }

    const lastActive = stats.lastActiveDate ? new Date(stats.lastActiveDate) : null;
    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0);
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = stats.dailyStreak || 0;
    if (lastActive?.getTime() === yesterday.getTime()) {
      newStreak += 1;
    } else if (lastActive?.getTime() !== today.getTime()) {
      newStreak = 1;
    }

    const longestStreak = Math.max(stats.longestStreak || 0, newStreak);

    const [updated] = await db.update(userStats)
      .set({ dailyStreak: newStreak, longestStreak, lastActiveDate: today })
      .where(eq(userStats.userId, userId))
      .returning();
    return updated;
  }

  // Badges
  async getBadges(userId: string): Promise<Badge[]> {
    return await db.select().from(badges)
      .where(eq(badges.userId, userId))
      .orderBy(desc(badges.earnedAt));
  }

  async createBadge(badge: InsertBadge): Promise<Badge> {
    const [newBadge] = await db.insert(badges).values(badge).returning();
    return newBadge;
  }

  async hasBadge(userId: string, type: string, tier: string): Promise<boolean> {
    const [existing] = await db.select().from(badges)
      .where(and(
        eq(badges.userId, userId),
        eq(badges.type, type as any),
        eq(badges.tier, tier as any)
      ));
    return !!existing;
  }

  // Notifications
  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return result[0]?.count || 0;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotif] = await db.insert(notifications).values(notification).returning();
    return newNotif;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // Book Clubs
  async getBookClub(id: number): Promise<BookClub | undefined> {
    const [club] = await db.select().from(bookClubs).where(eq(bookClubs.id, id));
    return club;
  }

  async getBookClubByInviteCode(code: string): Promise<BookClub | undefined> {
    const [club] = await db.select().from(bookClubs).where(eq(bookClubs.inviteCode, code));
    return club;
  }

  async getUserBookClubs(userId: string): Promise<BookClub[]> {
    const memberClubIds = await db.select({ clubId: bookClubMembers.clubId })
      .from(bookClubMembers)
      .where(eq(bookClubMembers.userId, userId));
    
    const ownedClubs = await db.select().from(bookClubs).where(eq(bookClubs.ownerId, userId));
    
    if (memberClubIds.length === 0) return ownedClubs;
    
    const memberClubs = await db.select().from(bookClubs)
      .where(inArray(bookClubs.id, memberClubIds.map(m => m.clubId)));
    
    const allClubs = [...ownedClubs, ...memberClubs];
    return Array.from(new Map(allClubs.map(c => [c.id, c])).values());
  }

  async createBookClub(club: InsertBookClub): Promise<BookClub> {
    const [newClub] = await db.insert(bookClubs).values(club).returning();
    return newClub;
  }

  async updateBookClub(id: number, updates: Partial<InsertBookClub>): Promise<BookClub> {
    const [updated] = await db.update(bookClubs)
      .set(updates)
      .where(eq(bookClubs.id, id))
      .returning();
    return updated;
  }

  async deleteBookClub(id: number): Promise<void> {
    await db.delete(bookClubMessages).where(eq(bookClubMessages.clubId, id));
    await db.delete(bookClubMembers).where(eq(bookClubMembers.clubId, id));
    await db.delete(bookClubs).where(eq(bookClubs.id, id));
  }

  // Book Club Members
  async getBookClubMembers(clubId: number): Promise<BookClubMember[]> {
    return await db.select().from(bookClubMembers)
      .where(eq(bookClubMembers.clubId, clubId));
  }

  async getBookClubMember(clubId: number, userId: string): Promise<BookClubMember | undefined> {
    const [member] = await db.select().from(bookClubMembers)
      .where(and(
        eq(bookClubMembers.clubId, clubId),
        eq(bookClubMembers.userId, userId)
      ));
    return member;
  }

  async addBookClubMember(member: InsertBookClubMember): Promise<BookClubMember> {
    const [newMember] = await db.insert(bookClubMembers).values(member).returning();
    return newMember;
  }

  async removeBookClubMember(clubId: number, userId: string): Promise<void> {
    await db.delete(bookClubMembers)
      .where(and(
        eq(bookClubMembers.clubId, clubId),
        eq(bookClubMembers.userId, userId)
      ));
  }

  async isClubMember(clubId: number, userId: string): Promise<boolean> {
    const [member] = await db.select().from(bookClubMembers)
      .where(and(
        eq(bookClubMembers.clubId, clubId),
        eq(bookClubMembers.userId, userId)
      ));
    return !!member;
  }

  // Book Club Messages
  async getBookClubMessages(clubId: number, limit: number = 100): Promise<BookClubMessage[]> {
    return await db.select().from(bookClubMessages)
      .where(eq(bookClubMessages.clubId, clubId))
      .orderBy(desc(bookClubMessages.createdAt))
      .limit(limit);
  }

  async createBookClubMessage(message: InsertBookClubMessage): Promise<BookClubMessage> {
    const [newMsg] = await db.insert(bookClubMessages).values(message).returning();
    return newMsg;
  }
}

export const storage = new DatabaseStorage();
