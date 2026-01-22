import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trophy, Target, BookOpen, Clock, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function QuizStats() {
  const { data, isLoading } = useQuery<{
    history: any[];
    stats: {
      total: number;
      averageScore: number;
      difficultyBreakdown: { easy: number; medium: number; hard: number };
    };
  }>({
    queryKey: ["/api/stats/quizzes"],
  });

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const stats = data?.stats;
  const history = data?.history || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 md:px-6 md:py-12 max-w-5xl">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-display font-bold text-foreground">Performance Dashboard</h1>
          <p className="text-muted-foreground mt-2">Track your learning progress and knowledge retention.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-card/50 backdrop-blur-sm border-border/60 hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Quizzes</CardTitle>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Attempts recorded</p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/60 hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
              <Trophy className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.averageScore || 0}%</div>
              <Progress value={stats?.averageScore || 0} className="h-2 mt-3" />
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/60 hover-elevate transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Mastery Level</CardTitle>
              <BarChart3 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground/60">
                    <span>Easy</span>
                    <span>{stats?.difficultyBreakdown.easy}</span>
                  </div>
                  <Progress value={(stats?.difficultyBreakdown.easy || 0) * 10} className="h-1 bg-green-100 dark:bg-green-950/30" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground/60">
                    <span>Medium</span>
                    <span>{stats?.difficultyBreakdown.medium}</span>
                  </div>
                  <Progress value={(stats?.difficultyBreakdown.medium || 0) * 10} className="h-1 bg-amber-100 dark:bg-amber-950/30" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground/60">
                    <span>Hard</span>
                    <span>{stats?.difficultyBreakdown.hard}</span>
                  </div>
                  <Progress value={(stats?.difficultyBreakdown.hard || 0) * 10} className="h-1 bg-red-100 dark:bg-red-950/30" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History Table */}
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Recent Activity
          </h2>
          <Card className="border-border/60 overflow-hidden bg-card/30 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold">Book</th>
                    <th className="px-6 py-4 text-sm font-semibold">Difficulty</th>
                    <th className="px-6 py-4 text-sm font-semibold">Score</th>
                    <th className="px-6 py-4 text-sm font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.length > 0 ? history.map((quiz, idx) => (
                    <motion.tr 
                      key={quiz.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{quiz.bookTitle}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${
                          quiz.difficulty === 'easy' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800' :
                          quiz.difficulty === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800' :
                          'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
                        }`}>
                          {quiz.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${
                            quiz.score === null ? 'text-muted-foreground' :
                            (quiz.score * 20) >= 80 ? 'text-green-600' :
                            (quiz.score * 20) >= 50 ? 'text-amber-600' :
                            'text-red-600'
                          }`}>
                            {quiz.score === null ? '—' : `${quiz.score * 20}%`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {format(new Date(quiz.createdAt), 'MMM d, yyyy')}
                      </td>
                    </motion.tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-muted-foreground italic">
                        No quiz attempts recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
