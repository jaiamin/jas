import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { chatProgress } from "@/lib/chat-progress";
import type { Analysis } from "@/lib/types";

export function useAgentChat(chatId: string | null) {
  const path = `/chats/${chatId}`;
  const chat = useQuery({
    queryKey: [path],
    queryFn: () => api<Analysis[]>(path),
    enabled: !!chatId,
    refetchInterval: 1500,
  });
  const client = useQueryClient();
  const pending = chat.data?.find(
    (message) => message.status === "pending",
  )?.id;
  useEffect(() => {
    if (!chatId || !pending) return;
    const stream = new EventSource(`/api/chats/${chatId}/events`);
    stream.onmessage = (event) => {
      const update = chatProgress(event.data, pending);
      if (!update) {
        stream.close();
        return;
      }
      if (update.status !== "pending") {
        stream.close();
        client.invalidateQueries({ queryKey: [`/chats/${chatId}`] });
        client.invalidateQueries({ queryKey: ["/chats"] });
        return;
      }
      client.setQueryData<Analysis[]>([`/chats/${chatId}`], (messages) =>
        messages?.map((message) =>
          message.id === pending && message.status === "pending"
            ? {
                ...message,
                purpose: update.purpose,
                output: {
                  ...(update.purpose !== message.purpose ? {} : message.output),
                  partial: update.partial,
                  introduction: update.introduction,
                  stage: update.stage,
                  ...(update.activity ? { activity: update.activity } : {}),
                  ...(update.research ? { research: update.research } : {}),
                },
              }
            : message,
        ),
      );
    };
    // Polling keeps an interrupted connection recoverable without resubmitting a request.
    stream.onerror = () => stream.close();
    return () => stream.close();
  }, [chatId, pending, client]);
  return chat;
}
