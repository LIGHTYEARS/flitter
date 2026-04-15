function Gx(T) {
  try {
    let R = new URL(T),
      a = R.pathname,
      e = a.match(/^(.*?)\/projects\/([^/]+)\/repos\/([^/]+)/);
    if (e?.[2] && e[3]) {
      let r = e[1] || "";
      return {
        instanceUrl: `${R.origin}${r}`.replace(/\/$/, ""),
        projectKey: e[2],
        repoSlug: e[3]
      };
    }
    let t = a.match(/^(.*?)\/scm\/([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (t?.[2] && t[3]) {
      let r = t[1] || "";
      return {
        instanceUrl: `${R.origin}${r}`.replace(/\/$/, ""),
        projectKey: t[2],
        repoSlug: t[3]
      };
    }
    return null;
  } catch {
    return null;
  }
}