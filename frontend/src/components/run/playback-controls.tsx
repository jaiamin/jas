import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
} from "@/components/icons";
import { OptionSelect } from "@/components/option-select";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { KeyMoment } from "@/lib/types";

export function PlaybackControls({
  turn,
  maxTurn,
  ready = true,
  moments = [],
  onTurn,
  copyLink = true,
}: {
  turn: number;
  maxTurn: number;
  ready?: boolean;
  moments?: KeyMoment[];
  onTurn: (turn: number) => void;
  copyLink?: boolean;
}) {
  const [end, setEnd] = useState<number | null>(null);
  const [speed, setSpeed] = useState("1");
  const [copiedTurn, setCopiedTurn] = useState<number | null>(null);
  const [copyError, setCopyError] = useState("");
  const playing = end !== null && turn < end;
  function select(value: number) {
    setEnd(null);
    onTurn(Math.max(0, Math.min(maxTurn, value)));
  }
  function toggle() {
    if (playing) setEnd(null);
    else {
      if (turn >= maxTurn) onTurn(0);
      setEnd(maxTurn);
    }
  }
  useEffect(() => {
    if (!playing || !ready || document.hidden) return;
    const timer = window.setTimeout(
      () => onTurn(turn + 1),
      900 / Number(speed),
    );
    return () => window.clearTimeout(timer);
  }, [playing, ready, turn, speed, onTurn]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setEnd(null);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  useEffect(() => {
    function key(event: KeyboardEvent) {
      const target = event.target;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (target instanceof Element &&
          target.closest(
            "input,textarea,select,a,[role=dialog],[role=slider],[role=combobox],[contenteditable=true]",
          ))
      )
        return;
      if (event.code === "Space" && maxTurn) {
        if (target instanceof Element && target.closest("button")) return;
        event.preventDefault();
        toggle();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        select(turn - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        select(turn + 1);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  return (
    <section
      aria-label="Recorded playback"
      className="flex min-w-0 flex-col gap-3 border-t pt-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-pressed={playing}
          disabled={!maxTurn}
          onClick={toggle}
        >
          {playing ? (
            <Pause data-icon="inline-start" />
          ) : (
            <Play data-icon="inline-start" />
          )}
          {playing ? "Pause recording" : "Play recording"}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous recorded turn"
          disabled={!turn}
          onClick={() => select(turn - 1)}
        >
          <ChevronLeft />
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          Turn {turn} / {maxTurn}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next recorded turn"
          disabled={turn >= maxTurn}
          onClick={() => select(turn + 1)}
        >
          <ChevronRight />
        </Button>
        <OptionSelect
          label="Playback speed"
          value={speed}
          onValueChange={setSpeed}
          options={["1", "2", "4"].map((value) => ({
            value,
            label: `${value}×`,
          }))}
          className="w-18"
        />
        {copyLink && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={async () => {
              setCopyError("");
              const url = new URL(window.location.href);
              url.searchParams.set("turn", String(turn));
              try {
                await navigator.clipboard.writeText(url.href);
                setCopiedTurn(turn);
              } catch {
                setCopyError("Copy the address bar to share this moment.");
              }
            }}
          >
            {copiedTurn === turn ? (
              <>
                <Check /> Link copied
              </>
            ) : (
              "Copy link to this moment"
            )}
          </Button>
        )}
      </div>
      <Slider
        aria-label="Recorded turn"
        min={0}
        max={Math.max(1, maxTurn)}
        disabled={!maxTurn}
        step={1}
        value={[turn]}
        onValueChange={([value]) => select(value)}
      />
      {maxTurn > 0 && (
        <div
          aria-hidden="true"
          className="mx-2 h-1 border-r"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px)",
            backgroundSize: `${100 / maxTurn}% 100%`,
          }}
        />
      )}
      {moments.length > 0 && (
        <section aria-label="Key moments" className="flex flex-wrap gap-2">
          {moments.map((moment) => (
            <Button
              key={`${moment.kind}-${moment.turn}`}
              variant="outline"
              size="sm"
              onClick={() => select(moment.turn)}
            >
              {moment.title} · {moment.turn}
            </Button>
          ))}
        </section>
      )}
      <p className="text-xs text-muted-foreground">
        Saved turns · no model calls. Space to play, ← → to step.
      </p>
      {copyError && (
        <p role="status" className="text-xs text-muted-foreground">
          {copyError}
        </p>
      )}
    </section>
  );
}
