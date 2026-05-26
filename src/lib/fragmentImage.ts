// Generates the saved fragment image as a PNG data URL.
// Mirrors the canvas drawing in FragmentOverlay's "Save to folder" action.
export const generateFragmentImage = (prime: number, registrationNumber: number): string | null => {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const regLabel = `#${String(registrationNumber).padStart(4, '0')}`;

  // bg
  ctx.fillStyle = '#04040a';
  ctx.fillRect(0, 0, 600, 800);

  // grid
  ctx.strokeStyle = 'rgba(100,80,160,0.1)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 600; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 800);
    ctx.stroke();
  }
  for (let y = 0; y <= 800; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(600, y);
    ctx.stroke();
  }

  // eye oval
  ctx.strokeStyle = 'rgba(160,140,200,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(300, 280, 80, 48, 0, 0, Math.PI * 2);
  ctx.stroke();

  // pupil
  ctx.fillStyle = '#5b4fd4';
  ctx.beginPath();
  ctx.arc(300, 280, 10, 0, Math.PI * 2);
  ctx.fill();

  // prime number
  ctx.fillStyle = '#c8963a';
  ctx.font = '96px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(prime), 300, 420);

  // player avatar
  ctx.strokeStyle = 'rgba(91,79,212,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(300, 560, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#5b4fd4';
  ctx.beginPath();
  ctx.arc(300, 560, 16, 0, Math.PI * 2);
  ctx.fill();

  // registration label
  ctx.fillStyle = 'rgba(160,140,200,0.4)';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(regLabel, 300, 590);

  // PRÆM at bottom (with letter-spacing)
  ctx.fillStyle = 'rgba(160,140,200,0.4)';
  ctx.font = '14px Cinzel, serif';
  ctx.textAlign = 'center';
  const label = 'PRÆM';
  const spacing = 14 * 0.3;
  const widths: number[] = [];
  let totalWidth = 0;
  for (const ch of label) {
    const w = ctx.measureText(ch).width;
    widths.push(w);
    totalWidth += w;
  }
  totalWidth += spacing * (label.length - 1);
  let cx = 300 - totalWidth / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < label.length; i++) {
    ctx.fillText(label[i], cx, 740);
    cx += widths[i] + spacing;
  }

  return canvas.toDataURL('image/png');
};
