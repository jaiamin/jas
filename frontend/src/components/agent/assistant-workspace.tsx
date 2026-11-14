import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useLocation } from "react-router-dom";

export type AssistantPageContext = {
  context: string;
  title: string;
  revision: number;
  throughTurn?: number;
};

type RegisteredContext = AssistantPageContext & { locationKey: string };
const AssistantWorkspace = createContext<{
  pageContext: AssistantPageContext | null;
  setPageContext: React.Dispatch<
    React.SetStateAction<RegisteredContext | null>
  >;
} | null>(null);

export function AssistantWorkspaceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const location = useLocation();
  const [registered, setPageContext] = useState<RegisteredContext | null>(null);
  return (
    <AssistantWorkspace.Provider
      value={{
        pageContext:
          registered?.locationKey === location.key ? registered : null,
        setPageContext,
      }}
    >
      {children}
    </AssistantWorkspace.Provider>
  );
}

export function useWorkspaceAssistant() {
  const value = useContext(AssistantWorkspace);
  if (!value) throw new Error("Assistant requires the workspace provider");
  return value;
}

// Pages register the actual displayed revision/cutoff, never an inferred latest record.
export function useAssistantPageContext(value: AssistantPageContext | null) {
  const { setPageContext } = useWorkspaceAssistant();
  const { key: locationKey } = useLocation();
  const context = value?.context;
  const title = value?.title;
  const revision = value?.revision;
  const throughTurn = value?.throughTurn;
  useEffect(() => {
    if (!context || title === undefined || revision === undefined) return;
    setPageContext({ context, title, revision, throughTurn, locationKey });
    return () =>
      setPageContext((current) =>
        current?.locationKey === locationKey ? null : current,
      );
  }, [context, title, revision, throughTurn, locationKey, setPageContext]);
}

export type AssistantSession = {
  slot: string;
  chatId: string | null;
  draftId: string;
};

export function recordAssistantChat(
  client: import("@tanstack/react-query").QueryClient,
  session: AssistantSession,
  chatId: string,
) {
  const storageKey = `jas:assistant-panel:${session.slot}`;
  const key = ["assistant-panel-chat", storageKey];
  const current = client.getQueryData<Omit<AssistantSession, "slot">>(key);
  if (current?.draftId !== session.draftId || current.chatId !== session.chatId)
    return;
  client.setQueryData(key, { chatId, draftId: session.draftId });
  localStorage.setItem(storageKey, chatId);
}
