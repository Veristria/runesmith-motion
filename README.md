# Runesmith Motion

A small motion-graphics program. You describe a clip in a JSON file (`.motion.json`): its size, its frame rate, and
elements that move between keyframes. The program renders any moment of the clip to SVG, prints its state as JSON, or
exports Lottie JSON and a folder of SVG frames. It runs on Node.js with no dependencies.

**It is made to be used by agents.** There is no editor window: an AI agent (or a person) writes the clip as JSON, runs
the command line, and reads back SVG frames, Lottie JSON or the state of every element as JSON. That is how the graphics
of the Runesmith launch film were made.

**It was built by [Runesmith](https://github.com/Veristria/runesmith), autonomously, by free AI models.** Runesmith is a system that plans software
as milestones, has an AI model write the code, and checks every step against acceptance checks before the change is
applied. Every line of the program's files in this repository (`motion.mjs` and the others listed under "What is here")
was written by free-tier AI models running through Runesmith. The only files not written that way are this README,
`LICENSE`, `NOTICE`, `.gitignore` and `.gitattributes`. We publish it as a worked example of what Runesmith does, and as an honest record of how far that got.

"Autonomously" has a precise meaning here. Runesmith wrote, checked and applied the code. For most of the project a person
directed it: the operator (an AI acting as the project's owner) added most of the milestones, approved or turned down
many of the acceptance checks, reviewed the results, and stepped in whenever the work stalled. The numbers below say how
much. Twice it ran unattended by the project lead's definition ("seeing it go at least from one milestone through to the
next without interfering"): on 2026-09-29, after the operator's session ended at 13:30 UTC, the schedule applied five
milestones by itself in 1 h 43 min; and on 2026-10-05, with no owner action from 02:43 to 05:19 UTC, it applied two
milestones in a row (03:18 and 04:28 UTC) that its own stuck policy had split off, with checks proposed and approved by
its check autopilot. Both stretches then stopped and waited for the owner: the first at a file-size limit, the second
when free models could not edit the 40 KB `motion.mjs` within their tries.

## Run it

You need [Node.js](https://nodejs.org) (the program was developed and exported with Node 24).

```
node motion.mjs sample.motion.json --at 1.5 --svg frame.svg    # draw the clip at 1.5 s into an SVG file
node motion.mjs sample.motion.json --at 1.5 --json             # print the state of every element at 1.5 s
```

`sample.motion.json` is an empty starting template: an 800x600 project at 30 fps with no elements yet, so these two
commands draw an empty frame and print an empty list until elements are added. `GUIDE.md` shows the element types and how
they move between keyframes.

`GUIDE.md` describes the project file format (styles, easing, element types) and the command line. The code also accepts
these options, which `GUIDE.md` does not describe yet:

- `--lottie FILE`: also write the whole clip as Lottie JSON
- `--frames DIR`: write every frame of the clip as an SVG file in DIR
- `--fps N`: the frame rate for --frames (default: the project's)
- `--format 16:9`: fit the drawing into that frame shape (also 9:16 and 1:1)

## What is here

- `editor.mjs`: meant to be the page's editor; a stub as built
- `GUIDE.md`: the project file format and the command line
- `index.html`: the editor page; a stub as built
- `motion.mjs`: the engine: reads a project, works out every element at a time, draws it, and exports
- `paints.mjs`: gradient fills
- `record.html`: the recorder page; a stub as built
- `renderer.mjs`: meant to be the page's renderer; a stub as built
- `sample.motion.json`: an empty starting template (a project with no elements yet)
- `scatter.mjs`: scattered elements that fade out
- `RUNESMITH.md`: Runesmith's own log of what it did in this folder

This repository was exported on 2026-10-05 21:25Z (UTC), from the project's folder as it was at that moment. Most of the work is
in `motion.mjs`. Some of the other files are small or only a start: `editor.mjs` (4 lines), `index.html` (11 lines), `record.html` (13 lines), `renderer.mjs` (5 lines). They are published as built. The program is
a work in progress; see the status below.

## The numbers

These are exact figures from Runesmith's own records of this project, read on 2026-10-05T11:20Z (UTC). The project was still being
built when this repository was prepared, so they move.

| What | Figure |
|---|---|
| Plan | 137 milestones: 54 done, 76 open, 7 dropped. "Done" means a milestone's approved checks passed and its change was applied. It does not mean the feature works. |
| Who planned it | Runesmith planned 21 of the 137 milestones (its own first plan, breakdowns the owner adopted, and smaller steps its stuck policy split off and adopted by itself). The operator added the other 116 through the Studio's milestone form. |
| Changes applied | 54, every one through Runesmith's guarded build path. The last model to write each file was Gemini 3.1 Flash Lite for 48 changes and Nemotron 3 Super 120B-A12B for 6. |
| Files | When read at 2026-10-05T11:20Z, 10 of 10 code and data files were byte for byte what the last applied change wrote. |
| Model calls | 1141 recorded: 771 answered, 370 not (rate limits, timeouts and unusable output). Recorded cost: $0.00; 89 calls carry no cost figure. "Free" is the routes' label, not a metered cost. |
| Acceptance checks | Runesmith's check autopilot made 135 decisions: 78 approved, 33 turned down, 24 left for the owner. At an earlier count, the operator's own audit judged 8 of 49 approvals wrong. |
| When | First change applied 2026-09-28T16:51:13Z; latest 2026-10-05T04:28:44Z. Between them, work was held for the owner for about two days (2026-10-02 to 2026-10-04) for a recovery review. |

## Status, plainly

- The project is not finished and not polished. The project lead judged the output "not yet world class" on 2026-10-01.
- Text-and-parse checks passed three rendering defects that only a person's eye caught.
- Some milestones are "done in name only": the recorder milestone's checks asked only that certain words appear, so
  `record.html` is a stub that passes them.
- The operator is the same AI that audits the checks, so these audits are a self-review, not human QA.

The paper behind Runesmith, *Beyond the Model*, and the Runesmith code are linked from the [Runesmith repository](https://github.com/Veristria/runesmith).

## License

Apache-2.0 (see `LICENSE`). Copyright 2026 AI ThinkLab.
