import type { HeroSlogan, HeroHomeTypography } from '@/lib/hero-images';
import { heroSliderCanvasFontStack, normalizeHeroFontKey } from '@/lib/hero-slider-typography';

export type ResolvedHeroHomeCanvas = {
  titleFontStack: string;
  line1Color: string;
  line2Solid: string | null;
  subtitleColor: string;
};

export function resolveHeroHomeCanvas(raw?: HeroHomeTypography | null): ResolvedHeroHomeCanvas {
  const fontKey = normalizeHeroFontKey(raw?.fontKey);
  return {
    titleFontStack: heroSliderCanvasFontStack(fontKey),
    line1Color: raw?.textColor?.trim() || '#ffffff',
    line2Solid: raw?.accentColor?.trim() || null,
    subtitleColor: raw?.metaColor?.trim() || 'rgba(255,255,255,0.4)',
  };
}

function applyLine2Fill(
  ctx: CanvasRenderingContext2D,
  padX: number,
  line2: string,
  baseY: number,
  lineH: number,
  style: ResolvedHeroHomeCanvas,
) {
  if (style.line2Solid) {
    ctx.fillStyle = style.line2Solid;
    ctx.fillText(line2, padX, baseY + lineH);
    return;
  }
  const metrics = ctx.measureText(line2);
  const grad = ctx.createLinearGradient(padX, 0, padX + metrics.width, 0);
  grad.addColorStop(0, '#d4af37');
  grad.addColorStop(1, '#f5d76e');
  ctx.fillStyle = grad;
  ctx.fillText(line2, padX, baseY + lineH);
}

/** Компактный оверлей превью на дашборде «Главная». */
export function drawDashboardHeroOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  slogan: HeroSlogan,
  style: ResolvedHeroHomeCanvas,
) {
  const padX = 24 * dpr;
  const titleSize = Math.round(28 * dpr);
  const lineH = Math.round(34 * dpr);
  const subSize = Math.round(11 * dpr);
  const baseY = h - lineH * 2 - 16 * dpr - subSize - 24 * dpr;

  const shOx = -82 * dpr;
  const shOy = 2 * dpr;
  const shScale = 1.3;
  const shTitleSize = Math.round(titleSize * shScale);
  const shLineH = Math.round(lineH * shScale);
  const shSubSize = Math.round(subSize * shScale);

  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.filter = `blur(${Math.round(4 * dpr)}px)`;
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';
  ctx.font = `800 ${shTitleSize}px ${style.titleFontStack}`;
  ctx.fillText(slogan.line1, padX + shOx, baseY + shOy);
  ctx.fillText(slogan.line2, padX + shOx, baseY + shLineH + shOy);
  ctx.font = `400 ${shSubSize}px ${style.titleFontStack}`;
  ctx.fillText(slogan.subtitle, padX + shOx, baseY + shLineH * 2 + 12 * dpr + shOy);
  ctx.restore();

  ctx.save();
  ctx.font = `800 ${titleSize}px ${style.titleFontStack}`;
  ctx.fillStyle = style.line1Color;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowOffsetX = dpr;
  ctx.shadowOffsetY = dpr;
  ctx.textBaseline = 'top';
  ctx.fillText(slogan.line1, padX, baseY);
  ctx.restore();

  ctx.save();
  ctx.font = `800 ${titleSize}px ${style.titleFontStack}`;
  ctx.textBaseline = 'top';
  applyLine2Fill(ctx, padX, slogan.line2, baseY, lineH, style);
  ctx.restore();

  ctx.save();
  ctx.font = `400 ${subSize}px ${style.titleFontStack}`;
  ctx.fillStyle = style.subtitleColor;
  ctx.textBaseline = 'top';
  ctx.fillText(slogan.subtitle, padX, baseY + lineH * 2 + 12 * dpr);
  ctx.restore();
}

/** Полноэкранный герой на публичной главной. */
export function drawPublicHeroOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dpr: number,
  slogan: HeroSlogan,
  style: ResolvedHeroHomeCanvas,
) {
  const cssW = w / dpr;
  const isMd = cssW >= 768;
  const padX = (cssW >= 1024 ? 96 : isMd ? 64 : 32) * dpr;
  const btnAreaH = (isMd ? 140 : 100) * dpr;
  const titleSize = Math.round((isMd ? 64 : 36) * dpr);
  const lineH = Math.round((isMd ? 72 : 44) * dpr);
  const subSize = Math.round((isMd ? 18 : 13) * dpr);

  const textBlockH = lineH * 2 + 16 * dpr + subSize + 8 * dpr;
  const baseY = h - btnAreaH - textBlockH - 24 * dpr;

  ctx.save();
  const badgeText = 'Премиальный сервис';
  ctx.font = `600 ${Math.round(11 * dpr)}px ${style.titleFontStack}`;
  const badgeW = ctx.measureText(badgeText).width + 20 * dpr;
  const badgeH = 24 * dpr;
  const badgeY = baseY - badgeH - 16 * dpr;
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = dpr;
  const bx = padX;
  const by = badgeY;
  const bw = badgeW;
  const bh = badgeH;
  const br = 6 * dpr;
  ctx.beginPath();
  ctx.moveTo(bx + br, by);
  ctx.lineTo(bx + bw - br, by);
  ctx.arcTo(bx + bw, by, bx + bw, by + br, br);
  ctx.lineTo(bx + bw, by + bh - br);
  ctx.arcTo(bx + bw, by + bh, bx + bw - br, by + bh, br);
  ctx.lineTo(bx + br, by + bh);
  ctx.arcTo(bx, by + bh, bx, by + bh - br, br);
  ctx.lineTo(bx, by + br);
  ctx.arcTo(bx, by, bx + br, by, br);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = 'rgba(212, 175, 55, 0.7)';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, padX + 10 * dpr, badgeY + badgeH / 2);
  ctx.restore();

  ctx.save();
  ctx.font = `800 ${titleSize}px ${style.titleFontStack}`;
  ctx.fillStyle = style.line1Color;
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowOffsetX = dpr;
  ctx.shadowOffsetY = dpr;
  ctx.textBaseline = 'top';
  ctx.fillText(slogan.line1, padX, baseY);
  ctx.restore();

  ctx.save();
  ctx.font = `800 ${titleSize}px ${style.titleFontStack}`;
  ctx.textBaseline = 'top';
  applyLine2Fill(ctx, padX, slogan.line2, baseY, lineH, style);
  ctx.restore();

  ctx.save();
  ctx.font = `400 ${subSize}px ${style.titleFontStack}`;
  ctx.fillStyle = style.subtitleColor;
  ctx.textBaseline = 'top';
  ctx.fillText(slogan.subtitle, padX, baseY + lineH * 2 + 16 * dpr);
  ctx.restore();
}
