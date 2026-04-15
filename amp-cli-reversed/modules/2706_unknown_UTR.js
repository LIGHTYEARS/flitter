class UTR {
  storage;
  fetchFn;
  url;
  pollIntervalDetails = {
    default: 180000,
    min: 60000
  };
  constructor(T, R, a) {
    this.storage = T, this.fetchFn = R, this.url = a;
  }
  stream() {
    return new AR(T => {
      let R,
        a = !0,
        e = async () => {
          if (!a) return;
          try {
            let t = await this.loadState(),
              r = Date.now();
            if (t && r < t.nextFetchAt) {
              let _ = t.nextFetchAt - r;
              R = setTimeout(e, _);
              return;
            }
            let h = await this.fetchFn(this.url);
            if (!h.ok) throw Error(`Failed to fetch feed: ${h.status} ${h.statusText}`);
            let i = await h.text(),
              c = await tN0(i),
              s = c.feed || c,
              A = this.mapFeedItemsToEntries(s.items || []),
              l = h.headers.get("Cache-Control")?.match(/max-age=(\d+)/),
              o = l?.[1] ? parseInt(l[1], 10) : 180,
              n = Date.now() + Math.max(o * 1000, this.pollIntervalDetails.min),
              p = this.findNewEntries(t?.entries || [], A);
            if (await this.saveState({
              entries: A,
              lastFetchedAt: Date.now(),
              nextFetchAt: n
            }), p.length > 0) T.next(p);
            R = setTimeout(e, Math.max(n - Date.now(), 0));
          } catch (t) {
            T.error(t), R = setTimeout(e, this.pollIntervalDetails.default);
          }
        };
      return e(), () => {
        a = !1, clearTimeout(R);
      };
    });
  }
  async loadState() {
    let T = await this.storage.get("entries"),
      R = await this.storage.get("lastFetchedAt"),
      a = await this.storage.get("nextFetchAt");
    if (T && R !== void 0 && a !== void 0) return {
      entries: T,
      lastFetchedAt: R,
      nextFetchAt: a
    };
    return;
  }
  async saveState(T) {
    await this.storage.set("entries", T.entries), await this.storage.set("lastFetchedAt", T.lastFetchedAt), await this.storage.set("nextFetchAt", T.nextFetchAt);
  }
  mapFeedItemsToEntries(T) {
    return T.map(R => ({
      title: R.title || "Untitled",
      link: R.link || "",
      description: R.description || "",
      pubDate: new Date(R.pubDate || R.date || Date.now())
    }));
  }
  findNewEntries(T, R) {
    let a = new Set(T.map(e => e.link));
    return R.filter(e => !a.has(e.link));
  }
}