function uW0(T, R, a, e, t) {
  if (yW0(R)) return new uR({
    padding: TR.only({
      left: 2
    }),
    child: new xT({
      text: new G(R.error.message, new cT({
        color: a.app.toolError
      })),
      selectable: !0
    })
  });
  if (!T) return new uR({
    padding: TR.only({
      left: 2
    }),
    child: new xT({
      text: new G(t ? "Applying patch..." : "No patch output", new cT({
        color: a.colors.mutedForeground
      }))
    })
  });
  let r = T.files.map(h => {
    let i = ki(h.path, e),
      c = new xT({
        text: new G("", void 0, [new G(`+${h.additions}`, new cT({
          color: a.app.diffAdded
        })), new G(` -${h.deletions}`, new cT({
          color: a.app.diffRemoved
        }))])
      }),
      s = [new uR({
        padding: TR.only({
          left: 2
        }),
        child: new T0({
          children: [new H3({
            uri: h.uri,
            text: i,
            style: new cT({
              color: a.app.fileReference,
              dim: !0,
              underline: !0
            })
          }), new XT({
            width: 1
          }), c]
        })
      })];
    if (h.diff) s.push(new fp({
      diff: h.diff,
      filePath: h.path
    }));
    return new xR({
      crossAxisAlignment: "start",
      children: s
    });
  });
  return new xR({
    crossAxisAlignment: "start",
    children: r
  });
}