async function vp0(T, R, a, e) {
  let t = await atT(T, `/threads/${R}/message`, {
    content: a,
    ...(e ? {
      agentMode: e
    } : {})
  });
  if (!t.ok) throw Error(`Failed to start handoff thread: ${t.status} ${await t.text()}`);
}