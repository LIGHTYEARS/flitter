/**
 * FlingScrollPhysics and VelocityTracker tests.
 *
 * Covers:
 * - VelocityTracker sample collection and velocity estimation
 * - FlingScrollPhysics clamping (delegates to ClampingScrollPhysics)
 * - Fling displacement and velocity computation
 * - Fling completion detection
 * - Total fling distance calculation
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FlingScrollPhysics, VelocityTracker } from "./fling-scroll-physics.js";

// ════════════════════════════════════════════════════
//  VelocityTracker tests
// ════════════════════════════════════════════════════

describe("VelocityTracker", () => {
  it("returns 0 velocity with no samples", () => {
    const vt = new VelocityTracker();
    assert.equal(vt.estimateVelocity(), 0);
  });

  it("returns 0 velocity with single sample", () => {
    const vt = new VelocityTracker();
    vt.addSample(100, 1000);
    assert.equal(vt.estimateVelocity(), 0);
  });

  it("estimates positive velocity (scrolling down)", () => {
    const vt = new VelocityTracker();
    vt.addSample(0, 0);
    vt.addSample(100, 100);
    const v = vt.estimateVelocity();
    assert.equal(v, 1.0); // 100 units / 100ms
  });

  it("estimates negative velocity (scrolling up)", () => {
    const vt = new VelocityTracker();
    vt.addSample(100, 0);
    vt.addSample(0, 100);
    const v = vt.estimateVelocity();
    assert.equal(v, -1.0);
  });

  it("respects maxSamples sliding window", () => {
    const vt = new VelocityTracker(3);
    vt.addSample(0, 0);
    vt.addSample(10, 10);
    vt.addSample(20, 20);
    vt.addSample(30, 30); // oldest (0) should be dropped
    assert.equal(vt.sampleCount, 3);
    // Velocity should be (30 - 10) / (30 - 10) = 1.0
    assert.equal(vt.estimateVelocity(), 1.0);
  });

  it("reset clears all samples", () => {
    const vt = new VelocityTracker();
    vt.addSample(0, 0);
    vt.addSample(100, 100);
    vt.reset();
    assert.equal(vt.sampleCount, 0);
    assert.equal(vt.estimateVelocity(), 0);
  });

  it("handles zero time delta", () => {
    const vt = new VelocityTracker();
    vt.addSample(0, 100);
    vt.addSample(50, 100); // same timestamp
    assert.equal(vt.estimateVelocity(), 0); // dt === 0
  });
});

// ════════════════════════════════════════════════════
//  FlingScrollPhysics tests
// ════════════════════════════════════════════════════

describe("FlingScrollPhysics", () => {
  it("clamps offset like ClampingScrollPhysics", () => {
    const fling = new FlingScrollPhysics();
    assert.equal(fling.clampOffset(-10, 0, 100), 0);
    assert.equal(fling.clampOffset(50, 0, 100), 50);
    assert.equal(fling.clampOffset(200, 0, 100), 100);
  });

  it("friction defaults to 0.015", () => {
    const fling = new FlingScrollPhysics();
    assert.equal(fling.friction, 0.015);
  });

  it("custom friction value", () => {
    const fling = new FlingScrollPhysics(0.05);
    assert.equal(fling.friction, 0.05);
  });

  it("fling displacement starts at 0", () => {
    const fling = new FlingScrollPhysics();
    assert.equal(fling.computeFlingDisplacement(1.0, 0), 0);
  });

  it("fling displacement increases over time", () => {
    const fling = new FlingScrollPhysics(0.01);
    const d1 = fling.computeFlingDisplacement(1.0, 100);
    const d2 = fling.computeFlingDisplacement(1.0, 200);
    assert.ok(d2 > d1, "displacement should increase over time");
  });

  it("fling velocity decreases over time", () => {
    const fling = new FlingScrollPhysics(0.01);
    const v1 = fling.computeFlingVelocity(1.0, 100);
    const v2 = fling.computeFlingVelocity(1.0, 200);
    assert.ok(Math.abs(v2) < Math.abs(v1), "velocity should decrease");
  });

  it("fling velocity at t=0 equals initial velocity", () => {
    const fling = new FlingScrollPhysics();
    assert.equal(fling.computeFlingVelocity(2.5, 0), 2.5);
  });

  it("isFlingComplete returns false initially", () => {
    const fling = new FlingScrollPhysics(0.01);
    assert.equal(fling.isFlingComplete(1.0, 0), false);
  });

  it("isFlingComplete returns true after sufficient time", () => {
    const fling = new FlingScrollPhysics(0.01);
    assert.equal(fling.isFlingComplete(1.0, 100000), true);
  });

  it("total fling distance is v0/friction", () => {
    const fling = new FlingScrollPhysics(0.02);
    const distance = fling.computeTotalFlingDistance(1.0);
    assert.equal(distance, 50); // 1.0 / 0.02
  });

  it("total fling distance is Infinity when friction is 0", () => {
    const fling = new FlingScrollPhysics(0);
    const distance = fling.computeTotalFlingDistance(1.0);
    assert.equal(distance, Infinity);
  });

  it("has a velocity tracker", () => {
    const fling = new FlingScrollPhysics();
    assert.ok(fling.tracker instanceof VelocityTracker);
  });
});
