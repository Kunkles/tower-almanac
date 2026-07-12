# The Tower Almanac

A planting guide and pocket tracker for a **Garden Tower 2** vertical garden — the rotating, vermicomposting tower (5 scalloped rings × 9 pockets + 5 crown spots = 50 plants, worm column down the middle, nutrient tea drawer at the base).

The tower is rendered in **3D** (Three.js): drag to spin it, scroll to zoom, tap a ring or pocket to select it. Planted pockets grow procedural plants — every one of the 30 species has its own recognizable mature form (ruffled lettuce rosettes, feathery carrot tops, tomato vines with fruit trusses, chive blossoms…), built entirely from code with no model files.

## Why the recommendations look the way they do

The physical tower rotates 360°, so sun exposure is uniform around the circumference. The meaningful gradient is **vertical**: the top gets the most sun and dries fastest; the bottom is most shaded, moistest, and richest (water + worm-compost nutrients migrate down). All plant placement logic keys off that — vines low and trellised out, Mediterranean herbs up top, brassicas in the rich lower-middle.

Season logic is intentionally **Southern California** (USDA ~zone 10): warm season Apr–Sep, cool season Oct–Mar.

## Running it

No build step. Serve the folder with any static server:

```sh
python3 -m http.server 4173
# → http://localhost:4173
```

(A server is needed because the app uses ES modules; opening `index.html` via `file://` won't load them.)

Plantings persist in `localStorage` on the device.

## Stack

Vanilla JS + [Three.js](https://threejs.org) via CDN import map. Google Fonts. Nothing else.
