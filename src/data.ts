import type { PromptCard, ScratchbookState } from "./types";

export const FREE_PROMPTS: PromptCard[] = [
  { id: "edge-light", family: "light", prompt: "Follow the edge of light.", constraint: "Make 8 frames where light and shade meet. Do not photograph the light source.", paid: false },
  { id: "one-color", family: "attention", prompt: "Collect one quiet color.", constraint: "Choose a color before you leave. Let it occupy less than a third of every frame.", paid: false },
  { id: "near-far", family: "form", prompt: "Make distance visible.", constraint: "Put a near shape and a far subject in the same frame. Keep both deliberate.", paid: false },
  { id: "three-steps", family: "sequence", prompt: "Tell a place in three steps.", constraint: "Make an arrival, a detail, and a departure. Stop after those three pictures.", paid: false },
  { id: "wait-change", family: "time", prompt: "Wait for one thing to change.", constraint: "Choose the frame first. Stay until gesture, shadow, or weather completes it.", paid: false },
  { id: "without-center", family: "form", prompt: "Let the center stay quiet.", constraint: "Make 6 frames with the visual weight away from the middle.", paid: false }
];

export const FULL_PROMPTS: PromptCard[] = [
  ...FREE_PROMPTS,
  { id: "reflections", family: "light", prompt: "Photograph the world twice.", constraint: "Use reflections without making a self-portrait. Include the reflecting surface as evidence.", paid: true },
  { id: "same-height", family: "attention", prompt: "See from one height.", constraint: "Keep the camera at one chosen height for the whole walk. Move your body, not the height.", paid: true },
  { id: "five-lines", family: "form", prompt: "Find five kinds of line.", constraint: "Make one frame each for a boundary, a path, a shadow, a gesture, and an interruption.", paid: true },
  { id: "before-after", family: "sequence", prompt: "Photograph before and after.", constraint: "Find 3 small events. Make one frame before each event resolves and one immediately after.", paid: true },
  { id: "borrowed-frame", family: "form", prompt: "Build a frame inside the frame.", constraint: "Use openings, gaps, or overlapping objects. Avoid doors and windows for the first 5 frames.", paid: true },
  { id: "slow-shutter", family: "time", prompt: "Let motion write the mark.", constraint: "Use a slower shutter than feels safe. Note the shutter speed and what you wanted to remain legible.", paid: true },
  { id: "negative-shape", family: "attention", prompt: "Photograph what is between things.", constraint: "Name the empty shape before pressing the shutter. Make the negative space the subject.", paid: true },
  { id: "one-lens", family: "attention", prompt: "Learn one angle of view.", constraint: "Use one lens or focal length. Take three steps before considering any crop.", paid: true },
  { id: "weather-evidence", family: "time", prompt: "Show the weather without showing the sky.", constraint: "Use surfaces, posture, movement, or light as evidence. Make a sequence of 4.", paid: true }
];

export const EMPTY_STATE: ScratchbookState = {
  version: 1,
  sessions: [],
  activeView: "prompt"
};

export function promptById(id: string): PromptCard {
  return FULL_PROMPTS.find((prompt) => prompt.id === id) ?? FREE_PROMPTS[0];
}

export function nextPrompt(currentId: string, paid: boolean): PromptCard {
  const deck = paid ? FULL_PROMPTS : FREE_PROMPTS;
  const currentIndex = deck.findIndex((prompt) => prompt.id === currentId);
  return deck[(currentIndex + 1 + deck.length) % deck.length];
}
