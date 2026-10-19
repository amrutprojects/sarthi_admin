/*
 * HTML generators kept from the original pages because they are pure
 * (data in, markup out), like the chart helpers:
 *   learnerPanelHtml — the learner "Your numbers" stat panel (was AS.learnerPanel)
 *   qrSvg            — the demo certificate QR pattern (was AS.charts.qrSvg)
 */
import AS from '../legacy';
import type { Candidate } from '../types/domain';

export function learnerPanelHtml(c: Candidate | null): string {
  const DB = AS.db,
    U = AS.ui,
    CT = AS.content;
  const L = CT.getLang(),
    S = CT.learnerStats,
    kal = CT.kalash;
  const pick = <T>(o: { mr: T; en: T }): T => o[L] || o.en;

  const progress = c ? c.progress : 64;
  const attendance = c ? c.attendance : 88;
  const hours = Math.round((kal.moduleHours * progress) / 100);
  const topicsOf = 86,
    topics = Math.round((topicsOf * progress) / 100);
  const asgOf = 10,
    asg = Math.round((asgOf * progress) / 100);
  const mcqOf = 160,
    mcq = Math.round((mcqOf * Math.min(100, progress + 12)) / 100);
  const asmOf = kal.modules.length,
    asm = c ? Math.min(asmOf, Math.round((asmOf * progress) / 100)) : 1;
  const attTone = attendance >= DB.config.minAttendancePct ? 'g' : attendance >= 60 ? 'a' : 'r';
  const words = pick(S.words);

  return U.statPanel({
    title: pick(S.title),
    sub: pick(S.sub),
    words,
    overall: { pct: progress, label: pick(S.overall) },
    items: [
      { label: pick(S.hours), value: hours, of: kal.moduleHours, link: c ? '#/candidates/' + c.id + '?tab=training' : null },
      { label: pick(S.topics), value: topics, of: topicsOf },
      {
        label: pick(S.attendance),
        value: attendance,
        unit: '%',
        pct: attendance,
        tone: attTone,
        note: attendance >= DB.config.minAttendancePct ? words.g : words.r,
        link: c ? '#/candidates/' + c.id + '?tab=attendance' : '#/attendance',
      },
      { label: pick(S.assignments), value: asg, of: asgOf, link: c ? '#/candidates/' + c.id + '?tab=assignments' : null },
      { label: pick(S.mcqs), value: mcq, of: mcqOf },
      { label: pick(S.assessments), value: asm, of: asmOf, link: c ? '#/candidates/' + c.id + '?tab=assessments' : '#/assessments' },
    ],
    footer: pick(S.foot),
  });
}

export function qrSvg(seed: string | null): string {
  const s = String(seed || '');
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  let cells = '';
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 11; x++) {
      n = (n * 1103515245 + 12345) >>> 0;
      let on = ((n >>> 16) & 1) === 1;
      const corner = (x < 3 && y < 3) || (x > 7 && y < 3) || (x < 3 && y > 7);
      if (corner) on = !(x === 1 && y === 1) && !(x === 9 && y === 1) && !(x === 1 && y === 9);
      if (on) cells += '<rect x="' + x * 6 + '" y="' + y * 6 + '" width="6" height="6" fill="#5C2A0D"/>';
    }
  }
  return (
    '<svg viewBox="0 0 66 66" style="width:74px;height:74px;background:#fff;border:1px solid var(--border);border-radius:6px;padding:3px">' +
    cells +
    '</svg>'
  );
}
