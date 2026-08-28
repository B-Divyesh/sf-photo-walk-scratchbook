import { describe, expect, it } from "vitest";
import { FREE_PROMPTS, FULL_PROMPTS, nextPrompt, promptById } from "../../src/data";
import { containBox } from "../../src/annotation";
import { readBackup } from "../../src/storage";

describe("prompt deck", () => {
  it("keeps a useful free deck and a larger paid deck", () => {
    expect(FREE_PROMPTS).toHaveLength(6);
    expect(FULL_PROMPTS.length).toBeGreaterThan(FREE_PROMPTS.length);
    expect(FREE_PROMPTS.every((prompt) => !prompt.paid)).toBe(true);
  });

  it("cycles only through the available deck", () => {
    expect(nextPrompt(FREE_PROMPTS.at(-1)!.id, false)).toEqual(FREE_PROMPTS[0]);
    expect(nextPrompt(FULL_PROMPTS.at(-1)!.id, true)).toEqual(FULL_PROMPTS[0]);
    expect(promptById("missing")).toEqual(FREE_PROMPTS[0]);
  });
});

describe("annotation geometry", () => {
  it("letterboxes landscape images without distortion", () => {
    expect(containBox(1200, 800, 600, 600)).toEqual({ x: 0, y: 100, width: 600, height: 400 });
  });
});

describe("portable backup", () => {
  it("recreates local image blobs from a versioned backup", () => {
    const state = readBackup({
      version: 1,
      activeView: "contact",
      sessions: [{
        id: "walk-1", title: "Test walk", createdAt: "2026-08-28T00:00:00.000Z", updatedAt: "2026-08-28T00:00:00.000Z",
        location: "", conditions: "", promptId: "edge-light", prompt: "Follow the edge of light.", constraint: "Test",
        intention: "", reflection: "", cameraNotes: "",
        photos: [{ id: "photo-1", name: "test.png", type: "image/png", width: 1, height: 1, importedAt: "2026-08-28T00:00:00.000Z", chosen: false, framingNote: "", exposureNote: "", marks: [], dataUrl: "data:image/png;base64,iVBORw0KGgo=" }]
      }]
    });
    expect(state.sessions[0].photos[0].blob).toBeInstanceOf(Blob);
    expect(state.activeView).toBe("contact");
  });
});
