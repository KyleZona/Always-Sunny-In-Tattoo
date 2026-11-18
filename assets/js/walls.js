/* Renders the gallery wall and sticker wall from data/layout.js + data/catalog.js.
   Positions are in "cqw" (percent of the wall's width), so a wall scales as one piece.
   Open index.html?arrange to edit the layout. */
(function () {
  var CAT = window.WALL_CATALOG, LAYOUT = window.WALL_LAYOUT;

  var css = document.createElement('style');
  css.textContent =
    '[data-wall]{container-type:inline-size;isolation:isolate}' +
    '.w-item{position:absolute;transform-origin:50% 50%}' +
    '.w-item img{display:block;pointer-events:none;user-select:none;-webkit-user-drag:none}' +
    '.w-frame .w-photo{position:absolute;object-fit:cover}' +
    '.w-frame .w-border{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 14px 16px rgba(0,0,0,.55)) drop-shadow(0 2px 3px rgba(0,0,0,.5))}' +
    '.w-sticker img{width:100%;height:auto;filter:drop-shadow(0 4px 6px rgba(0,0,0,.5))}';
  document.head.appendChild(css);

  function frameEl(it) {
    var f = CAT.frames[it.frame], p = CAT.photos[it.photo] || { src: '', alt: '' };
    var d = document.createElement('div');
    d.className = 'w-item w-frame';
    d.style.aspectRatio = f.aspect;
    var ph = document.createElement('img');
    ph.className = 'w-photo';
    ph.src = p.src; ph.alt = p.alt;
    ph.style.cssText = 'left:' + f.win[0] + '%;top:' + f.win[1] + '%;width:' + f.win[2] + '%;height:' + f.win[3] + '%' + (f.oval ? ';border-radius:50%' : '');
    var fr = document.createElement('img');
    fr.className = 'w-border'; fr.src = f.src; fr.alt = ''; fr.setAttribute('aria-hidden', 'true');
    d.appendChild(ph); d.appendChild(fr);
    return d;
  }

  function stickerEl(it) {
    var s = CAT.stickers[it.s];
    var d = document.createElement('div');
    d.className = 'w-item w-sticker';
    var im = document.createElement('img');
    im.src = s.src; im.alt = s.alt;
    d.appendChild(im);
    return d;
  }

  function place(el, it, i) {
    el.style.left = it.x + 'cqw';
    el.style.top = it.y + 'cqw';
    el.style.width = it.w + 'cqw';
    el.style.zIndex = i + 1;
    el.style.transform = 'rotate(' + (it.rot || 0) + 'deg)' + (it.flip ? ' scaleX(-1)' : '');
  }

  function render(name) {
    var wall = document.querySelector('[data-wall="' + name + '"]');
    if (!wall) return;
    var data = LAYOUT[name];
    wall.querySelectorAll('.w-item').forEach(function (n) { n.remove(); });
    if (name === 'gallery') wall.style.aspectRatio = '100 / ' + data.height;
    data.items.forEach(function (it, i) {
      var el = name === 'gallery' ? frameEl(it) : stickerEl(it);
      el.dataset.index = i;
      place(el, it, i);
      wall.appendChild(el);
    });
  }

  window.Walls = { render: render, place: place, catalog: CAT, get layout() { return LAYOUT; }, set layout(v) { LAYOUT = v; window.WALL_LAYOUT = v; } };
  render('gallery');
  render('stickers');

  if (/[?&]arrange\b/.test(location.search) && document.querySelector('[data-wall="gallery"]')) {
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'assets/css/arrange.css';
    document.head.appendChild(l);
    var s = document.createElement('script'); s.src = 'assets/js/arrange.js';
    document.body.appendChild(s);
  }
})();
