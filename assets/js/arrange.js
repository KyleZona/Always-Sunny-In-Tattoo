/* Arrange editor for the gallery wall + sticker wall. Loaded only on index.html?arrange */
(function () {
  var W = window.Walls, CAT = W.catalog;
  var L = JSON.parse(JSON.stringify(W.layout));
  var SAVED = JSON.stringify(L);
  var REPO_DEFAULT = 'KyleZona/Always-Sunny-In-Tattoo';
  var active = 'gallery', sel = null, snap = true, ghost = true;
  var undo = [], redo = [];

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  var wallEl = function (n) { return document.querySelector('[data-wall="' + (n || active) + '"]'); };
  var items = function () { return L[active].items; };
  var cur = function () { return sel == null ? null : items()[sel]; };
  var pxPerUnit = function () { return wallEl().getBoundingClientRect().width / 100; };

  /* ---------- UI ---------- */
  var bar = document.createElement('div');
  bar.id = 'arrBar';
  bar.innerHTML =
    '<div class="arr-row">' +
    '<b class="arr-title">Arrange</b>' +
    '<div class="arr-seg"><button data-seg="gallery" class="on">Gallery wall</button><button data-seg="stickers">Sticker wall</button></div>' +
    '<span class="arr-sep"></span>' +
    '<button data-act="add" title="Add from library">＋ Add</button>' +
    '<button data-act="dup" title="Duplicate (Ctrl+D)" data-need>Duplicate</button>' +
    '<button data-act="del" title="Delete (Del)" data-need>Delete</button>' +
    '<button data-act="front" title="Bring forward (])" data-need>Forward</button>' +
    '<button data-act="back" title="Send back ([)" data-need>Back</button>' +
    '<button data-act="flip" title="Mirror" data-need data-only="stickers">Flip</button>' +
    '<label class="arr-lab" data-need>Size <input type="range" id="arrSize" min="2" max="60" step="0.1"></label>' +
    '<label class="arr-lab" data-need>Tilt <input type="range" id="arrRot" min="-45" max="45" step="1"><span id="arrRotV">0°</span></label>' +
    '<span class="arr-sep"></span>' +
    '<label class="arr-lab" data-only="gallery">Wall height <input type="range" id="arrH" min="20" max="120" step="0.5"></label>' +
    '<button data-act="scatter" data-only="stickers" title="Random arrangement to start from">Scatter</button>' +
    '<label class="arr-lab" data-only="stickers"><input type="checkbox" id="arrGhost" checked> Ghost text</label>' +
    '<label class="arr-lab"><input type="checkbox" id="arrSnap" checked> Snap</label>' +
    '<span class="arr-grow"></span>' +
    '<button data-act="undo" title="Undo (Ctrl+Z)">↶</button><button data-act="redo" title="Redo (Ctrl+Shift+Z)">↷</button>' +
    '<button data-act="reset" title="Back to last saved layout">Reset</button>' +
    '<button data-act="save" class="arr-primary">Save</button>' +
    '<button data-act="exit" title="Leave arrange mode">✕</button>' +
    '</div>' +
    '<div class="arr-row arr-sub" id="arrSwap"></div>';
  document.body.appendChild(bar);
  document.body.classList.add('arranging');

  var drawer = document.createElement('div');
  drawer.id = 'arrDrawer';
  document.body.appendChild(drawer);
  new ResizeObserver(function () { var h = bar.offsetHeight + 'px'; document.body.style.paddingTop = h; drawer.style.top = h; }).observe(bar);

  var modal = document.createElement('div');
  modal.id = 'arrModal';
  document.body.appendChild(modal);

  var toastEl = document.createElement('div');
  toastEl.id = 'arrToast';
  document.body.appendChild(toastEl);
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove('show'); }, 2200); }

  var guideV = document.createElement('div'), guideH = document.createElement('div');
  guideV.className = 'arr-guide v'; guideH.className = 'arr-guide h';

  /* ---------- render + selection ---------- */
  function render(name) {
    W.layout = L;
    W.render(name || active);
    if (!name || name === active) decorate();
  }
  function renderAll() { W.layout = L; W.render('gallery'); W.render('stickers'); decorate(); }

  function decorate() {
    ['gallery', 'stickers'].forEach(function (n) { wallEl(n).classList.toggle('arr-active', n === active); });
    var w = wallEl();
    w.appendChild(guideV); w.appendChild(guideH);
    w.querySelectorAll('.w-item').forEach(function (el) {
      var i = +el.dataset.index;
      if (i === sel) {
        el.classList.add('arr-sel');
        var box = document.createElement('div');
        box.className = 'arr-box';
        box.innerHTML = '<i data-h="nw"></i><i data-h="ne"></i><i data-h="sw"></i><i data-h="se"></i><i data-h="rot" class="arr-rot"></i>';
        el.appendChild(box);
      }
    });
    syncBar();
  }

  function syncBar() {
    bar.querySelectorAll('.arr-seg button').forEach(function (b) { b.classList.toggle("on", b.dataset.seg === active); });
    bar.querySelectorAll('[data-only]').forEach(function (b) { b.style.display = b.dataset.only === active ? '' : 'none'; });
    var it = cur();
    bar.querySelectorAll('[data-need]').forEach(function (b) {
      if (b.dataset.only && b.dataset.only !== active) return;
      b.classList.toggle('arr-dis', !it);
      if (b.tagName === 'BUTTON') b.disabled = !it;
    });
    if (it) {
      bar.querySelector('#arrSize').value = it.w;
      bar.querySelector('#arrRot').value = it.rot || 0;
      bar.querySelector('#arrRotV').textContent = Math.round(it.rot || 0) + '°';
    }
    bar.querySelector('#arrH').value = L.gallery.height;
    document.body.classList.toggle('arr-stickers', active === 'stickers');
    document.body.classList.toggle('arr-ghost', active === 'stickers' && ghost);
    swapRow();
  }

  function swapRow() {
    var row = bar.querySelector('#arrSwap'), it = cur();
    if (!it || active !== 'gallery') { row.innerHTML = ''; row.style.display = 'none'; return; }
    row.style.display = '';
    var h = '<span class="arr-lbl">Photo</span>';
    Object.keys(CAT.photos).forEach(function (k) {
      h += '<img src="' + CAT.photos[k].src + '" data-photo="' + k + '" class="' + (k === it.photo ? 'on' : '') + '" title="' + CAT.photos[k].alt + '">';
    });
    h += '<span class="arr-lbl">Frame</span>';
    Object.keys(CAT.frames).forEach(function (k) {
      h += '<img src="' + CAT.frames[k].src + '" data-frame="' + k + '" class="arr-fr ' + (k === it.frame ? 'on' : '') + '" title="' + k + '">';
    });
    row.innerHTML = h;
  }

  function select(i) { sel = i; render(); }
  function setActive(n) {
    if (active === n) return;
    active = n; sel = null; renderAll();
    wallEl().scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- history ---------- */
  function snapshot() {
    undo.push(JSON.stringify(L)); if (undo.length > 100) undo.shift();
    redo = [];
  }
  function changed() { ls('wallDraft', JSON.stringify(L)); }
  function doUndo() { if (!undo.length) return; redo.push(JSON.stringify(L)); L = JSON.parse(undo.pop()); fixSel(); renderAll(); changed(); }
  function doRedo() { if (!redo.length) return; undo.push(JSON.stringify(L)); L = JSON.parse(redo.pop()); fixSel(); renderAll(); changed(); }
  function fixSel() { if (sel != null && sel >= items().length) sel = null; }

  /* ---------- geometry ---------- */
  function itemH(it, el) {
    if (active === 'gallery') return it.w / CAT.frames[it.frame].aspect;
    var im = el && el.querySelector('img');
    var r = im && im.naturalWidth ? im.naturalHeight / im.naturalWidth : 1;
    return it.w * r;
  }
  function wallHUnits() { var r = wallEl().getBoundingClientRect(); return r.height / r.width * 100; }

  function snapMove(i, x, y, el) {
    guideV.style.display = guideH.style.display = 'none';
    if (!snap) return [x, y];
    var it = items()[i], w = it.w, h = itemH(it, el), T = 0.7;
    var xs = [0, 50, 100], ys = [0, wallHUnits() / 2, wallHUnits()];
    wallEl().querySelectorAll('.w-item').forEach(function (o) {
      var j = +o.dataset.index; if (j === i) return;
      var oi = items()[j], oh = itemH(oi, o);
      xs.push(oi.x, oi.x + oi.w / 2, oi.x + oi.w);
      ys.push(oi.y, oi.y + oh / 2, oi.y + oh);
    });
    var bx = null, by = null;
    [[0, 'l'], [w / 2, 'c'], [w, 'r']].forEach(function (p) {
      xs.forEach(function (g) { var d = g - (x + p[0]); if (Math.abs(d) < T && (!bx || Math.abs(d) < Math.abs(bx.d))) bx = { d: d, g: g }; });
    });
    [[0], [h / 2], [h]].forEach(function (p) {
      ys.forEach(function (g) { var d = g - (y + p[0]); if (Math.abs(d) < T && (!by || Math.abs(d) < Math.abs(by.d))) by = { d: d, g: g }; });
    });
    if (bx) { x += bx.d; guideV.style.display = 'block'; guideV.style.left = bx.g + 'cqw'; }
    if (by) { y += by.d; guideH.style.display = 'block'; guideH.style.top = by.g + 'cqw'; }
    return [x, y];
  }

  /* ---------- pointer ---------- */
  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || e.target.closest('#arrBar,#arrDrawer,#arrModal')) return;
    var wall = e.target.closest('[data-wall]');
    if (!wall) { return; }
    var name = wall.dataset.wall;
    if (name !== active) { active = name; sel = null; renderAll(); }
    var handle = e.target.closest('.arr-box i');
    var el = e.target.closest('.w-item');
    if (!el) { if (sel != null) select(null); return; }
    e.preventDefault();
    var i = +el.dataset.index;
    if (i !== sel && !handle) { sel = i; render(); el = wallEl().querySelector('.w-item[data-index="' + i + '"]'); }
    var it = items()[i], r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    drag = {
      i: i, el: el, mode: handle ? handle.dataset.h : 'move', sx: e.clientX, sy: e.clientY,
      x0: it.x, y0: it.y, w0: it.w, rot0: it.rot || 0, cx: cx, cy: cy,
      d0: Math.hypot(e.clientX - cx, e.clientY - cy), h0: itemH(it, el), moved: false, before: JSON.stringify(L)
    };
    document.body.classList.add('arr-dragging');
  });

  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var it = items()[drag.i], u = pxPerUnit();
    var dx = (e.clientX - drag.sx) / u, dy = (e.clientY - drag.sy) / u;
    if (!drag.moved && Math.hypot(dx, dy) * u < 3) return;
    drag.moved = true;
    if (drag.mode === 'move') {
      var p = snapMove(drag.i, drag.x0 + dx, drag.y0 + dy, drag.el);
      it.x = round(p[0]); it.y = round(p[1]);
    } else if (drag.mode === 'rot') {
      var a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx) * 180 / Math.PI + 90;
      if (a > 180) a -= 360;
      if (snap && !e.altKey) { var s = Math.round(a / 15) * 15; if (Math.abs(s - a) < 4) a = s; }
      it.rot = Math.round(a);
    } else {
      var k = Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) / (drag.d0 || 1);
      var nw = clamp(drag.w0 * k, 2, 100);
      var nh = drag.h0 * nw / drag.w0;
      it.x = round(drag.x0 + drag.w0 / 2 - nw / 2);
      it.y = round(drag.y0 + drag.h0 / 2 - nh / 2);
      it.w = round(nw);
    }
    W.place(drag.el, it, drag.i);
    if (drag.mode !== 'move') syncBar();
  });

  document.addEventListener('pointerup', function () {
    if (!drag) return;
    if (drag.moved) { undo.push(drag.before); redo = []; changed(); }
    drag = null;
    guideV.style.display = guideH.style.display = 'none';
    document.body.classList.remove('arr-dragging');
    render();
  });

  function round(v) { return Math.round(v * 1000) / 1000; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- actions ---------- */
  var acts = {
    dup: function () {
      var it = cur(); if (!it) return; snapshot();
      var c = JSON.parse(JSON.stringify(it)); c.x = round(c.x + 2); c.y = round(c.y + 2);
      items().push(c); sel = items().length - 1; render(); changed(); toast('Duplicated: drag the copy where you want it');
    },
    del: function () { if (sel == null) return; snapshot(); items().splice(sel, 1); sel = null; render(); changed(); },
    front: function () { if (sel == null || sel >= items().length - 1) return; snapshot(); var a = items(); a.splice(sel + 1, 0, a.splice(sel, 1)[0]); sel++; render(); changed(); },
    back: function () { if (!sel) return; snapshot(); var a = items(); a.splice(sel - 1, 0, a.splice(sel, 1)[0]); sel--; render(); changed(); },
    flip: function () { var it = cur(); if (!it) return; snapshot(); it.flip = !it.flip; render(); changed(); },
    undo: doUndo, redo: doRedo,
    reset: function () {
      if (!confirmBox('Throw away changes and go back to the last saved layout?', function () { snapshot(); L = JSON.parse(SAVED); sel = null; renderAll(); ls('wallDraft', null); toast('Back to last saved'); })) return;
    },
    scatter: function () {
      var a = items(); if (!a.length) return;
      confirmBox('Randomly re-place all ' + a.length + ' stickers? (Undo brings it back.)', function () {
        snapshot();
        var H = wallHUnits();
        a.forEach(function (it) {
          it.x = round(Math.random() * (100 - it.w * 0.6) - it.w * 0.2);
          it.y = round(Math.random() * (H - it.w * 0.6) - it.w * 0.2);
          it.rot = Math.round(Math.random() * 36 - 18);
          it.flip = Math.random() < 0.25;
        });
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        sel = null; render(); changed();
      });
    },
    add: openDrawer,
    save: openSave,
    exit: function () {
      var go = function () { location.href = location.pathname + location.hash; };
      if (JSON.stringify(L) !== SAVED) confirmBox('You have unsaved changes (kept as a draft in this browser). Leave arrange mode?', go); else go();
    }
  };

  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b && b.dataset.seg) return setActive(b.dataset.seg);
    if (b && b.dataset.act && acts[b.dataset.act]) return acts[b.dataset.act]();
    var im = e.target.closest('#arrSwap img');
    if (im && cur()) {
      snapshot();
      if (im.dataset.photo) cur().photo = im.dataset.photo;
      if (im.dataset.frame) { var it = cur(), oldH = it.w / CAT.frames[it.frame].aspect; it.frame = im.dataset.frame; var nh = it.w / CAT.frames[it.frame].aspect; it.y = round(it.y + (oldH - nh) / 2); }
      render(); changed();
    }
  });

  var sliding = false;
  function slider(id, fn) {
    var inp = bar.querySelector(id);
    inp.addEventListener('pointerdown', function () { if (!sliding) { snapshot(); sliding = true; } });
    inp.addEventListener('keydown', function () { if (!sliding) { snapshot(); sliding = true; } });
    inp.addEventListener('input', function () { fn(+inp.value); });
    inp.addEventListener('change', function () { sliding = false; changed(); render(); });
  }
  slider('#arrSize', function (v) {
    var it = cur(); if (!it) return;
    var el = wallEl().querySelector('.w-item[data-index="' + sel + '"]');
    var h0 = itemH(it, el), nh = h0 * v / it.w;
    it.x = round(it.x + it.w / 2 - v / 2); it.y = round(it.y + h0 / 2 - nh / 2); it.w = v;
    W.place(el, it, sel);
  });
  slider('#arrRot', function (v) {
    var it = cur(); if (!it) return; it.rot = v;
    bar.querySelector('#arrRotV').textContent = v + '°';
    W.place(wallEl().querySelector('.w-item[data-index="' + sel + '"]'), it, sel);
  });
  slider('#arrH', function (v) { L.gallery.height = v; wallEl('gallery').style.aspectRatio = '100 / ' + v; });
  bar.querySelector('#arrSnap').addEventListener('change', function (e) { snap = e.target.checked; });
  bar.querySelector('#arrGhost').addEventListener('change', function (e) { ghost = e.target.checked; syncBar(); });

  document.addEventListener('keydown', function (e) {
    if (e.target.closest('input,textarea,select') && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
    if (modal.classList.contains('open')) { if (e.key === 'Escape') closeModal(); return; }
    var mod = e.ctrlKey || e.metaKey, k = e.key;
    if (mod && k.toLowerCase() === 'z') { e.preventDefault(); return e.shiftKey ? doRedo() : doUndo(); }
    if (mod && k.toLowerCase() === 'y') { e.preventDefault(); return doRedo(); }
    if (mod && k.toLowerCase() === 'd') { e.preventDefault(); return acts.dup(); }
    if (mod && k.toLowerCase() === 's') { e.preventDefault(); return openSave(); }
    if (k === 'Escape') { if (drawer.classList.contains('open')) return closeDrawer(); return select(null); }
    var it = cur(); if (!it) return;
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); return acts.del(); }
    if (k === ']') return acts.front();
    if (k === '[') return acts.back();
    var step = e.shiftKey ? 2 : 0.25, mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[k];
    if (mv) {
      e.preventDefault();
      if (!e.repeat) snapshot();
      it.x = round(it.x + mv[0]); it.y = round(it.y + mv[1]);
      W.place(wallEl().querySelector('.w-item[data-index="' + sel + '"]'), it, sel);
      changed();
    }
  });

  /* ---------- library drawer ---------- */
  var pickFrame = Object.keys(CAT.frames)[0];
  function openDrawer() {
    var h = '<div class="arr-dhead"><b>Add to ' + (active === 'gallery' ? 'gallery wall' : 'sticker wall') + '</b><button data-close>✕</button></div>';
    if (active === 'gallery') {
      h += '<p class="arr-hint">1. Pick a frame</p><div class="arr-grid fr">';
      Object.keys(CAT.frames).forEach(function (k) { h += '<img data-pick="' + k + '" src="' + CAT.frames[k].src + '" class="' + (k === pickFrame ? 'on' : '') + '">'; });
      h += '</div><p class="arr-hint">2. Click a photo to hang it</p><div class="arr-grid">';
      Object.keys(CAT.photos).forEach(function (k) { h += '<img data-addphoto="' + k + '" src="' + CAT.photos[k].src + '" title="' + CAT.photos[k].alt + '">'; });
      h += '</div><p class="arr-note">New photos: drop the file in <code>images/</code> and add it under "photos" in <code>data/catalog.js</code>.</p>';
    } else {
      h += '<p class="arr-hint">Click a sticker to add it</p><div class="arr-grid st">';
      Object.keys(CAT.stickers).forEach(function (k) { h += '<img data-addsticker="' + k + '" src="' + CAT.stickers[k].src + '" title="' + CAT.stickers[k].alt + '">'; });
      h += '</div>';
    }
    drawer.innerHTML = h; drawer.classList.add('open');
  }
  function closeDrawer() { drawer.classList.remove('open'); }
  function dropPoint(w) {
    var r = wallEl().getBoundingClientRect(), u = r.width / 100;
    var midY = (Math.max(r.top, 0) + Math.min(r.bottom, innerHeight)) / 2;
    return [round(50 - w / 2), round((midY - r.top) / u - w / 2)];
  }
  drawer.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) return closeDrawer();
    var t = e.target;
    if (t.dataset.pick) { pickFrame = t.dataset.pick; drawer.querySelectorAll('[data-pick]').forEach(function (n) { n.classList.toggle('on', n === t); }); return; }
    if (t.dataset.addphoto || t.dataset.addsticker) {
      snapshot();
      var w = active === 'gallery' ? 15 : 12, p = dropPoint(w);
      var it = active === 'gallery'
        ? { frame: pickFrame, photo: t.dataset.addphoto, x: p[0], y: p[1], w: w, rot: 0 }
        : { s: t.dataset.addsticker, x: p[0], y: p[1], w: w, rot: Math.round(Math.random() * 24 - 12), flip: false };
      items().push(it); sel = items().length - 1; render(); changed();
      toast('Added: drag it into place');
    }
  });

  /* ---------- modal helpers ---------- */
  function openModal(html) { modal.innerHTML = '<div class="arr-card">' + html + '</div>'; modal.classList.add('open'); }
  function closeModal() { modal.classList.remove('open'); }
  modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('[data-close]')) closeModal(); });
  function confirmBox(msg, yes) {
    openModal('<p>' + msg + '</p><div class="arr-btns"><button data-close>Cancel</button><button class="arr-primary" id="arrYes">OK</button></div>');
    modal.querySelector('#arrYes').onclick = function () { closeModal(); yes(); };
    return false;
  }

  /* ---------- save ---------- */
  function fileText() {
    return '// Wall layouts. Written by the Arrange editor (index.html?arrange).\nwindow.WALL_LAYOUT = ' + JSON.stringify(L) + ';\n';
  }
  function b64(str) { var b = new TextEncoder().encode(str), s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }

  function openSave() {
    var tok = ls('ghToken') || '', repo = ls('ghRepo') || REPO_DEFAULT;
    openModal(
      '<h3>Save layout</h3>' +
      '<p class="arr-note">Saving to GitHub updates the live site in about a minute.</p>' +
      '<label>GitHub token <input type="password" id="arrTok" placeholder="github_pat_…" value="' + tok + '"></label>' +
      '<label>Repo <input id="arrRepo" value="' + repo + '"></label>' +
      '<label class="arr-inline"><input type="checkbox" id="arrRemember" ' + (tok ? 'checked' : '') + '> Remember token on this browser</label>' +
      '<details><summary>How to get a token (one time)</summary><ol>' +
      '<li>GitHub → Settings → Developer settings → Fine-grained tokens → Generate new token.</li>' +
      '<li>Repository access: <b>Only select repositories</b> → Always-Sunny-In-Tattoo.</li>' +
      '<li>Permissions → Repository → <b>Contents: Read and write</b>. Nothing else.</li>' +
      '<li>Copy the token and paste it above.</li></ol></details>' +
      '<div class="arr-btns"><button id="arrDl">Download file instead</button><button data-close>Cancel</button><button class="arr-primary" id="arrPush">Save to GitHub</button></div>' +
      '<p id="arrMsg" class="arr-note"></p>'
    );
    modal.querySelector('#arrDl').onclick = function () {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([fileText()], { type: 'text/javascript' }));
      a.download = 'layout.js'; a.click();
      modal.querySelector('#arrMsg').textContent = 'Downloaded. Upload it to the repo’s data/ folder (Add file → Upload files) to publish.';
    };
    modal.querySelector('#arrPush').onclick = push;
  }

  async function push() {
    var tok = modal.querySelector('#arrTok').value.trim(), repo = modal.querySelector('#arrRepo').value.trim();
    var msg = modal.querySelector('#arrMsg');
    if (!tok) { msg.textContent = 'Paste a token first.'; return; }
    if (modal.querySelector('#arrRemember').checked) ls('ghToken', tok); else ls('ghToken', null);
    ls('ghRepo', repo);
    msg.textContent = 'Saving…';
    var url = 'https://api.github.com/repos/' + repo + '/contents/data/layout.js';
    var hdr = { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' };
    try {
      var g = await fetch(url, { headers: hdr, cache: 'no-store' });
      var sha = g.ok ? (await g.json()).sha : undefined;
      var p = await fetch(url, { method: 'PUT', headers: hdr, body: JSON.stringify({ message: 'Update wall layout (Arrange editor)', content: b64(fileText()), sha: sha }) });
      if (!p.ok) { var j = await p.json().catch(function () { return {}; }); throw new Error((p.status === 401 ? 'Token not accepted. ' : p.status === 404 ? 'Repo not found or token has no access to it. ' : '') + (j.message || p.status)); }
      SAVED = JSON.stringify(L); ls('wallDraft', null);
      msg.textContent = '';
      closeModal(); toast('Saved. Live site updates in about a minute.');
    } catch (err) { msg.textContent = 'Couldn’t save: ' + err.message; }
  }

  /* ---------- start ---------- */
  var draft = ls('wallDraft');
  renderAll();
  if (draft && draft !== SAVED) {
    openModal('<h3>Unsaved draft found</h3><p>You have changes from last time that weren’t saved. Pick up where you left off?</p><div class="arr-btns"><button id="arrDrop">Discard draft</button><button class="arr-primary" id="arrKeep">Restore draft</button></div>');
    modal.querySelector('#arrKeep').onclick = function () { L = JSON.parse(draft); renderAll(); closeModal(); };
    modal.querySelector('#arrDrop').onclick = function () { ls('wallDraft', null); closeModal(); };
  }
  window.addEventListener('beforeunload', function (e) { if (JSON.stringify(L) !== SAVED) { e.preventDefault(); e.returnValue = ''; } });
  wallEl('gallery').scrollIntoView({ block: 'start' });
  toast('Arrange mode: click a frame to select it');
})();
