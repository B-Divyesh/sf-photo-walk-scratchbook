import { drawMarks } from "./annotation";
import type { PhotoRecord, WalkSession } from "./types";

function loadBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 4): number {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let lines = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, y + lines * lineHeight);
      line = word;
      lines += 1;
      if (lines >= maxLines) return y + lines * lineHeight;
    } else line = candidate;
  }
  if (line && lines < maxLines) { context.fillText(line, x, y + lines * lineHeight); lines += 1; }
  return y + lines * lineHeight;
}

async function drawPhoto(context: CanvasRenderingContext2D, photo: PhotoRecord, x: number, y: number, width: number, height: number): Promise<void> {
  const bitmap = await loadBitmap(photo.blob);
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (bitmap.width - sourceWidth) / 2;
  const sourceY = (bitmap.height - sourceHeight) / 2;
  context.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  bitmap.close();
  drawMarks(context, photo.marks, { x, y, width, height });
  context.strokeStyle = "#244c3a";
  context.lineWidth = 3;
  context.strokeRect(x, y, width, height);
}

export async function createSessionSheet(session: WalkSession): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 2260;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw the session sheet.");
  context.fillStyle = "#f3eedc";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#244c3a";
  context.font = "700 36px system-ui, sans-serif";
  context.fillText("PHOTO WALK SCRATCHBOOK", 100, 120);
  context.font = "700 92px Georgia, serif";
  const titleBottom = wrapText(context, session.title, 100, 235, 1400, 100, 2);
  context.fillStyle = "#5b6259";
  context.font = "28px system-ui, sans-serif";
  context.fillText(`${new Date(session.createdAt).toLocaleDateString()}  ·  ${session.location || "Location unrecorded"}  ·  ${session.conditions || "Conditions unrecorded"}`, 100, titleBottom + 40);
  context.strokeStyle = "#c97822";
  context.lineWidth = 8;
  context.beginPath(); context.moveTo(100, titleBottom + 85); context.lineTo(1500, titleBottom + 85); context.stroke();

  context.fillStyle = "#202822";
  context.font = "italic 52px Georgia, serif";
  const promptBottom = wrapText(context, `“${session.prompt}”`, 100, titleBottom + 175, 1400, 62, 2);
  context.font = "28px system-ui, sans-serif";
  const constraintBottom = wrapText(context, session.constraint, 100, promptBottom + 30, 1400, 42, 3);

  const photos = (session.photos.some((photo) => photo.chosen) ? session.photos.filter((photo) => photo.chosen) : session.photos).slice(0, 4);
  const gridTop = Math.max(650, constraintBottom + 55);
  const photoWidth = 680;
  const photoHeight = 440;
  for (let index = 0; index < photos.length; index += 1) {
    const x = 100 + (index % 2) * 720;
    const y = gridTop + Math.floor(index / 2) * 485;
    await drawPhoto(context, photos[index], x, y, photoWidth, photoHeight);
  }

  const notesTop = photos.length > 2 ? gridTop + 1015 : photos.length ? gridTop + 530 : gridTop;
  context.fillStyle = "#244c3a";
  context.font = "700 30px system-ui, sans-serif";
  context.fillText("FIELD NOTES", 100, notesTop);
  context.fillStyle = "#202822";
  context.font = "30px system-ui, sans-serif";
  const notes = [session.intention, session.cameraNotes, session.reflection].filter(Boolean).join("  ·  ") || "No field notes recorded.";
  wrapText(context, notes, 100, notesTop + 55, 1400, 45, 6);
  context.fillStyle = "#5b6259";
  context.font = "24px system-ui, sans-serif";
  context.fillText("Made offline with Photo Walk Scratchbook · Images remain on the maker’s device", 100, 2180);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The session sheet could not be encoded.")), "image/png"));
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50) || "photo-walk";
}
