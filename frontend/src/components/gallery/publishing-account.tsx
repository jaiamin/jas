import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Alert } from "@/components/feedback";
import { Github } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { PublishingStatus } from "@/lib/publication";

export function usePublishingAccount() {
  return useQuery({
    queryKey: ["/publishing"],
    queryFn: () => api<PublishingStatus>("/publishing"),
    retry: false,
  });
}

export function PublishingAccount() {
  const status = usePublishingAccount();
  const client = useQueryClient();
  const login = useMutation({
    mutationFn: () =>
      api<{
        device_code: string;
        user_code: string;
        verification_uri: string;
        interval: number;
      }>("/publishing/login", {}),
  });
  const approval = useQuery({
    queryKey: ["gallery-device-approval", login.data?.user_code],
    queryFn: () =>
      api<{ status: string }>("/publishing/login/poll", {
        device_code: login.data?.device_code,
      }),
    enabled: !!login.data,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: (query) =>
      query.state.error || query.state.data?.status === "signed_in"
        ? false
        : Math.max(5000, (login.data?.interval ?? 5) * 1000),
  });
  const signedIn = approval.data?.status === "signed_in";
  const resetLogin = login.reset;
  useEffect(() => {
    if (!signedIn) return;
    client.invalidateQueries({ queryKey: ["/publishing"] });
    resetLogin();
  }, [client, resetLogin, signedIn]);
  const logout = useMutation({
    mutationFn: () => api("/publishing/sign-out", {}),
    onSuccess: () => {
      client.setQueryData<PublishingStatus>(["/publishing"], (previous) =>
        previous ? { ...previous, identity: null, error: null } : previous,
      );
      client.removeQueries({ queryKey: ["/community/mine"] });
      client.invalidateQueries({ queryKey: ["/publishing"] });
    },
  });
  const failure = status.error ?? login.error ?? approval.error ?? logout.error;
  return (
    <div className="flex flex-col items-start gap-3">
      {status.isPending ? (
        <Skeleton className="h-9 w-44" />
      ) : status.data?.identity ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            @{status.data.identity.handle}
          </span>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`${status.data.origin}/gallery/account`}
              target="_blank"
              rel="noreferrer"
            >
              Manage devices
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            Sign out
          </Button>
        </div>
      ) : login.data ? (
        <div className="flex max-w-prose flex-col gap-3 text-sm">
          <p>
            Confirm{" "}
            <strong className="font-mono">{login.data.user_code}</strong> at{" "}
            {new URL(login.data.verification_uri).host}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a
                href={login.data.verification_uri}
                target="_blank"
                rel="noreferrer"
              >
                Continue in browser
              </a>
            </Button>
            <Button variant="ghost" onClick={() => login.reset()}>
              Cancel
            </Button>
          </div>
          <p role="status" className="text-muted-foreground">
            {approval.error
              ? "Sign-in stopped. Cancel and try again."
              : "Waiting for approval. This page will update automatically."}
          </p>
        </div>
      ) : (
        <>
          <Button
            variant="outline"
            disabled={login.isPending || !!status.data?.error || !!status.error}
            onClick={() => login.mutate()}
          >
            <Github data-icon="inline-start" />
            Sign in with GitHub
          </Button>
          <p className="max-w-prose text-sm text-muted-foreground">
            Only needed to publish and manage your records. Local experiments
            and browsing need no account.
          </p>
        </>
      )}
      {(failure || status.data?.error) && (
        <Alert variant="error" title="Publishing unavailable">
          {failure?.message ?? status.data?.error}
          <Button variant="outline" size="sm" onClick={() => status.refetch()}>
            Try again
          </Button>
        </Alert>
      )}
    </div>
  );
}
