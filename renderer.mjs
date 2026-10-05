export function generateSvg(data, states, time) {
  let svgContent = '<svg width="' + data.project.width + '" height="' + data.project.height + '" xmlns="http://www.w3.org/2000/svg">\n';
  // ... (renderer logic from motion.mjs)
  return svgContent;
}
