function UkR(T) {
  let R = T instanceof Error ? T.message : String(T),
    a = R.match(/at line (\d+)/),
    e = a ? ` on line ${a[1]}` : "";
  if (R.includes("Nested mappings are not allowed in compact mappings")) return {
    message: `Invalid YAML${e}: value contains unquoted colon`,
    hint: 'Wrap the value in quotes: description: "NOT for: code comments"'
  };
  if (R.includes("Implicit map keys need to be followed by map values")) return {
    message: `Invalid YAML${e}: unexpected line break in value`,
    hint: "Use quotes for multi-line values or use YAML block syntax (| or >)"
  };
  if (R.includes("Map keys must be unique")) return {
    message: `Invalid YAML${e}: duplicate field`,
    hint: "Each field (name, description, etc.) can only appear once in frontmatter"
  };
  if (R.includes('Missing closing "quote') || R.includes("Missing closing 'quote")) return {
    message: `Invalid YAML${e}: unclosed quote`,
    hint: "Make sure all quoted strings have matching opening and closing quotes"
  };
  return {
    message: `Invalid YAML in frontmatter${e}`,
    hint: "Check for proper indentation and quote values containing special characters (: @ # etc.)"
  };
}