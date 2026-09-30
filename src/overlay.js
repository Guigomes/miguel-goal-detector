// Desenho do overlay em cima do frame já pintado no canvas 2D visível.

export function drawBalloon(ctx, detection) {
  if (!detection) return;
  const { cx, cy, radius, colorName } = detection;

  ctx.save();
  ctx.strokeStyle = "#4ade80";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const label = `bexiga: ${colorName}`;
  ctx.font = "16px system-ui, sans-serif";
  const textWidth = ctx.measureText(label).width;
  const labelX = Math.max(4, cx - textWidth / 2 - 6);
  const labelY = Math.max(4, cy - radius - 26);

  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(labelX, labelY, textWidth + 12, 22);
  ctx.fillStyle = "#e7edf3";
  ctx.fillText(label, labelX + 6, labelY + 16);
  ctx.restore();
}
