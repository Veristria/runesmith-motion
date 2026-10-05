export function getScatterElements(el, time) {
  const elements = [];
  const count = el.count || 0;
  const seed = el.seed || 0;
  const fadeStart = el.fadeStart ?? null;
  const fadeEnd = el.fadeEnd ?? null;
  let multiplier = 1;
  if (fadeStart !== null && fadeEnd !== null) {
    if (time <= fadeStart) multiplier = 1;
    else if (time >= fadeEnd) multiplier = 0;
    else multiplier = 1 - (time - fadeStart) / (fadeEnd - fadeStart);
  }
  const opacity = (el.child.opacity ?? 1) * multiplier;
  for (let k = 0; k < count; k++) {
    const fx = ((seed * 53 + k * 97) % 1000) / 1000;
    const fy = ((seed * 131 + k * 197) % 1000) / 1000;
    const cx = Math.round((el.x + fx * el.width) * 100) / 100;
    const cy = Math.round((el.y + fy * el.height) * 100) / 100;
    elements.push({
      type: 'circle',
      id: `${el.id}-${k}`,
      cx,
      cy,
      r: el.child.r,
      fill: el.child.fill,
      opacity: Math.round(opacity * 100) / 100,
      _scatter_idx: k
    });
  }
  return elements;
}
