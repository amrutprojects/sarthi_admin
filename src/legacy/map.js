/* =========================================================
   AMRUT x SUMAGO - Maharashtra district map (schematic vector)
   Renders all 36 districts as an interactive, clickable tile map.
   No API key required. Swap-in point for Mapbox / Google Maps:
   AS.map.provider === 'schematic' -> replace render() only.

   Only real data is shown: the district shapes and names (geography, kept here so the map does not depend on
   the sample dataset) and, when the caller passes `live`, the live register counts per district
   (applications / eligible / enrolled). Every other metric and the old RAG "status" colouring came from the
   invented sample dataset; they are accepted for backward compatibility but render neutral, with no number
   and no status claim.
   ========================================================= */
(function () {
  'use strict';
  var AS = (window.AS = window.AS || {});

  var CW = 88, CH = 58, GAP = 4;

  /* [name, code, col, row] — Maharashtra's 36 districts on the schematic grid. */
  var GEO = [
    ['Nandurbar', 'NDB', 3, 0], ['Dhule', 'DHU', 4, 0], ['Jalgaon', 'JAL', 5, 0], ['Buldhana', 'BUL', 6, 0],
    ['Akola', 'AKO', 7, 0], ['Amravati', 'AMR', 8, 0], ['Nagpur', 'NAG', 10, 0], ['Bhandara', 'BHA', 11, 0],
    ['Gondia', 'GON', 12, 0],
    ['Palghar', 'PAL', 2, 1], ['Nashik', 'NAS', 4, 1], ['Washim', 'WAS', 7, 1], ['Yavatmal', 'YAV', 8, 1],
    ['Wardha', 'WAR', 9, 1], ['Chandrapur', 'CHA', 11, 1], ['Gadchiroli', 'GAD', 12, 1],
    ['Mumbai Suburban', 'MUS', 1, 2], ['Thane', 'THA', 2, 2], ['Chhatrapati Sambhajinagar', 'CSN', 5, 2],
    ['Jalna', 'JLN', 6, 2], ['Hingoli', 'HIN', 7, 2], ['Parbhani', 'PAR', 8, 2], ['Nanded', 'NAN', 9, 2],
    ['Mumbai City', 'MUC', 1, 3], ['Raigad', 'RAI', 2, 3], ['Pune', 'PUN', 3, 3], ['Ahilyanagar', 'AHL', 4, 3],
    ['Beed', 'BEE', 5, 3], ['Latur', 'LAT', 7, 3], ['Dharashiv', 'DHA', 8, 3],
    ['Ratnagiri', 'RAT', 2, 4], ['Satara', 'SAT', 3, 4], ['Solapur', 'SOL', 5, 4],
    ['Sindhudurg', 'SIN', 2, 5], ['Kolhapur', 'KOL', 3, 5], ['Sangli', 'SAN', 4, 5]
  ].map(function (r) { return { name: r[0], code: r[1], col: r[2], row: r[3] }; });
  var GEO_BY = {};
  GEO.forEach(function (d) { GEO_BY[d.code] = d; });

  var NEUTRAL = '#E4EAF2';
  var ZERO = '#DCC9B4';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* Live register counts (opts.live = { CODE: {applications, eligible, enrolled} }) are the only figures shown. */
  var LIVE_METRICS = {
    applications: { en: 'Applications', mr: 'अर्ज' },
    eligible: { en: 'Eligible', mr: 'पात्र' },
    enrolled: { en: 'Enrolled', mr: 'नोंदणीकृत' }
  };
  function isLive(live, metric) { return !!live && !!LIVE_METRICS[metric]; }

  /* The live count for a district, or null when the metric has no live source (nothing invented is returned). */
  function metricValue(d, metric, live) {
    if (!isLive(live, metric)) return null;
    return (live[d.code] && live[d.code][metric]) || 0;
  }

  function shade(v, max) {
    if (!v) return ZERO;
    var t = v / max;
    return t > .8 ? '#5C2A0D' : t > .6 ? '#7A3A16' : t > .4 ? '#C8651C' : t > .2 ? '#E2A166' : '#F2D3B0';
  }

  function bi(o) { return esc(o.en) + ' · <span lang="mr">' + esc(o.mr) + '</span>'; }

  function bounds() {
    var maxCol = Math.max.apply(null, GEO.map(function (d) { return d.col; }));
    var maxRow = Math.max.apply(null, GEO.map(function (d) { return d.row; }));
    return { W: (maxCol + 1) * (CW + GAP) + GAP, H: (maxRow + 1) * (CH + GAP) + GAP };
  }

  /**
   * options: { metric, colorMode, filterMode, statusFilter, height, live }
   * live (optional): live register counts per district code. With a live metric (applications / eligible /
   * enrolled) the tiles are shaded by that count and show it. colorMode 'status', statusFilter, filterMode and
   * every other metric are accepted for older callers but ignored: tiles stay neutral with no number.
   */
  function render(opts) {
    opts = opts || {};
    var metric = opts.metric || 'enrolled';
    var live = opts.live || null;
    var showLive = isLive(live, metric);
    var b = bounds();
    var max = showLive ? Math.max.apply(null, GEO.map(function (d) { return metricValue(d, metric, live); }).concat([1])) : 1;

    var tiles = GEO.map(function (d) {
      var x = GAP + d.col * (CW + GAP), y = GAP + d.row * (CH + GAP);
      var v = showLive ? metricValue(d, metric, live) : null;
      var col = showLive ? shade(v, max) : NEUTRAL;
      var lc = live ? live[d.code] || { applications: 0, eligible: 0, enrolled: 0 } : null;
      var liveAttr = lc ? ' data-live="' + [lc.applications, lc.eligible, lc.enrolled].join(',') + '"' : '';
      var short = d.name.length > 13 ? d.name.replace('Chhatrapati ', 'Chh. ').slice(0, 12) + '.' : d.name;
      var dark = showLive && v / max > .4;
      var lblStyle = showLive ? (dark ? '' : ' style="fill:#5C2A0D"') : ' style="fill:#8A7566"';
      return '<g class="mh-tile" data-district="' + d.code + '" data-go="#/districts/' + d.code + '"' + liveAttr + '>' +
        '<rect class="mh-rect" x="' + x + '" y="' + y + '" width="' + CW + '" height="' + CH + '" rx="8" fill="' + col + '"' + (showLive ? '' : ' stroke="#fff"') + '/>' +
        '<text class="mh-lbl" x="' + (x + CW / 2) + '" y="' + (y + 22) + '"' + lblStyle + '>' + esc(short) + '</text>' +
        (showLive ? '<text class="mh-val" x="' + (x + CW / 2) + '" y="' + (y + 38) + '"' + lblStyle + '>' + esc(String(v)) + '</text>' : '') +
        '</g>';
    }).join('');

    var legend = showLive
      ? '<div class="map-legend"><span class="muted">' + bi({
        en: 'Shading by live ' + LIVE_METRICS[metric].en.toLowerCase() + ' count (darker = higher)',
        mr: 'थेट ' + LIVE_METRICS[metric].mr + ' संख्येनुसार छटा (गडद = जास्त)'
      }) + '</span>' +
      '<span class="muted" style="margin-left:auto">' + bi({ en: 'Click a district to drill down', mr: 'तपशीलासाठी जिल्ह्यावर क्लिक करा' }) + '</span></div>'
      : '<div class="map-legend" data-testid="map-no-data"><span class="muted">' + bi({
        en: 'No live figures for this view yet',
        mr: 'या दृश्यासाठी अद्याप थेट आकडे नाहीत'
      }) + '</span>' +
      '<span class="muted" style="margin-left:auto">' + bi({ en: 'Schematic map of 36 districts', mr: '३६ जिल्ह्यांचा योजनाबद्ध नकाशा' }) + '</span></div>';

    return '<div class="mapwrap" id="mh-map"><svg viewBox="0 0 ' + b.W + ' ' + b.H + '" style="width:100%;height:auto;max-height:' + (opts.height || 430) + 'px">' +
      tiles + '</svg><div id="mh-tip" style="display:none"></div></div>' + legend;
  }

  /** attach hover tooltips after the map HTML is inserted: the district name and, when present, its live counts */
  function mount(root) {
    var wrap = (root || document).querySelector('#mh-map');
    if (!wrap) return;
    var tip = wrap.querySelector('#mh-tip');
    wrap.addEventListener('mousemove', function (e) {
      var g = e.target.closest ? e.target.closest('.mh-tile') : null;
      if (!g) { tip.style.display = 'none'; return; }
      var d = GEO_BY[g.getAttribute('data-district')];
      if (!d) return;
      var lv = g.getAttribute('data-live');
      var lc = lv ? lv.split(',') : null;
      tip.className = 'map-tip';
      tip.innerHTML = '<b>' + esc(d.name) + '</b>' +
        (lc
          ? '<div class="r"><span>' + bi(LIVE_METRICS.applications) + '</span><b>' + esc(lc[0]) + '</b></div>' +
            '<div class="r"><span>' + bi(LIVE_METRICS.eligible) + '</span><b>' + esc(lc[1]) + '</b></div>' +
            '<div class="r"><span>' + bi(LIVE_METRICS.enrolled) + '</span><b>' + esc(lc[2]) + '</b></div>'
          : '<div class="r"><span class="muted">' + bi({ en: 'No data yet', mr: 'अद्याप माहिती नाही' }) + '</span></div>');
      tip.style.display = 'block';
      var r = wrap.getBoundingClientRect();
      var x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
      if (x + 190 > r.width) x = e.clientX - r.left - 190;
      if (y + 110 > r.height) y = Math.max(4, e.clientY - r.top - 110);
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    });
    wrap.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
  }

  /** marker map (centres, live sessions): the caller supplies the markers; with none, no legend is claimed */
  function markers(list, opts) {
    opts = opts || {};
    list = list || [];
    var b = bounds();
    var base = GEO.map(function (d) {
      var x = GAP + d.col * (CW + GAP), y = GAP + d.row * (CH + GAP);
      return '<g class="mh-tile" data-district="' + d.code + '" data-go="#/districts/' + d.code + '">' +
        '<rect class="mh-rect" x="' + x + '" y="' + y + '" width="' + CW + '" height="' + CH + '" rx="8" fill="' + NEUTRAL + '" stroke="#fff"/>' +
        '<text class="mh-lbl" x="' + (x + CW / 2) + '" y="' + (y + 20) + '" style="fill:#8A7566;font-size:6.8px">' + esc(d.name.length > 13 ? d.name.slice(0, 12) + '.' : d.name) + '</text></g>';
    }).join('');
    var pins = list.map(function (m) {
      var d = GEO_BY[m.districtId];
      if (!d) return '';
      var x = GAP + d.col * (CW + GAP) + CW / 2, y = GAP + d.row * (CH + GAP) + CH - 16;
      var col = m.color || '#C8651C';
      return '<g style="cursor:pointer"' + (m.link ? ' data-go="' + esc(m.link) + '"' : '') + '>' +
        (m.live ? '<circle cx="' + x + '" cy="' + y + '" r="13" fill="' + col + '" opacity=".2"><animate attributeName="r" values="9;16;9" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values=".35;0;.35" dur="1.8s" repeatCount="indefinite"/></circle>' : '') +
        '<circle cx="' + x + '" cy="' + y + '" r="7.5" fill="' + col + '" stroke="#fff" stroke-width="2"/>' +
        '<text x="' + x + '" y="' + (y + 2.8) + '" font-size="7" fill="#fff" text-anchor="middle" font-weight="700">' + esc(m.badge || '') + '</text>' +
        '<title>' + esc(m.title) + (m.sub ? '\n' + esc(m.sub) : '') + '</title></g>';
    }).join('');
    var legend = list.length
      ? '<div class="map-legend">' + (opts.legend || []).map(function (l) { return '<span><i style="background:' + l.c + '"></i>' + esc(l.l) + '</span>'; }).join('') +
        '<span class="muted" style="margin-left:auto">Schematic positions - not to geographic scale</span></div>'
      : '<div class="map-legend" data-testid="map-no-data"><span class="muted">' + bi({ en: 'No data yet', mr: 'अद्याप माहिती नाही' }) + '</span></div>';
    return '<div class="mapwrap" id="mh-map"><svg viewBox="0 0 ' + b.W + ' ' + b.H + '" style="width:100%;height:auto;max-height:' + (opts.height || 400) + 'px">' +
      base + pins + '</svg><div id="mh-tip" style="display:none"></div></div>' + legend;
  }

  AS.map = { provider: 'schematic', render: render, mount: mount, markers: markers, metricValue: metricValue, districts: GEO };
})();
