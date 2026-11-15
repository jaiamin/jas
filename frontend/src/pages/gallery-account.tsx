import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Disclosure,
  DisclosureContent,
  DisclosureTrigger,
} from "@/components/disclosure";
import { Alert } from "@/components/feedback";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { date } from "@/lib/format";
import GalleryPage from "@/pages/gallery";

export default function GalleryAccount({
  loginOnly = false,
}: {
  loginOnly?: boolean;
}) {
  const [params] = useSearchParams();
  const code = params.get("user_code") ?? "";
  const client = useQueryClient();
  const identity = useQuery({
    queryKey: ["/gallery-identity"],
    queryFn: () => api<{ handle: string } | null>("/gallery-identity"),
    retry: false,
  });
  const tokens = useQuery({
    queryKey: ["/gallery-account/tokens"],
    queryFn: () =>
      api<{ id: string; label: string; created: string }[]>(
        "/gallery-account/tokens",
      ),
    enabled: !!identity.data && !identity.error && !loginOnly,
    retry: false,
  });
  const [approved, setApproved] = useState(false);
  const approve = useMutation({
    mutationFn: () =>
      api("/gallery-account/device-approval", { user_code: code }),
    onSuccess: () => setApproved(true),
  });
  const revoke = useMutation({
    mutationFn: (id: string) =>
      api(`/gallery-account/tokens/${id}`, undefined, "DELETE"),
    onSuccess: () => tokens.refetch(),
  });
  const logout = useMutation({
    mutationFn: () => api("/gallery-account/sign-out", {}),
    onSuccess: () => {
      client.setQueryData(["/gallery-identity"], null);
      client.removeQueries({ queryKey: ["/gallery-account/tokens"] });
      client.removeQueries({ queryKey: ["/gallery/mine"] });
    },
  });
  if (identity.isPending) return <Loading />;
  if (
    identity.error &&
    !(identity.error instanceof ApiError && identity.error.status === 401)
  )
    return <ErrorState error={identity.error} onRetry={identity.refetch} />;
  if (
    !identity.data ||
    (identity.error instanceof ApiError && identity.error.status === 401)
  )
    return (
      <>
        <PageHeading
          title="Sign in to publish"
          description="Reading and local experiments never need an account."
        />
        {code && (
          <p className="mb-4 text-sm">
            Confirm this code matches your local app:{" "}
            <strong className="font-mono">{code}</strong>.
          </p>
        )}
        <Button asChild>
          <a href={`/auth/github?${new URLSearchParams({ user_code: code })}`}>
            Continue with GitHub
          </a>
        </Button>
        <p className="mt-4 max-w-prose text-sm text-muted-foreground">
          Your GitHub account must be at least seven days old. JAS requests your
          public profile and stores no GitHub password. Signing in means
          accepting the{" "}
          <a href="/terms" className="underline underline-offset-4">
            gallery terms
          </a>
          .
        </p>
      </>
    );
  return (
    <>
      <PageHeading title={loginOnly ? "Authorize publishing" : "My published"}>
        <Button
          variant="outline"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          Sign out
        </Button>
      </PageHeading>
      {code && (
        <section className="mb-8 space-y-4">
          <p className="max-w-prose text-sm">
            Confirm code <strong className="font-mono">{code}</strong> matches
            the app or CLI you started. Approval allows it to publish and
            unpublish your experiments.
          </p>
          {approved ? (
            <p role="status">Approved. Return to JAS.</p>
          ) : (
            <Button
              onClick={() => approve.mutate()}
              disabled={approve.isPending}
            >
              Approve this device
            </Button>
          )}
          {approve.error && (
            <Alert variant="error">{approve.error.message}</Alert>
          )}
        </section>
      )}
      {!loginOnly && (
        <>
          <Disclosure className="mb-6">
            <DisclosureTrigger>Authorized devices</DisclosureTrigger>
            <DisclosureContent className="flex flex-col gap-4 pt-4">
              {tokens.error ? (
                <ErrorState error={tokens.error} onRetry={tokens.refetch} />
              ) : !tokens.data ? (
                <Loading />
              ) : !tokens.data.length ? (
                <p className="text-sm text-muted-foreground">
                  No active devices. Use Sign in with GitHub in the local app or
                  jas login.
                </p>
              ) : (
                tokens.data.map((token) => (
                  <div
                    key={token.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 text-sm"
                  >
                    <span>
                      {token.label} · {date(token.created)}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={revoke.isPending}
                      onClick={() => revoke.mutate(token.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                ))
              )}
              {revoke.error && (
                <Alert variant="error">{revoke.error.message}</Alert>
              )}
            </DisclosureContent>
          </Disclosure>
          <GalleryPage publicSurface mine />
        </>
      )}
    </>
  );
}
