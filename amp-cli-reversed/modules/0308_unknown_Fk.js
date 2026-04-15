class Fk {
  id;
  kind;
  path;
  uri;
  charBag;
  metadata;
  isIgnored;
  isExternal;
  isPrivate;
  isAlwaysIncluded;
  constructor(T) {
    this.id = T.id, this.kind = T.kind, this.path = T.path, this.uri = T.uri, this.metadata = T.metadata, this.isIgnored = T.isIgnored ?? !1, this.isExternal = T.isExternal ?? !1, this.isPrivate = T.isPrivate ?? !1, this.isAlwaysIncluded = T.isAlwaysIncluded ?? !1, this.charBag = oh.fromPath(this.path);
  }
  withUpdates(T) {
    return new Fk({
      id: this.id,
      kind: T.kind ?? this.kind,
      path: this.path,
      uri: this.uri,
      metadata: T.metadata ?? this.metadata,
      isIgnored: T.isIgnored ?? this.isIgnored,
      isExternal: T.isExternal ?? this.isExternal,
      isPrivate: T.isPrivate ?? this.isPrivate,
      isAlwaysIncluded: T.isAlwaysIncluded ?? this.isAlwaysIncluded
    });
  }
  isFile() {
    return this.kind === "file";
  }
  isDirectory() {
    return this.kind === "directory" || this.kind === "unloaded-directory" || this.kind === "pending-directory";
  }
  isLoadedDirectory() {
    return this.kind === "directory";
  }
  getFilename() {
    return this.path.split(/[/\\]/).pop() || this.path;
  }
  getExtension() {
    let T = this.getFilename(),
      R = T.lastIndexOf(".");
    return R > 0 ? T.slice(R + 1) : "";
  }
  getDirectory() {
    let T = this.path.split(/[/\\]/);
    return T.length > 1 ? T.slice(0, -1).join("/") : "";
  }
  shouldIncludeInResults() {
    if (this.isAlwaysIncluded) return !0;
    if (this.isIgnored || this.isPrivate) return !1;
    return !0;
  }
  shouldIncludeInMentions() {
    if (this.isAlwaysIncluded) return !0;
    if (this.isIgnored || this.isPrivate) return !1;
    if (this.isFile()) return !0;
    return this.isLoadedDirectory();
  }
  getImportanceBoost() {
    return this.isAlwaysIncluded ? 0.1 : 0;
  }
  toJSON() {
    return {
      id: this.id,
      kind: this.kind,
      path: this.path,
      uri: this.uri.toString(),
      metadata: this.metadata,
      isIgnored: this.isIgnored,
      isExternal: this.isExternal,
      isPrivate: this.isPrivate,
      isAlwaysIncluded: this.isAlwaysIncluded,
      charBag: this.charBag.toJSON()
    };
  }
  static fromJSON(T, R) {
    return new Fk({
      id: T.id,
      kind: T.kind,
      path: T.path,
      uri: R(T.uri),
      metadata: T.metadata,
      isIgnored: T.isIgnored,
      isExternal: T.isExternal,
      isPrivate: T.isPrivate,
      isAlwaysIncluded: T.isAlwaysIncluded
    });
  }
  equals(T) {
    return this.id === T.id && this.kind === T.kind && this.path === T.path && this.metadata.mtime === T.metadata.mtime && this.metadata.size === T.metadata.size;
  }
  hashCode() {
    return `${this.path}:${this.metadata.mtime}:${this.metadata.size}`;
  }
  toString() {
    return `Entry{${this.kind}:${this.path}}`;
  }
}