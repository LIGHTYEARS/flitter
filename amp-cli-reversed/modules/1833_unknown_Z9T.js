function Z9T(T, R = "default") {
  let a = T.filter(e => e.content);
  if (a.length === 0) return "";
  if (R === "deep") return IkR(a);
  return a.map(e => {
    let t = ZA(e.uri),
      r = a7T(e.uri);
    return `${`Contents of ${t} (${r}):`}

<instructions>
${e.content}
</instructions>`;
  }).join(`

`);
}