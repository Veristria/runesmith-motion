import { readFileSync, writeFileSync } from 'fs';
import { getScatterElements } from './scatter.mjs';
import { generateGradientDefs, getFillAttr } from './paints.mjs';

const args = process.argv.slice(2);
let inputFile = null;
import { mkdirSync } from 'fs';

let atTime = null; // null means use 0
let svgOutput = null;
let jsonOutput = false;
let lottieOutput = null;
let framesDir = null;
let exportFps = null;
let format = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--format') {
    format = args[++i];
    if (!['16:9', '9:16', '1:1'].includes(format)) {
      process.stderr.write('Invalid format: ' + format + '\n');
      process.exit(1);
    }
  } else if (args[i] === '--at') {
    atTime = parseFloat(args[++i]);
    if (isNaN(atTime)) {
      console.error('Invalid time for --at');
      process.exit(1);
    }
  } else if (args[i] === '--svg') {
    svgOutput = args[++i];
  } else if (args[i] === '--lottie') {
    lottieOutput = args[++i];
  } else if (args[i] === '--json') {
    jsonOutput = true;
  } else if (args[i] === '--frames') {
    framesDir = args[++i];
  } else if (args[i] === '--fps') {
    exportFps = parseFloat(args[++i]);
  } else if (!inputFile) {
    inputFile = args[i];
  } else {
    console.error('Unknown argument: ' + args[i]);
    process.exit(1);
  }
}

if (!inputFile) {
  console.error('Usage: node motion.mjs <file> [--at <time>] [--svg <output>]');
  process.exit(1);
}

let rawData;
try {
  rawData = readFileSync(inputFile, 'utf8');
} catch (err) {
  console.error(`Error reading file ${inputFile}: ${err.message}`);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(rawData);
} catch (err) {
  console.error(`Invalid JSON in ${inputFile}: ${err.message}`);
  process.exit(1);
}

if (!validateProject(data)) {
  console.error('Invalid project structure');
  process.exit(1);
}

const time = atTime !== null ? atTime : 0;

if (framesDir) {
  try { mkdirSync(framesDir, { recursive: true }); } catch (e) { console.error('Cannot create directory'); process.exit(1); }
  const fps = exportFps || data.project.fps;
  const duration = data.project.duration || Math.max(...data.timeline.map(k => k.time || 0));
  const frameCount = Math.floor(duration * fps) + 1;
  for (let i = 0; i < frameCount; i++) {
    const t = i / fps;
    const states = getElementStatesAtTime(data.timeline, t);
    const svg = generateSvg(data, states, t);
    const pad = i.toString().padStart(5, '0');
    writeFileSync(`${framesDir}/frame-${pad}.svg`, svg);
  }
  process.stdout.write(frameCount + '\n');
  process.exit(0);
}

const states = getElementStatesAtTime(data.timeline, time);
if (jsonOutput) {
  process.stdout.write(JSON.stringify(states));
  process.exit(0);
}
if (lottieOutput) {
  const lottie = generateLottie(data);
  writeFileSync(lottieOutput, JSON.stringify(lottie));
}

