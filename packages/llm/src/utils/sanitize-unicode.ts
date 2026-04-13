/**
 * Unicode sanitization
 *
 * Removes unpaired surrogates that can cause issues with
 * JSON serialization and some LLM APIs.
 */

/**
 * Remove unpaired UTF-16 surrogates from a string.
 *
 * Unpaired surrogates (U+D800–U+DFFF without a matching pair) cause
 * JSON.stringify to produce invalid output and some APIs to reject input.
 */
export function sanitizeSurrogates(text: string): string {
  // Match lone high surrogates (not followed by low) and lone low surrogates (not preceded by high)
  // eslint-disable-next-line no-control-regex
  return text.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    "\uFFFD",
  );
}
