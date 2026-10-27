import { noteDimensions } from './devNotes';

export async function captureDevNote(): Promise<{ shot: string; thumb: string }> {
  document.documentElement.setAttribute('data-note-capture', 'true');
  try {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const { toJpeg } = await import('html-to-image');
    const width = window.innerWidth, height = window.innerHeight;
    const size = noteDimensions(width, height, 1280);
    // Body includes #root AND portaled NPC/Profile overlays. Canvas nodes are cloned by html-to-image.
    let shot = await toJpeg(document.body, { width, height, canvasWidth: size.width, canvasHeight: size.height, pixelRatio: 1, quality: .75, filter: node => !(node instanceof Element && node.hasAttribute('data-dev-notepad')) });
    const image = new Image(); image.src = shot; await image.decode();
    const jpeg = (w: number, quality: number) => {
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = Math.round(image.height * w / image.width);
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('No screenshot canvas');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height); return canvas.toDataURL('image/jpeg', quality);
    };
    let w = size.width;
    while (shot.length > 3_000_000 && w > 240) { w = Math.max(240, Math.floor(w * .8)); shot = jpeg(w, .75); }
    const thumb = jpeg(240, .6);
    if (shot.length > 3_000_000 || thumb.length > 200_000) throw new Error('Screenshot is too large');
    return { shot, thumb };
  } finally { document.documentElement.removeAttribute('data-note-capture'); }
}