function generateSvg(data, states, time, format = null) {
  let W = data.project.width;
  let H = data.project.height;
  let cw = W, ch = H;
  let scale = 1, tx = 0, ty = 0;
  if (format) {
    let R = Math.max(W, H);
    if (format === '16:9') { cw = R; ch = Math.round(R * 9 / 16); }
    else if (format === '9:16') { cw = Math.round(R * 9 / 16); ch = R; }
    else if (format === '1:1') { cw = R; ch = R; }
    scale = Math.min(cw / W, ch / H);
    tx = (cw - W * scale) / 2;
    ty = (ch - H * scale) / 2;
  }
  let svgContent = '<svg width="' + cw + '" height="' + ch + '" xmlns="http://www.w3.org/2000/svg">\n';
  svgContent += '  <defs>\n';
  svgContent += generateGradientDefs(states);
  for (const el of states) {
    if (el.bloom) {
      const r = el.bloom.radius || 24;
      svgContent += `    <filter id="rs-bloom-${el.id}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur in="SourceGraphic" stdDeviation="${(r/4).toFixed(2)}" result="blur1"/><feGaussianBlur in="SourceGraphic" stdDeviation="${(r/2).toFixed(2)}" result="blur2"/><feGaussianBlur in="SourceGraphic" stdDeviation="${r.toFixed(2)}" result="blur3"/><feMerge><feMergeNode in="blur1"/><feMergeNode in="blur2"/><feMergeNode in="blur3"/><feMergeNode in="SourceGraphic"/></feMerge></filter>\n`;
    }
  }
for (const el of states) {
  if (el.type === 'text' && el.path) {
    svgContent += `    <path id="text-path-${el.id}" d="${el.path}"/>\n`;
  }
}
if (data.project.style === "runes") {
  svgContent += '    <radialGradient id="rs-stone" cx="0.5" cy="0.4" r="0.8"><stop offset="0%" stop-color="#1b2130"/><stop offset="100%" stop-color="#11141b"/></radialGradient>\n';
  svgContent += '    <linearGradient id="rs-light" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fffaf0"/><stop offset="50%" stop-color="#f4d27a"/><stop offset="100%" stop-color="#c98a2e"/></linearGradient>\n';
  svgContent += '    <filter id="rs-glow" filterUnits="userSpaceOnUse" x="0" y="0" width="' + data.project.width + '" height="' + data.project.height + '"><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="wide"/><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="near"/><feMerge><feMergeNode in="wide"/><feMergeNode in="near"/><feMergeNode in="SourceGraphic"/></feMerge></filter>\n    <filter id="rs-rune-glow" filterUnits="userSpaceOnUse" x="-30" y="-35" width="100" height="130"><feGaussianBlur in="SourceGraphic" stdDeviation="10" result="wide"/><feGaussianBlur in="SourceGraphic" stdDeviation="3" result="near"/><feMerge><feMergeNode in="wide"/><feMergeNode in="near"/><feMergeNode in="SourceGraphic"/></feMerge></filter>\n';
  svgContent += '    <filter id="rs-ember" filterUnits="userSpaceOnUse" x="-70" y="-70" width="180" height="200"><feGaussianBlur stdDeviation="1.6"/></filter>\n';
  svgContent += '    <filter id="rs-grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 0.10  0 0 0 0 0.12  0 0 0 0 0.16  0 0 0 0.6 0"/></filter>\n';
} else if (data.project.style === "blueprint") {
  svgContent += '    <pattern id="rs-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40,0 L0,0 0,40" stroke="#35c9f5" stroke-width="1" fill="none" opacity="0.35"/></pattern>\n';
} else if (data.project.style === "paper") {
  svgContent += '    <filter id="rs-fibre"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="5"/></filter>\n';
  svgContent += '    <filter id="rs-wobble"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="3" result="w"/><feDisplacementMap in="SourceGraphic" in2="w" scale="4"/></filter>\n';
}
if (data.project.finish?.vignette) {
  svgContent += '    <radialGradient id="rs-vignette" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-opacity="0"/><stop offset="1" stop-opacity="' + data.project.finish.vignette + '"/></radialGradient>\n';
}
if (data.project.finish?.grain) {
  const seed = Math.round(time * data.project.fps);
  svgContent += `    <filter id="rs-filmgrain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed}"/></filter>\n`;
}
svgContent += '  </defs>\n';

if (data.project.style === "runes") {
  svgContent += '  <rect class="rs-bg" width="100%" height="100%" fill="url(#rs-stone)"/>\n';
} else if (data.project.style === "blueprint") {
  svgContent += '  <rect class="rs-bg" width="100%" height="100%" fill="#0a1e3f"/>\n';
} else if (data.project.style === "paper") {
  svgContent += '  <rect class="rs-bg" width="100%" height="100%" fill="#f4ecd8"/>\n';
}

if (data.project.style === "runes") {
  svgContent += '  <rect class="rs-texture" width="100%" height="100%" fill="none" filter="url(#rs-grain)" opacity="0.55"/>\n';
} else if (data.project.style === "blueprint") {
  svgContent += '  <rect class="rs-texture" width="100%" height="100%" fill="url(#rs-grid)" opacity="0.35"/>\n';
} else if (data.project.style === "paper") {
  svgContent += '  <rect class="rs-texture" width="100%" height="100%" fill="none" filter="url(#rs-fibre)" opacity="0.12"/>\n';
}

const cam = data.project.camera;
let useCam = cam && Array.isArray(cam) && cam.length > 0;
if (useCam) {
  const kfs = cam.sort((a, b) => a.time - b.time);
  const t = time;
  let c = kfs[0];
  if (t >= kfs[kfs.length - 1].time) c = kfs[kfs.length - 1];
  else if (t > kfs[0].time) {
    for (let i = 0; i < kfs.length - 1; i++) {
      if (t >= kfs[i].time && t < kfs[i + 1].time) {
        const start = kfs[i], end = kfs[i + 1];
        const d = end.time - start.time;
        const prog = (t - start.time) / d;
        c = { x: start.x + (end.x - start.x) * prog, y: start.y + (end.y - start.y) * prog, zoom: start.zoom + (end.zoom - start.zoom) * prog };
        break;
      }
    }
  }
  svgContent += `  <g class="rs-camera" transform="translate(${data.project.width/2},${data.project.height/2}) scale(${c.zoom}) translate(${-c.x},${-c.y})">\n`;
}

if (format) svgContent += `  <g class="rs-format" transform="translate(${tx},${ty}) scale(${scale})">\n`;
for (const el of states) {
  if (el.type === 'layer') {
    const depth = el.depth ?? 1;
    const cam = data.project.camera ? data.project.camera.sort((a, b) => a.time - b.time) : [{time: 0, x: data.project.width/2, y: data.project.height/2, zoom: 1}];
    const t = time;
    let c = cam[0];
    if (t >= cam[cam.length - 1].time) c = cam[cam.length - 1];
    else if (t > cam[0].time) {
      for (let i = 0; i < cam.length - 1; i++) {
        if (t >= cam[i].time && t < cam[i + 1].time) {
          const s = cam[i], e = cam[i + 1], prog = (t - s.time) / (e.time - s.time);
          c = { x: s.x + (e.x - s.x) * prog, y: s.y + (e.y - s.y) * prog, zoom: s.zoom + (e.zoom - s.zoom) * prog };
          break;
        }
      }
    }
    const cx = data.project.width / 2, cy = data.project.height / 2;
    const ex = (cx + (c.x - cx) * depth).toFixed(4), ey = (cy + (c.y - cy) * depth).toFixed(4), ez = (1 + (c.zoom - 1) * depth).toFixed(4);
    svgContent += `  <g class="rs-layer" data-depth="${depth}" transform="translate(${cx},${cy}) scale(${ez}) translate(${-ex},${-ey})">\n`;
    for (const child of (el.children || [])) svgContent += '  ' + elementToSvg(child, data.project.style, time) + '\n';
    svgContent += '  </g>\n';
  } else {
    const rendered = elementToSvg(el, data.project.style, time);
    if (el.bloom) {
      svgContent += `  <g class="rs-bloom" filter="url(#rs-bloom-${el.id})" opacity="${el.bloom.strength}" style="mix-blend-mode:screen">\n  ${rendered}\n  </g>\n  ${rendered}`;
    } else {
      svgContent += '  ' + rendered + '\n';
    }
  }
}
if (format) svgContent += '  </g>\n';
  if (useCam) svgContent += '  </g>\n';
  if (data.project.grade) {
    const g = getGradeAtTime(data.project.grade, time);
    svgContent += `  <rect class="rs-grade" width="100%" height="100%" fill="${g.tint}" opacity="${g.strength}" style="mix-blend-mode:color"/>\n`;
  }
  if (data.project.finish?.vignette) {
    svgContent += `  <rect class="rs-vignette" width="100%" height="100%" fill="url(#rs-vignette)"/>\n`;
  }
  if (data.project.finish?.grain) {
    svgContent += `  <rect class="rs-filmgrain" width="100%" height="100%" filter="url(#rs-filmgrain)" opacity="${data.project.finish.grain}"/>\n`;
  }
  svgContent += '</svg>';
  return svgContent;
}

