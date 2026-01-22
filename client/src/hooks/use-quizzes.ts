import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useGenerateQuiz(bookId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ difficulty }: { difficulty?: string } = {}) => {
      const url = buildUrl(api.books.generateQuiz.path, { id: bookId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to generate quiz");
      return api.books.generateQuiz.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      toast({ title: "Quiz Ready", description: "Test your knowledge now!" });
      queryClient.invalidateQueries({ queryKey: [api.quizzes.get.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/quizzes"] });
    },
  });
}

export function useQuiz(id: number) {
  return useQuery({
    queryKey: [api.quizzes.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.quizzes.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch quiz");
      return api.quizzes.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useSubmitQuiz() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, answers }: { id: number; answers: (number | number[])[] }) => {
      const url = buildUrl(api.quizzes.submit.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to submit quiz");
      return api.quizzes.submit.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.quizzes.get.path, data.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/quizzes"] });
      toast({ 
        title: "Quiz Submitted!", 
        description: `You scored ${(data.score ?? 0) * 20}%`,
        variant: data.score !== null && data.score >= 4 ? "default" : "destructive"
      });
    },
  });
}
