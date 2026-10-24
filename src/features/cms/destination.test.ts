import { describe, expect, it } from 'vitest';
import { destinationProblem, normalizeDestination } from './destination';

describe('CMS destination links', () => {
  it('accepts an address typed as www. and reads it as https://', () => {
    expect(destinationProblem('www.example.gov.in')).toBeUndefined();
    expect(destinationProblem(' WWW.mahadbt.gov.in/scheme?id=4 ')).toBeUndefined();
    expect(normalizeDestination('www.example.gov.in')).toBe('https://www.example.gov.in');
    expect(normalizeDestination('/apply')).toBe('/apply');
  });

  it('still refuses anything that is not a site page, an http(s) address or www.', () => {
    const message = 'Destination must be a page on this site starting with /, or a web address starting with https:// or www.';
    expect(destinationProblem('example.gov.in')).toBe(message);
    expect(destinationProblem('javascript:alert(1)')).toBe(message);
    expect(destinationProblem('www.example .gov.in')).toBe('The address contains characters that are not allowed');
  });
});
