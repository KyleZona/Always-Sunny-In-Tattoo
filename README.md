# Always Sunny in Tattoo

Website for Alukx Alexi Tattoo. Plain HTML, CSS and JS, hosted on GitHub Pages.

## Arranging the gallery wall and sticker wall

Open the site with `?arrange` on the end of the address, e.g. `https://kylezona.github.io/Always-Sunny-In-Tattoo/?arrange`.

- Switch between **Gallery wall** and **Sticker wall** at the top.
- Click to select, drag to move, drag a corner to resize, drag the round handle to tilt.
- **Duplicate** (Ctrl+D), **Delete** (Del), **Forward/Back** ( ] / [ ) for overlaps, arrow keys to nudge (Shift = bigger steps).
- Gallery: swap the photo or frame of the selected piece from the strip under the toolbar; **Wall height** makes room for more frames.
- Stickers: **Flip**, **Scatter** for a random starting point, **Ghost text** shows where the Deals/FAQ text sits.
- **Snap** lines up edges and centers with other pieces.
- Undo / Redo / Reset. Unsaved changes are kept as a draft in your browser.
- **Save** writes `data/layout.js` to this repo (needs a fine-grained GitHub token with Contents: read and write on this repo only). Or download the file and upload it by hand.

## Adding a new tattoo photo or sticker

1. Put the image in `images/`.
2. Add a line for it in `data/catalog.js` under `photos` (tattoo photos) or `stickers`.
3. It shows up in the editor's **Add** panel.

## Files

- `index.html`, `about.html`, `work.html`, `faq.html`, `book.html`: the pages (book.html holds the calendar, request-a-date and flash-day screens)
- `images/flash/fl-1.png` … `fl-24.png`: flash designs for deal days (add these)
- `assets/js/dc.js`: runs the page templates (calendar, forms)
- `index.html` home page
- `data/layout.js`: where every frame and sticker sits (written by the editor)
- `data/catalog.js`: the frames, photos and stickers you can use
- `assets/js/walls.js`: draws both walls
- `assets/js/arrange.js`, `assets/css/arrange.css`: the editor (only loads with `?arrange`)
