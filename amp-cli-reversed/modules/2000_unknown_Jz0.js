function Jz0(T, R, a) {
  if (T.remote && !R) throw new GR("The -r/--remote flag requires --execute mode", 1, 'Use: amp --remote --execute "your message"');
  if (T.streamJson && !R) throw new GR("The --stream-json flag requires --execute mode", 1, 'Use: amp --execute "your message" --stream-json');
  if (T.streamJsonInput && !R) throw new GR("The --stream-json-input flag requires --execute mode", 1, "Use: amp --execute --stream-json --stream-json-input");
  if (T.streamJsonInput && !T.streamJson) throw new GR("The --stream-json-input flag requires --stream-json", 1, "Use: amp --execute --stream-json --stream-json-input");
  if (T.stats && !R) throw new GR("The --stats flag requires --execute mode", 1, 'Use: amp --execute "your message" --stats');
  if (T.archive && !R) throw new GR("The --archive flag requires --execute mode", 1, 'Use: amp --execute "your message" --archive');
  if (T.streamJsonInput && typeof T.execute === "string" && T.execute.trim() !== "") throw new GR("Do not provide a message argument when using --stream-json-input", 1, `Supply messages via stdin JSONL instead: echo '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"your message"},{"type":"image","source":{"type":"base64","media_type":"image/png","data":"..."}}]}}' | amp --execute --stream-json --stream-json-input`);
  if (R && a === "" && !T.streamJsonInput && !T.headless) throw new GR("User message must be provided through stdin or as argument when using execute mode", 1, `Either pass a message as an argument: amp --execute "your message"
Or pipe via stdin: echo "your message" | amp --execute`);
}