import { useEffect, useState } from "react";

export type FavoriteKind = "studies" | "runs";

function readFavorites(kind: FavoriteKind) {
  const prefix = `jas:favorite:${kind}:`;
  return new Set(
    Object.keys(localStorage)
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length)),
  );
}

function readFavoriteState(kind: FavoriteKind) {
  try {
    return { ids: readFavorites(kind), available: true, error: "" };
  } catch {
    return {
      ids: new Set<string>(),
      available: false,
      error: "Favorites could not be loaded from browser storage.",
    };
  }
}

export function useRecordFavorites(kind: FavoriteKind) {
  const [state, setState] = useState(() => readFavoriteState(kind));
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === null || event.key.startsWith(`jas:favorite:${kind}:`))
        setState(readFavoriteState(kind));
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [kind]);
  function save(ids: readonly string[], favorite?: boolean) {
    try {
      for (const id of ids) {
        const key = `jas:favorite:${kind}:${id}`;
        if (favorite ?? localStorage.getItem(key) === null)
          localStorage.setItem(key, "true");
        else localStorage.removeItem(key);
      }
      setState(readFavoriteState(kind));
    } catch {
      // A batch can fail after some writes. Reflect the persisted subset and
      // retain an actionable error rather than claiming the whole batch saved.
      setState((current) => {
        let ids = current.ids;
        try {
          ids = readFavorites(kind);
        } catch {
          // Keep the known state if storage itself has become unreadable.
        }
        return {
          ...current,
          ids,
          error: "The favorite could not be saved. Try again.",
        };
      });
    }
  }
  return {
    ...state,
    retry: () => setState(readFavoriteState(kind)),
    toggle: (id: string) => save([id]),
    setMany: (ids: readonly string[], favorite: boolean) => save(ids, favorite),
  };
}