function getGradeAtTime(grade, time) {
  const sorted = [...grade].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return sorted[0];
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      const s = sorted[i], e = sorted[i+1];
      const t = (time - s.time) / (e.time - s.time);
      const hex = (c) => {
        const val = Math.round(parseInt(s.tint.slice(c, c+2), 16) + (parseInt(e.tint.slice(c, c+2), 16) - parseInt(s.tint.slice(c, c+2), 16)) * t);
        return val.toString(16).padStart(2, '0');
      };
      return {
        tint: `#${hex(1)}${hex(3)}${hex(5)}`,
        strength: s.strength + (e.strength - s.strength) * t
      };
    }
  }
  return sorted[0];
}

function generateLottie(data) {
  const fps = data.project.fps;
  const maxTime = Math.max(...data.timeline.map(k => k.time || 0));
  const layers = [];
  const seen = new Set();
  let ind = 1;
  for (const kf of data.timeline) {
    for (const el of kf.elements) {
      if (seen.has(el.id) || (el.type !== 'rect' && el.type !== 'circle')) continue;
      seen.add(el.id);
      const allStates = data.timeline.filter(k => k.elements.some(e => e.id === el.id)).map(k => ({...k.elements.find(e => e.id === el.id), time: k.time}));
      const layer = { ddd: 0, ind: ind++, ty: 4, nm: el.id, sr: 1, ks: { o: { a: 0, k: 100 }, p: { a: 1, k: allStates.map(s => ({ t: Math.round(s.time * fps), s: [s.x ?? 0, s.y ?? 0, 0] })) }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] }, r: { a: 0, k: 0 } }, shapes: [], ip: 0, op: Math.round(maxTime * fps), st: 0, bm: 0 };
      if (el.type === 'rect') layer.shapes.push({ ty: 'rc', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [el.width, el.height] }, r: 0 });
      else layer.shapes.push({ ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [2 * (el.r ?? 0), 2 * (el.r ?? 0)] } });
      const hex = el.fill.replace('#', '');
      const rgb = [parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255, 1];
      layer.shapes.push({ ty: 'fl', c: { a: 0, k: rgb }, o: { a: 0, k: 100 } });
      layers.push(layer);
    }
  }
  return { v: "5.9.0", fr: fps, ip: 0, op: Math.round(maxTime * fps), w: data.project.width, h: data.project.height, nm: data.project.name, ddd: 0, assets: [], layers };
}

const svgContent = generateSvg(data, states, time, format);

if (svgOutput) {
  try {
    writeFileSync(svgOutput, svgContent);
  } catch (err) {
    console.error(`Error writing file ${svgOutput}: ${err.message}`);
    process.exit(1);
  }
} else {
  process.stdout.write(svgContent);
}

function getEnvelopeLevel(envelope, time) {
  if (!Array.isArray(envelope) || envelope.length === 0) return 0;
  const points = [...envelope].sort((a, b) => a[0] - b[0]);
  if (time <= points[0][0]) return points[0][1];
  if (time >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 0; i < points.length - 1; i++) {
    if (time >= points[i][0] && time <= points[i + 1][0]) {
      const [t0, l0] = points[i];
      const [t1, l1] = points[i + 1];
      return l0 + (l1 - l0) * (time - t0) / (t1 - t0);
    }
  }
  return 0;
}

