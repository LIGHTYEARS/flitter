function gx0(T, R) {
  if (T === "find_thread") {
    let a = typeof R.query === "string" ? R.query.trim() : void 0;
    return {
      kind: "search",
      title: a ? `Searched threads: ${a}` : "Searched threads",
      icon: "search"
    };
  }
  if (T === "read_thread") {
    let a = typeof R.threadID === "string" ? R.threadID.trim() : void 0,
      e = typeof R.goal === "string" ? R.goal.trim() : void 0;
    return {
      kind: "read",
      title: e ? `Read thread: ${e}` : a ? `Read thread ${a}` : "Read thread",
      icon: "threads"
    };
  }
  if (T === "slack_read") {
    let a = typeof R.type === "string" ? R.type : void 0,
      e = typeof R.query === "string" ? R.query.trim() : void 0,
      t = e ? `: ${e}` : "";
    if (a === "users") return {
      kind: "search",
      title: `Slack searched users${t}`,
      icon: "slack"
    };
    if (a === "channels") return {
      kind: "search",
      title: `Slack searched channels${t}`,
      icon: "slack"
    };
    if (a === "messages") return {
      kind: "read",
      title: `Slack read messages${t}`,
      icon: "slack"
    };
    if (a === "thread") return {
      kind: "read",
      title: "Slack read thread",
      icon: "slack"
    };
    return {
      kind: "read",
      title: e ? `Slack read: ${e}` : "Slack read",
      icon: "slack"
    };
  }
  if (T === "docs_list") {
    let a = ai(R);
    return {
      kind: "list",
      title: a ? `Listed docs: ${a}` : "Listed docs",
      icon: "docs"
    };
  }
  if (T === "docs_read") {
    let a = ai(R);
    return {
      kind: "read",
      title: a ? `Read docs: ${a}` : "Read docs",
      icon: "docs"
    };
  }
  if (T === "github_repo_ci_status") {
    let a = ai(R);
    return {
      kind: "read",
      title: a ? `Read CI status: ${a}` : "Read CI status",
      icon: "github"
    };
  }
  if (T === "web_search") {
    let a = ai(R);
    return {
      kind: "search",
      title: a ? `Searched web: ${a}` : "Searched web",
      icon: "web"
    };
  }
  if (T === "read_web_page") {
    let a = ai(R);
    return {
      kind: "read",
      title: a ? `Read web page: ${a}` : "Read web page",
      icon: "web"
    };
  }
  if (T === "search_github" || T === "commit_search" || T === "glob_github") {
    let a = ai(R);
    return {
      kind: "search",
      title: a ? `Searched GitHub: ${a}` : "Searched GitHub",
      icon: "github"
    };
  }
  if (T === "list_directory_github" || T === "list_repositories") {
    let a = ai(R);
    return {
      kind: "list",
      title: a ? `Listed GitHub content: ${a}` : "Listed GitHub content",
      icon: "github"
    };
  }
  if (T === "read_github" || T === "diff") {
    let a = ai(R);
    return {
      kind: "read",
      title: a ? `Read GitHub content: ${a}` : "Read GitHub content",
      icon: "github"
    };
  }
  return;
}