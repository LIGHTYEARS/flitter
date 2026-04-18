export type MemoryCommandAction =
  | { action: "list" }
  | { action: "add"; key: string; value: string }
  | { action: "remove"; key: string }
  | { action: "get"; key: string }
  | { action: "error"; message: string };

export function parseMemoryCommand(args: string): MemoryCommandAction {
  const trimmed = args.trim();
  if (trimmed === "" || trimmed === "list") return { action: "list" };

  const parts = trimmed.split(/\s+/);
  const action = parts[0];

  switch (action) {
    case "add": {
      const key = parts[1];
      if (!key) return { action: "error", message: "Usage: /memory add <key> <value>" };
      const value = parts.slice(2).join(" ");
      if (!value) return { action: "error", message: "Usage: /memory add <key> <value>" };
      return { action: "add", key, value };
    }
    case "remove":
    case "rm":
    case "delete": {
      const key = parts[1];
      if (!key) return { action: "error", message: "Usage: /memory remove <key>" };
      return { action: "remove", key };
    }
    case "get":
    case "show": {
      const key = parts[1];
      if (!key) return { action: "error", message: "Usage: /memory get <key>" };
      return { action: "get", key };
    }
    case "list":
    case "ls":
      return { action: "list" };
    default:
      return {
        action: "error",
        message: `Unknown memory action: "${action}". Use add, remove, list, or get.`,
      };
  }
}
