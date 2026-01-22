import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api, buildUrl } from "@shared/routes";
import type { Notification } from "@shared/schema";

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: [api.notifications.list.path],
    queryFn: async () => {
      const res = await fetch(api.notifications.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
  });
}

export function useUnreadNotificationCount() {
  return useQuery<{ count: number }>({
    queryKey: [api.notifications.unreadCount.path],
    queryFn: async () => {
      const res = await fetch(api.notifications.unreadCount.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch unread count");
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", buildUrl(api.notifications.markRead.path, { id }));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.notifications.unreadCount.path] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", api.notifications.markAllRead.path);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.notifications.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.notifications.unreadCount.path] });
    },
  });
}
