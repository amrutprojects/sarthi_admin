import { describe, expect, it } from 'vitest';
import { ApiError } from '../../../services/api-client';
import { csvCell, csvFileName, levelFor, pctText, rangeInvalid, reportCsv, unavailableFrom } from '../report.utils';
import { place, report } from './fixtures';

describe('report utils', () => {
  it('levelFor follows the drill path', () => {
    const p = place('X', 'X');
    expect(levelFor({})).toBe('division');
    expect(levelFor({ division: p })).toBe('district');
    expect(levelFor({ division: p, district: p })).toBe('centre');
    expect(levelFor({ division: p, district: p, centre: p })).toBe('batch');
  });

  it('rangeInvalid: reversed or over 366 days; open ends are fine', () => {
    expect(rangeInvalid('', '')).toBe(false);
    expect(rangeInvalid('2026-11-01', '')).toBe(false);
    expect(rangeInvalid('2026-11-21', '2026-11-01')).toBe(true);
    expect(rangeInvalid('2025-11-21', '2026-11-21')).toBe(false);
    expect(rangeInvalid('2025-11-20', '2026-11-21')).toBe(true);
  });

  it('unavailableFrom maps the API codes to the screen states', () => {
    const e = (status: number, code: string) => new ApiError('x', status, code);
    expect(unavailableFrom(e(404, 'LMS_READS_DISABLED'))).toBe('serverOff');
    expect(unavailableFrom(e(404, 'LMS_LIVE_DATA_OFF'))).toBe('off');
    expect(unavailableFrom(e(503, 'LMS_NOT_CONFIGURED'))).toBe('notConfigured');
    expect(unavailableFrom(e(503, 'LMS_TIMEOUT'))).toBe('down');
    expect(unavailableFrom(e(503, 'LMS_KEY_REJECTED'))).toBe('down');
    expect(unavailableFrom(e(0, 'NETWORK_ERROR'))).toBe('down');
    expect(unavailableFrom(e(403, 'FORBIDDEN'))).toBe('noAccess');
    expect(unavailableFrom(e(422, 'VALIDATION_ERROR'))).toBe('badRange');
    expect(unavailableFrom(e(500, 'INTERNAL_ERROR'))).toBe('error');
    expect(unavailableFrom(new Error('x'))).toBe('error');
  });

  it('pctText shows one decimal or a dash', () => {
    expect(pctText(71.8)).toBe('71.8%');
    expect(pctText(70)).toBe('70%');
    expect(pctText(null)).toBe('—');
  });

  it('csvCell quotes and neutralises formulas', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell(-5)).toBe('-5');
    expect(csvCell(null)).toBe('');
  });

  it('reportCsv is the table on screen: rows, totals, area and range, in the chosen language', () => {
    const r = report();
    const en = reportCsv(r, {}, 'en');
    expect(en.startsWith('﻿')).toBe(true);
    const lines = en.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('Attendance reports');
    expect(lines[1]).toBe('All divisions');
    expect(lines[2]).toBe('2026-10-23 to 2026-11-21');
    expect(lines[5].split(',').slice(0, 5)).toEqual(['Division', 'Code', 'Batches', 'Sessions held', 'Records marked']);
    expect(lines[6].split(',').slice(0, 2)).toEqual(['Nagpur', 'NAGPUR']);
    expect(lines[7]).toContain('Pune,PUNE,1,4,100,70,10,20,0,70,10,20,80,6,5,4,2');
    expect(lines[8].startsWith('Total,,2,8,110,79,10,21,0,71.8')).toBe(true);
    expect(lines).toHaveLength(9);

    const mr = reportCsv(r, { division: place('PUNE', 'Pune', 'पुणे') }, 'mr');
    expect(mr).toContain('उपस्थिती अहवाल');
    expect(mr).toContain('\r\nपुणे\r\n');
    expect(mr).toContain('नागपूर,NAGPUR');
    expect(mr).toContain('2026-10-23 ते 2026-11-21');
  });

  it('csvFileName carries level, area codes and dates', () => {
    expect(csvFileName(report({ level: 'centre' }), { division: place('PUNE', 'Pune'), district: place('PUN', 'Pune') })).toBe(
      'attendance_centre_PUNE_PUN_2026-10-23_2026-11-21.csv',
    );
  });
});
