class v6T {
  async download(T, R) {
    if (T.downloadPath) {
      let a = await IdR(T, R);
      if (a instanceof fk) {
        let e = VgR(T.downloadPath);
        YgR.fromWeb(a.responseInternal.body).pipe(e), await QgR(e);
      } else try {
        await XgR(T.downloadPath, a, {
          encoding: "base64"
        });
      } catch (e) {
        throw Error(`Failed to write file to ${T.downloadPath}: ${e}`);
      }
    }
  }
}