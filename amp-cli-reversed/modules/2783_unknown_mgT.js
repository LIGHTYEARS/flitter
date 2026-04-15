function mgT(T) {
  return new et(new q_({
    initialState: {
      copied: !1
    },
    builder: (R, a, e) => {
      let t = $R.of(R),
        r = new cT({
          color: t.app.command,
          bold: !1
        });
      return new xR({
        children: [new xT({
          text: new G("", void 0, [new G(T, r), new G(" was built for a world where manual context management was necessary. Now models are good enough that you just need to get them the right information.")])
        }), new XT({
          height: 1
        }), new xT({
          text: new G("To prepare for this, we're getting rid of lesser-used manual context management features like this one.")
        }), new XT({
          height: 1
        }), new xT({
          text: new G(`You can downgrade to the last version with this feature by running \`${bgT}\` to see your thread maps one last time.`)
        }), new Fw({
          text: e.copied ? "\u2713 Copied!" : "Copy install command",
          onPressed: async () => {
            await d9.instance.tuiInstance.clipboard.writeText(bgT), a(() => ({
              copied: !0
            }));
          },
          color: e.copied ? t.app.toolSuccess : t.app.command
        }), new XT({
          height: 1
        })]
      });
    }
  }), `${T} has been removed`);
}