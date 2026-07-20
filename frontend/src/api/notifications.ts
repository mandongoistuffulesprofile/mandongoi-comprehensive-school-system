import { api, requestInner } from "../lib/api";
import type { Notification } from "../types";

interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
}

export const notificationsApi = {
  list: async (unreadOnly = false): Promise<NotificationsResponse> => {
    const res = await requestInner<Notification[]>("/notifications", {
      method: "GET",
      query: { unreadOnly: unreadOnly ? "true" : undefined },
    });
    const body = res.body as any;
    return { data: body.data as Notification[], unreadCount: body.unreadCount ?? 0 };
  },
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
};
