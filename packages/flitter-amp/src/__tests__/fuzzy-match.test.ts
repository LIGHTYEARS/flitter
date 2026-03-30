// Tests for fuzzy match utility functions
// Gap 28: Fuzzy matching engine for command palette search/filter

import { describe, test, expect } from 'bun:test';
import { fuzzyMatch, fuzzyMatchDetailed, scoreCommand } from '../utils/fuzzy-match';

describe('fuzzyMatch', () => {
  test('empty query matches everything with score 1', () => {
    expect(fuzzyMatch('', 'anything')).toBe(1);
    expect(fuzzyMatch('', '')).toBe(1);
  });

  test('exact match returns high score', () => {
    const score = fuzzyMatch('clear', 'Clear conversation');
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThan(0);
  });

  test('non-matching query returns null', () => {
    expect(fuzzyMatch('xyz', 'Clear conversation')).toBeNull();
    expect(fuzzyMatch('zzz', 'abc')).toBeNull();
  });

  test('case insensitive matching', () => {
    const score1 = fuzzyMatch('CLEAR', 'Clear conversation');
    const score2 = fuzzyMatch('clear', 'Clear conversation');
    expect(score1).not.toBeNull();
    expect(score2).not.toBeNull();
    expect(score1).toBe(score2);
  });

  test('match at start of string gets bonus', () => {
    // "cl" at start of "Clear" should score higher than "cl" in "unclear"
    const startScore = fuzzyMatch('cl', 'Clear');
    const midScore = fuzzyMatch('cl', 'unclear');
    expect(startScore).not.toBeNull();
    expect(midScore).not.toBeNull();
    expect(startScore!).toBeGreaterThan(midScore!);
  });

  test('word boundary matches score higher', () => {
    // "tc" matching "Toggle tool calls" at word boundaries
    // vs "tc" matching "technical" without word boundaries
    const boundaryScore = fuzzyMatch('tc', 'Toggle calls');
    const noBoundaryScore = fuzzyMatch('tc', 'technical stuff');
    expect(boundaryScore).not.toBeNull();
    expect(noBoundaryScore).not.toBeNull();
    // The boundary match should score higher due to word boundary bonus
    expect(boundaryScore!).toBeGreaterThan(noBoundaryScore!);
  });

  test('consecutive character matches score higher than scattered', () => {
    // "clear" as consecutive chars in "Clear" vs scattered in "ConversationLEAR"
    const consecutiveScore = fuzzyMatch('cle', 'clear');
    const scatteredScore = fuzzyMatch('cle', 'cancel large edit');
    expect(consecutiveScore).not.toBeNull();
    expect(scatteredScore).not.toBeNull();
    expect(consecutiveScore!).toBeGreaterThan(scatteredScore!);
  });

  test('shorter targets get bonus', () => {
    const shortScore = fuzzyMatch('a', 'abc');
    const longScore = fuzzyMatch('a', 'abcdefghijklmnop');
    expect(shortScore).not.toBeNull();
    expect(longScore).not.toBeNull();
    expect(shortScore!).toBeGreaterThan(longScore!);
  });

  test('query longer than target returns null', () => {
    expect(fuzzyMatch('abcdefgh', 'abc')).toBeNull();
  });

  test('single character match works', () => {
    expect(fuzzyMatch('t', 'Toggle')).not.toBeNull();
    expect(fuzzyMatch('z', 'Toggle')).toBeNull();
  });

  test('hyphen boundary gives bonus', () => {
    const score = fuzzyMatch('tc', 'tool-calls');
    expect(score).not.toBeNull();
    // "c" after hyphen should get word boundary bonus
    expect(score!).toBeGreaterThan(2); // More than just base 2 points
  });

  test('underscore boundary gives bonus', () => {
    const score = fuzzyMatch('tc', 'tool_calls');
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThan(2);
  });
});

describe('fuzzyMatchDetailed', () => {
  test('empty query returns empty matchedIndices', () => {
    const result = fuzzyMatchDetailed('', 'anything');
    expect(result).not.toBeNull();
    expect(result!.score).toBe(1);
    expect(result!.matchedIndices).toEqual([]);
  });

  test('returns matched character indices', () => {
    const result = fuzzyMatchDetailed('cl', 'Clear');
    expect(result).not.toBeNull();
    expect(result!.matchedIndices).toEqual([0, 1]);
  });

  test('scattered match returns correct indices', () => {
    const result = fuzzyMatchDetailed('ct', 'Clear tool');
    expect(result).not.toBeNull();
    expect(result!.matchedIndices[0]).toBe(0); // C
    expect(result!.matchedIndices[1]).toBe(6); // t
  });

  test('non-match returns null', () => {
    expect(fuzzyMatchDetailed('xyz', 'abc')).toBeNull();
  });

  test('score matches fuzzyMatch', () => {
    const simple = fuzzyMatch('clear', 'Clear conversation');
    const detailed = fuzzyMatchDetailed('clear', 'Clear conversation');
    expect(detailed).not.toBeNull();
    expect(detailed!.score).toBe(simple);
  });
});

describe('scoreCommand', () => {
  test('label-only match works', () => {
    const score = scoreCommand('clear', { label: 'Clear conversation' });
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThan(0);
  });

  test('description match contributes half weight', () => {
    const labelOnly = scoreCommand('clear', { label: 'Clear conversation' });
    const withDesc = scoreCommand('clear', {
      label: 'Clear conversation',
      description: 'Remove and clear everything',
    });
    expect(labelOnly).not.toBeNull();
    expect(withDesc).not.toBeNull();
    // With description match, score should be higher
    expect(withDesc!).toBeGreaterThanOrEqual(labelOnly!);
  });

  test('no match returns null', () => {
    expect(scoreCommand('xyz', { label: 'abc', description: 'def' })).toBeNull();
  });

  test('description-only match works', () => {
    // "expand" does not match label "Toggle tool calls" but matches description
    const score = scoreCommand('expand', {
      label: 'Toggle tool calls',
      description: 'Expand/collapse all tool blocks',
    });
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThan(0);
  });

  test('label match takes priority over description match', () => {
    // When label matches, it contributes full weight
    const labelMatch = scoreCommand('toggle', {
      label: 'Toggle tool calls',
      description: 'Something else entirely',
    });
    const descMatch = scoreCommand('toggle', {
      label: 'Something else entirely',
      description: 'Toggle all things',
    });
    expect(labelMatch).not.toBeNull();
    expect(descMatch).not.toBeNull();
    // Label match at full weight should score higher than desc at half weight
    expect(labelMatch!).toBeGreaterThan(descMatch!);
  });

  test('empty query matches everything', () => {
    expect(scoreCommand('', { label: 'anything' })).not.toBeNull();
  });
});
