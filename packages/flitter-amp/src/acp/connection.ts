// ACP Connection — spawn agent subprocess and establish ClientSideConnection

import * as acp from '@agentclientprotocol/sdk';
import { Readable, Writable } from 'node:stream';
import { log } from '../utils/logger';
import { spawnAgent, type AgentProcess } from '../utils/process';
import { FlitterClient, type ClientCallbacks } from './client';

export interface ConnectionHandle {
  connection: acp.ClientSideConnection;
  client: FlitterClient;
  agent: AgentProcess;
  capabilities: acp.AgentCapabilities | undefined;
  sessionId: string;
  agentName: string | null;
}

/**
 * Connect to an ACP agent by spawning it as a subprocess.
 *
 * Flow:
 * 1. Spawn agent process
 * 2. Create ndJsonStream over stdin/stdout
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

  // 2. Create ACP stream over subprocess stdio
  const input = Readable.toWeb(agent.stdout as any) as ReadableStream<Uint8Array>;
  const output = Writable.toWeb(agent.stdin as any) as WritableStream<Uint8Array>;
  const stream = acp.ndJsonStream(output, input);

  // 3. Create client and connection
  // ClientSideConnection takes a factory: (agentProxy: Agent) => Client
  const client = new FlitterClient(callbacks);
  const connection = new acp.ClientSideConnection(
    (_agentProxy: acp.Agent) => client as unknown as acp.Client,
    stream,
  );

  // 4. Initialize — negotiate protocol version
  log.info('Sending initialize request...');
  const initResponse = await connection.initialize({
    protocolVersion: acp.PROTOCOL_VERSION,
    clientInfo: { name: 'flitter-amp', version: '0.2.0' },
    clientCapabilities: {
      fs: { readTextFile: true, writeTextFile: true },
      terminal: true,
    },
  });
  log.info('Agent initialized:', initResponse.agentInfo?.name ?? 'unknown');
  log.info('Agent capabilities:', JSON.stringify(initResponse.agentCapabilities));

  // 5. Create a new session
  log.info('Creating new session...');
  const sessionResponse = await connection.newSession({
    cwd,
    mcpServers: [],
  });
  log.info(`Session created: ${sessionResponse.sessionId}`);

  return {
    connection,
    client,
    agent,
    capabilities: initResponse.agentCapabilities,
    sessionId: sessionResponse.sessionId,
    agentName: initResponse.agentInfo?.name ?? null,
  };
}

/**
 * Send a text prompt to the agent.
 * Returns when the agent finishes processing (PromptResponse received).
 */
export async function sendPrompt(
  connection: acp.ClientSideConnection,
  sessionId: string,
  text: string,
): Promise<{ stopReason: string }> {
  log.info(`Sending prompt to session ${sessionId}`);
  const response = await connection.prompt({
    sessionId,
    prompt: [{ type: 'text', text }],
  });
  return { stopReason: (response as any).stopReason ?? 'end_turn' };
}

/**
 * Cancel the current operation in a session.
 */
export async function cancelPrompt(
  connection: acp.ClientSideConnection,
  sessionId: string,
): Promise<void> {
  log.info(`Cancelling session ${sessionId}`);
  await connection.cancel({ sessionId });
}
