function xmR({
  readFileFn: T,
  readBinaryFileFn: R,
  maxFileSizeBytes: a,
  maxLines: e = tG,
  maxLineBytes: t = WLT
}) {
  return async ({
    args: r
  }, {
    thread: h,
    filesystem: i
  }, c) => {
    if (I9T(r.path)) return {
      status: "error",
      error: {
        errorCode: "reading-secret-file",
        message: "Refusing to read env file because it likely contains secrets."
      }
    };
    let s = mi(r.path);
    try {
      if ((await i.stat(s, {
        signal: c
      })).isDirectory) {
        let o = await i.readdir(s, {
            signal: c
          }),
          n = o.length > pq,
          p = o.slice(0, pq).map(m => ({
            name: MR.basename(m.uri),
            isDirectory: m.isDirectory
          })).sort((m, b) => {
            if (m.isDirectory !== b.isDirectory) return m.isDirectory ? -1 : 1;
            return m.name.localeCompare(b.name);
          }).map(m => m.name + (m.isDirectory ? "/" : "")),
          _ = NLT(p, r.read_range, e);
        if (n) {
          let m = o.length - pq;
          _ += `

[... directory listing truncated, ${m} more ${o9(m, "entry", "entries")} not shown ...]`;
        }
        return {
          status: "done",
          progress: {},
          result: {
            absolutePath: s.fsPath,
            content: _,
            isDirectory: !0,
            directoryEntries: p
          },
          trackFiles: [d0(s)]
        };
      }
      let A = await wLT(i, s, c);
      if (A) {
        let o = await R(s, c),
          n = kLT(o) ? o.toString("base64") : btoa(String.fromCharCode(...o)),
          p = n.length;
        if (p > zD) {
          let _ = (p / 1048576).toFixed(1),
            m = (zD / 1048576).toFixed(1);
          return {
            status: "error",
            error: {
              message: `Error: Image file (${_} MB) exceeds maximum allowed size (${m} MB).`,
              absolutePath: s.fsPath
            }
          };
        }
        return {
          status: "done",
          progress: {},
          result: {
            absolutePath: s.fsPath,
            content: n,
            isImage: !0,
            imageInfo: {
              mimeType: A.mimeType,
              size: A.size
            }
          },
          trackFiles: [d0(s)]
        };
      }
      if (!(await i.isExclusiveWriterFor(s))) TG(s, h.id, Date.now());
      let l;
      if (r.read_range && s.scheme === "file") l = (await ImR(s, r.read_range, c, t)).join(`
`);else if (r.read_range) {
        let o = (await T(s, c)).split(`
`);
        l = fmR(o, r, e, t);
      } else {
        let o = await new y9T(i).readFile(s, {
          maxBytes: a,
          signal: c,
          textProcessing: {
            addLineNumbers: !0,
            maxLines: e,
            maxLineBytes: t,
            truncationStrategy: "ellipsis"
          }
        });
        if (o.error) return {
          status: "error",
          error: {
            message: o.error.message,
            absolutePath: s.fsPath
          }
        };
        if (o.binary) return {
          status: "error",
          error: {
            message: `File appears to be binary and cannot be read as text (${(o.fileSize / 1024).toFixed(1)} KB). Binary files like executables, archives, or compiled assets are not supported by the ${y8} tool.`,
            absolutePath: s.fsPath
          }
        };
        if (o.content === void 0) {
          let n = Math.round(o.fileSize / 1024),
            p = Math.round(a / 1024);
          return {
            status: "error",
            error: {
              message: `Error: File content (${n} KB) exceeds maximum allowed size (${p} KB). Use read_range parameters to read specific line ranges in the file, or use the ${ht} tool to search for specific content.`,
              absolutePath: s.fsPath
            }
          };
        }
        l = o.content;
      }
      return {
        status: "done",
        progress: {},
        result: {
          absolutePath: s.fsPath,
          content: l
        },
        trackFiles: [d0(s)]
      };
    } catch (A) {
      return {
        status: "error",
        error: {
          message: A instanceof Error ? A.message : String(A),
          absolutePath: s.fsPath
        }
      };
    }
  };
}