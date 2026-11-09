import type { ReactNode } from "react";
import { Alert } from "@/components/feedback";
import { Star } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { useRecordFavorites } from "@/hooks/use-record-favorites";
import type { RecordFilters } from "@/hooks/use-record-filters";

type Favorites = ReturnType<typeof useRecordFavorites>;

export function RecordListView({
  filters,
  favorites,
  noun,
  children,
}: {
  filters: RecordFilters;
  favorites: Favorites;
  noun: string;
  children: ReactNode;
}) {
  return (
    <Tabs
      value={filters.view}
      className="min-w-0 gap-0"
      onValueChange={(value) => {
        if (value === "all" || value === "favorites") filters.setView(value);
      }}
    >
      <div className="px-4 py-2 sm:px-6 lg:px-8">
        <TabsList aria-label={`View ${noun}`}>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="favorites" disabled={!favorites.available}>
            Favorites
          </TabsTrigger>
        </TabsList>
        {favorites.error && (
          <Alert variant="error">
            {favorites.error}{" "}
            <Button variant="outline" size="sm" onClick={favorites.retry}>
              Retry favorites
            </Button>
          </Alert>
        )}
      </div>
      <Separator />
      <TabsContent value={filters.view} className="min-w-0">
        {children}
      </TabsContent>
    </Tabs>
  );
}

export function FavoriteButton({
  id,
  name,
  favorites,
}: {
  id: string;
  name: string;
  favorites: Favorites;
}) {
  const favorite = favorites.ids.has(id);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      disabled={!favorites.available}
      aria-pressed={favorite}
      aria-label={`${favorite ? "Remove" : "Add"} ${name} ${favorite ? "from" : "to"} favorites`}
      onClick={() => favorites.toggle(id)}
    >
      <Star
        fill={favorite ? "currentColor" : "none"}
        data-favorite={favorite}
        className="data-[favorite=true]:text-primary"
      />
    </Button>
  );
}
