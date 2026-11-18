/* Tiny runtime that renders the design-canvas page format (x-dc templates + Component classes)
   as a normal website. Supports {{value}}, <sc-if>, <sc-for>, <dc-import>, onClick, setState. */
(function () {
  var defs = {};

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (part, cb) {
    var p = typeof part === 'function' ? part(this.state) : part;
    this.state = Object.assign({}, this.state, p);
    if (this.__rerender) this.__rerender();
    if (cb) cb();
  };
  window.DCLogic = DCLogic;

  function define(name, defaults, Cls) { defs[name] = { defaults: defaults || {}, Cls: Cls }; }

  var TOKEN = /\{\{\s*([^}]+?)\s*\}\}/g;
  function lookup(scope, expr) {
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    var parts = expr.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function single(str) { var m = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/.exec(str); return m ? m[1] : null; }
  function interp(str, scope) { return str.replace(TOKEN, function (_, e) { var v = lookup(scope, e); return v == null ? '' : String(v); }); }

  var BOOL = { disabled: 1, checked: 1, hidden: 1, selected: 1, readonly: 1, required: 1, open: 1, multiple: 1 };
  function camel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }

  function process(node, scope, inst) {
    var kids = Array.prototype.slice.call(node.childNodes);
    kids.forEach(function (n) {
      if (n.nodeType === 3) { if (n.nodeValue.indexOf('{{') > -1) n.nodeValue = interp(n.nodeValue, scope); return; }
      if (n.nodeType !== 1) return;
      var tag = n.tagName.toLowerCase();
      if (tag === 'sc-if') {
        var e = single(n.getAttribute('value') || '');
        var ok = e ? lookup(scope, e) : false;
        var frag = document.createDocumentFragment();
        if (ok) { while (n.firstChild) frag.appendChild(n.firstChild); process(frag, scope, inst); }
        n.parentNode.replaceChild(frag, n);
        return;
      }
      if (tag === 'sc-for') {
        var list = lookup(scope, single(n.getAttribute('list') || '') || '') || [];
        var as = n.getAttribute('as') || 'item';
        var out = document.createDocumentFragment();
        list.forEach(function (item, i) {
          var s = Object.create(scope); s[as] = item; s.index = i;
          var f = document.createDocumentFragment();
          Array.prototype.forEach.call(n.childNodes, function (c) { f.appendChild(c.cloneNode(true)); });
          process(f, s, inst);
          out.appendChild(f);
        });
        n.parentNode.replaceChild(out, n);
        return;
      }
      if (tag === 'dc-import') {
        var props = {};
        Array.prototype.forEach.call(n.attributes, function (a) {
          if (a.name === 'name' || a.name.indexOf('hint-') === 0) return;
          var ex = single(a.value);
          props[camel(a.name)] = ex ? lookup(scope, ex) : interp(a.value, scope);
        });
        var host = document.createElement('div');
        host.style.display = 'contents';
        n.parentNode.replaceChild(host, n);
        mount(n.getAttribute('name'), host, props);
        return;
      }
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        if (a.value.indexOf('{{') < 0) return;
        var ex = single(a.value), name = a.name.toLowerCase();
        if (name.indexOf('on') === 0 && name.length > 2) {
          n.removeAttribute(a.name);
          var fn = ex ? lookup(scope, ex) : null;
          if (typeof fn === 'function') n.addEventListener(name.slice(2), function (ev) { fn(ev); });
        } else if (BOOL[name]) {
          var v = ex ? lookup(scope, ex) : interp(a.value, scope);
          if (v && v !== 'false') n.setAttribute(a.name, ''); else n.removeAttribute(a.name);
        } else {
          n.setAttribute(a.name, interp(a.value, scope));
        }
      });
      if (tag === 'template') return;
      process(n, scope, inst);
    });
  }

  function saveFields(host) {
    var vals = {}, focus = null;
    host.querySelectorAll('input[name],textarea[name],select[name]').forEach(function (el) {
      if (el.type === 'file') return;
      vals[el.name] = el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value;
      if (el === document.activeElement) focus = el.name;
    });
    return { vals: vals, focus: focus };
  }
  function restoreFields(host, st) {
    host.querySelectorAll('input[name],textarea[name],select[name]').forEach(function (el) {
      if (!(el.name in st.vals) || el.type === 'file') return;
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = st.vals[el.name]; else el.value = st.vals[el.name];
      if (st.focus === el.name) el.focus();
    });
  }

  function mount(name, host, props) {
    var d = defs[name], tpl = document.getElementById('dc-' + name);
    if (!d || !tpl) { console.warn('dc: missing component', name); return; }
    var p = Object.assign({}, d.defaults, props || {});
    var inst = new d.Cls(p);
    inst.props = p;
    inst.state = inst.state || {};
    function render() {
      var st = saveFields(host);
      var frag = tpl.content.cloneNode(true);
      var vals = typeof inst.renderVals === 'function' ? inst.renderVals() : {};
      process(frag, vals, inst);
      host.innerHTML = '';
      host.appendChild(frag);
      restoreFields(host, st);
      document.dispatchEvent(new CustomEvent('dc:render', { detail: { name: name, host: host } }));
    }
    inst.__rerender = render;
    render();
    if (typeof inst.componentDidMount === 'function') inst.componentDidMount();
    return inst;
  }

  window.DC = { define: define, mount: mount };
})();
