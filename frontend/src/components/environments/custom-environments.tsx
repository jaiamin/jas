import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { EnvironmentMark } from "@/components/environments/environment-mark";
import { Alert, Empty } from "@/components/feedback";
import { Ellipsis, PenLine, Trash2 } from "@/components/icons";
import { ErrorState } from "@/components/shared";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api, useApi } from "@/lib/api";
import { label } from "@/lib/format";
import type { Environment, SavedEnvironment } from "@/lib/types";

export function CustomEnvironments({
  search,
  environments,
  onClearSearch,
}: {
  search: string;
  environments: Environment[];
  onClearSearch: () => void;
}) {
  const client = useQueryClient();
  const setups = useApi<SavedEnvironment[]>("/environments");
  const [pendingRemoval, setPendingRemoval] = useState<SavedEnvironment | null>(
    null,
  );
  const query = search.trim().toLowerCase();
  const visibleSetups =
    setups.data?.filter((item) =>
      `${item.design.title} ${environments.find((env) => env.key === item.design.environment)?.name ?? label(item.design.environment)}`
        .toLowerCase()
        .includes(query),
    ) ?? [];
  const remove = useMutation({
    mutationFn: (record: SavedEnvironment) =>
      api(
        `/environments/${record.id}?revision=${record.revision}`,
        undefined,
        "DELETE",
      ),
    onSuccess: () => {
      setPendingRemoval(null);
      void client.invalidateQueries({ queryKey: ["/environments"] });
    },
  });
  return (
    <>
      {setups.error && (
        <ErrorState error={setups.error} onRetry={setups.refetch} />
      )}
      {!setups.data && !setups.error ? (
        <div
          role="status"
          aria-label="Loading custom environments"
          aria-busy="true"
          className="flex flex-col gap-4"
        >
          {["a", "b", "c"].map((id) => (
            <div
              key={id}
              aria-hidden="true"
              className="flex items-center gap-3 py-3"
            >
              <Skeleton className="size-12 shrink-0 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="size-6" />
            </div>
          ))}
        </div>
      ) : setups.data && visibleSetups.length > 0 ? (
        <ItemGroup className="gap-0">
          {visibleSetups.map((item) => (
            <Fragment key={item.id}>
              <Item>
                <ItemMedia>
                  <EnvironmentMark environment={item.design.environment} />
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle className="max-w-full">
                    <Link
                      className="truncate hover:underline"
                      to={`/new?setup=${item.id}&step=conditions`}
                    >
                      {item.design.title}
                    </Link>
                  </ItemTitle>
                  <ItemDescription>
                    {environments.find(
                      (env) => env.key === item.design.environment,
                    )?.name ?? label(item.design.environment)}{" "}
                    · Revision {item.revision}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        className="text-muted-foreground"
                        aria-label={`Actions for ${item.design.title}`}
                      >
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem asChild>
                          <Link to={`/new?setup=${item.id}&step=conditions`}>
                            <PenLine />
                            Edit and reuse
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            remove.reset();
                            setPendingRemoval(item);
                          }}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </ItemActions>
              </Item>
              <Separator />
            </Fragment>
          ))}
        </ItemGroup>
      ) : setups.data ? (
        <Empty
          title={
            query
              ? "No matching custom environments"
              : "No custom environments yet"
          }
          description={
            query
              ? undefined
              : "Save a setup from the experiment editor to reuse it here."
          }
        >
          {query && (
            <Button variant="outline" onClick={onClearSearch}>
              Clear search
            </Button>
          )}
        </Empty>
      ) : null}{" "}
      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setPendingRemoval(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{pendingRemoval?.design.title}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the custom environment from your workspace library.
              Saved experiments keep their own rules and evidence.
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
                if (pendingRemoval) remove.mutate(pendingRemoval);
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete environment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
