import type { Mark, Point } from "./types";

export interface ImageBox { x: number; y: number; width: number; height: number; }

export function containBox(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number): ImageBox {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { x: (targetWidth - width) / 2, y: (targetHeight - height) / 2, width, height };
}

function pointInBox(point: Point, box: ImageBox): Point {
  return { x: box.x + point.x * box.width, y: box.y + point.y * box.height };
}

export function drawMark(context: CanvasRenderingContext2D, mark: Mark, box: ImageBox): void {
  if (mark.points.length === 0) return;
  const points = mark.points.map((point) => pointInBox(point, box));
  context.save();
  context.strokeStyle = mark.color;
  context.fillStyle = mark.color;
  context.lineWidth = Math.max(3, box.width / 180);
  context.lineCap = "round";
  context.lineJoin = "round";

  if (mark.tool === "pen") {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.stroke();
  } else if (mark.tool === "frame" && points[1]) {
    context.setLineDash([context.lineWidth * 3, context.lineWidth * 1.5]);
    context.strokeRect(points[0].x, points[0].y, points[1].x - points[0].x, points[1].y - points[0].y);
  } else if (mark.tool === "arrow" && points[1]) {
    const start = points[0];
    const end = points[1];
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const head = Math.max(14, box.width / 25);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
    context.moveTo(end.x, end.y);
    context.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
    context.stroke();
  } else if (mark.tool === "text" && mark.text) {
    context.font = `700 ${Math.max(16, box.width / 22)}px system-ui, sans-serif`;
    context.lineWidth = Math.max(4, box.width / 120);
    context.strokeStyle = "rgba(20, 27, 23, .82)";
    context.strokeText(mark.text, points[0].x, points[0].y);
    context.fillText(mark.text, points[0].x, points[0].y);
  }
  context.restore();
}

export function drawMarks(context: CanvasRenderingContext2D, marks: Mark[], box: ImageBox): void {
  marks.forEach((mark) => drawMark(context, mark, box));
}

export function normalizePoint(clientX: number, clientY: number, element: HTMLElement, box: ImageBox): Point | null {
  const rect = element.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < box.x || y < box.y || x > box.x + box.width || y > box.y + box.height) return null;
  return { x: (x - box.x) / box.width, y: (y - box.y) / box.height };
}
