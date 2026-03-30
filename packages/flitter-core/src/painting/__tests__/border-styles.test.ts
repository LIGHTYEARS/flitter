// Tests for border-painter — Gap 31: dashed and double box-drawing character sets
import { describe, test, expect } from 'bun:test';
import { BOX_DRAWING, type BoxDrawingChars } from '../../painting/border-painter';

describe('BOX_DRAWING character sets', () => {
  test('contains all four styles', () => {
    expect(BOX_DRAWING.rounded).toBeDefined();
    expect(BOX_DRAWING.solid).toBeDefined();
    expect(BOX_DRAWING.dashed).toBeDefined();
    expect(BOX_DRAWING.double).toBeDefined();
  });

  const verifyCharSet = (name: string, chars: BoxDrawingChars) => {
    describe(name, () => {
      test('all fields are single characters', () => {
        const fields = [
          chars.tl, chars.tr, chars.bl, chars.br,
          chars.h, chars.v,
          chars.teeDown, chars.teeUp, chars.teeRight, chars.teeLeft,
          chars.cross,
        ];
        for (const f of fields) {
          expect(f.length).toBe(1);
        }
      });

      test('corners are distinct from edges', () => {
        expect(chars.tl).not.toBe(chars.h);
        expect(chars.tl).not.toBe(chars.v);
      });
    });
  };

  verifyCharSet('rounded', BOX_DRAWING.rounded);
  verifyCharSet('solid', BOX_DRAWING.solid);
  verifyCharSet('dashed', BOX_DRAWING.dashed);
  verifyCharSet('double', BOX_DRAWING.double);

  describe('dashed style specifics', () => {
    test('uses dashed horizontal line U+2504', () => {
      expect(BOX_DRAWING.dashed.h).toBe('\u2504');
    });
    test('uses dashed vertical line U+2506', () => {
      expect(BOX_DRAWING.dashed.v).toBe('\u2506');
    });
    test('uses solid corners (inherits from solid)', () => {
      expect(BOX_DRAWING.dashed.tl).toBe(BOX_DRAWING.solid.tl);
      expect(BOX_DRAWING.dashed.tr).toBe(BOX_DRAWING.solid.tr);
      expect(BOX_DRAWING.dashed.bl).toBe(BOX_DRAWING.solid.bl);
      expect(BOX_DRAWING.dashed.br).toBe(BOX_DRAWING.solid.br);
    });
  });

  describe('double style specifics', () => {
    test('uses double horizontal line U+2550', () => {
      expect(BOX_DRAWING.double.h).toBe('\u2550');
    });
    test('uses double vertical line U+2551', () => {
      expect(BOX_DRAWING.double.v).toBe('\u2551');
    });
    test('uses double corners', () => {
      expect(BOX_DRAWING.double.tl).toBe('\u2554');
      expect(BOX_DRAWING.double.tr).toBe('\u2557');
      expect(BOX_DRAWING.double.bl).toBe('\u255A');
      expect(BOX_DRAWING.double.br).toBe('\u255D');
    });
    test('uses double T-junctions', () => {
      expect(BOX_DRAWING.double.teeDown).toBe('\u2566');
      expect(BOX_DRAWING.double.teeUp).toBe('\u2569');
      expect(BOX_DRAWING.double.teeRight).toBe('\u2560');
      expect(BOX_DRAWING.double.teeLeft).toBe('\u2563');
    });
    test('uses double cross', () => {
      expect(BOX_DRAWING.double.cross).toBe('\u256C');
    });
  });
});
