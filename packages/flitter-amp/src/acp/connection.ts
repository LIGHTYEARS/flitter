// ACP Connection — spawn agent subprocess and establish ClientSideConnection

import * as acp from '@agentclientprotocol/sdk';
import type { Implementation, StopReason } from '@agentclientprotocol/sdk';
import { log } from '../utils/logger';
import { spawnAgent, type AgentProcess } from '../utils/process';
import { FlitterClient, type ClientCallbacks } from './client';
import { withTimeout } from './timeout';
import { supportsCloseSession } from './capabilities';

export interface ConnectionHandle {
  connection: acp.ClientSideConnection;
  client: FlitterClient;
  agent: AgentProcess;
  capabilities: acp.AgentCapabilities | undefined;
  agentInfo: Implementation | null | undefined;
  sessionId: string;
  /** Precomputed: whether the agent advertises session.close capability */
  supportsCloseSession: boolean;
}

/**
 * Connect to an ACP agent by spawning it as a subprocess.
 *
 * Flow:
 * 1. Spawn agent process
 * 2. Create ndJsonStream over stdin/stdout (already Web Streams from Bun.spawn)
 * 3. Create ClientSideConnection with our FlitterClient
 * 4. Send initialize request
 * 5. Create a new session
 * 6. Return the connection handle for prompt sending
 */
export async function connectToAgent(
  agentCommand: string,
  agentArgs: string[],
  cwd: string,
  callbacks: ClientCallbacks,
): Promise<ConnectionHandle> {
  // 1. Spawn the agent subprocess
  const agent = spawnAgent(agentCommand, agentArgs, cwd);

  // 2. Create ACP stream — agent.stdin/stdout are already Web Streams
  const stream = acp.ndJsonStream(agent.stdin, agent.stdout);

  // 3. Create client and connection
  // FlitterClient implements acp.Client directly — no cast needed
  const client = new FlitterClient(callbacks);
  const connection = new acp.ClientSideConnection(
    (_agentProxy: acp.Agent) => client,
    stream,
  );

  // 4. Initialize — negotiate protocol version (30s timeout)
  log.info('Sending initialize request...');
  let initResponse: acp.InitializeResponse;
  try {
    initResponse = await withTimeout(
      connection.initialize({
        protocolVersion: acp.PROTOCOL_VERSION,
        clientInfo: { name: 'flitter-amp', version: '0.1.0' },
        clientCapabilities: {
          fs: { readTextFile: true, writeTextFile: true },
          terminal: true,
        },
      }),
      30_000,
      'initialize',
    );
  } catch (err) {
    agent.kill(); // Prevent zombie process on init failure
    throw err;
  }
  log.info(`Agent initialized: ${initResponse.agentInfo?.name ?? 'unknown'}`);
  log.info(`Agent capabilities: ${JSON.stringify(initResponse.agentCapabilities)}`);

  // 5. Create a new session (15s timeout)
  log.info('Creating new session...');
  let sessionResponse: acp.NewSessionResponse;
  try {
    sessionResponse = await withTimeout(
      connection.newSession({
        cwd,
        mcpServers: [],
      }),
      15_000,
      'newSession',
    );
  } catch (err) {
    agent.kill(); // Prevent zombie process on session failure
    throw err;
  }
  log.info(`Session created: ${sessionResponse.sessionId}`);

  const handle: ConnectionHandle = {
    connection,
    client,
    agent,
    capabilities: initResponse.agentCapabilities,
    agentInfo: initResponse.agentInfo,
    sessionId: sessionResponse.sessionId,
    supportsCloseSession: supportsCloseSession(initResponse.agentCapabilities),
  };

  log.info(`Agent supports session.close: ${handle.supportsCloseSession}`);

  return handle;
}

/**
 * Send a text prompt to the agent.
 * Returns when the agent finishes processing (PromptResponse received).
 * Default timeout: 5 minutes (LLM inference can take minutes for complex tasks).
 */
export async function sendPrompt(
  connection: acp.ClientSideConnection,
  sessionId: string,
  text: string,
  timeoutMs: number = 300_000,
): Promise<{ stopReason: StopReason }> {
  log.info(`Sending prompt to session ${sessionId}`);
  const response = await withTimeout(
    connection.prompt({
      sessionId,
      prompt: [{ type: 'text', text }],
    }),
    timeoutMs,
    'prompt',
  );
  // stopReason is a required field on PromptResponse — no cast or fallback needed
  return { stopReason: response.stopReason };
}

