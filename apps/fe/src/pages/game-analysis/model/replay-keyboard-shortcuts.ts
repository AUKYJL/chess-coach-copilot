const REPLAY_NAVIGATION_KEYS = {
  start: new Set(["ArrowUp", "Home", "0"]),
  end: new Set(["ArrowDown", "End", "$"]),
  previous: new Set(["ArrowLeft", "k"]),
  next: new Set(["ArrowRight", "j"]),
} as const;

export type ReplayNavigationAction = "end" | "next" | "previous" | "start";

export function getReplayNavigationAction(
  event: KeyboardEvent,
): ReplayNavigationAction | null {
  const navigationKey =
    event.key.length === 1 ? event.key.toLowerCase() : event.key;

  if (REPLAY_NAVIGATION_KEYS.start.has(navigationKey)) {
    return "start";
  }

  if (REPLAY_NAVIGATION_KEYS.end.has(navigationKey)) {
    return "end";
  }

  if (REPLAY_NAVIGATION_KEYS.previous.has(navigationKey)) {
    return "previous";
  }

  if (REPLAY_NAVIGATION_KEYS.next.has(navigationKey)) {
    return "next";
  }

  return null;
}
