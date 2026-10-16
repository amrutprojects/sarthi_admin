/* =========================================================
   AMRUT x SUMAGO - Maharashtra district map (schematic vector)
   Renders all 36 districts as an interactive, clickable tile map.
   No API key required. Swap-in point for Mapbox / Google Maps:
   AS.map.provider === 'schematic' -> replace render() only.
   ========================================================= */
(function () {
  'use strict';
  var AS = (window.AS = window.AS || {});

  var CW = 88, CH = 58, GAP = 4;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function metricValue(d, metric) {
    var k = AS.db.kpis(AS.db.byDistrict(d.code), d.target);
    switch (metric) {
      case 'target': return k.target;
      case 'applications': return k.applications;
      case 'enrolled': return k.enrolled;
      case 'active': return k.trainingActive;
      case 'completed': return k.completed;
      case 'certified': return k.certified;
      case 'attendance': return k.attendance;
      case 'achievement': return k.achievementPct;
      default: return k.enrolled;
    }
  }

  function colorFor(d, mode, metric) {
    if (mode === 'status') return AS.db.DISTRICT_STATUS[d.status].color;
    var v = metricValue(d, metric);
    var all = AS.db.districts.map(function (x) { return metricValue(x, metric); });
    var max = Math.max.apply(null, all.concat([1]));
    var t = v / max;
    if (v === 0) return '#DCC9B4';
    return t > .8 ? '#5C2A0D' : t > .6 ? '#7A3A16' : t > .4 ? '#C8651C' : t > .2 ? '#E2A166' : '#F2D3B0';
  }

  /**
   * options: { metric, colorMode:'status'|'metric', filterMode:'ALL'|'OFFLINE'|'ONLINE',
   *            statusFilter:'ALL'|RAG, onClick:'#/districts/', height }
   */
  function render(opts) {
    opts = opts || {};
    var metric = opts.metric || 'enrolled';
    var colorMode = opts.colorMode || 'status';
    var ds = AS.db.districts;
    var maxCol = Math.max.apply(null, ds.map(function (d) { return d.col; }));
    var maxRow = Math.max.apply(null, ds.map(function (d) { return d.row; }));
    var W = (maxCol + 1) * (CW + GAP) + GAP, H = (maxRow + 1) * (CH + GAP) + GAP;

    var tiles = ds.map(function (d) {
      var x = GAP + d.col * (CW + GAP), y = GAP + d.row * (CH + GAP);
      var col = colorFor(d, colorMode, metric);
      var v = metricValue(d, metric);
      var dim = false;
      if (opts.statusFilter && opts.statusFilter !== 'ALL') dim = AS.db.DISTRICT_STATUS[d.status].rag !== opts.statusFilter;
      if (opts.filterMode === 'OFFLINE' && !d.hasCentre) dim = true;
      var short = d.name.length > 13 ? d.name.replace('Chhatrapati ', 'Chh. ').slice(0, 12) + '.' : d.name;
      return '<g class="mh-tile' + (dim ? ' dim' : '') + '" data-district="' + d.code + '" data-go="#/districts/' + d.code + '">' +
        '<rect class="mh-rect" x="' + x + '" y="' + y + '" width="' + CW + '" height="' + CH + '" rx="8" fill="' + col + '"/>' +
        '<text class="mh-lbl" x="' + (x + CW / 2) + '" y="' + (y + 22) + '">' + esc(short) + '</text>' +
        '<text class="mh-val" x="' + (x + CW / 2) + '" y="' + (y + 36) + '">' + v + (metric === 'attendance' || metric === 'achievement' ? '%' : '') + ' / ' + d.target + '</text>' +
        '<text class="mh-val" x="' + (x + CW / 2) + '" y="' + (y + 47) + '" style="font-size:5.8px;opacity:.8">' + esc(AS.db.DISTRICT_STATUS[d.status].l) + '</text>' +
        '</g>';
    }).join('');

    var legend = colorMode === 'status'
      ? '<div class="map-legend">' +
      '<span><i style="background:#16A34A"></i>Active / On Track</span>' +
      '<span><i style="background:#C98A1E"></i>Needs Attention</span>' +
      '<span><i style="background:#B3271E"></i>Critical / Delayed</span>' +
      '<span><i style="background:#8A7566"></i>On Hold</span>' +
      '<span><i style="background:#B3A08D"></i>Not Started</span>' +
      '<span class="muted" style="margin-left:auto">Schematic district map - 36 districts, click to drill down</span></div>'
      : '<div class="map-legend"><span class="muted">Shading by ' + esc(metric) + ' (darker = higher)</span>' +
      '<span class="muted" style="margin-left:auto">Click a district to drill down</span></div>';

    return '<div class="mapwrap" id="mh-map"><svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;max-height:' + (opts.height || 430) + 'px">' +
      tiles + '</svg><div id="mh-tip" style="display:none"></div></div>' + legend;
  }

  /** attach hover tooltips after the map HTML is inserted */
  function mount(root) {
    var wrap = (root || document).querySelector('#mh-map');
    if (!wrap) return;
    var tip = wrap.querySelector('#mh-tip');
    wrap.addEventListener('mousemove', function (e) {
      var g = e.target.closest ? e.target.closest('.mh-tile') : null;
      if (!g) { tip.style.display = 'none'; return; }
      var d = AS.db.districtBy[g.getAttribute('data-district')];
      if (!d) return;
      var k = AS.db.kpis(AS.db.byDistrict(d.code), d.target);
      var st = AS.db.DISTRICT_STATUS[d.status];
      tip.className = 'map-tip';
      tip.innerHTML = '<b>' + esc(d.name) + '</b>' +
        '<div class="r"><span>Target</span><b>' + k.target + '</b></div>' +
        '<div class="r"><span>Enrolled</span><b>' + k.enrolled + '</b></div>' +
        '<div class="r"><span>Training active</span><b>' + k.trainingActive + '</b></div>' +
        '<div class="r"><span>Completed</span><b>' + k.completed + '</b></div>' +
        '<div class="r"><span>Certified</span><b>' + k.certified + '</b></div>' +
        '<div class="r" style="margin-top:4px"><span>Status</span><b style="color:' + st.color + '">' + st.l + '</b></div>';
      tip.style.display = 'block';
      var r = wrap.getBoundingClientRect();
      var x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
      if (x + 190 > r.width) x = e.clientX - r.left - 190;
      if (y + 150 > r.height) y = Math.max(4, e.clientY - r.top - 150);
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    });
    wrap.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
  }

  /** marker map for centres / live training */
  function markers(list, opts) {
    opts = opts || {};
    var ds = AS.db.districts;
    var maxCol = Math.max.apply(null, ds.map(function (d) { return d.col; }));
    var maxRow = Math.max.apply(null, ds.map(function (d) { return d.row; }));
    var W = (maxCol + 1) * (CW + GAP) + GAP, H = (maxRow + 1) * (CH + GAP) + GAP;
    var base = ds.map(function (d) {
      var x = GAP + d.col * (CW + GAP), y = GAP + d.row * (CH + GAP);
      return '<g class="mh-tile" data-district="' + d.code + '" data-go="#/districts/' + d.code + '">' +
        '<rect class="mh-rect" x="' + x + '" y="' + y + '" width="' + CW + '" height="' + CH + '" rx="8" fill="#E4EAF2" stroke="#fff"/>' +
        '<text class="mh-lbl" x="' + (x + CW / 2) + '" y="' + (y + 20) + '" style="fill:#8A7566;font-size:6.8px">' + esc(d.name.length > 13 ? d.name.slice(0, 12) + '.' : d.name) + '</text></g>';
    }).join('');
    var pins = list.map(function (m) {
      var d = AS.db.districtBy[m.districtId];
      if (!d) return '';
      var x = GAP + d.col * (CW + GAP) + CW / 2, y = GAP + d.row * (CH + GAP) + CH - 16;
      var col = m.color || '#C8651C';
      return '<g style="cursor:pointer"' + (m.link ? ' data-go="' + esc(m.link) + '"' : '') + '>' +
        (m.live ? '<circle cx="' + x + '" cy="' + y + '" r="13" fill="' + col + '" opacity=".2"><animate attributeName="r" values="9;16;9" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values=".35;0;.35" dur="1.8s" repeatCount="indefinite"/></circle>' : '') +
        '<circle cx="' + x + '" cy="' + y + '" r="7.5" fill="' + col + '" stroke="#fff" stroke-width="2"/>' +
        '<text x="' + x + '" y="' + (y + 2.8) + '" font-size="7" fill="#fff" text-anchor="middle" font-weight="700">' + esc(m.badge || '') + '</text>' +
        '<title>' + esc(m.title) + (m.sub ? '\n' + esc(m.sub) : '') + '</title></g>';
    }).join('');
    var legend = '<div class="map-legend">' + (opts.legend || [
      { c: '#C8651C', l: 'Offline training centre' },
      { c: '#1E7A46', l: 'Online training unit (central)' },
      { c: '#B3271E', l: 'Live session in progress' }
    ]).map(function (l) { return '<span><i style="background:' + l.c + '"></i>' + esc(l.l) + '</span>'; }).join('') +
      '<span class="muted" style="margin-left:auto">Schematic positions - not to geographic scale</span></div>';
    return '<div class="mapwrap" id="mh-map"><svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;max-height:' + (opts.height || 400) + 'px">' +
      base + pins + '</svg><div id="mh-tip" style="display:none"></div></div>' + legend;
  }

  AS.map = { provider: 'schematic', render: render, mount: mount, markers: markers, metricValue: metricValue };
})();
