async function tW0(T) {
  J.debug("jetbrains-plugin-download", {
    message: "Starting download",
    destinationFile: T
  }), await uH0(kA.dirname(T), {
    recursive: !0
  });
  let R = await z0R(),
    {
      plugin_zip: a,
      plugin_sha: e
    } = R;
  J.debug("jetbrains-plugin-download", {
    message: "Download URLs determined",
    pluginUrl: a,
    checksumUrl: e,
    pluginVersion: R.plugin_version
  }), J.debug("jetbrains-plugin-download", {
    message: "Downloading checksum",
    checksumUrl: e
  });
  let t = (await (await HQ(e)).text()).trim().split(/\s+/)[0];
  J.debug("jetbrains-plugin-download", {
    message: "Checksum downloaded",
    expectedChecksum: t
  }), J.debug("jetbrains-plugin-download", {
    message: "Downloading plugin",
    pluginUrl: a
  });
  let r = await HQ(a);
  if (!r.body) throw Error("Plugin response body is empty");
  let h = `${T}.${process.pid}.${Date.now()}.tmp`;
  try {
    J.debug("jetbrains-plugin-download", {
      message: "Writing plugin to temp file",
      tmpFile: h
    });
    let i = pH0(h),
      c = xH0.fromWeb(r.body);
    await fH0(c, i), J.debug("jetbrains-plugin-download", {
      message: "Plugin downloaded, verifying checksum"
    });
    let s = await hW0(h);
    if (s !== t) throw J.error("jetbrains-plugin-download", {
      message: "Checksum validation failed",
      expectedChecksum: t,
      actualChecksum: s
    }), Error(`JetBrains plugin checksum validation failed: expected ${t}, got ${s}`);
    J.debug("jetbrains-plugin-download", {
      message: "Checksum verified, moving to final location",
      from: h,
      to: T
    }), await rW0(h, T);
  } finally {
    await kH0(h).catch(() => {});
  }
  J.debug("jetbrains-plugin-download", {
    message: "Download completed successfully",
    destinationFile: T
  });
}