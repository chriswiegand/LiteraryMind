import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertBook, type Book } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useBooks(status?: 'read' | 'reading' | 'want_to_read', search?: string) {
  return useQuery({
    queryKey: [api.books.list.path, status, search],
    queryFn: async () => {
      const url = buildUrl(api.books.list.path);
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (search) params.append("search", search);
      
      const res = await fetch(`${url}?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch books");
      return api.books.list.responses[200].parse(await res.json());
    },
  });
}

export function useBook(id: number) {
  return useQuery({
    queryKey: [api.books.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.books.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch book");
      return api.books.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertBook) => {
      const res = await fetch(api.books.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create book");
      return api.books.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
      toast({ title: "Book added", description: "Successfully added to your library." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add book.", variant: "destructive" });
    }
  });
}

export function useUpdateBook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertBook>) => {
      const url = buildUrl(api.books.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update book");
      return api.books.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.books.get.path, data.id] });
      toast({ title: "Book updated", description: "Changes saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update book.", variant: "destructive" });
    }
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.books.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete book");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
      toast({ title: "Book removed", description: "Removed from your library." });
    },
  });
}

export function useGenerateSummary(bookId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (length: "short" | "medium" | "detailed" = "medium") => {
      const url = buildUrl(api.books.generateSummary.path, { id: bookId });
      const res = await fetch(url, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ length }),
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to generate summary");
      return api.books.generateSummary.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.books.get.path, bookId] });
      toast({ title: "Summary Ready", description: "AI has generated a summary for you." });
    },
  });
}
