function zzR() {
  if (Av("/bin/bash")) return "/bin/bash";
  if (Av("/usr/bin/bash")) return "/usr/bin/bash";
  if (Av("/bin/sh")) return "/bin/sh";
  return fzT() ?? process.env.SHELL ?? "/bin/sh";
}