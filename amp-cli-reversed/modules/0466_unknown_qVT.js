async function qVT(T, R, a, e) {
  let t = R ?? null;
  if (!t) t = await DVT();
  if (!t) t = await Ob0();
  if (!t) {
    if ((process.argv[1] || "").includes("/nix/store/")) throw Error("Cannot update amp: this installation was not installed via npm/pnpm/yarn/bun and cannot be updated using the update command. Please use your system package manager or installation method to update amp.");
    throw Error("Could not detect which package manager was used to install Amp. Please specify one explicitly or ensure the package manager is available in PATH.");
  }
  if (J.debug("Using package manager for update", {
    packageManager: t,
    targetVersion: T
  }), t === "binary") try {
    await Vb0(T, e);
    return;
  } catch (i) {
    throw Error(`Binary update failed: ${i instanceof Error ? i.message : String(i)}`);
  }
  if (t === "bootstrap") try {
    await hm0(T), await om0(a);
    return;
  } catch (i) {
    throw Error(`Bootstrap update failed: ${i instanceof Error ? i.message : String(i)}`);
  }
  if (t === "brew") return a?.("brew upgrade ampcode/tap/ampcode"), new Promise((i, c) => {
    J.debug("Running update command", {
      packageManager: t,
      command: "brew"
    });
    let s = Ej("brew", ["upgrade", "ampcode/tap/ampcode"], {
        stdio: ["ignore", "pipe", "pipe"],
        shell: oY.platform() === "win32"
      }),
      A = "",
      l = "",
      o = !1;
    s.subscribe({
      next: n => {
        if (n.stdout) l = n.stdout;
        if (n.stderr) A = n.stderr;
        if (n.exited && !o) if (o = !0, n.exitCode === 0) i();else {
          let p = A || l || "No output";
          c(Error(`brew upgrade ampcode/tap/ampcode failed with code ${n.exitCode}:
${p}`));
        }
      },
      error: n => {
        if (!o) o = !0, c(Error(`Failed to spawn brew: ${n.message}`));
      },
      complete: () => {
        if (!o) o = !0, i();
      }
    });
  });
  let [r, h] = db0(t, T);
  return a?.(`${r} ${h.join(" ")}`), new Promise((i, c) => {
    J.debug("Running update command", {
      packageManager: t,
      command: r,
      args: h
    });
    let s = "",
      A = "",
      l = !1;
    Ej(r, h, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: oY.platform() === "win32"
    }).subscribe({
      next: o => {
        if (o.stdout) A = o.stdout;
        if (o.stderr) s = o.stderr;
        if (o.exited && !l) if (l = !0, o.exitCode === 0) i();else {
          let n = s || A || "No output",
            p = `${r} ${h.join(" ")} failed with code ${o.exitCode}:
${n}`;
          if (r === "pnpm" && n.includes("Unable to find the global bin directory")) p += `

Hint: Try running "pnpm setup" to configure pnpm global directory, or use npm instead:
  npm install -g @sourcegraph/amp`;
          c(Error(p));
        }
      },
      error: o => {
        if (!l) l = !0, c(Error(`Failed to spawn ${r}: ${o.message}`));
      },
      complete: () => {
        if (!l) l = !0, i();
      }
    });
  });
}