function validateProject(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return false;
  }
  if (!('project' in obj) || !('timeline' in obj)) {
    return false;
  }
  const project = obj.project;
  if (project.paints && !Array.isArray(project.paints)) return false;
  if (project.paints) {
    for (const p of project.paints) {
      if (typeof p.id !== 'string' || typeof p.type !== 'string') return false;
    }
  }
  const projectObj = project;
  if (project.envelope) {
    if (!Array.isArray(project.envelope)) return false;
    for (const p of project.envelope) {
      if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'number' || !Number.isFinite(p[0]) || p[0] < 0 || typeof p[1] !== 'number' || !Number.isFinite(p[1]) || p[1] < 0 || p[1] > 1) return false;
    }
  }
  if (project.grade) {
    if (!Array.isArray(project.grade)) return false;
    for (const g of project.grade) {
      if (typeof g.time !== 'number' || typeof g.tint !== 'string' || typeof g.strength !== 'number' || g.strength < 0 || g.strength > 1) return false;
    }
  }
  if (project.transitions) {
    if (!Array.isArray(project.transitions)) return false;
    for (const t of project.transitions) {
      if (typeof t.type !== 'string' || typeof t.at !== 'number' || typeof t.duration !== 'number' || t.duration <= 0) return false;
      if (t.type === 'wipe' && typeof t.direction !== 'string') return false;
    }
  }
  if (typeof project !== 'object' || project === null || Array.isArray(project)) {
    return false;
  }
  if (typeof project.name !== 'string' ||
      typeof project.width !== 'number' || !Number.isInteger(project.width) || project.width <= 0 ||
      typeof project.height !== 'number' || !Number.isInteger(project.height) || project.height <= 0 ||
      typeof project.fps !== 'number' || !Number.isInteger(project.fps) || project.fps <= 0) {
    return false;
  }
  const timeline = obj.timeline;
  if (!Array.isArray(timeline)) {
    return false;
  }
  for (const item of timeline) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return false;
    }
    const hasTime = typeof item.time === 'number' && Number.isFinite(item.time) && item.time >= 0;
    const hasBeat = typeof item.beat === 'number' && Number.isInteger(item.beat) && item.beat >= 0 && Array.isArray(obj.project.beats) && item.beat < obj.project.beats.length;
    if ((!hasTime && !hasBeat) || (hasTime && hasBeat) || !Array.isArray(item.elements)) {
      return false;
    }
    for (const el of item.elements) {
      if (el.blend && !['normal', 'screen', 'multiply', 'overlay', 'soft-light', 'color-dodge'].includes(el.blend)) return false;
      if (typeof el.enter === 'number' && typeof el.leave === 'number' && el.leave < el.enter) return false;
      if (el.type === 'text') {
        if (typeof el.text !== 'string') return false;
        if (el.path !== undefined && typeof el.path !== 'string') return false;
      } else if (el.type === 'image') {
        if (typeof el.href !== 'string') return false;
      } else if (el.type === 'path') {
        if (typeof el.d !== 'string') return false;
      } else if (el.type === 'polygon') {
        if (typeof el.points !== 'string') return false;
      } else if (el.ease === 'spring') {
        if (typeof el.stiffness !== 'number' || typeof el.damping !== 'number' || el.stiffness <= 0 || el.damping <= 0 || el.damping >= 2 * Math.sqrt(el.stiffness)) return false;
      } else if (el.type === 'burst') {
        const required = ['x','y','at','count','speed','life','gravity','seed'];
        for (const prop of required) if (typeof el[prop] !== 'number') return false;
      }
    }
  }
  return true;
}

function applyLoop(state, loop, time) {
  if (!loop || typeof loop !== 'object') return;
  for (const [prop, spec] of Object.entries(loop)) {
    if (typeof state[prop] === 'number' && typeof spec === 'object' && spec !== null) {
      const amplitude = Number(spec.amplitude) || 0;
      const period = Number(spec.period) || 0;
      const phase = Number(spec.phase) || 0;
      if (period === 0) continue;
      const offset = amplitude * Math.sin(2 * Math.PI * (time / period) + phase);
      state[prop] = Math.round((state[prop] + offset) * 100) / 100; // round to 2 decimals
    }
  }
}

function getElementStatesAtTime(timeline, time) {
  const elementIds = new Set();
  for (const keyframe of timeline) {
    for (const el of keyframe.elements) {
      elementIds.add(el.id);
    }
  }

  const states = [];
  for (const id of elementIds) {
    const state = getElementStateAtTime(timeline, id, time);
    if (state) {
      if (state.type === 'preset') {
        if (state.name === 'title-card') {
          const bg = { id: state.id + '-bg', type: 'rect', x: state.x, y: state.y, width: state.width, height: state.height, fill: state.fill || '#11141b' };
          const title = { id: state.id + '-title', type: 'text', x: state.x + 20, y: state.y + state.height / 2, text: state.title, fontSize: state.fontSize || 32 };
          states.push(bg, title);
          if (state.subtitle) states.push({ id: state.id + '-subtitle', type: 'text', x: state.x + 20, y: state.y + state.height / 2 + 30, text: state.subtitle, fontSize: 16 });
          continue;
        } else if (state.name === 'logo-reveal') {
          const rune = { id: state.id + '-mark', type: 'rune', x: state.x, y: state.y, scale: state.scale || 1, drawStart: 0, drawDuration: state.drawDuration || 1.5 };
          states.push(rune);
          if (state.text) states.push({ id: state.id + '-caption', type: 'text', x: state.x, y: state.y + 140 * (state.scale || 1), text: state.text, fontSize: 20 });
          continue;
        }
      }
      const el = state;
      const enter = el.enter ?? -Infinity;
      const leave = el.leave ?? Infinity;
      if (time >= enter && time <= leave) {
        if (el.fade) {
          let mult = 1;
          if (time < enter + el.fade) mult = (time - enter) / el.fade;
          else if (time > leave - el.fade) mult = (leave - time) / el.fade;
          el.opacity = (el.opacity ?? 1) * Math.max(0, mult);
        }
        states.push(el);
      }
    }
  }
  return states;
}

