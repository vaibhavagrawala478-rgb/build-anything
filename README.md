<img src="assets/icon.svg" width="64" height="64" alt="">

# BuildAnything

[![Fork](https://img.shields.io/github/forks/vaibhavagrawala478-rgb/build-anything?style=social)](https://github.com/vaibhavagrawala478-rgb/build-anything/fork)
[![Stars](https://img.shields.io/github/stars/vaibhavagrawala478-rgb/build-anything?style=social)](https://github.com/vaibhavagrawala478-rgb/build-anything)
[![Sponsor](https://img.shields.io/badge/sponsor-%E2%99%A5-ea4aaa)](https://github.com/sponsors/vaibhavagrawala478-rgb)

Design houses, machines, vehicles, cities and spaces with a huge library of 3D components — right in the browser.

## Features

- **3D editor** — isometric/orthographic or perspective camera, soft shadows, move/rotate/scale gizmo, snapping, multi-select, groups, undo/redo, copy/paste, direct drag on the floor, hide/lock, drag-and-drop reordering in the scene tree.
- **77 components** across Architecture, Furniture, Vehicles, City, Nature, Machines, Physics and Primitives. Every component is procedural and has live parameters (size, teeth, floors, …) plus recolourable material slots and finishes (matte, glossy, metal, clay, glass, glow).
- **Materials** — per-part colours and finishes in the inspector.
- **Physics** — set objects to *Static* or *Dynamic* and press **Space**: bodies fall, stack, roll down ramps and can be shoved by clicking them ([cannon-es](https://github.com/pmndrs/cannon-es)).
- **Mechanical components & interactive simulations** — meshing gears with correct ratios, crank-slider piston, motor, conveyor, fan, spring, robot arm, pendulum, lift, windmill. Any object can also get a spin / swing / slide motion.
- **Blueprints** — `B` switches to a technical top-down view with live dimensions; export it as a PNG.
- **AI Generate** — type a prompt (“red sports car”, “three pine trees”, “plants in pots”) to get variants in five styles. It runs locally by matching your words to the component library, so it works offline.
- **Templates & community** — a workspace room, tiny house, city block, gear machine and physics playground, plus featured showcase scenes. Publish your own designs to a local shelf.
- **Share & export** — share links (the scene is encoded in the URL, no server), PNG, GLB, glTF, OBJ, STL and scene JSON. Import `.glb`/`.gltf` and scene files.
- **Frame, comments, text labels, sun/lighting controls**, auto-save to the browser.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

Press `?` in the app for all keyboard shortcuts.

## Structure

```
src/engine   scene document, viewport, simulation, component library, generator, templates
src/ui       sidebar, toolbar, inspector, overlays, dialogs
```

## Forks & contributing

Fork it, remix it, send a pull request — see [CONTRIBUTING.md](CONTRIBUTING.md). Click **Fork** on GitHub to get your own copy.

## Sponsors

BuildAnything is free and built in the open. If it's useful to you, you can support its development through [GitHub Sponsors](https://github.com/sponsors/vaibhavagrawala478-rgb). Thank you!

Created in [T3 Code](https://t3.codes).
