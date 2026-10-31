import type { Verb } from "./types";

export const VERBS: { id: Verb; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "close", label: "Close" },
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "walk", label: "Walk to" },
  { id: "pickup", label: "Pick up" },
  { id: "use", label: "Use" },
  { id: "give", label: "Give" },
  { id: "talk", label: "Talk to" },
  { id: "look", label: "Examine" },
];

export const VERB_LABEL: Record<Verb, string> = Object.fromEntries(
  VERBS.map((verb) => [verb.id, verb.label]),
) as Record<Verb, string>;

export const DEFAULT_QUIPS: Record<Verb, string> = {
  walk: "Märmu is already standing around.",
  look: "Märmu sees nothing unusual.",
  open: "It doesn't open.",
  close: "It doesn't close.",
  push: "Märmu gives it a shove. Nothing happens.",
  pull: "Märmu pulls. It stays put.",
  use: "Märmu can't think of a use for that.",
  pickup: "Märmu doesn't need to carry that.",
  give: "There is nobody to give that to.",
  talk: "There is no answer. Mountains are like that.",
};

export function commandLine(verb: Verb, name: string): string {
  return `${VERB_LABEL[verb]} ${name}`;
}