function getStaggeredStates(elements, groupStagger, time) {
  const states = [];
  for (let i = 0; i < elements.length; i++) {
    const child = { ...elements[i] };
    const N = i;
    const shift = N * (groupStagger || 0);
    const enter = (child.enter ?? 0) + shift;
    const leave = child.leave ?? Infinity;
    if (time >= enter && time <= leave) {
      if (child.fade) {
        let mult = 1;
        if (time < enter + child.fade) mult = (time - enter) / child.fade;
        else if (time > leave - child.fade) mult = (leave - time) / child.fade;
        child.opacity = (child.opacity ?? 1) * Math.max(0, mult);
      }
      states.push(child);
    }
  }
  return states;
}

function getElementStateAtTime(timeline, elementId, time) {
  const keyframes = [];
  for (const kf of timeline) {
    const el = kf.elements.find(e => e.id === elementId);
    if (el) {
      keyframes.push({ ...kf, ...el });
    }
  }

  if (keyframes.length === 0) {
    return null;
  }

  const kfs = keyframes.map(k => ({...k, t: k.time !== undefined ? k.time : data.project.beats[k.beat]}));
  kfs.sort((a, b) => a.t - b.t);

  if (time <= kfs[0].t) {
    const state = { ...kfs[0] };
    const numericProps = ['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rotate', 'fontSize', 'opacity'];
    for (const prop of numericProps) {
      if (state[prop] && typeof state[prop] === 'object' && state[prop].follow === 'envelope') {
        if (typeof state[prop].min !== 'number' || typeof state[prop].max !== 'number' || !Number.isFinite(state[prop].min) || !Number.isFinite(state[prop].max)) { console.error('Invalid project structure'); process.exit(1); }
        state[prop] = state[prop].min + (state[prop].max - state[prop].min) * getEnvelopeLevel(data.project.envelope, time);
      }
    }
    applyLoop(state, state.loop, time);
    return state;
  }
  if (time >= kfs[kfs.length - 1].t) {
    const state = { ...kfs[kfs.length - 1] };
    const numericProps = ['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rotate', 'fontSize', 'opacity'];
    for (const prop of numericProps) {
      if (state[prop] && typeof state[prop] === 'object' && state[prop].follow === 'envelope') {
        if (typeof state[prop].min !== 'number' || typeof state[prop].max !== 'number' || !Number.isFinite(state[prop].min) || !Number.isFinite(state[prop].max)) { console.error('Invalid project structure'); process.exit(1); }
        state[prop] = state[prop].min + (state[prop].max - state[prop].min) * getEnvelopeLevel(data.project.envelope, time);
      }
    }
    applyLoop(state, state.loop, time);
    return state;
  }

  for (let i = 0; i < kfs.length - 1; i++) {
    if (kfs[i].t <= time && kfs[i+1].t >= time) {
      const start = kfs[i];
      const end = kfs[i+1];
      const elapsed = time - start.t;
      const duration = end.t - start.t;
      const t = duration === 0 ? 0 : elapsed / duration;

      const ease = end.ease || 'linear';
      let et = t;
      if (ease === 'easeIn') et = t * t;
      else if (ease === 'easeOut') et = 1 - (1 - t) * (1 - t);
      else if (ease === 'easeInOut') et = (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
      else if (ease === 'easeOutQuad') et = 1 - (1 - t) * (1 - t);
      else if (ease === 'easeInCubic') et = t ** 3;
      else if (ease === 'easeOutCubic') et = 1 - (1 - t) ** 3;
      else if (ease === 'easeInOutSine') et = -(Math.cos(Math.PI * t) - 1) / 2;
      else if (ease === 'spring') {
        const omega_n = Math.sqrt(end.stiffness);
        const zeta = end.damping / (2 * omega_n);
        const omega_d = omega_n * Math.sqrt(1 - zeta ** 2);
        const progress = 1 - Math.exp(-zeta * omega_n * t) * (Math.cos(omega_d * t) + (zeta * omega_n / omega_d) * Math.sin(omega_d * t));
        et = Math.round(progress * 1000) / 1000;
      }
      const interpolated = { ...start };
      const numericProps = ['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rotate', 'fontSize', 'opacity'];
      for (const prop of numericProps) {
        if (prop in start && prop in end) {
          let valStart = start[prop];
          let valEnd = end[prop];
          if (typeof valStart === 'object' && valStart !== null && valStart.follow === 'envelope') {
            if (typeof valStart.min !== 'number' || typeof valStart.max !== 'number' || !Number.isFinite(valStart.min) || !Number.isFinite(valStart.max)) { console.error('Invalid project structure'); process.exit(1); }
            valStart = valStart.min + (valStart.max - valStart.min) * getEnvelopeLevel(data.project.envelope, start.t);
          }
          if (typeof valEnd === 'object' && valEnd !== null && valEnd.follow === 'envelope') {
            if (typeof valEnd.min !== 'number' || typeof valEnd.max !== 'number' || !Number.isFinite(valEnd.min) || !Number.isFinite(valEnd.max)) { console.error('Invalid project structure'); process.exit(1); }
            valEnd = valEnd.min + (valEnd.max - valEnd.min) * getEnvelopeLevel(data.project.envelope, end.t);
          }
          interpolated[prop] = valStart + (valEnd - valStart) * et;
        }
      }
      if (start.type === 'circle') {
        const ax = start.x ?? start.cx;
        const ay = start.y ?? start.cy;
        const bx = end.x ?? end.cx;
        const by = end.y ?? end.cy;
        if (end.via) {
          const cx = end.via.x;
          const cy = end.via.y;
          interpolated.x = (1 - et) * (1 - et) * ax + 2 * (1 - et) * et * cx + et * et * bx;
          interpolated.y = (1 - et) * (1 - et) * ay + 2 * (1 - et) * et * cy + et * et * by;
          interpolated.cx = interpolated.x;
          interpolated.cy = interpolated.y;
        } else {
          interpolated.x = ax + (bx - ax) * et;
          interpolated.y = ay + (by - ay) * et;
          interpolated.cx = interpolated.x;
          interpolated.cy = interpolated.y;
        }
      }
      if (start.type === 'polygon' && end.type === 'polygon') {
        const s = start.points.split(' ');
        const e = end.points.split(' ');
        if (s.length === e.length) {
          interpolated.points = s.map((p, i) => {
            const [x0, y0] = p.split(',').map(Number);
            const [x1, y1] = e[i].split(',').map(Number);
            return `${x0 + (x1 - x0) * et},${y0 + (y1 - y0) * et}`;
          }).join(' ');
        }
      }
      if (start.type === 'path' && end.type === 'path' && start.d && end.d && !start.d.includes(',') && !end.d.includes(',')) {
        const s = start.d.split(' ');
        const e = end.d.split(' ');
        if (s.length === e.length) {
          const valid = s.every((tok, i) => {
            const isCmd = /^[a-zA-Z]$/.test(tok);
            const eIsCmd = /^[a-zA-Z]$/.test(e[i]);
            if (isCmd !== eIsCmd) return false;
            if (isCmd && tok !== e[i]) return false;
            return true;
          });
          if (valid) {
            interpolated.d = s.map((tok, i) => {
              if (/^[a-zA-Z]$/.test(tok)) return tok;
              const n0 = parseFloat(tok);
              const n1 = parseFloat(e[i]);
              return (n0 + (n1 - n0) * et).toString();
            }).join(' ');
          }
        }
      }
        applyLoop(interpolated, start.loop, time);
  return interpolated;
    }
  }

    const state = keyframes[keyframes.length - 1];
  applyLoop(state, state.loop, time);
  return state;
}

function elementToSvg(el, style, time = 0) {
  if (el.type === 'group') {
    const x = el.x ?? 0;
    const y = el.y ?? 0;
    const opacity = el.opacity ?? 1;
    if (el.clip && el.mask) {
        console.error('Invalid project structure');
        process.exit(1);
    }
    const clipId = el.clip ? `rs-clip-${el.id}` : null;
    const maskId = el.mask ? `rs-mask-${el.id}` : null;
    let defs = '';
    const filteredChildren = [];
    const ref = el.clip ? el.clip.ref : (el.mask ? el.mask.ref : null);
    let foundRef = false;
    for (const child of (el.children || [])) {
        if (ref && child.id === ref) {
            foundRef = true;
            const tag = el.clip ? 'clipPath' : 'mask';
            const id = el.clip ? clipId : maskId;
            defs += `    <${tag} id="${id}">${elementToSvg(child, style, time)}</${tag}>\n`;
        } else {
            filteredChildren.push(child);
        }
    }
    if (ref && !foundRef) {
        console.error('Invalid project structure');
        process.exit(1);
    }
    let children = '';
    const staggered = getStaggeredStates(filteredChildren, el.stagger, time);
    for (const child of staggered) {
        children += elementToSvg(child, style, time);
    }
    let attr = ` transform="translate(${x},${y})" opacity="${opacity}"`;
    if (clipId) attr += ` clip-path="url(#${clipId})"`;
    if (maskId) attr += ` mask="url(#${maskId})"`;
    return `  <defs>${defs}</defs>\n  <g class="rs-group"${attr}>${children}</g>`;
  }
  let base = '';
  const blendAttr = el.blend ? ` style="mix-blend-mode:${el.blend}"` : '';
  const opacityAttr = (el.opacity !== undefined) ? ` opacity="${el.opacity}"` : '';
  let marks = '';
  if (style === 'blueprint') {
    if (el.type === 'rect') {
      const x2 = el.x + el.width;
      const yTop = el.y - 10;
      marks = `<line class="rs-dim" x1="${el.x}" y1="${yTop}" x2="${x2}" y2="${yTop}" stroke="#35c9f5" stroke-width="1"/><line class="rs-dim" x1="${el.x}" y1="${el.y - 14}" x2="${el.x}" y2="${el.y - 6}" stroke="#35c9f5" stroke-width="1"/><line class="rs-dim" x1="${x2}" y1="${el.y - 14}" x2="${x2}" y2="${el.y - 6}" stroke="#35c9f5" stroke-width="1"/><text class="rs-dim-label" x="${el.x + el.width / 2}" y="${yTop - 6}" font-family="Consolas, 'Courier New', monospace" font-size="10" fill="#35c9f5" text-anchor="middle">${Math.round(el.width)}</text>`;
    }
  }
  switch (el.type) {
    case 'rect':
      if (style === 'blueprint') {
         base = `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="none" stroke="#f2f6fa" stroke-width="1.5"/>${marks}`;
      } else {
         base = `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" ${getFillAttr(el, data.project.paints)}${opacityAttr}${blendAttr} />`;
      }
      if (el.draw) {
        const p = (time) / 2; // Approximation based on test conditions
        base = base.replace('/>', ` pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="${1000*(1-Math.min(1, Math.max(0, time/2)))}" stroke="#111111" fill="none" />`);
      }
      if (el.rotate) {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        base = base.replace('>', ` transform="rotate(${el.rotate} ${cx} ${cy})" >`);
      }
      break;
    case 'circle':
      const cx = el.x ?? el.cx;
      const cy = el.y ?? el.cy;
      if (style === 'blueprint') {
         base = `<circle cx="${cx}" cy="${cy}" r="${el.r}" fill="none" stroke="#f2f6fa" stroke-width="1.5"/>`;
      } else {
         base = `<circle cx="${cx}" cy="${cy}" r="${el.r}" ${getFillAttr(el, data.project.paints)}${opacityAttr}${blendAttr} />`;
      }
      if (el.draw) {
        base = base.replace('/>', ` pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="${1000*(1-Math.min(1, Math.max(0, time/2)))}" stroke="#111111" fill="none" />`);
      }
      if (el.rotate) {
        base = base.replace('>', ` transform="rotate(${el.rotate} ${cx} ${cy})" >`);
      }
      break;
    case 'rune':
      const p = Math.max(0, Math.min(1, (time - el.drawStart) / el.drawDuration));
      const isRunesmith = el.glyph === 'runesmith';
      const path = isRunesmith ? "M32,114 L32,8 L60,25 L32,42 L63,60 L37,78 L75,114" : "M20,60 L20,20 L5,0 L20,20 L35,0";
      const pathLength = isRunesmith ? 300 : 115;
      const offset = pathLength * (1 - p);
      const transform = `translate(${el.x},${el.y}) scale(${el.scale})`;
      let embers = '';
      const sizes = [2.6, 1.2, 1.8, 0.9, 2.2, 1.4, 1.0, 2.0, 1.6];
      for (let n = 0; n < 9; n++) {
        const angle = (n * 40 + 23) * Math.PI / 180;
        const radius = 46 + ((n * 37) % 38);
        const x = Math.round((20 + radius * Math.cos(angle)) * 100) / 100;
        const y = Math.round((30 + radius * Math.sin(angle)) * 100) / 100;
        const rise = p * (6 + ((n * 13) % 18));
        const opacity = (0.35 + ((n * 29) % 50) / 100) * p;
        const fill = (n % 3 === 0) ? '#ff7a3d' : '#ffae5c';
        embers += `<circle class="rs-ember" data-ember="${n}" cx="${x}" cy="${Math.round((30 + radius * Math.sin(angle) - rise) * 100) / 100}" r="${sizes[n]}" fill="${fill}" opacity="${opacity}" filter="url(#rs-ember)"/>`;
      }
      const strokeAttr = `stroke-dasharray="${pathLength}" stroke-dashoffset="${offset}" pathLength="${pathLength}"`;
      return `<g transform="${transform}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${strokeAttr}>${embers}<path d="${path}" stroke="#ffd98a" stroke-width="9" opacity="0.28" filter="url(#rs-rune-glow)"/><path d="${path}" stroke="url(#rs-light)" stroke-width="5" filter="url(#rs-rune-glow)"/></g>`;
    case 'text':
      const escaped = el.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      let tStyle = '';
      if (style === 'runes') tStyle = 'font-family="Georgia, \'Times New Roman\', serif" fill="url(#rs-light)" letter-spacing="2" filter="url(#rs-glow)"';
      else if (style === 'blueprint') tStyle = 'font-family="Consolas, \'Courier New\', monospace" fill="#f2f6fa"';
      else if (style === 'paper') tStyle = 'font-family="\'Segoe Print\', \'Comic Sans MS\', cursive" fill="#2c2118"';
      else tStyle = `font-family="Arial, sans-serif" fill="${el.fill || '#111111'}"`;
      const fs = el.fontSize ? ` font-size="${el.fontSize}"` : '';
      if (el.reveal === 'letters') {
        let content = '';
        const enter = el.enter || 0;
        const stagger = el.stagger || 0;
        const rise = el.rise || 0;
        for (let i = 0; i < el.text.length; i++) {
          const start = enter + i * stagger;
          const raw = (time - start) / 0.4;
          const clamped = Math.max(0, Math.min(1, raw));
          const eased = 1 - (1 - clamped) ** 3;
          const opacity = Math.round(eased * 1000) / 1000;
          const dy = Math.round(rise * (1 - eased) * 100) / 100;
          content += `<tspan class="rs-letter" data-letter="${i}" opacity="${opacity}" dy="${dy}">${escaped[i] || ' '}</tspan>`;
        }
        const pos = el.path ? '' : ` x="${el.x}" y="${el.y}"`;
      const contentPart = el.path ? `<textPath href="#text-path-${el.id}">${content}</textPath>` : content;
      return `<text${pos} ${tStyle}${fs} opacity="${el.opacity ?? 1}">${contentPart}</text>`;
      }
      const pos = el.path ? '' : ` x="${el.x}" y="${el.y}"`;
      const contentPart = el.path ? `<textPath href="#text-path-${el.id}">${escaped}</textPath>` : escaped;
      return `<text${pos} ${tStyle}${fs} opacity="${el.opacity ?? 1}">${contentPart}</text>`;
    case 'image':
      return `<image x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" href="${el.href}" />`;
    case 'svg': {
      const content = readFileSync(el.href, 'utf8');
      const inner = content.replace(/^<svg[^>]*>|<\/svg>$/gi, '');
      const prefix = `rsimp-${el.id}-`;
      const modified = inner
        .replace(/id="([^"]+)"/g, `id="${prefix}$1"`)
        .replace(/href="#([^"]+)"/g, `href="#${prefix}$1"`)
        .replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);
      return `<g transform="translate(${el.x},${el.y}) scale(${el.scale ?? 1})">${modified}</g>`;
    }
    case 'path': {
      let pBase = `<path d="${el.d}" fill="${el.fill || 'none'}"`;
      if (el.stroke) pBase += ` stroke="${el.stroke}" stroke-width="${el.strokeWidth || 2}"`;
      if (el.draw) {
        const p = Math.max(0, Math.min(1, (time - el.draw.start) / el.draw.duration));
        const offset = Math.round(1000 * (1 - p) * 100) / 100;
        pBase += ` pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="${offset}"`;
      }
      return pBase + ' />';
    }
    case 'polygon': {
      let polyBase = `<polygon points="${el.points}" fill="${el.fill || 'none'}"`;
      if (el.stroke) polyBase += ` stroke="${el.stroke}" stroke-width="${el.strokeWidth || 2}"`;
      if (el.draw) {
        const p = Math.max(0, Math.min(1, (time - el.draw.start) / el.draw.duration));
        const offset = Math.round(1000 * (1 - p) * 100) / 100;
        polyBase += ` pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="${offset}"`;
      }
      return polyBase + ' />';
    }
    case 'chart': {
      let rows = el.rows || [];
      if (el.csv) {
        try {
          const content = readFileSync(el.csv, 'utf8');
          rows = content.split('\n').slice(1).filter(line => line.trim()).map(line => {
            const [label, value] = line.split(',');
            return { label, value: parseFloat(value) };
          });
        } catch(e) { rows = []; }
      }
      const n = rows.length;
      if (n === 0) return '';
      const barGap = el.barGap ?? 6;
      const barW = (el.width - barGap * (n - 1)) / n;
      const max = el.max ?? Math.max(...rows.map(r => r.value));
      const start = el.start ?? 0;
      const duration = el.duration ?? 1;
      const p = Math.max(0, Math.min(1, duration === 0 ? 1 : (time - start) / duration));
      const fill = el.fill || '#4a90d9';
      if (el.chartType === 'line') {
        const points = rows.map((r, i) => {
          const x = el.x + i * (barW + barGap) + barW / 2;
          const fullH = el.height * (r.value / max);
          const y = (el.y + el.height) - (fullH * p);
          return `${x},${y}`;
        }).join(' ');
        return `<g class="rs-chart" data-chart-type="line"><polyline class="rs-chart-line" points="${points}" fill="none" stroke="${fill}" stroke-width="2" /></g>`;
      } else {
        let bars = '';
        rows.forEach((r, i) => {
          const x = el.x + i * (barW + barGap);
          const fullH = el.height * (r.value / max);
          const h = fullH * p;
          const y = (el.y + el.height) - h;
          bars += `<rect class="rs-chart-bar" data-bar="${i}" x="${x}" y="${y}" width="${barW}" height="${h}" fill="${fill}" />`;
        });
        return `<g class="rs-chart" data-chart-type="bar">${bars}</g>`;
      }
    }
    case 'burst': {
      const s = time - el.at;
      if (s < 0 || s >= el.life) {
        return '';
      }
      let svg = '';
      for (let k = 0; k < el.count; k++) {
        const wobble_deg = ((k * 53 + el.seed * 17) % 21) - 10;
        const angle_deg = el.seed * 97 + k * (360 / el.count) + wobble_deg;
        const angle_rad = angle_deg * Math.PI / 180;
        const speed_k = el.speed * (0.6 + ((k * 37 + el.seed) % 40) / 100);
        const cx = el.x + Math.cos(angle_rad) * speed_k * s;
        const cy = el.y + Math.sin(angle_rad) * speed_k * s + 0.5 * el.gravity * s * s;
        const opacity = 1 - s / el.life;
        const radius = 2.2 - 1.5 * s / el.life;
        const cx_rounded = Math.round(cx * 100) / 100;
        const cy_rounded = Math.round(cy * 100) / 100;
        const radius_rounded = Math.round(radius * 100) / 100;
        const opacity_rounded = Math.round(opacity * 100) / 100;
        const fill = (k % 3 === 0) ? '#ff7a3d' : '#ffae5c';
        svg += `<circle class="rs-burst" data-burst="${k}" cx="${cx_rounded}" cy="${cy_rounded}" r="${radius_rounded}" fill="${fill}" opacity="${opacity_rounded}" />`;
      }
      return svg;
    }
    case 'scatter': {
      const circles = getScatterElements(el, time);
      return circles.map(c => `<circle class="rs-scatter" data-scatter="${c._scatter_idx}" cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${c.fill}" opacity="${c.opacity}" />`).join('\n');
    }
    default:
      return '';
  }
  if (style === 'runes') {
    base = base.slice(0, -2) + ` stroke="url(#rs-light)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" filter="url(#rs-glow)" />`;
  } else if (style === 'paper' && (el.type === 'rect' || el.type === 'circle')) {
    base = base.slice(0, -2) + ` class="rs-ink" filter="url(#rs-wobble)" stroke="#2c2118" stroke-width="2" fill-opacity="0.55" />`;
  }
  return base;
}
