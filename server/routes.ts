import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { registerAudioRoutes } from "./replit_integrations/audio/routes";
import { openai } from "./replit_integrations/audio/client"; // Reusing the openai client

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);
  registerChatRoutes(app);
  registerImageRoutes(app);
  registerAudioRoutes(app);

  // Books Routes
  app.get(api.books.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const books = await storage.getBooks(userId);
    res.json(books);
  });

  app.post(api.books.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    try {
      const bookData = api.books.create.input.parse(req.body);
      if (!bookData.coverUrl) {
        bookData.coverUrl = await getFirstCover(bookData.title, bookData.author) || undefined;
      }
      const book = await storage.createBook({ ...bookData, userId });
      
      // Increment books added stat and check for badges
      await storage.incrementStat(userId, 'totalBooksAdded');
      await checkAndAwardBadges(userId);
      
      res.status(201).json(book);
    } catch (error) {
      res.status(400).json({ message: "Invalid book data" });
    }
  });
  
  // Helper function to check and award badges
  async function checkAndAwardBadges(userId: string) {
    const stats = await storage.getUserStats(userId);
    if (!stats) return;

    const badgeTiers = [
      { tier: 'bronze', thresholds: { quizzes: 1, books_added: 1, books_read: 1, daily_streak: 3 } },
      { tier: 'silver', thresholds: { quizzes: 5, books_added: 5, books_read: 5, daily_streak: 7 } },
      { tier: 'gold', thresholds: { quizzes: 10, books_added: 10, books_read: 10, daily_streak: 14 } },
      { tier: 'platinum', thresholds: { quizzes: 20, books_added: 20, books_read: 20, daily_streak: 30 } },
      { tier: 'diamond', thresholds: { quizzes: 50, books_added: 50, books_read: 50, daily_streak: 100 } },
    ];

    for (const { tier, thresholds } of badgeTiers) {
      // Check quizzes badge
      if ((stats.totalQuizzesCompleted || 0) >= thresholds.quizzes) {
        const hasBadge = await storage.hasBadge(userId, 'quizzes', tier);
        if (!hasBadge) {
          await storage.createBadge({
            userId,
            type: 'quizzes',
            tier: tier as any,
            milestone: thresholds.quizzes,
          });
          await storage.createNotification({
            userId,
            type: 'badge_earned',
            title: 'New Badge Earned!',
            message: `You earned the ${tier} Quiz Master badge for completing ${thresholds.quizzes} quizzes!`,
            isRead: false,
          });
        }
      }

      // Check books added badge
      if ((stats.totalBooksAdded || 0) >= thresholds.books_added) {
        const hasBadge = await storage.hasBadge(userId, 'books_added', tier);
        if (!hasBadge) {
          await storage.createBadge({
            userId,
            type: 'books_added',
            tier: tier as any,
            milestone: thresholds.books_added,
          });
          await storage.createNotification({
            userId,
            type: 'badge_earned',
            title: 'New Badge Earned!',
            message: `You earned the ${tier} Collector badge for adding ${thresholds.books_added} books!`,
            isRead: false,
          });
        }
      }

      // Check books read badge
      if ((stats.totalBooksRead || 0) >= thresholds.books_read) {
        const hasBadge = await storage.hasBadge(userId, 'books_read', tier);
        if (!hasBadge) {
          await storage.createBadge({
            userId,
            type: 'books_read',
            tier: tier as any,
            milestone: thresholds.books_read,
          });
          await storage.createNotification({
            userId,
            type: 'badge_earned',
            title: 'New Badge Earned!',
            message: `You earned the ${tier} Bookworm badge for reading ${thresholds.books_read} books!`,
            isRead: false,
          });
        }
      }

      // Check daily streak badge
      if ((stats.dailyStreak || 0) >= thresholds.daily_streak) {
        const hasBadge = await storage.hasBadge(userId, 'daily_streak', tier);
        if (!hasBadge) {
          await storage.createBadge({
            userId,
            type: 'daily_streak',
            tier: tier as any,
            milestone: thresholds.daily_streak,
          });
          await storage.createNotification({
            userId,
            type: 'streak_milestone',
            title: 'Streak Milestone!',
            message: `You earned the ${tier} Dedicated Reader badge for a ${thresholds.daily_streak} day streak!`,
            isRead: false,
          });
        }
      }
    }
  }
  
  // Add default starter books for new users
  async function addStarterBooks(userId: string) {
    const existingBooks = await storage.getBooks(userId);
    if (existingBooks.length > 0) return;

    const starterBooks = [
      { title: "Cosmos", author: "Carl Sagan" },
      { title: "Moby Dick", author: "Herman Melville" },
    ];

    for (const book of starterBooks) {
      const coverUrl = await getFirstCover(book.title, book.author);
      await storage.createBook({
        title: book.title,
        author: book.author,
        coverUrl: coverUrl || undefined,
        status: "want_to_read",
        userId,
      } as any);
    }

    await storage.createOrUpdateUserStats(userId, { totalBooksAdded: 2 });
  }

  app.patch(api.books.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    try {
      const id = Number(req.params.id);
      const bookData = api.books.update.input.parse(req.body);
      
      // Check if status is changing to "read"
      const existingBook = await storage.getBook(id);
      const wasNotRead = existingBook && existingBook.status !== 'read';
      const isNowRead = bookData.status === 'read';
      
      const book = await storage.updateBook(id, bookData);
      
      // If book is now marked as read, increment stats
      if (wasNotRead && isNowRead) {
        await storage.incrementStat(userId, 'totalBooksRead');
        await checkAndAwardBadges(userId);
      }
      
      res.json(book);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.delete(api.books.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = Number(req.params.id);
      await storage.deleteBook(id);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to delete book" });
    }
  });

  // Helper to fetch first cover
  async function getFirstCover(title: string, author?: string): Promise<string | null> {
    try {
      const query = encodeURIComponent(`${title} ${author || ""}`);
      const olResponse = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=5`);
      const olData = await olResponse.json();

      const olCover = olData.docs.find((doc: any) => doc.cover_i);
      if (olCover) return `https://covers.openlibrary.org/b/id/${olCover.cover_i}-L.jpg`;

      const gbResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
      const gbData = await gbResponse.json();
      const gbCover = gbData.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
      if (gbCover) return gbCover.replace('http:', 'https:');

      return null;
    } catch (e) {
      console.error("Cover fetch error:", e);
      return null;
    }
  }

  // Book Cover Search (Moved up to avoid conflict with /api/books/:id)
  app.get("/api/books/covers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const title = req.query.title as string;
    const author = req.query.author as string;
    if (!title) return res.status(400).json({ message: "Title is required" });

    try {
      const query = encodeURIComponent(`${title} ${author || ""}`);
      // Try Open Library first
      const olResponse = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=5`);
      const olData = await olResponse.json();
      
      let covers: any[] = olData.docs
        .filter((doc: any) => doc.cover_i)
        .map((doc: any) => ({
          id: `ol-${doc.cover_i}`,
          url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
          title: doc.title,
          author: doc.author_name?.[0]
        }));

      // If we don't have many covers, try Google Books API as fallback/supplement
      if (covers.length < 5) {
        const gbResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5`);
        const gbData = await gbResponse.json();
        
        if (gbData.items) {
          const gbCovers = gbData.items
            .filter((item: any) => item.volumeInfo?.imageLinks?.thumbnail)
            .map((item: any) => ({
              id: `gb-${item.id}`,
              url: item.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:'),
              title: item.volumeInfo.title,
              author: item.volumeInfo.authors?.[0]
            }));
          
          covers = [...covers, ...gbCovers].slice(0, 10);
        }
      }

      res.json(covers);
    } catch (error) {
      console.error("Error fetching covers:", error);
      res.status(500).json({ message: "Failed to fetch book covers" });
    }
  });

  app.get(api.books.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid book ID" });
    const book = await storage.getBook(id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  });

  // AI Summary Generation
  app.post(api.books.generateSummary.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const bookId = Number(req.params.id);
    const book = await storage.getBook(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    try {
      const parseResult = api.books.generateSummary.input.safeParse(req.body || {});
      const length = parseResult.success ? parseResult.data.length : "medium";
      
      const lengthConfig = {
        short: { chars: 500, description: "brief (approximately 500 characters)" },
        medium: { chars: 1500, description: "moderate length (approximately 1500 characters)" },
        detailed: { chars: 5000, description: "comprehensive and detailed (approximately 5000 characters)" }
      };
      
      const config = lengthConfig[length];

      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: `You are a helpful literary assistant. Provide a ${config.description} summary of the book. 

Format your response as structured paragraphs with bullet points for key details:
- Start with a main paragraph introducing the book's premise
- Include bullet points for:
  • Main themes
  • Key characters
  • Plot highlights
- End with a concluding paragraph about the book's significance or impact

Use clear paragraph breaks and bullet formatting throughout.`
          },
          {
            role: "user",
            content: `Please provide a ${config.description} summary for the book "${book.title}" by ${book.author}.`
          }
        ],
      });

      const summary = completion.choices[0].message.content || "Could not generate summary.";
      
      // Save summary to book
      await storage.updateBook(bookId, { aiSummary: summary });

      res.json({ summary });
    } catch (error) {
      console.error("Error generating summary:", error);
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  // AI Chapter Summaries
  app.post(api.books.generateChapterSummaries.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const bookId = Number(req.params.id);
    const book = await storage.getBook(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a literary analyst. Break the book into its main chapters or parts and provide a concise summary for each. Return a JSON object with a 'chapters' array containing { chapter: string, summary: string }."
          },
          {
            role: "user",
            content: `Please provide chapter-by-chapter summaries for the book "${book.title}" by ${book.author}.`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content || "{}";
      const data = JSON.parse(content);
      const chapters = data.chapters || [];

      await storage.updateBook(bookId, { chapterSummaries: chapters });
      res.json({ chapters });
    } catch (error) {
      console.error("Error generating chapter summaries:", error);
      res.status(500).json({ message: "Failed to generate chapter summaries" });
    }
  });

  // AI Chat about book
  app.post(api.books.chat.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const bookId = Number(req.params.id);
    const book = await storage.getBook(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    try {
      const { message } = api.books.chat.input.parse(req.body);
      const history = (book.chatHistory as any[]) || [];

      const messages: any[] = [
        {
          role: "system",
          content: `You are an expert on the book "${book.title}" by ${book.author}. Answer the user's questions about the book based on its content, themes, characters, and historical context.`
        },
        ...history,
        { role: "user", content: message }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
      });

      const assistantMessage = completion.choices[0].message.content || "";
      const updatedHistory = [...history, { role: "user", content: message }, { role: "assistant", content: assistantMessage }];

      await storage.updateBook(bookId, { chatHistory: updatedHistory });
      res.json({ response: assistantMessage, history: updatedHistory });
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ message: "Failed to get AI response" });
    }
  });

  // AI Quiz Generation
  app.post(api.books.generateQuiz.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const bookId = Number(req.params.id);
    const book = await storage.getBook(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    try {
      const { difficulty } = api.books.generateQuiz.input.parse(req.body);
      
      const difficultyPrompts = {
        beginner: "Generate very simple, basic recall questions about the main character names and the most obvious plot events. Ideal for someone who just started reading.",
        easy: "Generate simple, factual questions about characters, settings, and major plot points.",
        medium: "Generate questions about themes, character motivations, relationships, and key events.",
        hard: "Generate challenging questions about literary devices, symbolism, subtle foreshadowing, and thematic analysis.",
        expert: "Generate expert-level questions requiring deep analysis of narrative techniques, authorial intent, historical context, intertextual references, and complex character psychology."
      };

      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: `You are a teacher creating a diverse quiz for a book. ${difficultyPrompts[difficulty as keyof typeof difficultyPrompts]} Generate 10 questions with a mix of question types in JSON format. Include:
- 3 true/false questions (type: "true_false", options: ["True", "False"], correctAnswer: 0 or 1)
- 4 multiple choice questions (type: "multiple_choice", options: 4 choices, correctAnswer: 0-3)
- 3 select-all-that-apply questions (type: "multiple_select", options: 4 choices including possibly "None of the above", correctAnswers: array of correct indices like [0, 2])

The format should be: { questions: [{ type: string, question: string, options: string[], correctAnswer?: number, correctAnswers?: number[] }] }. For multiple_select, use correctAnswers array. For true_false and multiple_choice, use correctAnswer number.`
          },
          {
            role: "user",
            content: `Create a ${difficulty} difficulty quiz with 10 mixed-type questions for "${book.title}" by ${book.author}.`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content || "{}";
      const data = JSON.parse(content);

      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error("Invalid quiz format received from AI");
      }

      const quiz = await storage.createQuiz({
        bookId,
        difficulty,
        questions: data.questions,
        score: null,
        userAnswers: null,
      });

      res.status(201).json(quiz);
    } catch (error) {
      console.error("Error generating quiz:", error);
      res.status(500).json({ message: "Failed to generate quiz" });
    }
  });

  app.get("/api/stats/quizzes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const stats = await storage.getQuizStats(userId);
    res.json(stats);
  });

  // Quizzes Routes
  app.get(api.quizzes.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const quiz = await storage.getQuiz(Number(req.params.id));
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    res.json(quiz);
  });

  app.post(api.quizzes.submit.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const quizId = Number(req.params.id);
    const { answers } = req.body;
    
    const quiz = await storage.getQuiz(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // Calculate score - handle different question types
    const questions = quiz.questions as any[];
    let score = 0;
    questions.forEach((q, i) => {
      const userAnswer = answers[i];
      if (q.type === 'multiple_select') {
        // For multiple select, compare arrays
        const correctSet = new Set(q.correctAnswers || []);
        const userSet = new Set(Array.isArray(userAnswer) ? userAnswer : []);
        if (correctSet.size === userSet.size && [...correctSet].every(a => userSet.has(a))) {
          score++;
        }
      } else {
        // For true/false and single choice
        if (q.correctAnswer === userAnswer) score++;
      }
    });

    const updatedQuiz = await storage.updateQuizScore(quizId, score, answers);
    
    // Increment quiz completion stat and check for badges
    await storage.incrementStat(userId, 'totalQuizzesCompleted');
    await checkAndAwardBadges(userId);
    
    res.json(updatedQuiz);
  });

  // Identify books from image
  app.post(api.books.identify.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { image } = api.books.identify.input.parse(req.body);

      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: "You are a visual assistant specialized in identifying books from photos. Identify all books visible in the image. Return a JSON object with a 'books' array containing { title, author } for each book found."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify these books."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content || "{}";
      const data = JSON.parse(content);

      // Automatically fetch covers for identified books
      if (data.books && Array.isArray(data.books)) {
        for (const book of data.books) {
          book.coverUrl = await getFirstCover(book.title, book.author);
        }
      }

      res.json(data);
    } catch (error) {
      console.error("Error identifying books:", error);
      res.status(500).json({ message: "Failed to identify books" });
    }
  });

  app.get("/api/authors/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const query = req.query.q as string;
    if (!query) return res.json([]);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Find authors matching the query. Return a JSON array of objects with { name, birthDate, deathDate }."
          },
          {
            role: "user",
            content: `Search for authors: ${query}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const data = JSON.parse(completion.choices[0].message.content || "{\"authors\":[]}");
      res.json(data.authors || []);
    } catch (error) {
      res.status(500).json({ message: "Failed to search authors" });
    }
  });

  app.get("/api/authors/:name/works", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const name = req.params.name;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "List major works for the given author. Return a JSON array of objects with { title, publicationDate, material }."
          },
          {
            role: "user",
            content: `List works by: ${name}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const data = JSON.parse(completion.choices[0].message.content || "{\"works\":[]}");
      res.json(data.works || []);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch works" });
    }
  });

  // Recommendations Routes
  app.get(api.recommendations.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const recs = await storage.getRecommendations(userId);
    res.json(recs);
  });

  app.post(api.recommendations.generate.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const userBooks = await storage.getBooks(userId);
    
    // Simple logic: pass last few read books to AI
    const readBooks = userBooks.filter(b => b.status === 'read').slice(0, 5);
    
    if (readBooks.length === 0) {
      return res.json([]); // No books to base recommendations on
    }

    try {
      // Delete all existing recommendations before generating new ones
      await storage.deleteAllRecommendations(userId);
      
      const bookList = readBooks.map(b => `"${b.title}" by ${b.author}`).join(", ");
      
      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: "You are a librarian. Recommend 3 books based on the user's reading history. Format as JSON: { recommendations: [{ bookTitle: string, bookAuthor: string, reason: string }] }."
          },
          {
            role: "user",
            content: `I have read: ${bookList}. What should I read next?`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content || "{}";
      const data = JSON.parse(content);

      if (!data.recommendations || !Array.isArray(data.recommendations)) {
        throw new Error("Invalid recommendations format");
      }

      const createdRecs = [];
      for (const rec of data.recommendations) {
        const newRec = await storage.createRecommendation({
          userId,
          bookTitle: rec.bookTitle,
          bookAuthor: rec.bookAuthor,
          reason: rec.reason,
          isIgnored: false,
        });
        createdRecs.push(newRec);
      }

      res.json(createdRecs);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      res.status(500).json({ message: "Failed to generate recommendations" });
    }
  });

  // User Stats Routes
  app.get(api.userStats.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    let stats = await storage.getUserStats(userId);
    if (!stats) {
      stats = await storage.createOrUpdateUserStats(userId, {});
    }
    res.json(stats);
  });

  // Badges Routes
  app.get(api.badges.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const userBadges = await storage.getBadges(userId);
    res.json(userBadges);
  });

  // Notifications Routes
  app.get(api.notifications.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const notifs = await storage.getNotifications(userId);
    res.json(notifs);
  });

  app.get(api.notifications.unreadCount.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const count = await storage.getUnreadNotificationCount(userId);
    res.json({ count });
  });

  app.post(api.notifications.markRead.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    await storage.markNotificationRead(id);
    res.json({ success: true });
  });

  app.post(api.notifications.markAllRead.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    await storage.markAllNotificationsRead(userId);
    res.json({ success: true });
  });

  // External book search
  app.get(api.externalBooks.search.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const query = req.query.q as string;
    if (!query) return res.json([]);

    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodedQuery}&limit=10`);
      const data = await response.json();

      const books = data.docs.map((doc: any) => ({
        title: doc.title,
        author: doc.author_name?.[0] || "Unknown",
        coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined,
        description: doc.first_sentence?.[0] || undefined,
        publishedDate: doc.first_publish_year?.toString() || undefined,
      }));

      res.json(books);
    } catch (error) {
      console.error("Error searching external books:", error);
      res.status(500).json({ message: "Failed to search books" });
    }
  });

  // AI Grouping
  app.post(api.aiGrouping.suggest.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const userBooks = await storage.getBooks(userId);

    if (userBooks.length < 2) {
      return res.json({ groups: [] });
    }

    try {
      const bookList = userBooks.map(b => `ID:${b.id} "${b.title}" by ${b.author}`).join("\n");

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a librarian organizing books into thematic groups. Analyze the books and suggest 3-5 meaningful groups based on themes, genres, time periods, or other patterns. Return JSON: { groups: [{ name: string, description: string, bookIds: number[] }] }"
          },
          {
            role: "user",
            content: `Please organize these books into groups:\n${bookList}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0].message.content || "{}";
      const data = JSON.parse(content);
      res.json(data);
    } catch (error) {
      console.error("Error generating AI grouping:", error);
      res.status(500).json({ message: "Failed to generate grouping suggestions" });
    }
  });

  // Book Clubs Routes
  app.get(api.bookClubs.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const clubs = await storage.getUserBookClubs(userId);
    res.json(clubs);
  });

  app.get(api.bookClubs.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const id = Number(req.params.id);
    const club = await storage.getBookClub(id);
    if (!club) return res.status(404).json({ message: "Club not found" });
    res.json(club);
  });

  app.post(api.bookClubs.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const { name, description } = req.body;

    // Generate unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const club = await storage.createBookClub({
      name,
      description,
      ownerId: userId,
      inviteCode,
      currentBookId: null,
    });

    res.status(201).json(club);
  });

  app.post(api.bookClubs.join.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const code = req.params.code;

    const club = await storage.getBookClubByInviteCode(code);
    if (!club) return res.status(404).json({ message: "Club not found" });

    const isMember = await storage.isClubMember(club.id, userId);
    if (!isMember && club.ownerId !== userId) {
      await storage.addBookClubMember({ clubId: club.id, userId });
    }

    res.json(club);
  });

  app.post(api.bookClubs.leave.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const clubId = Number(req.params.id);

    await storage.removeBookClubMember(clubId, userId);
    res.json({ success: true });
  });

  app.post(api.bookClubs.setCurrentBook.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.params.id);
    const { bookId } = req.body;

    const club = await storage.updateBookClub(clubId, { currentBookId: bookId });
    res.json(club);
  });

  app.get(api.bookClubs.members.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.params.id);
    const members = await storage.getBookClubMembers(clubId);
    res.json(members);
  });

  app.get(api.bookClubs.messages.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.params.id);
    const messages = await storage.getBookClubMessages(clubId);
    res.json(messages);
  });

  app.post(api.bookClubs.sendMessage.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const clubId = Number(req.params.id);
    const { content } = req.body;

    const message = await storage.createBookClubMessage({
      clubId,
      userId,
      content,
    });

    res.status(201).json(message);
  });

  // Feed Route
  app.get(api.feed.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;

    try {
      // Get notifications
      const notifs = await storage.getNotifications(userId, 10);

      // Get user's books
      const userBooks = await storage.getBooks(userId);
      const readBooks = userBooks.filter(b => b.status === 'read');
      const authors = [...new Set(userBooks.map(b => b.author))];

      // Suggest books based on reading history
      let suggestedBooks: any[] = [];
      if (readBooks.length > 0) {
        const bookList = readBooks.slice(0, 3).map(b => `"${b.title}" by ${b.author}`).join(", ");
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a librarian. Suggest 3 books based on reading history. Return JSON: { books: [{ title: string, author: string, reason: string }] }"
              },
              {
                role: "user",
                content: `Based on reading: ${bookList}, suggest new books.`
              }
            ],
            response_format: { type: "json_object" },
          });
          const data = JSON.parse(completion.choices[0].message.content || "{}");
          suggestedBooks = data.books || [];
        } catch (e) {
          console.error("Error getting suggestions:", e);
        }
      }

      // Get books needing refresher quizzes (read more than 30 days ago)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const refresherQuizzes = readBooks
        .filter(b => b.dateRead && new Date(b.dateRead) < thirtyDaysAgo)
        .slice(0, 5)
        .map(b => ({
          bookId: b.id,
          bookTitle: b.title,
          lastQuizDate: b.dateRead,
        }));

      // Get new books by favorite authors
      let newAuthorBooks: any[] = [];
      if (authors.length > 0) {
        try {
          const authorList = authors.slice(0, 3).join(", ");
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "List popular books by these authors that the user might not have read. Return JSON: { books: [{ title: string, author: string, reason: string }] }"
              },
              {
                role: "user",
                content: `Authors: ${authorList}. Suggest other books by these authors.`
              }
            ],
            response_format: { type: "json_object" },
          });
          const data = JSON.parse(completion.choices[0].message.content || "{}");
          newAuthorBooks = data.books || [];
        } catch (e) {
          console.error("Error getting author books:", e);
        }
      }

      res.json({
        notifications: notifs,
        suggestedBooks,
        refresherQuizzes,
        newAuthorBooks,
      });
    } catch (error) {
      console.error("Error getting feed:", error);
      res.status(500).json({ message: "Failed to get feed" });
    }
  });

  // External book search
  app.get("/api/external-books/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const query = req.query.q as string;
    if (!query || query.length < 2) return res.json([]);

    try {
      // Search Google Books
      const googleRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=6`
      );
      const googleData = await googleRes.json();
      
      const books = (googleData.items || []).map((item: any) => ({
        title: item.volumeInfo?.title || "Unknown",
        author: item.volumeInfo?.authors?.join(", ") || "Unknown",
        coverUrl: item.volumeInfo?.imageLinks?.thumbnail?.replace("http:", "https:"),
        description: item.volumeInfo?.description?.slice(0, 200),
        publishedDate: item.volumeInfo?.publishedDate,
      }));

      res.json(books);
    } catch (error) {
      console.error("External book search error:", error);
      res.json([]);
    }
  });

  // AI-powered book grouping
  app.post("/api/books/ai-grouping", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;

    try {
      const books = await storage.getBooks(userId);
      if (books.length < 2) {
        return res.json({ groups: [{ name: "All Books", description: "Your library", bookIds: books.map(b => b.id) }] });
      }

      const bookList = books.map(b => `ID:${b.id} "${b.title}" by ${b.author}`).join("\n");
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a librarian organizing books into thematic groups. Analyze the list and create 2-5 meaningful groups based on themes, genres, time periods, or writing styles. Return JSON: { groups: [{ name: string, description: string, bookIds: number[] }] }. Each book should appear in exactly one group.`
          },
          {
            role: "user",
            content: `Group these books:\n${bookList}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const data = JSON.parse(completion.choices[0].message.content || "{}");
      res.json(data);
    } catch (error) {
      console.error("AI grouping error:", error);
      res.status(500).json({ message: "Failed to generate groups" });
    }
  });

  // Book Clubs
  app.get("/api/book-clubs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const clubs = await storage.getUserBookClubs(userId);
    res.json(clubs);
  });

  app.post("/api/book-clubs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const { name, description } = req.body;

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const club = await storage.createBookClub({
      name,
      description,
      ownerId: userId,
      inviteCode,
    });

    // Add owner as member
    await storage.addBookClubMember({
      clubId: club.id,
      userId,
      role: "owner",
    });

    res.status(201).json(club);
  });

  app.post("/api/book-clubs/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const { inviteCode } = req.body;

    const club = await storage.getBookClubByInviteCode(inviteCode);
    if (!club) return res.status(404).json({ message: "Club not found" });

    const existingMember = await storage.getBookClubMember(club.id, userId);
    if (existingMember) return res.status(400).json({ message: "Already a member" });

    await storage.addBookClubMember({
      clubId: club.id,
      userId,
      role: "member",
    });

    res.json({ message: "Joined successfully", club });
  });

  app.get("/api/book-clubs/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const clubId = Number(req.params.id);

    const club = await storage.getBookClub(clubId);
    if (!club) return res.status(404).json({ message: "Club not found" });

    const isMember = await storage.getBookClubMember(clubId, userId);
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    const members = await storage.getBookClubMembers(clubId);
    const messages = await storage.getBookClubMessages(clubId);

    res.json({ club, members, messages });
  });

  app.post("/api/book-clubs/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = (req.user as any).claims.sub;
    const clubId = Number(req.params.id);
    const { message } = req.body;

    const isMember = await storage.getBookClubMember(clubId, userId);
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    const user = await storage.getUser(userId);
    const newMessage = await storage.createBookClubMessage({
      clubId,
      userId,
      userName: user?.firstName || "Member",
      message,
    });

    res.status(201).json(newMessage);
  });

  // Middleware to update streak and add starter books on activity
  app.use(async (req, res, next) => {
    if (req.isAuthenticated()) {
      const userId = (req.user as any).claims.sub;
      try {
        await storage.updateStreak(userId);
        await addStarterBooks(userId);
      } catch (e) {
        // Ignore errors
      }
    }
    next();
  });

  return httpServer;
}
