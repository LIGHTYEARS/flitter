async function voT(T, R, a) {
  try {
    return await T.readFile(R, a);
  } catch (e) {
    if (e instanceof ur) return null;
    throw e;
  }
}
async function Aq(T, R, a) {
  try {
    return await T.access(R, a), !0;
  } catch (e) {
    if (Er(e)) return !1;
    throw e;
  }
}
function DLT(T) {
  let R = MR.extname(T).toLowerCase(),
    a = BLT[R];
  if (a && fN(a)) return {
    mimeType: a
  };
  return null;
}
async function wLT(T, R, a) {
  let e = DLT(R);
  if (e) {
    let t = await T.stat(R, {
      signal: a
    });
    return {
      ...e,
      size: t.size
    };
  }
  return null;
}
async function PmR(T, R, a) {
  let e = DLT(R);
  if (!e) return {
    success: !1,
    error: `Unsupported image file extension: ${MR.extname(R).toLowerCase()}. Supported extensions: .png, .jpg, .jpeg, .gif, .webp`
  };
  try {
    let t = await T.readBinaryFile(R, {
        signal: a
      }),
      r = t instanceof Buffer ? t : Buffer.from(t),
      h = XA({
        source: {
          type: "file",
          path: R.fsPath,
          data: r
        }
      });
    if (h) return {
      success: !1,
      error: h
    };
    return {
      success: !0,
      image: {
        mimeType: e.mimeType,
        data: r.toString("base64")
      }
    };
  } catch (t) {
    if (Er(t)) return {
      success: !1,
      error: `Image file not found: ${R.fsPath}`
    };
    return {
      success: !1,
      error: `Failed to read image file: ${R.fsPath} - ${t instanceof Error ? t.message : String(t)}`
    };
  }
}