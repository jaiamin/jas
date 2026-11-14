import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/feedback";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api, useApi } from "@/lib/api";
import type { PublishingStatus } from "@/lib/publication";
import type { Settings } from "@/lib/types";

export function PublishingSettings({ settings }: { settings: Settings }) {
  const status = useApi<PublishingStatus>("/publishing");
  const client = useQueryClient();
  const [url, setUrl] = useState(settings.preferences.gallery_url ?? "");
  const [visibility, setVisibility] = useState(
    settings.preferences.default_visibility,
  );
  const [notice, setNotice] = useState("");
  const save = useMutation({
    mutationFn: () =>
      api(
        "/settings",
        {
          preferences: {
            gallery_url: url || null,
            default_visibility: visibility,
          },
        },
        "PUT",
      ),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["/settings"] });
      status.refetch();
      setNotice("Gallery connection saved.");
    },
  });
  const login = useMutation({
    mutationFn: () =>
      api<{ device_code: string; user_code: string; verification_uri: string }>(
        "/publishing/login",
        {},
      ),
  });
  const poll = useMutation({
    mutationFn: () =>
      api<{ status: string }>("/publishing/login/poll", {
        device_code: login.data?.device_code,
      }),
    onSuccess: (result) => {
      if (result.status === "signed_in") {
        status.refetch();
        setNotice(
          "Signed in. Your publish token is stored in the OS keychain.",
        );
        login.reset();
      } else
        setNotice(
          "Approval is pending. Complete it in the gallery, then check again.",
        );
    },
  });
  const logout = useMutation({
    mutationFn: () => api("/publishing/sign-out", {}),
    onSuccess: () => {
      status.refetch();
      setNotice("Signed out on this machine.");
    },
  });
  const failure =
    save.error ?? login.error ?? poll.error ?? logout.error ?? status.error;
  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
        className="flex flex-col gap-3"
      >
        <Field>
          <FieldLabel htmlFor="gallery-url">Gallery URL</FieldLabel>
          <Input
            id="gallery-url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder={status.data?.origin ?? "http://127.0.0.1:8081"}
          />
          <FieldDescription>
            The gallery is separate from this private workspace. Provider keys
            never go there.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Default visibility</FieldLabel>
          <RadioGroup
            value={visibility}
            onValueChange={(value) =>
              setVisibility(value as "public" | "unlisted")
            }
            className="flex flex-wrap gap-x-6 gap-y-3"
          >
            <label
              className="flex items-center gap-2 text-sm"
              htmlFor="visibility-unlisted"
            >
              <RadioGroupItem id="visibility-unlisted" value="unlisted" />
              Unlisted
            </label>
            <label
              className="flex items-center gap-2 text-sm"
              htmlFor="visibility-public"
            >
              <RadioGroupItem id="visibility-public" value="public" />
              Public
            </label>
          </RadioGroup>
          <FieldDescription>
            Unlisted pages are accessible to anyone with the link. Public pages
            also appear in the gallery.
          </FieldDescription>
        </Field>
        <div>
          <Button variant="outline" disabled={save.isPending}>
            Save gallery connection
          </Button>
        </div>
      </form>
      {status.data?.identity ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">Signed in as @{status.data.identity.handle}</p>
          <Button
            size="sm"
            variant="outline"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            Sign out
          </Button>
          <a
            href={`${status.data.origin}/gallery/account`}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline"
          >
            Manage or revoke tokens
          </a>
        </div>
      ) : (
        <div>
          <Button
            disabled={login.isPending || !!status.data?.error}
            onClick={() => {
              setNotice("");
              login.mutate();
            }}
          >
            Sign in with GitHub
          </Button>
        </div>
      )}
      {login.data && (
        <div className="space-y-3 rounded-lg border p-4 text-sm">
          <p>
            Confirm code{" "}
            <strong className="font-mono">{login.data.user_code}</strong> in the
            gallery.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a
                href={login.data.verification_uri}
                target="_blank"
                rel="noreferrer"
              >
                Open GitHub sign-in
              </a>
            </Button>
            <Button
              variant="outline"
              disabled={poll.isPending}
              onClick={() => poll.mutate()}
            >
              Check approval
            </Button>
          </div>
        </div>
      )}
      {(failure || status.data?.error) && (
        <Alert variant="error">{failure?.message ?? status.data?.error}</Alert>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        An account is only needed to publish. Publish tokens can publish and
        unpublish your records; revoke them from your gallery account.
      </p>
    </div>
  );
}
