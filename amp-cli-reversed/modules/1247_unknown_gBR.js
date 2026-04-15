function kBR(T) {
  return `${T.description}
\`\`\`json
${JSON.stringify(T.args)}
\`\`\``;
}
function wh(T) {
  return `# Examples

` + T.map(kBR).join(`

`);
}
async function gBR(T, R, a) {
  try {
    let e;
    try {
      e = mi(T);
    } catch (r) {
      return {
        error: `Save path must be absolute: ${r instanceof Error ? r.message : String(r)}`
      };
    }
    let t = d0(e);
    try {
      if ((await R.stat(e, {
        signal: a
      })).isDirectory) return {
        error: `Save path is a directory: ${t}`
      };
      return {
        error: `Save path already exists: ${t}`
      };
    } catch (r) {
      if (!Er(r)) return {
        error: `Failed to check save path: ${r instanceof Error ? r.message : String(r)}`
      };
    }
    try {
      if (!(await R.stat(MR.dirname(e), {
        signal: a
      })).isDirectory) return {
        error: `Save path parent is not a directory: ${t}`
      };
    } catch (r) {
      if (!Er(r)) return {
        error: `Failed to check save path parent: ${r instanceof Error ? r.message : String(r)}`
      };
    }
    return {
      uri: e,
      uriString: t
    };
  } catch (e) {
    return {
      error: `Failed to parse savePath: ${e instanceof Error ? e.message : String(e)}`
    };
  }
}