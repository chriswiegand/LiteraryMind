import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Badge, UserStats } from "@shared/schema";

export function useBadges() {
  return useQuery<Badge[]>({
    queryKey: [api.badges.list.path],
    queryFn: async () => {
      const res = await fetch(api.badges.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch badges");
      return res.json();
    },
  });
}

export function useUserStats() {
  return useQuery<UserStats>({
    queryKey: [api.userStats.get.path],
    queryFn: async () => {
      const res = await fetch(api.userStats.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user stats");
      return res.json();
    },
  });
}

export const badgeInfo = {
  quizzes: {
    name: "Quiz Master",
    description: "Complete quizzes to test your knowledge",
    icon: "BrainCircuit",
  },
  books_added: {
    name: "Collector",
    description: "Add books to your library",
    icon: "Library",
  },
  books_read: {
    name: "Bookworm",
    description: "Read and complete books",
    icon: "BookOpen",
  },
  daily_streak: {
    name: "Dedicated Reader",
    description: "Maintain a daily reading streak",
    icon: "Flame",
  },
};

export const tierColors = {
  bronze: "bg-amber-600 text-white",
  silver: "bg-gray-400 text-white",
  gold: "bg-yellow-500 text-white",
  platinum: "bg-cyan-400 text-white",
  diamond: "bg-purple-500 text-white",
};
