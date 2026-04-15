function yFR(T, R, a, e) {
  let t = R.length > 0 ? `## Files to Review

${R.join(`
`)}` : `## Files to Review

Review all relevant files in the working directory.`,
    r = a ? `## Diff Description

Use this description to gather the full diff using git or bash commands:

${a}` : "",
    h = T.frontmatter["severity-default"] ?? "medium";
  return `# ${T.name} Check

${T.content}

${t}

${r}

Working directory: ${e ?? "unknown"}

## Your Task

1. Review the git diff to see what changed
2. Search for patterns described above ONLY in the changed lines (+ lines in diff)
3. Report issues ONLY for code that was added or modified in this diff
4. Do NOT report issues for unchanged/pre-existing code

## Output Format

End your response with:

<checkResult>
<checkName>${T.name}</checkName>
<status>completed</status>
<filesAnalyzed>NUMBER</filesAnalyzed>
<linesAnalyzed>NUMBER</linesAnalyzed>
<patternsChecked>
<pattern>Brief description of pattern 1</pattern>
<pattern>Brief description of pattern 2</pattern>
</patternsChecked>
<issues>
<issue severity="${h}" file="path/to/file.ts" line="LINE">
<problem>functionName(): What is wrong (include method/function name if applicable)</problem>
<why>Why this matters</why>
<fix>How to fix it</fix>
</issue>
</issues>
</checkResult>

IMPORTANT: The "file" attribute MUST use the EXACT path from the diff header (e.g., "core/src/tools/file.ts"), not just the filename.

## Severity (default: ${h})
- critical: Security vulnerability, data loss, crash
- high: Bug or performance issue
- medium: Code smell or maintainability
- low: Style suggestion`;
}