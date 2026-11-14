import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert } from "@/components/feedback";
import { ErrorState, Loading, PageHeading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { api, useApi } from "@/lib/api";
import { date } from "@/lib/format";
import GalleryPage from "@/pages/gallery";

export default function GalleryAccount({
  loginOnly = false,
}: {
  loginOnly?: boolean;
}) {
  const [params] = useSearchParams();
  const code = params.get("user_code") ?? "";
  const identity = useApi<{ handle: string }>("/gallery-identity");
  const tokens = useApi<{ id: string; label: string; created: string }[]>(
    "/gallery-account/tokens",
  );
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
      identity.refetch();
      tokens.refetch();
    },
  });
  if (!identity.data)
    return (
      <>
        <PageHeading
          title="Publish with your GitHub identity"
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
          accepting the gallery terms.
        </p>
      </>
    );
  return (
    <>
      <PageHeading
        title={
          loginOnly
            ? "Connect your local workspace"
            : `@${identity.data.handle}`
        }
      >
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
            <p role="status">Approved. Return to JAS and check approval.</p>
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
          <section className="mb-10 space-y-4">
            <h2 className="text-lg font-semibold">Publish tokens</h2>
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
          </section>
          <GalleryPage publicSurface mine />
        </>
      )}
    </>
  );
}
