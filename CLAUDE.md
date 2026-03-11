# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static single-page marketing website for the **Horizonte Penthouse Collection** — a luxury real estate project in Mijas, Costa del Sol. No build tools, package managers, or frameworks — open `index.html` directly in a browser or serve it with any static server.

## Development

```bash
# Serve locally (pick any static server)
python3 -m http.server 8080
# or
npx serve .
```

No build, lint, or test commands exist.

## Architecture

Three source files drive the entire page:

- [index.html](index.html) — single HTML document; all sections live here as `<div>` wrappers
- [style.css](style.css) — all styling; self-hosted fonts loaded via `@font-face` at the top
- [script.js](script.js) — all interactivity; GSAP + ScrollTrigger loaded from CDN before this file

### Sections (top to bottom in HTML)
| CSS class | What it is |
|---|---|
| `.hero` | Full-viewport hero with background image and nav |
| `.text_section` | Pinned scroll reveal of title/subtitle/buttons |
| `.cards_section` | Terrace background image with 3 absolutely-positioned info cards that animate upward |
| `.location_section` | Location title with word-shuffle reveal animation |
| `.exterior_section` | Stacked-card image slider (NEXT/BACK controls) |
| `.interior_section` | Pinned stacked-card scroll: 4 interior images rise one over the other |
| `.sea-section` | Pinned masked-text + scale image reveal |
| `.floorplans` + `.plan-card` | Price table with hover-follow floor plan popup cards |
| `.amenity` | Pinned scroll-snapping amenity slideshow |
| `.video-hero` | Full-screen background video with clipped text reveals |

### Animation pattern
All scroll animations use **GSAP ScrollTrigger**. The dominant pattern is:

```js
gsap.timeline({
  scrollTrigger: { trigger: ".section", start: "top top", end: "+=N", pin: true, scrub: 1 }
})
```

Sections that need `pin: true` consume extra scroll height via GSAP's automatic pin spacer. Refresh (`ScrollTrigger.refresh()`) is called after page load to restore saved scroll position from `sessionStorage`.

### Typography
Two typeface families, both self-hosted under [fonts/](fonts/):
- **Canela Web** (`font-family: 'Canela Web'`, weight 100) — display headings
- **Apercu / Apercu Mono** — body text and labels

### Assets
All images are in [images/](images/). A video file (`./video/sea-sunset.mp4`) is referenced in the video section but not included in the repository.
