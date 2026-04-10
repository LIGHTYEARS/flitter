// thread-relationships.test.ts -- Tests for thread relationships (F7),
// async createThread (F9), and enhanced generateTitle (F16).
//
// Validates addRelationship, getRelationships, getChildThreads,
// async createThread with parent/queuedMessages, and generateTitle
// with AbortController/skipIfContains/child-thread skip logic.

import { describe, test, expect, beforeEach } from 'bun:test';
import { ThreadPool } from '../../src/state/thread-pool';

// =============================================================================
// ThreadRelationship tracking
// =============================================================================
describe('ThreadRelationship tracking', () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool();
  });

  // -------------------------------------------------------------------------
  // 1. addRelationship stores fork relationship
  // -------------------------------------------------------------------------
  test('addRelationship stores fork relationship', async () => {
    const h1 = await pool.createThread({ cwd: '/tmp', model: 'test' });
    const h2 = await pool.createThread({ cwd: '/tmp', model: 'test' });

    pool.addRelationship('fork', h1.threadID, h2.threadID);

    const rels = pool.getRelationships(h1.threadID);
    expect(rels.length).toBe(1);
    expect(rels[0].type).toBe('fork');
    expect(rels[0].sourceThreadID).toBe(h1.threadID);
    expect(rels[0].targetThreadID).toBe(h2.threadID);
    expect(typeof rels[0].createdAt).toBe('number');
  });

  // -------------------------------------------------------------------------
  // 2. addRelationship stores handoff relationship
  // -------------------------------------------------------------------------
  test('addRelationship stores handoff relationship', async () => {
    const h1 = await pool.createThread({ cwd: '/tmp', model: 'test' });
    const h2 = await pool.createThread({ cwd: '/tmp', model: 'test' });

    pool.addRelationship('handoff', h1.threadID, h2.threadID);

    const rels = pool.getRelationships(h2.threadID);
    expect(rels.length).toBe(1);
    expect(rels[0].type).toBe('handoff');
  });

  // -------------------------------------------------------------------------
  // 3. getRelationships returns all relationships for a thread
  // -------------------------------------------------------------------------
  test('getRelationships returns all relationships for a thread', async () => {
    const h1 = await pool.createThread({ cwd: '/tmp', model: 'test' });
    const h2 = await pool.createThread({ cwd: '/tmp', model: 'test' });
    const h3 = await pool.createThread({ cwd: '/tmp', model: 'test' });

    pool.addRelationship('fork', h1.threadID, h2.threadID);
    pool.addRelationship('mention', h3.threadID, h1.threadID);

    // h1 is source in first, target in second
    const rels = pool.getRelationships(h1.threadID);
    expect(rels.length).toBe(2);
    expect(rels.some(r => r.type === 'fork')).toBe(true);
    expect(rels.some(r => r.type === 'mention')).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 4. getChildThreads returns only child relationships
  // -------------------------------------------------------------------------
  test('getChildThreads returns only child relationships', async () => {
    const h1 = await pool.createThread({ cwd: '/tmp', model: 'test' });
    const h2 = await pool.createThread({ cwd: '/tmp', model: 'test' });
    const h3 = await pool.createThread({ cwd: '/tmp', model: 'test' });

    pool.addRelationship('fork', h1.threadID, h2.threadID);
    pool.addRelationship('handoff', h1.threadID, h3.threadID);
    pool.addRelationship('mention', h2.threadID, h1.threadID);

    const children = pool.getChildThreads(h1.threadID);
    expect(children.length).toBe(2);
    expect(children.every(r => r.sourceThreadID === h1.threadID)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 5. removeThread cleans up relationships
  // -------------------------------------------------------------------------
  test('removeThread cleans up relationships for removed thread', async () => {
    const h1 = await pool.createThread({ cwd: '/tmp', model: 'test' });
    const h2 = await pool.createThread({ cwd: '/tmp', model: 'test' });

    pool.addRelationship('fork', h1.threadID, h2.threadID);
    expect(pool.getRelationships(h1.threadID).length).toBe(1);

    pool.removeThread(h2.threadID);
    expect(pool.getRelationships(h1.threadID).length).toBe(0);
  });
});

// =============================================================================
// async createThread
// =============================================================================
describe('async createThread', () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool();
  });

  // -------------------------------------------------------------------------
  // 6. createThread returns a ThreadHandle
  // -------------------------------------------------------------------------
  test('createThread returns a valid ThreadHandle', async () => {
    const handle = await pool.createThread({ cwd: '/tmp', model: 'test' });

    expect(handle.threadID).toBeDefined();
    expect(handle.threadID.startsWith('T-')).toBe(true);
    expect(handle.session).toBeDefined();
    expect(handle.conversation).toBeDefined();
    expect(pool.threadHandleMap.has(handle.threadID)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 7. createThread with parent registers relationship
  // -------------------------------------------------------------------------
  test('createThread with parent registers relationship', async () => {
    const parent = await pool.createThread({ cwd: '/tmp', model: 'test' });

    const child = await pool.createThread({
      cwd: '/tmp',
      model: 'test',
      parent: { threadID: parent.threadID, relationType: 'fork' },
    });

    const rels = pool.getRelationships(child.threadID);
    expect(rels.length).toBe(1);
    expect(rels[0].type).toBe('fork');
    expect(rels[0].sourceThreadID).toBe(parent.threadID);
    expect(rels[0].targetThreadID).toBe(child.threadID);
  });

  // -------------------------------------------------------------------------
  // 8. createThread with parent inherits visibility
  // -------------------------------------------------------------------------
  test('createThread with parent inherits visibility', async () => {
    const parent = await pool.createThread({ cwd: '/tmp', model: 'test' });
    pool.setThreadVisibility(parent.threadID, 'hidden');

    const child = await pool.createThread({
      cwd: '/tmp',
      model: 'test',
      parent: { threadID: parent.threadID, relationType: 'handoff' },
    });

    expect(child.visibility).toBe('hidden');
  });

  // -------------------------------------------------------------------------
  // 9. createThread with queuedMessages transfers them
  // -------------------------------------------------------------------------
  test('createThread with queuedMessages transfers them', async () => {
    const msgs = [
      { id: 'qm-1', text: 'Hello', queuedAt: Date.now() },
      { id: 'qm-2', text: 'World', queuedAt: Date.now() },
    ];

    const handle = await pool.createThread({
      cwd: '/tmp',
      model: 'test',
      queuedMessages: msgs,
    });

    expect(handle.queuedMessages.length).toBe(2);
    expect(handle.queuedMessages[0].text).toBe('Hello');
    expect(handle.queuedMessages[1].text).toBe('World');
    // Verify it's a copy, not the same array
    expect(handle.queuedMessages).not.toBe(msgs);
  });

  // -------------------------------------------------------------------------
  // 10. createThread with seededMessages injects user messages
  // -------------------------------------------------------------------------
  test('createThread with seededMessages injects user messages', async () => {
    const handle = await pool.createThread({
      cwd: '/tmp',
      model: 'test',
      seededMessages: [
        { role: 'user', text: 'Seeded message' },
        { role: 'assistant', text: 'Seeded response' },
      ],
    });

    // User messages should be injected into session items
    expect(handle.session.items.length).toBe(1); // only user messages injected
    expect(handle.session.items[0].type).toBe('user_message');
  });
});

// =============================================================================
// generateTitle enhanced
// =============================================================================
describe('generateTitle enhanced', () => {
  let pool: ThreadPool;

  beforeEach(() => {
    pool = new ThreadPool();
  });

  // -------------------------------------------------------------------------
  // 11. skips child threads
  // -------------------------------------------------------------------------
  test('skips title generation for child threads', async () => {
    const parent = await pool.createThread({ cwd: '/tmp', model: 'test' });
    const child = await pool.createThread({ cwd: '/tmp', model: 'test' });

    // Register child as a target of a fork relationship
    pool.addRelationship('fork', parent.threadID, child.threadID);

    // Add a user message to the child's session
    child.session.startProcessing('Child message');

    pool.generateTitle(child.threadID);
    expect(child.title).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 12. respects skipIfContains rules
  // -------------------------------------------------------------------------
  test('respects skipIfContains rules', async () => {
    const handle = await pool.createThread({ cwd: '/tmp', model: 'test' });

    handle.session.startProcessing('This contains a secret pattern');

    pool.generateTitle(handle.threadID, {
      skipIfContains: ['secret pattern'],
    });

    expect(handle.title).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 13. respects abortSignal
  // -------------------------------------------------------------------------
  test('respects abortSignal when already aborted', async () => {
    const handle = await pool.createThread({ cwd: '/tmp', model: 'test' });

    handle.session.startProcessing('Hello world');

    const controller = new AbortController();
    controller.abort(); // pre-abort

    pool.generateTitle(handle.threadID, {
      abortSignal: controller.signal,
    });

    expect(handle.title).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 14. generates title normally when no skip conditions apply
  // -------------------------------------------------------------------------
  test('generates title normally when no skip conditions apply', async () => {
    const handle = await pool.createThread({ cwd: '/tmp', model: 'test' });

    handle.session.startProcessing('Normal message');

    pool.generateTitle(handle.threadID, {
      skipIfContains: ['does not match'],
    });

    expect(handle.title).toBe('Normal message');
  });

  // -------------------------------------------------------------------------
  // 15. skipIfContains with non-matching pattern still generates title
  // -------------------------------------------------------------------------
  test('skipIfContains with non-matching pattern still generates title', async () => {
    const handle = await pool.createThread({ cwd: '/tmp', model: 'test' });

    handle.session.startProcessing('Perfectly fine message');

    pool.generateTitle(handle.threadID, {
      skipIfContains: ['nope', 'not-here'],
    });

    expect(handle.title).toBe('Perfectly fine message');
  });
});
