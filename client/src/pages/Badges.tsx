import { Navigation } from "@/components/Navigation";
import { useBadges, useUserStats, badgeInfo, tierColors } from "@/hooks/use-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, BrainCircuit, Library, BookOpen, Flame, Trophy, Award } from "lucide-react";

const tierThresholds = {
  quizzes: [1, 5, 10, 20, 50],
  books_added: [1, 5, 10, 20, 50],
  books_read: [1, 5, 10, 20, 50],
  daily_streak: [3, 7, 14, 30, 100],
};

const tierNames = ["bronze", "silver", "gold", "platinum", "diamond"] as const;

const iconMap = {
  BrainCircuit,
  Library,
  BookOpen,
  Flame,
};

export default function Badges() {
  const { data: badges, isLoading: badgesLoading } = useBadges();
  const { data: stats, isLoading: statsLoading } = useUserStats();

  if (badgesLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const getProgressForCategory = (category: keyof typeof badgeInfo) => {
    const thresholds = tierThresholds[category];
    let current = 0;
    switch (category) {
      case "quizzes":
        current = stats?.totalQuizzesCompleted || 0;
        break;
      case "books_added":
        current = stats?.totalBooksAdded || 0;
        break;
      case "books_read":
        current = stats?.totalBooksRead || 0;
        break;
      case "daily_streak":
        current = stats?.dailyStreak || 0;
        break;
    }

    const earnedBadges = badges?.filter(b => b.type === category) || [];
    const highestTierIndex = earnedBadges.reduce((max, b) => {
      const idx = tierNames.indexOf(b.tier as any);
      return idx > max ? idx : max;
    }, -1);

    const nextTierIndex = highestTierIndex + 1;
    const nextThreshold = nextTierIndex < 5 ? thresholds[nextTierIndex] : thresholds[4];
    const prevThreshold = nextTierIndex > 0 ? thresholds[nextTierIndex - 1] : 0;
    
    const progress = nextTierIndex < 5 
      ? Math.min(100, ((current - prevThreshold) / (nextThreshold - prevThreshold)) * 100)
      : 100;

    return {
      current,
      nextThreshold,
      nextTier: nextTierIndex < 5 ? tierNames[nextTierIndex] : null,
      progress,
      earnedTiers: earnedBadges.map(b => b.tier),
    };
  };

  const categories = Object.keys(badgeInfo) as (keyof typeof badgeInfo)[];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Achievements</h1>
            <p className="text-muted-foreground">Track your reading milestones and earn badges.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.dailyStreak || 0}</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <BrainCircuit className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalQuizzesCompleted || 0}</p>
                <p className="text-sm text-muted-foreground">Quizzes Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Library className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalBooksAdded || 0}</p>
                <p className="text-sm text-muted-foreground">Books Added</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <BookOpen className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalBooksRead || 0}</p>
                <p className="text-sm text-muted-foreground">Books Read</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {categories.map((category) => {
            const info = badgeInfo[category];
            const { current, nextThreshold, nextTier, progress, earnedTiers } = getProgressForCategory(category);
            const IconComponent = iconMap[info.icon as keyof typeof iconMap] || Award;

            return (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{info.name}</CardTitle>
                      <CardDescription>{info.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {tierNames.map((tier, index) => {
                      const earned = earnedTiers.includes(tier);
                      const threshold = tierThresholds[category][index];
                      return (
                        <Badge
                          key={tier}
                          variant="secondary"
                          className={`${earned ? tierColors[tier] : "bg-muted text-muted-foreground opacity-50"} capitalize`}
                          data-testid={`badge-${category}-${tier}`}
                        >
                          {tier} ({threshold})
                        </Badge>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress: {current}</span>
                      {nextTier && <span>Next: {nextThreshold}</span>}
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
