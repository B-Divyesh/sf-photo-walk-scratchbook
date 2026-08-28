export type View = "prompt" | "contact" | "notes" | "sheet";
export type Tool = "pen" | "frame" | "arrow" | "text";

export interface Point { x: number; y: number; }

export interface Mark {
  id: string;
  tool: Tool;
  color: string;
  points: Point[];
  text?: string;
}

export interface PhotoRecord {
  id: string;
  name: string;
  type: string;
  blob: Blob;
  width: number;
  height: number;
  importedAt: string;
  chosen: boolean;
  framingNote: string;
  exposureNote: string;
  marks: Mark[];
}

export interface WalkSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  location: string;
  conditions: string;
  promptId: string;
  prompt: string;
  constraint: string;
  intention: string;
  reflection: string;
  cameraNotes: string;
  photos: PhotoRecord[];
}

export interface ScratchbookState {
  version: 1;
  sessions: WalkSession[];
  activeSessionId?: string;
  activeView: View;
}

export interface PromptCard {
  id: string;
  family: "attention" | "light" | "sequence" | "form" | "time";
  prompt: string;
  constraint: string;
  paid: boolean;
}

export interface LicenseState {
  token: string | null;
  valid: boolean;
  checking: boolean;
  reason?: string;
  lastChecked?: number;
}
