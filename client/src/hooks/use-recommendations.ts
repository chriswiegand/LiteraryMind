import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useRecommendations() {
  return useQuery({
    queryKey: [api.recommendations.list.path],
    queryFn: async () => {
      const res = await fetch(api.recommendations.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return api.recommendations.list.responses[200].parse(await res.json());
    },
  });
}

export function useGenerateRecommendations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.recommendations.generate.path, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("Failed to generate recommendations");
      return api.recommendations.generate.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.recommendations.list.path] });
      toast({ title: "New Recommendations", description: "Based on your recent reading history." });
    },
  });
}
