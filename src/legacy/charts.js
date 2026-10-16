/* =========================================================
   AMRUT x SUMAGO - Lightweight SVG chart library
   No external dependencies. All charts return HTML strings.
   ========================================================= */
(function () {
  'use strict';
  var AS = (window.AS = window.AS || {});

  var PALETTE = ['#C8651C', '#E88C2C', '#1E7A46', '#6B3FA0', '#146A72', '#A85B08', '#A82C5E', '#7A3A16', '#6E8C1C', '#7E4BB0'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return (n == null ? '-' : Number(n).toLocaleString('en-IN')); }

  /* ---------------- Donut ---------------- */
  function donut(items, opts) {
    opts = opts || {};
    var size = opts.size || 190, thick = opts.thick || 26, r = (size - thick) / 2, cx = size / 2, cy = size / 2;
    var total = items.reduce(function (a, i) { return a + i.v; }, 0) || 1;
    var acc = -90, paths = '';
    items.forEach(function (it, i) {
      var frac = it.v / total, ang = frac * 360;
      var col = it.c || PALETTE[i % PALETTE.length];
      if (frac <= 0) return;
      if (frac >= 0.9999) {
        paths += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + thick + '"><title>' + esc(it.l) + ': ' + fmt(it.v) + '</title></circle>';
      } else {
        var a0 = acc * Math.PI / 180, a1 = (acc + ang) * Math.PI / 180;
        var x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
        var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
        paths += '<path d="M' + x0.toFixed(2) + ' ' + y0.toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + (ang > 180 ? 1 : 0) + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + '" fill="none" stroke="' + col + '" stroke-width="' + thick + '" stroke-linecap="butt"' +
          (opts.click ? ' style="cursor:pointer" data-go="' + esc(it.link || '') + '"' : '') + '><title>' + esc(it.l) + ': ' + fmt(it.v) + ' (' + Math.round(frac * 100) + '%)</title></path>';
      }
      acc += ang;
    });
    var mid = opts.centerValue != null
      ? '<div class="donut-mid"><b>' + esc(opts.centerValue) + '</b><span>' + esc(opts.centerLabel || '') + '</span></div>' : '';
    var leg = opts.legend === false ? '' : '<div class="legend">' + items.map(function (it, i) {
      return '<span' + (it.link ? ' class="pointer" data-go="' + esc(it.link) + '"' : '') + '><i style="background:' + (it.c || PALETTE[i % PALETTE.length]) + '"></i>' + esc(it.l) + ' <b>' + fmt(it.v) + '</b></span>';
    }).join('') + '</div>';
    return '<div class="chart"><div class="donut-c" style="max-width:' + size + 'px;margin:0 auto">' +
      '<svg viewBox="0 0 ' + size + ' ' + size + '" style="max-width:' + size + 'px">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="#F6E9D9" stroke-width="' + thick + '"/>' + paths + '</svg>' + mid + '</div>' + leg + '</div>';
  }

  /* ---------------- Horizontal bars ---------------- */
  function hbar(items, opts) {
    opts = opts || {};
    var max = opts.max || Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
    var rows = items.map(function (it, i) {
      var pct = Math.round((it.v / max) * 100);
      var col = it.c || opts.color || PALETTE[0];
      return '<div class="' + (it.link ? 'pointer' : '') + '"' + (it.link ? ' data-go="' + esc(it.link) + '"' : '') + ' style="margin-bottom:9px">' +
        '<div class="f jb ac" style="font-size:12px;margin-bottom:3px"><span class="ell" style="max-width:65%">' + esc(it.l) + '</span>' +
        '<b class="num">' + (it.display != null ? esc(it.display) : fmt(it.v)) + '</b></div>' +
        '<div class="prog"><i style="width:' + pct + '%;background:' + col + '"></i></div></div>';
    }).join('');
    return '<div>' + rows + '</div>';
  }

  /* ---------------- Vertical bars ---------------- */
  function vbar(items, opts) {
    opts = opts || {};
    var W = 100 * items.length + 40, H = opts.height || 200, pad = { t: 14, r: 10, b: 26, l: 38 };
    var max = opts.max || Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
    max = Math.ceil(max * 1.12);
    var iw = (W - pad.l - pad.r) / items.length, bw = Math.min(46, iw * 0.56);
    var grid = '', ticks = 4;
    for (var g = 0; g <= ticks; g++) {
      var y = pad.t + (H - pad.t - pad.b) * (g / ticks), v = Math.round(max * (1 - g / ticks));
      grid += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (W - pad.r) + '" y2="' + y + '" stroke="#F6E9D9" stroke-width="1"/>' +
        '<text x="' + (pad.l - 6) + '" y="' + (y + 3.5) + '" font-size="9.5" fill="#B3A08D" text-anchor="end">' + fmt(v) + '</text>';
    }
    var bars = items.map(function (it, i) {
      var h = Math.max(1, ((it.v / max) * (H - pad.t - pad.b)));
      var x = pad.l + i * iw + (iw - bw) / 2, y = H - pad.b - h;
      var col = it.c || opts.color || PALETTE[0];
      return '<g class="bar-g"' + (it.link ? ' style="cursor:pointer" data-go="' + esc(it.link) + '"' : '') + '>' +
        '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4" fill="' + col + '"><title>' + esc(it.l) + ': ' + fmt(it.v) + '</title></rect>' +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" font-size="10" font-weight="650" fill="#4A3B31" text-anchor="middle">' + fmt(it.v) + '</text>' +
        '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - pad.b + 14) + '" font-size="10" fill="#8A7566" text-anchor="middle">' + esc(it.l) + '</text></g>';
    }).join('');
    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '">' + grid + bars + '</svg></div>';
  }

  /* ---------------- Stacked bars ---------------- */
  function stacked(cats, series, opts) {
    opts = opts || {};
    var W = 110 * cats.length + 40, H = opts.height || 210, pad = { t: 14, r: 10, b: 28, l: 40 };
    var totals = cats.map(function (c, i) { return series.reduce(function (a, s) { return a + (s.v[i] || 0); }, 0); });
    var max = Math.ceil(Math.max.apply(null, totals.concat([1])) * 1.12);
    var iw = (W - pad.l - pad.r) / cats.length, bw = Math.min(52, iw * 0.5);
    var grid = '';
    for (var g = 0; g <= 4; g++) {
      var y = pad.t + (H - pad.t - pad.b) * (g / 4);
      grid += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (W - pad.r) + '" y2="' + y + '" stroke="#F6E9D9"/>' +
        '<text x="' + (pad.l - 6) + '" y="' + (y + 3.5) + '" font-size="9.5" fill="#B3A08D" text-anchor="end">' + fmt(Math.round(max * (1 - g / 4))) + '</text>';
    }
    var out = cats.map(function (c, i) {
      var x = pad.l + i * iw + (iw - bw) / 2, yBase = H - pad.b, g = '';
      series.forEach(function (s, si) {
        var v = s.v[i] || 0, h = (v / max) * (H - pad.t - pad.b);
        yBase -= h;
        if (v > 0) g += '<rect x="' + x.toFixed(1) + '" y="' + yBase.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + (s.c || PALETTE[si % PALETTE.length]) + '" rx="' + (si === series.length - 1 ? 3 : 0) + '"><title>' + esc(s.l) + ' - ' + esc(c) + ': ' + fmt(v) + '</title></rect>';
      });
      g += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - pad.b + 15) + '" font-size="10" fill="#8A7566" text-anchor="middle">' + esc(c) + '</text>';
      return g;
    }).join('');
    var leg = '<div class="legend">' + series.map(function (s, i) { return '<span><i style="background:' + (s.c || PALETTE[i % PALETTE.length]) + '"></i>' + esc(s.l) + '</span>'; }).join('') + '</div>';
    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '">' + grid + out + '</svg>' + leg + '</div>';
  }

  /* ---------------- Line / area ---------------- */
  function line(series, labels, opts) {
    opts = opts || {};
    var W = opts.width || 640, H = opts.height || 220, pad = { t: 16, r: 14, b: 28, l: 42 };
    var all = [];
    series.forEach(function (s) { all = all.concat(s.v); });
    var max = opts.max || Math.ceil(Math.max.apply(null, all.concat([1])) * 1.15);
    var iw = (W - pad.l - pad.r) / Math.max(1, labels.length - 1);
    var grid = '';
    for (var g = 0; g <= 4; g++) {
      var y = pad.t + (H - pad.t - pad.b) * (g / 4);
      grid += '<line x1="' + pad.l + '" y1="' + y + '" x2="' + (W - pad.r) + '" y2="' + y + '" stroke="#F6E9D9"/>' +
        '<text x="' + (pad.l - 6) + '" y="' + (y + 3.5) + '" font-size="9.5" fill="#B3A08D" text-anchor="end">' + fmt(Math.round(max * (1 - g / 4))) + '</text>';
    }
    labels.forEach(function (l, i) {
      if (labels.length > 14 && i % Math.ceil(labels.length / 8) !== 0) return;
      grid += '<text x="' + (pad.l + i * iw).toFixed(1) + '" y="' + (H - pad.b + 15) + '" font-size="9.5" fill="#8A7566" text-anchor="middle">' + esc(l) + '</text>';
    });
    var body = series.map(function (s, si) {
      var col = s.c || PALETTE[si % PALETTE.length];
      var pts = s.v.map(function (v, i) {
        return [pad.l + i * iw, H - pad.b - (v / max) * (H - pad.t - pad.b)];
      });
      var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
      var area = opts.area === false ? '' :
        '<path d="' + d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (H - pad.b) + ' L' + pts[0][0].toFixed(1) + ' ' + (H - pad.b) + ' Z" fill="' + col + '" opacity=".08"/>';
      var dots = pts.map(function (p, i) {
        return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.2" fill="#fff" stroke="' + col + '" stroke-width="2"><title>' + esc(s.l) + ' - ' + esc(labels[i]) + ': ' + fmt(s.v[i]) + '</title></circle>';
      }).join('');
      return area + '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' + (labels.length > 20 ? '' : dots);
    }).join('');
    var leg = series.length > 1 ? '<div class="legend">' + series.map(function (s, i) { return '<span><i style="background:' + (s.c || PALETTE[i % PALETTE.length]) + '"></i>' + esc(s.l) + '</span>'; }).join('') + '</div>' : '';
    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '">' + grid + body + '</svg>' + leg + '</div>';
  }

  /* ---------------- Funnel ---------------- */
  function funnel(stages, opts) {
    opts = opts || {};
    var W = 640, rowH = 46, H = stages.length * rowH + 10;
    var max = stages[0] ? stages[0].v : 1;
    var body = stages.map(function (s, i) {
      var w = Math.max(40, (s.v / max) * (W - 210));
      var y = i * rowH + 6, col = s.c || PALETTE[i % PALETTE.length];
      var prev = i > 0 ? stages[i - 1].v : null;
      var conv = prev ? Math.round((s.v / prev) * 1000) / 10 : null;
      return '<g class="funnel-s"' + (s.link ? ' data-go="' + esc(s.link) + '"' : '') + '>' +
        '<rect x="196" y="' + y + '" width="' + w.toFixed(1) + '" height="' + (rowH - 13) + '" rx="5" fill="' + col + '"/>' +
        '<text x="188" y="' + (y + rowH / 2 - 3) + '" font-size="11.5" fill="#4A3B31" text-anchor="end" font-weight="600">' + esc(s.l) + '</text>' +
        '<text x="' + (202 + w).toFixed(1) + '" y="' + (y + rowH / 2 - 3) + '" font-size="11.5" font-weight="700" fill="#0F172A">' + fmt(s.v) + '</text>' +
        (conv != null ? '<text x="' + (202 + w).toFixed(1) + '" y="' + (y + rowH / 2 + 9) + '" font-size="9.5" fill="#B3A08D">' + conv + '% of previous</text>' : '') +
        '<title>' + esc(s.l) + ': ' + fmt(s.v) + '</title></g>';
    }).join('');
    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '">' + body + '</svg></div>';
  }

  /* ---------------- Heatmap grid ---------------- */
  function heatmap(cells, opts) {
    opts = opts || {};
    var cols = opts.cols || 9, cw = 74, ch = 46, W = cols * cw, H = Math.ceil(cells.length / cols) * ch;
    var max = Math.max.apply(null, cells.map(function (c) { return c.v; }).concat([1]));
    var body = cells.map(function (c, i) {
      var x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
      var t = c.v / max;
      var col = c.c || (t > .75 ? '#7A3A16' : t > .5 ? '#C8651C' : t > .25 ? '#E8B584' : t > 0 ? '#F7E3CC' : '#F6E9D9');
      var fg = t > .45 ? '#fff' : '#4A3B31';
      return '<g class="heat-c"' + (c.link ? ' data-go="' + esc(c.link) + '"' : '') + '>' +
        '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="' + (cw - 4) + '" height="' + (ch - 4) + '" rx="5" fill="' + col + '" stroke="#fff" stroke-width="1"/>' +
        '<text x="' + (x + cw / 2) + '" y="' + (y + 20) + '" font-size="8.6" fill="' + fg + '" text-anchor="middle" font-weight="600">' + esc(c.l.length > 11 ? c.l.slice(0, 10) + '.' : c.l) + '</text>' +
        '<text x="' + (x + cw / 2) + '" y="' + (y + 33) + '" font-size="10.5" fill="' + fg + '" text-anchor="middle" font-weight="700">' + fmt(c.v) + '</text>' +
        '<title>' + esc(c.l) + ': ' + fmt(c.v) + (c.sub ? ' (' + esc(c.sub) + ')' : '') + '</title></g>';
    }).join('');
    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '">' + body + '</svg></div>';
  }

  /* ---------------- Gauge ring ---------------- */
  function ring(pct, opts) {
    opts = opts || {};
    var size = opts.size || 112, thick = opts.thick || 11, r = (size - thick) / 2, c = 2 * Math.PI * r;
    var col = opts.color || (pct >= 80 ? '#1E7A46' : pct >= 60 ? '#C98A1E' : '#B3271E');
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px;flex-basis:' + size + 'px">' +
      '<svg viewBox="0 0 ' + size + ' ' + size + '" style="transform:rotate(-90deg)">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#F6E9D9" stroke-width="' + thick + '"/>' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + thick + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - Math.min(100, pct) / 100)).toFixed(1) + '"/></svg>' +
      '<div class="rv"><b style="color:' + col + '">' + (opts.label || pct + '%') + '</b><span>' + esc(opts.sub || '') + '</span></div></div>';
  }

  /* ---------------- Sparkline ---------------- */
  function spark(values, opts) {
    opts = opts || {};
    var W = opts.width || 110, H = opts.height || 30;
    var max = Math.max.apply(null, values.concat([1])), min = Math.min.apply(null, values);
    var rng = (max - min) || 1;
    var d = values.map(function (v, i) {
      var x = (i / Math.max(1, values.length - 1)) * W, y = H - ((v - min) / rng) * (H - 4) - 2;
      return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }).join(' ');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:' + W + 'px;height:' + H + 'px"><path d="' + d + '" fill="none" stroke="' + (opts.color || '#C8651C') + '" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  }

  /* ---------------- Calendar heat (attendance month) ---------------- */
  function calendar(days, opts) {
    opts = opts || {};
    var cw = 34, ch = 34, cols = 7, W = cols * cw + 4, rows = Math.ceil(days.length / 7);
    var head = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (d, i) {
      return '<text x="' + (i * cw + cw / 2) + '" y="10" font-size="9" fill="#B3A08D" text-anchor="middle">' + d + '</text>';
    }).join('');
    var body = days.map(function (d, i) {
      var x = (i % 7) * cw, y = 16 + Math.floor(i / 7) * ch;
      var col = d.v === 0 ? '#FAF1E6' : d.v >= 85 ? '#1E7A46' : d.v >= 75 ? '#3E8F5E' : d.v >= 60 ? '#C98A1E' : '#B3271E';
      var fg = d.v === 0 ? '#B3A08D' : '#fff';
      return '<g class="heat-c"><rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="' + (cw - 4) + '" height="' + (ch - 4) + '" rx="6" fill="' + col + '"/>' +
        '<text x="' + (x + cw / 2) + '" y="' + (y + cw / 2 + 1) + '" font-size="9.5" fill="' + fg + '" text-anchor="middle" font-weight="600">' + d.d + '</text>' +
        '<title>' + esc(d.full || '') + (d.v === 0 ? ' - No session' : ': ' + d.v + '% present') + '</title></g>';
    }).join('');
    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + (16 + rows * ch) + '" style="max-width:' + W + 'px">' + head + body + '</svg></div>';
  }

  AS.charts = {
    palette: PALETTE, donut: donut, hbar: hbar, vbar: vbar, stacked: stacked,
    line: line, funnel: funnel, heatmap: heatmap, ring: ring, spark: spark, calendar: calendar, fmt: fmt
  };
})();