/**
 * Cancel the current operation in a session.
 * Default timeout: 10 seconds (should be near-instant).
 */
export async function cancelPrompt(
  connection: acp.ClientSideConnection,
  sessionId: string,
  timeoutMs: number = 10_000,
): Promise<void> {
  log.info(`Cancelling session ${sessionId}`);
  await withTimeout(
    connection.cancel({ sessionId }),
    timeoutMs,
    'cancel',
  );
}

/** Timeout for the closeSession RPC. 5 seconds is generous. */
const CLOSE_SESSION_TIMEOUT_MS = 5_000;

/**
 * Attempt to gracefully close an ACP session.
 *
 * If the agent advertises `session.close`, sends a `closeSession` request
 * with a timeout. If the agent does not support it, or if the request
 * fails or times out, returns false so the caller can fall back to a
 * hard kill.
 *
 * This function NEVER throws. All errors are logged and swallowed.
 */
export async function closeSession(
  connection: acp.ClientSideConnection,
  sessionId: string,
  capabilities: acp.AgentCapabilities | undefined,
  timeoutMs: number = CLOSE_SESSION_TIMEOUT_MS,
): Promise<boolean> {
  if (!supportsCloseSession(capabilities)) {
    log.info(
      'Agent does not advertise session.close capability; skipping closeSession',
    );
    return false;
  }

  log.info(
    `Sending closeSession for session ${sessionId} (timeout: ${timeoutMs}ms)`,
  );

  try {
    await withTimeout(
      connection.unstable_closeSession({ sessionId }),
      timeoutMs,
      'closeSession',
    );
    log.info('Session closed gracefully');
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`closeSession failed: ${message}`);
    return false;
  }
}

/**
 * Attempt to resume a previously saved session via ACP session/load.
 * Falls back to newSession if:
 * - The agent does not implement session/load (MethodNotFound)
 * - The session ID is not recognized by the agent (SessionNotFound)
 * - Any other error occurs during loadSession
 *
 * The fallback is silent from the user's perspective -- the TUI starts normally
 * with a new session. A log warning is emitted for debugging.
 */
export async function connectToAgentWithResume(
  agentCommand: string,
  agentArgs: string[],
  cwd: string,
  callbacks: ClientCallbacks,
  resumeSessionId: string,
): Promise<ConnectionHandle> {
  // Steps 1-4 are identical to connectToAgent
  const agent = spawnAgent(agentCommand, agentArgs, cwd);
  const stream = acp.ndJsonStream(agent.stdin, agent.stdout);
  const client = new FlitterClient(callbacks);
  const connection = new acp.ClientSideConnection(
    (_agentProxy: acp.Agent) => client,
    stream,
  );

  log.info('Sending initialize request...');
  let initResponse: acp.InitializeResponse;
  try {
    initResponse = await withTimeout(
      connection.initialize({
        protocolVersion: acp.PROTOCOL_VERSION,
        clientInfo: { name: 'flitter-amp', version: '0.1.0' },
        clientCapabilities: {
          fs: { readTextFile: true, writeTextFile: true },
          terminal: true,
        },
      }),
      30_000,
      'initialize',
    );
  } catch (err) {
    agent.kill();
    throw err;
  }
  log.info(`Agent initialized: ${initResponse.agentInfo?.name ?? 'unknown'}`);

  // Step 5: Try loadSession, fall back to newSession
  let sessionId: string;

  try {
    log.info(`Attempting to load session: ${resumeSessionId}`);
    const loadResponse = await withTimeout(
      connection.loadSession({
        sessionId: resumeSessionId,
      }),
      15_000,
      'loadSession',
    );
    sessionId = loadResponse.sessionId;
    log.info(`Session loaded successfully: ${sessionId}`);
  } catch (err) {
    // Agent does not support loadSession or session not found
    log.warn(`loadSession failed, falling back to newSession: ${err}`);
    try {
      const sessionResponse = await withTimeout(
        connection.newSession({ cwd, mcpServers: [] }),
        15_000,
        'newSession',
      );
      sessionId = sessionResponse.sessionId;
      log.info(`New session created as fallback: ${sessionId}`);
    } catch (err2) {
      agent.kill();
      throw err2;
    }
  }

  return {
    connection,
    client,
    agent,
    capabilities: initResponse.agentCapabilities,
    agentInfo: initResponse.agentInfo,
    sessionId,
    supportsCloseSession: supportsCloseSession(initResponse.agentCapabilities),
  };
}
