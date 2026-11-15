import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/feedback";
import { ShieldCheck } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, invalidateResources } from "@/lib/api";
import { label } from "@/lib/format";
import type { PublicationCard } from "@/lib/publication";

const publishedDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function GallerySkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading gallery"
      aria-busy="true"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
    >
      {[0, 1, 2].map((id) => (
        <Card key={id}>
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-3 h-4 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Publication({
  card,
  mine,
  publicSurface,
}: {
  card: PublicationCard;
  mine: boolean;
  publicSurface: boolean;
}) {
  const client = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const remove = useMutation({
    mutationFn: () =>
      api(
        `${publicSurface ? "/gallery" : "/community"}/${encodeURIComponent(card.author)}/${encodeURIComponent(card.slug)}?version=${card.version}`,
        undefined,
        "DELETE",
      ),
    onSuccess: () => {
      setConfirm(false);
      invalidateResources(client, [
        "/community",
        "/community/mine",
        "/community/filters",
        "/gallery",
        "/gallery/mine",
        "/gallery/filters",
      ]);
    },
  });
  return (
    <Card className="min-w-0 transition-colors hover:bg-muted/30">
      <a
        href={card.url}
        className="flex min-w-0 flex-1 flex-col gap-4 rounded-t-xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <CardHeader>
          <CardTitle>
            <h2 className="line-clamp-2 break-words">{card.title}</h2>
          </CardTitle>
          <CardDescription className="line-clamp-3 break-words">
            {card.finding}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{label(card.world)}</Badge>
            {card.verified && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Replay verified
              </span>
            )}
          </div>
          <p className="line-clamp-2 break-words text-xs text-muted-foreground">
            {card.models.length ? card.models.join(", ") : "Scripted control"}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">@{card.author}</span>
            <span>
              {card.fork_count} {card.fork_count === 1 ? "fork" : "forks"} ·{" "}
              {publishedDate.format(new Date(card.created))}
            </span>
          </div>
        </CardContent>
      </a>
      {mine && (
        <CardFooter className="flex flex-wrap justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            v{card.version} · {label(card.visibility)}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(card.url);
                  setNotice("Link copied.");
                } catch {
                  setNotice("Could not copy. Open the record to copy its URL.");
                }
              }}
            >
              Copy link
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
              Unpublish
            </Button>
          </div>
          {notice && (
            <p role="status" className="w-full text-xs text-muted-foreground">
              {notice}
            </p>
          )}
        </CardFooter>
      )}
      <AlertDialog
        open={confirm}
        onOpenChange={(open) => {
          if (!remove.isPending) setConfirm(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unpublish this version?</AlertDialogTitle>
            <AlertDialogDescription>
              “{card.title}” will no longer be served by the gallery. Copies
              already downloaded cannot be recalled. Your local experiment stays
              here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {remove.error && (
            <Alert variant="error">{remove.error.message}</Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                remove.mutate();
              }}
            >
              {remove.isPending ? "Unpublishing…" : "Unpublish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export function GalleryCards({
  cards,
  mine = false,
  publicSurface = false,
}: {
  cards: PublicationCard[];
  mine?: boolean;
  publicSurface?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Publication
          key={card.id}
          card={card}
          mine={mine}
          publicSurface={publicSurface}
        />
      ))}
    </div>
  );
}
