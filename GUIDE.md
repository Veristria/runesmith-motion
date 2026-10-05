# Runesmith Motion Guide

Runesmith Motion allows creating animated clips using a declarative JSON format.

## Project Structure (`.motion.json`)

Projects are defined as follows:

```json
{
  "project": {
    "name": "My Animation",
    "width": 800,
    "height": 600,
    "fps": 30,
    "style": "runes"
  },
  "timeline": [
    { "time": 0, "elements": [...] },
    { "time": 2.5, "elements": [...] }
  ]
}
```

- **Styles**: `runes`, `blueprint`, `paper`.
- **Easing**: `linear`, `easeIn`, `easeOut`, `easeInOut`, `easeOutQuad`, `easeInCubic`, `easeOutCubic`, `easeInOutSine`.

## Element Types

Elements describe visual objects at a specific keyframe:

- `rect`: `x`, `y`, `width`, `height`, `fill`
- `circle`: `x`, `y`, `r`, `fill`
- `text`: `x`, `y`, `text`, `size`
- `image`: `x`, `y`, `width`, `height`, `src`
- `rune`: `x`, `y`, `scale`, `drawStart`, `drawDuration`

## Command Line

Run the logic directly using `motion.mjs`.

- **View JSON state at T**: `node motion.mjs FILE --at T --json`
- **Export SVG at T**: `node motion.mjs FILE --at T --svg OUT.svg`

Example: `node motion.mjs sample.motion.json --at 1.5 --svg frame.svg`