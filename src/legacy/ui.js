/* =========================================================
   AMRUT x SUMAGO - Reusable UI component library
   ========================================================= */
(function () {
  'use strict';
  var AS = (window.AS = window.AS || {});
  /* shared registries — created here because ui.js loads before every page module */
  AS.actions = AS.actions || {};
  AS.state = AS.state || {};
  AS.routes = AS.routes || {};

  /* ---------------- helpers ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return n == null ? '-' : Number(n).toLocaleString('en-IN'); }
  function money(n) {
    if (n == null) return '-';
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
    if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
    return '₹' + Number(n).toLocaleString('en-IN');
  }
  function dateFmt(iso) {
    if (!iso || iso === '-') return '-';
    var d = new Date(iso.length > 10 ? iso.replace(' ', 'T') : iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
  }
  function initials(n) {
    return String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase();
  }
  function titleCase(s) {
    return String(s || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  /* ---------------- icons ---------------- */
  var I = {
    dashboard: '<path d="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 14h7v7H3z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
    megaphone: '<path d="m3 11 15-7v16l-15-7z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    map: '<path d="m9 20-6 2V6l6-2 6 2 6-2v16l-6 2z"/><path d="M9 4v16M15 6v16"/>',
    building: '<path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M15 9h4a2 2 0 0 1 2 2v10"/><path d="M9 7h2M9 11h2M9 15h2"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
    teacher: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    check: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="m8.2 13.4-1.4 7.4L12 18l5.2 2.8-1.4-7.4"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 14 3-4 4 3 5-7"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>',
    rupee: '<path d="M6 3h12M6 8h12M15 3c0 5-3.5 5-9 5l9 13"/>',
    plug: '<path d="M9 2v6M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 19h2"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
    filter: '<path d="M3 4h18l-7 8v7l-4 2v-9z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
    qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM18 18h3v3h-3z"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
    play: '<circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4z"/>'
  };
  function icon(name, cls) {
    return '<svg class="ico ' + (cls || '') + '" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + (I[name] || I.dashboard) + '</svg>';
  }

  /* ---------------- badges ---------------- */
  var TONE_CLASS = { green: 'b-green', amber: 'b-amber', red: 'b-red', grey: 'b-grey', blue: 'b-blue', info: 'b-info', violet: 'b-violet', saffron: 'b-saffron' };
  function badge(label, tone, nodot) {
    return '<span class="badge ' + (TONE_CLASS[tone] || 'b-grey') + (nodot ? ' nodot' : '') + '">' + esc(label) + '</span>';
  }
  function statusBadge(k) {
    var s = AS.db.STATUS_MAP[k];
    return badge(s ? s.l : titleCase(k), s ? s.tone : 'grey');
  }
  var GEN_TONE = {
    ACTIVE: 'green', COMPLETED: 'green', CERTIFIED: 'green', VERIFIED: 'green', APPROVED: 'green', SENT: 'green', PAID: 'green', RESOLVED: 'green', HEALTHY: 'green', ON_TRACK: 'green', PASSED: 'green',
    PENDING: 'amber', IN_PROGRESS: 'amber', UPCOMING: 'blue', SCHEDULED: 'blue', NEEDS_IMPROVEMENT: 'amber', AT_RISK: 'amber', PARTIALLY_PAID: 'amber', DRAFT: 'grey', OPEN: 'amber', PARTIAL: 'amber',
    CRITICAL: 'red', DELAYED: 'red', REJECTED: 'red', FAILED: 'red', SUSPENDED: 'red', INACTIVE: 'grey', CANCELLED: 'red',
    CLOSED: 'grey', ARCHIVED: 'grey', NOT_STARTED: 'grey', BACKUP: 'blue', SUCCESS: 'green', INFO: 'blue', LIVE: 'red'
  };
  function genBadge(k) { return badge(titleCase(k), GEN_TONE[k] || 'grey'); }
  function modeTag(m) {
    return m === 'ONLINE'
      ? '<span class="mode-tag mode-on">ONLINE</span>'
      : '<span class="mode-tag mode-off">OFFLINE</span>';
  }
  function prio(p) { return badge(titleCase(p), p === 'HIGH' ? 'red' : p === 'MEDIUM' ? 'amber' : 'grey'); }

  /* ---------------- kpi card ---------------- */
  function kpi(o) {
    return '<div class="kpi ' + (o.tone || '') + '"' + (o.link ? ' data-go="' + esc(o.link) + '"' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + '>' +
      '<div class="kpi-t">' + esc(o.label) + '</div>' +
      '<div class="kpi-v">' + (typeof o.value === 'number' ? fmt(o.value) : esc(o.value)) + '</div>' +
      (o.sub ? '<div class="kpi-d">' + o.sub + '</div>' : '') +
      (o.pct != null ? '<div class="prog sm mt8"><i class="' + (o.progTone || '') + '" style="width:' + Math.min(100, o.pct) + '%"></i></div>' : '') +
      '</div>';
  }
  function progRow(pct, tone, label) {
    return '<div class="prog-row"><div class="prog"><i class="' + (tone || '') + '" style="width:' + Math.min(100, pct || 0) + '%"></i></div><b>' + (label || (pct || 0) + '%') + '</b></div>';
  }

  /* ---------------- breadcrumb / page head ---------------- */
  function crumb(items) {
    return '<div class="crumb">' + items.map(function (it, i) {
      return (i ? '<i>' + '/' + '</i>' : '') + (it.link ? '<a data-go="' + esc(it.link) + '">' + esc(it.l) + '</a>' : '<span>' + esc(it.l) + '</span>');
    }).join('') + '</div>';
  }
  function pageHead(o) {
    return (o.crumbs ? crumb(o.crumbs) : '') +
      '<div class="page-head"><div class="ph-l"><h1>' + esc(o.title) + (o.badge || '') + '</h1>' +
      (o.sub ? '<div class="page-sub">' + o.sub + '</div>' : '') + '</div>' +
      (o.actions ? '<div class="page-actions">' + o.actions + '</div>' : '') + '</div>';
  }
  function card(title, body, opts) {
    opts = opts || {};
    return '<div class="card' + (opts.cls ? ' ' + opts.cls : '') + '">' +
      (title ? '<div class="card-h"><h3>' + title + (opts.sub ? ' <span class="sub">' + opts.sub + '</span>' : '') + '</h3>' + (opts.action || '') + '</div>' : '') +
      '<div class="card-b' + (opts.flush ? ' flush' : '') + '">' + body + '</div>' +
      (opts.footer ? '<div class="card-f">' + opts.footer + '</div>' : '') + '</div>';
  }
  function empty(title, msg, action) {
    return '<div class="empty"><div class="e-ico">' + icon('search') + '</div><b>' + esc(title) + '</b><p>' + esc(msg) + '</p>' + (action || '') + '</div>';
  }
  function loading(rows) {
    var out = '';
    for (var i = 0; i < (rows || 4); i++) out += '<div class="skel" style="height:14px;margin-bottom:10px;width:' + (100 - i * 8) + '%"></div>';
    return '<div style="padding:6px 0">' + out + '</div>';
  }
  function callout(tone, title, msg) {
    return '<div class="callout c-' + tone + '"><div>' + (title ? '<b>' + esc(title) + '</b>' : '') + msg + '</div></div>';
  }
  function demoNote(txt) {
    return '<div class="disclaim mt10">' + esc(txt || 'Indicative values - subject to AMRUT / COEP approval.') + '</div>';
  }

  /* =========================================================
     DATA TABLE
     opts: { columns:[{k,l,w,align,render(row),sortable,sortVal(row)}],
             rows, rowLink(row), pageSize, search:[keys], exportName,
             toolbar (html), emptyMsg }
     ========================================================= */
  var tableState = {};
  function table(mountId, opts) {
    var st = tableState[mountId] = {
      q: '', sort: opts.defaultSort || null, dir: opts.defaultDir || 'asc', page: 1,
      pageSize: opts.pageSize || 12, cols: opts.columns.map(function (c) { return c.k; }), opts: opts
    };
    draw(mountId);
  }
  function draw(mountId) {
    var st = tableState[mountId]; if (!st) return;
    var el = document.getElementById(mountId); if (!el) return;
    var o = st.opts;
    var rows = o.rows.slice();

    if (st.q && o.search) {
      var q = st.q.toLowerCase();
      rows = rows.filter(function (r) {
        return o.search.some(function (k) {
          var v = typeof k === 'function' ? k(r) : r[k];
          return String(v == null ? '' : v).toLowerCase().indexOf(q) >= 0;
        });
      });
    }
    if (st.sort) {
      var col = o.columns.filter(function (c) { return c.k === st.sort; })[0];
      if (col) {
        rows.sort(function (a, b) {
          var va = col.sortVal ? col.sortVal(a) : a[col.k], vb = col.sortVal ? col.sortVal(b) : b[col.k];
          if (typeof va === 'number' && typeof vb === 'number') return st.dir === 'asc' ? va - vb : vb - va;
          va = String(va == null ? '' : va).toLowerCase(); vb = String(vb == null ? '' : vb).toLowerCase();
          return st.dir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
        });
      }
    }
    var total = rows.length, pages = Math.max(1, Math.ceil(total / st.pageSize));
    if (st.page > pages) st.page = pages;
    var slice = rows.slice((st.page - 1) * st.pageSize, st.page * st.pageSize);
    var visCols = o.columns.filter(function (c) { return st.cols.indexOf(c.k) >= 0; });

    var head = '<tr>' + visCols.map(function (c) {
      var on = st.sort === c.k;
      return '<th class="' + (c.sortable !== false ? 'sortable' : '') + (on ? ' on' : '') + '" data-tsort="' + esc(c.k) + '" data-tid="' + mountId + '"' +
        (c.w ? ' style="width:' + c.w + '"' : '') + '>' + esc(c.l) +
        (c.sortable !== false ? '<span class="arw">' + (on ? (st.dir === 'asc' ? '▲' : '▼') : '⇅') + '</span>' : '') + '</th>';
    }).join('') + '</tr>';

    var body = slice.length ? slice.map(function (r) {
      var link = o.rowLink ? o.rowLink(r) : null;
      return '<tr' + (link ? ' data-go="' + esc(link) + '"' : ' class="norow"') + '>' + visCols.map(function (c) {
        return '<td class="' + (c.align === 'right' ? 'num' : '') + '">' + (c.render ? c.render(r) : esc(r[c.k])) + '</td>';
      }).join('') + '</tr>';
    }).join('') : '<tr class="norow"><td colspan="' + visCols.length + '">' + empty('No records found', o.emptyMsg || 'Adjust your filters or search terms to see results.') + '</td></tr>';

    var pgBtns = '';
    var from = Math.max(1, st.page - 2), to = Math.min(pages, from + 4);
    from = Math.max(1, to - 4);
    for (var p = from; p <= to; p++) pgBtns += '<button data-tpage="' + p + '" data-tid="' + mountId + '" class="' + (p === st.page ? 'on' : '') + '">' + p + '</button>';

    el.innerHTML =
      '<div class="tbl-top">' +
      (o.search ? '<div class="grow"><input class="inp sm" placeholder="Search ' + esc(o.searchLabel || 'records') + '..." data-tq="' + mountId + '" value="' + esc(st.q) + '"></div>' : '<div class="grow"></div>') +
      (o.toolbar || '') +
      '<button class="btn sm" data-tcols="' + mountId + '">' + icon('filter') + '<span class="hide-s">Columns</span></button>' +
      '<button class="btn sm" data-texport="' + mountId + '" data-fmt="csv">' + icon('download') + 'CSV</button>' +
      '<button class="btn sm" data-texport="' + mountId + '" data-fmt="xls">Excel</button>' +
      '<button class="btn sm" data-texport="' + mountId + '" data-fmt="pdf">PDF</button>' +
      '</div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>' +
      '<div class="tbl-bot"><div class="info">Showing <b>' + (total ? (st.page - 1) * st.pageSize + 1 : 0) + '-' + Math.min(total, st.page * st.pageSize) + '</b> of <b>' + fmt(total) + '</b> records</div>' +
      '<select class="inp sm" style="width:auto" data-tsize="' + mountId + '">' +
      [10, 12, 25, 50, 100].map(function (n) { return '<option value="' + n + '"' + (n === st.pageSize ? ' selected' : '') + '>' + n + ' / page</option>'; }).join('') + '</select>' +
      '<div class="pager"><button data-tpage="1" data-tid="' + mountId + '"' + (st.page === 1 ? ' disabled' : '') + '>«</button>' +
      '<button data-tpage="' + (st.page - 1) + '" data-tid="' + mountId + '"' + (st.page === 1 ? ' disabled' : '') + '>‹</button>' + pgBtns +
      '<button data-tpage="' + (st.page + 1) + '" data-tid="' + mountId + '"' + (st.page === pages ? ' disabled' : '') + '>›</button>' +
      '<button data-tpage="' + pages + '" data-tid="' + mountId + '"' + (st.page === pages ? ' disabled' : '') + '>»</button></div></div>';
  }
  function tableRows(mountId) {
    var st = tableState[mountId]; return st ? st.opts.rows : [];
  }

  /* ---------------- export ---------------- */
  function exportRows(name, columns, rows, fmtType) {
    var head = columns.map(function (c) { return c.l; });
    var data = rows.map(function (r) {
      return columns.map(function (c) {
        var v = c.exportVal ? c.exportVal(r) : (c.render ? String(c.render(r)).replace(/<[^>]*>/g, '').trim() : r[c.k]);
        return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
      });
    });
    if (fmtType === 'pdf') {
      var w = window.open('', '_blank');
      if (!w) { toast('Allow pop-ups to preview the PDF export.', 'warn'); return; }
      w.document.write('<html><head><title>' + esc(name) + '</title><style>' +
        'body{font-family:Segoe UI,Arial,sans-serif;padding:26px;color:#0F172A}' +
        'h1{font-size:17px;margin:0 0 4px}.m{color:#64748B;font-size:11px;margin-bottom:14px}' +
        'table{width:100%;border-collapse:collapse;font-size:10.5px}th{background:#0A2540;color:#fff;text-align:left;padding:6px 7px}' +
        'td{padding:5px 7px;border-bottom:1px solid #E3E8EF}tr:nth-child(even) td{background:#F8FAFC}' +
        '.f{margin-top:18px;font-size:10px;color:#94A3B8;font-style:italic}</style></head><body>' +
        '<h1>' + esc(AS.db.config.shortName) + ' - ' + esc(name) + '</h1>' +
        '<div class="m">Generated ' + new Date().toLocaleString('en-IN') + ' | ' + rows.length + ' records</div>' +
        '<table><thead><tr>' + head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        data.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table><div class="f">Use the browser print dialog to save as PDF.</div>' +
        '<script>setTimeout(function(){window.print()},350)<\/script></body></html>');
      w.document.close();
      toast('PDF preview opened - use Print > Save as PDF.', 'ok');
      return;
    }
    var sep = ',';
    var csv = [head].concat(data).map(function (r) {
      return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(sep);
    }).join('\r\n');
    var blob = new Blob(['﻿' + csv], { type: fmtType === 'xls' ? 'application/vnd.ms-excel' : 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name.replace(/[^\w\-]+/g, '_') + '.' + (fmtType === 'xls' ? 'xls' : 'csv');
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 800);
    toast('Exported ' + rows.length + ' records (' + (fmtType === 'xls' ? 'Excel' : 'CSV') + ').', 'ok');
  }

  /* ---------------- modal / drawer / toast ---------------- */
  function modal(o) {
    var root = document.getElementById('modal-root');
    root.innerHTML = '<div class="ov" data-modal-ov>' +
      '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true">' +
      '<div class="modal-h"><h3>' + esc(o.title) + '</h3>' + (o.headExtra || '') + '<button class="x-btn" data-modal-close>✕</button></div>' +
      '<div class="modal-b">' + o.body + '</div>' +
      (o.footer ? '<div class="modal-f">' + o.footer + '</div>' : '') +
      '</div></div>';
    if (o.onMount) o.onMount(root);
  }
  function closeModal() { document.getElementById('modal-root').innerHTML = ''; }
  function confirmDialog(title, msg, onYes, yesLabel, danger) {
    modal({
      title: title, body: '<p style="margin:0">' + msg + '</p>',
      footer: '<button class="btn" data-modal-close>Cancel</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" id="cf-yes">' + esc(yesLabel || 'Confirm') + '</button>',
      onMount: function (r) { r.querySelector('#cf-yes').onclick = function () { closeModal(); onYes && onYes(); }; }
    });
  }
  function drawer(o) {
    var root = document.getElementById('drawer-root');
    root.innerHTML = '<div class="drawer-ov" data-drawer-close></div>' +
      '<aside class="drawer ' + (o.size || '') + '">' +
      '<div class="drawer-h"><h3>' + esc(o.title) + '</h3>' + (o.headExtra || '') + '<button class="x-btn" data-drawer-close>✕</button></div>' +
      '<div class="drawer-b">' + o.body + '</div>' +
      (o.footer ? '<div class="drawer-f">' + o.footer + '</div>' : '') + '</aside>';
    if (o.onMount) o.onMount(root);
  }
  function closeDrawer() { document.getElementById('drawer-root').innerHTML = ''; }
  function toast(msg, kind, ms) {
    var root = document.getElementById('toast-root');
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.innerHTML = '<span>' + esc(msg) + '</span><button class="tclose">✕</button>';
    el.querySelector('.tclose').onclick = function () { el.remove(); };
    root.appendChild(el);
    setTimeout(function () { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 320); }, ms || 3400);
  }

  /* ---------------- filter bar ---------------- */
  /* fields: [{k,l,type:'select'|'text'|'date',options:[{v,l}],value}] */
  function filterBar(fields, opts) {
    opts = opts || {};
    return '<div class="filterbar" id="' + (opts.id || 'filterbar') + '">' +
      fields.map(function (f) {
        if (f.type === 'text') {
          return '<div class="fld"><label>' + esc(f.l) + '</label><input class="inp" data-f="' + esc(f.k) + '" placeholder="' + esc(f.ph || '') + '" value="' + esc(f.value || '') + '"></div>';
        }
        if (f.type === 'date') {
          return '<div class="fld"><label>' + esc(f.l) + '</label><input type="date" class="inp" data-f="' + esc(f.k) + '" value="' + esc(f.value || '') + '"></div>';
        }
        return '<div class="fld"><label>' + esc(f.l) + '</label><select class="inp" data-f="' + esc(f.k) + '">' +
          f.options.map(function (o2) { return '<option value="' + esc(o2.v) + '"' + (String(f.value) === String(o2.v) ? ' selected' : '') + '>' + esc(o2.l) + '</option>'; }).join('') +
          '</select></div>';
      }).join('') +
      '<div class="fb-actions"><button class="btn" data-fclear>Reset</button>' + (opts.extra || '') + '</div></div>';
  }
  function districtOptions(all) {
    return [{ v: 'ALL', l: all || 'All districts' }].concat(AS.db.districts.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; }).map(function (d) { return { v: d.code, l: d.name }; }));
  }
  function centreOptions() {
    return [{ v: 'ALL', l: 'All centres' }].concat(AS.db.allCentres.map(function (c) { return { v: c.id, l: c.name }; }));
  }
  function batchOptions() {
    return [{ v: 'ALL', l: 'All batches' }].concat(AS.db.batches.map(function (b) { return { v: b.id, l: b.id }; }));
  }
  function modeOptions() {
    return [{ v: 'ALL', l: 'All modes' }, { v: 'OFFLINE', l: 'Offline' }, { v: 'ONLINE', l: 'Online' }];
  }
  function statusOptions() {
    return [{ v: 'ALL', l: 'All statuses' }].concat(AS.db.STATUS.map(function (s) { return { v: s.k, l: s.l }; }));
  }

  /* ---------------- misc renderers ---------------- */
  function tl(items) {
    return '<div class="tl">' + items.map(function (i) {
      return '<div class="tl-i ' + (i.state || '') + '"><b>' + esc(i.title) + '</b><span>' + (i.sub || '') + '</span></div>';
    }).join('') + '</div>';
  }
  function kvList(pairs) {
    return pairs.map(function (p) {
      return '<div class="kv"><span>' + esc(p[0]) + '</span><b>' + (p[2] === true ? p[1] : esc(p[1])) + '</b></div>';
    }).join('');
  }
  function listRows(items) {
    return '<div class="list">' + items.map(function (i) {
      return '<div class="list-row"' + (i.link ? ' data-go="' + esc(i.link) + '"' : '') + '>' +
        (i.icon ? '<div class="icon-sq" style="background:' + (i.iconBg || 'var(--brand-100)') + ';color:' + (i.iconFg || 'var(--brand-600)') + '">' + i.icon + '</div>' : '') +
        '<div class="lr-main"><b>' + esc(i.title) + '</b><span>' + esc(i.sub || '') + '</span></div>' +
        (i.right || '') + '</div>';
    }).join('') + '</div>';
  }
  function avatar(name, cls) { return '<div class="avatar ' + (cls || '') + '">' + esc(initials(name)) + '</div>'; }
  function riskBadges(c) {
    if (!c.risks || !c.risks.length) return '<span class="badge b-green">No risk</span>';
    return c.risks.map(function (r) { return badge(r.l, r.tone); }).join(' ');
  }
  function attendanceCell(v) {
    if (!v) return '<span class="muted">-</span>';
    var tone = v >= 85 ? 'g' : v >= 75 ? '' : v >= 60 ? 'a' : 'r';
    return '<div class="prog-row" style="min-width:96px"><div class="prog sm"><i class="' + tone + '" style="width:' + v + '%"></i></div><b>' + v + '%</b></div>';
  }

  /* =========================================================
     STAT PANEL — "Your numbers"
     One container, one hairline grid, every metric expressed the
     same way: label -> value/denominator -> progress -> status.
     opts: {
       title, sub, footer,
       overall: {pct, label},
       items: [{ label, value, of, unit, pct, tone, note, link }]
     }
     `tone` is derived from pct when omitted; `note` falls back to a
     status word so meaning never rests on colour alone.
     ========================================================= */
  function statPanel(o) {
    o = o || {};
    var items = o.items || [];
    var words = o.words || { g: 'On track', n: 'In progress', a: 'Behind', r: 'Needs attention', done: 'Complete' };

    var cells = items.map(function (it) {
      var pct = it.pct != null ? it.pct
        : (it.of ? Math.round((it.value / it.of) * 100) : 0);
      pct = Math.max(0, Math.min(100, isFinite(pct) ? pct : 0));
      var tone = it.tone || (pct >= 100 ? 'g' : pct >= 75 ? 'g' : pct >= 50 ? 'n' : pct >= 25 ? 'a' : 'r');
      var note = it.note || (pct >= 100 ? words.done : pct >= 75 ? words.g : pct >= 50 ? words.n : pct >= 25 ? words.a : words.r);
      return '<div class="stat-cell' + (it.link ? ' is-link' : '') + '"' +
        (it.link ? ' data-go="' + esc(it.link) + '"' : '') +
        ' title="' + esc(it.label + ': ' + it.value + (it.of ? ' of ' + it.of : '') + ' — ' + note) + '">' +
        '<div class="stat-label">' + esc(it.label) + '</div>' +
        '<div class="stat-value ' + tone + '"><b>' + esc(it.value) + '</b>' +
        (it.of != null ? '<span>/ ' + esc(it.of) + '</span>' : (it.unit ? '<span>' + esc(it.unit) + '</span>' : '')) +
        '</div>' +
        '<div class="stat-bar"><i class="' + tone + '" style="width:' + pct + '%"></i></div>' +
        '<div class="stat-note ' + tone + '"><span class="sn-dot"></span>' + esc(note) + '</div>' +
        '</div>';
    }).join('');

    var ov = o.overall;
    return '<div class="statpanel">' +
      '<div class="statpanel-h"><h3>' + esc(o.title || 'Your numbers') + '</h3>' +
      (o.sub ? '<span class="sp-sub">' + esc(o.sub) + '</span>' : '') +
      (ov ? '<div class="sp-overall"><span class="sp-sub">' + esc(ov.label || 'Overall') + '</span>' +
        '<div class="prog"><i class="' + (ov.pct >= 75 ? 'g' : ov.pct >= 40 ? '' : 'a') + '" style="width:' + Math.min(100, ov.pct) + '%"></i></div>' +
        '<b>' + ov.pct + '%</b></div>' : '') +
      '</div>' +
      '<div class="stat-grid">' + cells + '</div>' +
      (o.footer ? '<div class="statpanel-f">' + o.footer + '</div>' : '') +
      '</div>';
  }

  AS.ui = {
    esc: esc, fmt: fmt, money: money, dateFmt: dateFmt, initials: initials, titleCase: titleCase,
    statPanel: statPanel,
    icon: icon, badge: badge, statusBadge: statusBadge, genBadge: genBadge, modeTag: modeTag, prio: prio,
    kpi: kpi, progRow: progRow, crumb: crumb, pageHead: pageHead, card: card, empty: empty, loading: loading,
    callout: callout, demoNote: demoNote, table: table, drawTable: draw, tableState: tableState, tableRows: tableRows,
    exportRows: exportRows, modal: modal, closeModal: closeModal, confirmDialog: confirmDialog,
    drawer: drawer, closeDrawer: closeDrawer, toast: toast, filterBar: filterBar,
    districtOptions: districtOptions, centreOptions: centreOptions, batchOptions: batchOptions,
    modeOptions: modeOptions, statusOptions: statusOptions,
    tl: tl, kvList: kvList, listRows: listRows, avatar: avatar, riskBadges: riskBadges, attendanceCell: attendanceCell
  };
})();
