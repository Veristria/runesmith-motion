export function generateGradientDefs(states) {
  let defs = '';
  for (const el of states) {
    if (el.gradient) {
      const id = `grad-${el.id}`;
      const grad = el.gradient;
      if (grad.type === 'linear') {
        const rad = grad.angle * Math.PI / 180;
        const x1 = Math.round((0.5 - 0.5 * Math.cos(rad)) * 10000) / 10000;
        const y1 = Math.round((0.5 - 0.5 * Math.sin(rad)) * 10000) / 10000;
        const x2 = Math.round((0.5 + 0.5 * Math.cos(rad)) * 10000) / 10000;
        const y2 = Math.round((0.5 + 0.5 * Math.sin(rad)) * 10000) / 10000;
        defs += `    <linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">\n`;
      } else {
        defs += `    <radialGradient id="${id}">\n`;
      }
      for (const stop of grad.stops) {
        defs += `      <stop offset="${stop.offset}" stop-color="${stop.color}"/>\n`;
      }
      defs += `    </${grad.type}Gradient>\n`;
    }
  }
  return defs;
}

export function getFillAttr(el, paints) {
  if (el.fill && el.fill.startsWith('paint:')) {
    const id = el.fill.split(':')[1];
    if (!paints || !paints.some(p => p.id === id)) {
      console.error('Invalid project structure');
      process.exit(1);
    }
    return `fill="url(#rs-paint-${id})"`;
  }
  if (el.gradient) {
    return `fill="url(#grad-${el.id})"`;
  }
  return `fill="${el.fill || '#000'}"`;
}