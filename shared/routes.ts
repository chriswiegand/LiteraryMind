import { z } from 'zod';
import { insertBookSchema, books, quizzes, recommendations, userStats, badges, notifications, bookClubs, bookClubMembers, bookClubMessages } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  books: {
    list: {
      method: 'GET' as const,
      path: '/api/books',
      input: z.object({
        status: z.enum(['read', 'reading', 'want_to_read']).optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof books.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/books/:id',
      responses: {
        200: z.custom<typeof books.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/books',
      input: insertBookSchema,
      responses: {
        201: z.custom<typeof books.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/books/:id',
      input: insertBookSchema.partial(),
      responses: {
        200: z.custom<typeof books.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/books/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    generateSummary: {
      method: 'POST' as const,
      path: '/api/books/:id/summary',
      input: z.object({
        length: z.enum(["short", "medium", "detailed"]).default("medium"),
      }),
      responses: {
        200: z.object({ summary: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    generateChapterSummaries: {
      method: 'POST' as const,
      path: '/api/books/:id/chapters',
      responses: {
        200: z.object({ chapters: z.array(z.object({ chapter: z.string(), summary: z.string() })) }),
        404: errorSchemas.notFound,
      },
    },
    chat: {
      method: 'POST' as const,
      path: '/api/books/:id/chat',
      input: z.object({
        message: z.string(),
      }),
      responses: {
        200: z.object({ response: z.string(), history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })) }),
        404: errorSchemas.notFound,
      },
    },
    generateQuiz: {
      method: 'POST' as const,
      path: '/api/books/:id/quiz',
      input: z.object({
        difficulty: z.enum(["beginner", "easy", "medium", "hard", "expert"]).default("medium"),
      }),
      responses: {
        201: z.custom<typeof quizzes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    identify: {
      method: 'POST' as const,
      path: '/api/books/identify',
      input: z.object({
        image: z.string(), // base64 image
      }),
      responses: {
        200: z.object({
          books: z.array(z.object({
            title: z.string(),
            author: z.string(),
          })),
        }),
      },
    },
    searchAuthors: {
      method: 'GET' as const,
      path: '/api/authors/search',
      responses: {
        200: z.array(z.object({
          name: z.string(),
          birthDate: z.string().optional(),
          deathDate: z.string().optional(),
        })),
      },
    },
    getAuthorWorks: {
      method: 'GET' as const,
      path: '/api/authors/:name/works',
      responses: {
        200: z.array(z.object({
          title: z.string(),
          publicationDate: z.string().optional(),
          material: z.string().optional(),
        })),
      },
    },
  },
  quizzes: {
    get: {
      method: 'GET' as const,
      path: '/api/quizzes/:id',
      responses: {
        200: z.custom<typeof quizzes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    submit: {
      method: 'POST' as const,
      path: '/api/quizzes/:id/submit',
      input: z.object({
        answers: z.array(z.number()),
      }),
      responses: {
        200: z.custom<typeof quizzes.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  recommendations: {
    list: {
      method: 'GET' as const,
      path: '/api/recommendations',
      responses: {
        200: z.array(z.custom<typeof recommendations.$inferSelect>()),
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/recommendations/generate',
      responses: {
        200: z.array(z.custom<typeof recommendations.$inferSelect>()),
      },
    },
  },
  userStats: {
    get: {
      method: 'GET' as const,
      path: '/api/user/stats',
      responses: {
        200: z.custom<typeof userStats.$inferSelect>(),
      },
    },
  },
  badges: {
    list: {
      method: 'GET' as const,
      path: '/api/badges',
      responses: {
        200: z.array(z.custom<typeof badges.$inferSelect>()),
      },
    },
  },
  notifications: {
    list: {
      method: 'GET' as const,
      path: '/api/notifications',
      responses: {
        200: z.array(z.custom<typeof notifications.$inferSelect>()),
      },
    },
    unreadCount: {
      method: 'GET' as const,
      path: '/api/notifications/unread-count',
      responses: {
        200: z.object({ count: z.number() }),
      },
    },
    markRead: {
      method: 'POST' as const,
      path: '/api/notifications/:id/read',
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    markAllRead: {
      method: 'POST' as const,
      path: '/api/notifications/read-all',
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
  },
  bookClubs: {
    list: {
      method: 'GET' as const,
      path: '/api/book-clubs',
      responses: {
        200: z.array(z.custom<typeof bookClubs.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/book-clubs/:id',
      responses: {
        200: z.custom<typeof bookClubs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/book-clubs',
      input: z.object({
        name: z.string(),
        description: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof bookClubs.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    join: {
      method: 'POST' as const,
      path: '/api/book-clubs/join/:code',
      responses: {
        200: z.custom<typeof bookClubs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    leave: {
      method: 'POST' as const,
      path: '/api/book-clubs/:id/leave',
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    setCurrentBook: {
      method: 'POST' as const,
      path: '/api/book-clubs/:id/current-book',
      input: z.object({
        bookId: z.number().nullable(),
      }),
      responses: {
        200: z.custom<typeof bookClubs.$inferSelect>(),
      },
    },
    members: {
      method: 'GET' as const,
      path: '/api/book-clubs/:id/members',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          clubId: z.number(),
          userId: z.string(),
          joinedAt: z.date().nullable(),
          user: z.object({
            id: z.string(),
            firstName: z.string().nullable(),
            lastName: z.string().nullable(),
            profileImageUrl: z.string().nullable(),
          }).optional(),
        })),
      },
    },
    messages: {
      method: 'GET' as const,
      path: '/api/book-clubs/:id/messages',
      responses: {
        200: z.array(z.custom<typeof bookClubMessages.$inferSelect>()),
      },
    },
    sendMessage: {
      method: 'POST' as const,
      path: '/api/book-clubs/:id/messages',
      input: z.object({
        content: z.string(),
      }),
      responses: {
        201: z.custom<typeof bookClubMessages.$inferSelect>(),
      },
    },
  },
  feed: {
    get: {
      method: 'GET' as const,
      path: '/api/feed',
      responses: {
        200: z.object({
          notifications: z.array(z.custom<typeof notifications.$inferSelect>()),
          suggestedBooks: z.array(z.object({
            title: z.string(),
            author: z.string(),
            reason: z.string(),
          })),
          refresherQuizzes: z.array(z.object({
            bookId: z.number(),
            bookTitle: z.string(),
            lastQuizDate: z.date().nullable(),
          })),
          newAuthorBooks: z.array(z.object({
            title: z.string(),
            author: z.string(),
            reason: z.string(),
          })),
        }),
      },
    },
  },
  externalBooks: {
    search: {
      method: 'GET' as const,
      path: '/api/external-books/search',
      responses: {
        200: z.array(z.object({
          title: z.string(),
          author: z.string(),
          coverUrl: z.string().optional(),
          description: z.string().optional(),
          publishedDate: z.string().optional(),
        })),
      },
    },
  },
  aiGrouping: {
    suggest: {
      method: 'POST' as const,
      path: '/api/books/ai-grouping',
      responses: {
        200: z.object({
          groups: z.array(z.object({
            name: z.string(),
            description: z.string(),
            bookIds: z.array(z.number()),
          })),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
