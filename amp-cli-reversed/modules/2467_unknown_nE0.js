function nE0(T, R, a, e) {
  if (R.length === 0) return null;
  let t = $R.maybeOf(T)?.colors ?? Z0.of(T).colorScheme,
    r = [new xT({
      text: new G("Images: ", new cT({
        color: t.foreground,
        dim: !0
      }))
    })];
  for (let h = 0; h < R.length; h++) {
    let i = h;
    if (r.push(new G0({
      onClick: () => e(i),
      cursor: "pointer",
      child: new xT({
        text: new G(`[image ${h + 1}]`, new cT({
          color: a.color,
          italic: a.italic,
          underline: !0
        }))
      })
    })), h < R.length - 1) r.push(new xT({
      text: new G(" ")
    }));
  }
  return new uR({
    padding: TR.only({}),
    child: new T0({
      mainAxisSize: "min",
      children: r
    })
  });
}