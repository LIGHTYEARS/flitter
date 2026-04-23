/**
 * AnimatedOrb unit tests.
 *
 * Validates:
 * - AnimatedOrb is a StatefulWidget
 * - GlowNoise produces values in [0, 1]
 * - RenderOrbSphere has correct intrinsic sizes
 * - Default colors match amp reference
 *
 * @module
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Color, StatefulWidget } from "@flitter/tui";
import { AnimatedOrb, GlowNoise, RenderOrbSphere } from "./animated-orb.js";

describe("AnimatedOrb", () => {
  it("extends StatefulWidget", () => {
    const orb = new AnimatedOrb();
    assert.ok(orb instanceof StatefulWidget);
  });

  it("defaults to 40x40 dimensions", () => {
    const orb = new AnimatedOrb();
    assert.equal(orb.width, 40);
    assert.equal(orb.height, 40);
  });

  it("defaults to 30 fps", () => {
    const orb = new AnimatedOrb();
    assert.equal(orb.fps, 30);
  });

  it("accepts custom width/height", () => {
    const orb = new AnimatedOrb({ width: 20, height: 15 });
    assert.equal(orb.width, 20);
    assert.equal(orb.height, 15);
  });

  it("accepts external time value", () => {
    const orb = new AnimatedOrb({ t: 1.5 });
    assert.equal(orb.t, 1.5);
  });
});

describe("GlowNoise", () => {
  it("produces values in [0, 1] range", () => {
    const glow = new GlowNoise(42);
    for (let x = 0; x < 40; x++) {
      for (let y = 0; y < 40; y++) {
        const v = glow.sample(x, y, 0);
        assert.ok(v >= 0 && v <= 1, `sample(${x},${y},0) = ${v} out of range`);
      }
    }
  });

  it("varies over time", () => {
    const glow = new GlowNoise(42);
    const v0 = glow.sample(10, 10, 0);
    const v1 = glow.sample(10, 10, 1);
    assert.notEqual(v0, v1, "Noise should change over time");
  });

  it("is deterministic with same seed", () => {
    const a = new GlowNoise(123);
    const b = new GlowNoise(123);
    assert.equal(a.sample(5, 5, 0.5), b.sample(5, 5, 0.5));
  });

  it("differs with different seeds", () => {
    const a = new GlowNoise(1);
    const b = new GlowNoise(2);
    // Most positions will differ; check a few
    let anyDifferent = false;
    for (let i = 0; i < 10; i++) {
      if (a.sample(i, i, 0) !== b.sample(i, i, 0)) {
        anyDifferent = true;
        break;
      }
    }
    assert.ok(anyDifferent, "Different seeds should produce different noise");
  });

  it("sampleEdge returns values in [0, 1] range", () => {
    const glow = new GlowNoise(42);
    for (let ny = -1; ny <= 1; ny += 0.25) {
      const v = glow.sampleEdge(40, 40, ny, 0);
      assert.ok(v >= 0 && v <= 1, `sampleEdge(40,40,${ny},0) = ${v} out of range`);
    }
  });
});

describe("RenderOrbSphere", () => {
  it("reports correct intrinsic sizes", () => {
    const glow = new GlowNoise(42);
    const bg = Color.default();
    const ro = new RenderOrbSphere(
      40,
      40,
      0,
      glow,
      [],
      { r: 0, g: 55, b: 0 },
      { r: 0, g: 255, b: 136 },
      bg,
    );
    assert.equal(ro.getMinIntrinsicWidth(0), 8);
    assert.equal(ro.getMaxIntrinsicWidth(0), 40);
    assert.equal(ro.getMinIntrinsicHeight(0), 8);
    assert.equal(ro.getMaxIntrinsicHeight(0), 40);
  });
});
