/**
 * processAssistantMessage — post-process an assistant message's content blocks.
 *
 * Trims whitespace from text and thinking blocks, filters out empty ones.
 *
 * 逆向: amp-cli-reversed/modules/1087_ProcessAssistantMessage_IbT.js
 *   ```
 *   function IbT(T, R) {
 *     let a = Ur(R), e = T.content.length,
 *       t = { ...T, content: T.content.map(h => {
 *         if (h.type === "thinking") return { ...h, thinking: h.thinking.trim() };
 *         if (h.type === "text") return { ...h, text: h.text.trim() };
 *         return h;
 *       }).filter(h => {
 *         if (h.type === "thinking") return h.thinking !== "";
 *         if (h.type === "text") return h.text !== "";
 *         return !0;
 *       }) },
 *       r = t.content.length;
 *     if (e !== r) a.debug("postProcessAssistantMessage filtered empty blocks", { ... });
 *     return t;
 *   }
 *   ```
 */

import type { AssistantContentBlock } from "@flitter/schemas";

/**
 * Trim whitespace from text and thinking blocks, then filter out empty ones.
 *
 * 逆向: IbT (modules/1087_ProcessAssistantMessage_IbT.js)
 */
export function processAssistantMessage(content: AssistantContentBlock[]): AssistantContentBlock[] {
  return content
    .map((block) => {
      const b = block as Record<string, unknown>;
      // 逆向: IbT — trim thinking blocks
      if (b.type === "thinking" && typeof b.thinking === "string") {
        return { ...b, thinking: b.thinking.trim() } as AssistantContentBlock;
      }
      // 逆向: IbT — trim text blocks
      if (b.type === "text" && typeof b.text === "string") {
        return { ...b, text: b.text.trim() } as AssistantContentBlock;
      }
      return block;
    })
    .filter((block) => {
      const b = block as Record<string, unknown>;
      // 逆向: IbT — filter empty thinking blocks
      if (b.type === "thinking" && (b.thinking as string) === "") return false;
      // 逆向: IbT — filter empty text blocks
      if (b.type === "text" && (b.text as string) === "") return false;
      return true;
    });
}
