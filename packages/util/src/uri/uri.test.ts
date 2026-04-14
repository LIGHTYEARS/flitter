import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { URI } from "./uri.ts";

// ---------------------------------------------------------------------------
// 1. URI.parse — standard URIs
// ---------------------------------------------------------------------------
describe("URI.parse", () => {
  it("parses a full HTTP URI with query and fragment", () => {
    const uri = URI.parse("http://example.com/path?query=1#frag");
    assert.equal(uri.scheme, "http");
    assert.equal(uri.authority, "example.com");
    assert.equal(uri.path, "/path");
    assert.equal(uri.query, "query=1");
    assert.equal(uri.fragment, "frag");
  });

  it("parses authority with userinfo and port", () => {
    const uri = URI.parse("https://user:pass@host:8080/path");
    assert.equal(uri.scheme, "https");
    assert.equal(uri.authority, "user:pass@host:8080");
    assert.equal(uri.path, "/path");
    assert.equal(uri.query, "");
    assert.equal(uri.fragment, "");
  });

  it("parses a Unix file URI", () => {
    const uri = URI.parse("file:///home/user/file.txt");
    assert.equal(uri.scheme, "file");
    assert.equal(uri.authority, "");
    assert.equal(uri.path, "/home/user/file.txt");
  });

  it("parses a Windows file URI", () => {
    const uri = URI.parse("file:///C:/Users/file.txt");
    assert.equal(uri.scheme, "file");
    assert.equal(uri.authority, "");
    assert.equal(uri.path, "/C:/Users/file.txt");
  });

  it("parses a custom scheme", () => {
    const uri = URI.parse("custom-scheme://host/path");
    assert.equal(uri.scheme, "custom-scheme");
    assert.equal(uri.authority, "host");
    assert.equal(uri.path, "/path");
  });

  it("parses a relative path", () => {
    const uri = URI.parse("relative/path");
    assert.equal(uri.scheme, "");
    assert.equal(uri.authority, "");
    assert.equal(uri.path, "relative/path");
  });

  it("parses an empty string", () => {
    const uri = URI.parse("");
    assert.equal(uri.scheme, "");
    assert.equal(uri.authority, "");
    assert.equal(uri.path, "");
    assert.equal(uri.query, "");
    assert.equal(uri.fragment, "");
  });

  it("parses a scheme-only URI", () => {
    const uri = URI.parse("http:");
    assert.equal(uri.scheme, "http");
    assert.equal(uri.authority, "");
    assert.equal(uri.path, "");
  });

  it("parses a path-only URI", () => {
    const uri = URI.parse("/just/a/path");
    assert.equal(uri.scheme, "");
    assert.equal(uri.path, "/just/a/path");
  });

  it("parses a URI with IPv6 host", () => {
    const uri = URI.parse("http://[::1]:8080/path");
    assert.equal(uri.scheme, "http");
    assert.equal(uri.authority, "[::1]:8080");
    assert.equal(uri.path, "/path");
  });

  it("parses a URI with only query", () => {
    const uri = URI.parse("?key=value");
    assert.equal(uri.scheme, "");
    assert.equal(uri.path, "");
    assert.equal(uri.query, "key=value");
  });

  it("parses a URI with only fragment", () => {
    const uri = URI.parse("#section");
    assert.equal(uri.scheme, "");
    assert.equal(uri.path, "");
    assert.equal(uri.fragment, "section");
  });
});

// ---------------------------------------------------------------------------
// 2. URI.file — path to URI
// ---------------------------------------------------------------------------
describe("URI.file", () => {
  it("creates a file URI from a Unix path", () => {
    const uri = URI.file("/home/user/file.txt");
    assert.equal(uri.scheme, "file");
    assert.equal(uri.authority, "");
    assert.equal(uri.path, "/home/user/file.txt");
  });

  it("creates a file URI from a Windows path", () => {
    const uri = URI.file("C:\\Users\\file.txt");
    assert.equal(uri.scheme, "file");
    assert.equal(uri.authority, "");
    assert.equal(uri.path, "/C:/Users/file.txt");
  });

  it("creates a file URI from a Windows path with forward slashes", () => {
    const uri = URI.file("C:/Users/file.txt");
    assert.equal(uri.scheme, "file");
    assert.equal(uri.path, "/C:/Users/file.txt");
  });

  it("handles a path with spaces", () => {
    const uri = URI.file("/home/user/my folder/file.txt");
    assert.equal(uri.scheme, "file");
    assert.equal(uri.path, "/home/user/my folder/file.txt");
  });
});

// ---------------------------------------------------------------------------
// 3. URI.from — components
// ---------------------------------------------------------------------------
describe("URI.from", () => {
  it("creates a URI from full components", () => {
    const uri = URI.from({
      scheme: "https",
      authority: "example.com",
      path: "/path",
      query: "q=1",
      fragment: "top",
    });
    assert.equal(uri.scheme, "https");
    assert.equal(uri.authority, "example.com");
    assert.equal(uri.path, "/path");
    assert.equal(uri.query, "q=1");
    assert.equal(uri.fragment, "top");
  });

  it("defaults missing components to empty string", () => {
    const uri = URI.from({ scheme: "http" });
    assert.equal(uri.scheme, "http");
    assert.equal(uri.authority, "");
    assert.equal(uri.path, "");
    assert.equal(uri.query, "");
    assert.equal(uri.fragment, "");
  });

  it("creates a URI from empty components", () => {
    const uri = URI.from({});
    assert.equal(uri.scheme, "");
    assert.equal(uri.authority, "");
    assert.equal(uri.path, "");
  });
});

// ---------------------------------------------------------------------------
// 4. fsPath
// ---------------------------------------------------------------------------
describe("fsPath", () => {
  it("returns Unix path from a file URI", () => {
    const uri = URI.parse("file:///home/user/file.txt");
    assert.equal(uri.fsPath, "/home/user/file.txt");
  });

  it("returns Windows path with backslashes from a file URI", () => {
    const uri = URI.parse("file:///C:/Users/file.txt");
    assert.equal(uri.fsPath, "C:\\Users\\file.txt");
  });

  it("returns UNC path when authority is present", () => {
    const uri = URI.parse("file://server/share/path");
    assert.equal(uri.fsPath, "//server/share/path");
  });

  it("returns path as-is for non-Windows, non-UNC URIs", () => {
    const uri = URI.parse("file:///usr/local/bin");
    assert.equal(uri.fsPath, "/usr/local/bin");
  });
});

// ---------------------------------------------------------------------------
// 5. with — immutable transform
// ---------------------------------------------------------------------------
describe("with", () => {
  it("changes scheme while keeping other components", () => {
    const original = URI.parse("http://example.com/path?q=1#frag");
    const changed = original.with({ scheme: "https" });
    assert.equal(changed.scheme, "https");
    assert.equal(changed.authority, "example.com");
    assert.equal(changed.path, "/path");
    assert.equal(changed.query, "q=1");
    assert.equal(changed.fragment, "frag");
  });

  it("changes path while keeping other components", () => {
    const original = URI.parse("http://example.com/old?q=1");
    const changed = original.with({ path: "/new" });
    assert.equal(changed.scheme, "http");
    assert.equal(changed.authority, "example.com");
    assert.equal(changed.path, "/new");
    assert.equal(changed.query, "q=1");
  });

  it("does not modify the original URI", () => {
    const original = URI.parse("http://example.com/path");
    original.with({ path: "/changed" });
    assert.equal(original.path, "/path");
  });
});

// ---------------------------------------------------------------------------
// 6. toString — serialization
// ---------------------------------------------------------------------------
describe("toString", () => {
  it("round-trips: parse -> toString -> parse produces same components", () => {
    const input = "http://example.com/path?query=1#frag";
    const uri = URI.parse(input);
    const reparsed = URI.parse(uri.toString());
    assert.equal(reparsed.scheme, uri.scheme);
    assert.equal(reparsed.authority, uri.authority);
    assert.equal(reparsed.path, uri.path);
    assert.equal(reparsed.query, uri.query);
    assert.equal(reparsed.fragment, uri.fragment);
  });

  it("preserves query and fragment", () => {
    const uri = URI.from({
      scheme: "https",
      authority: "host",
      path: "/p",
      query: "a=b",
      fragment: "sec",
    });
    const str = uri.toString();
    assert.ok(str.includes("?"));
    assert.ok(str.includes("#"));
    const reparsed = URI.parse(str);
    assert.equal(reparsed.query, "a=b");
    assert.equal(reparsed.fragment, "sec");
  });

  it("serializes a file URI", () => {
    const uri = URI.file("/home/user/file.txt");
    const str = uri.toString();
    assert.ok(str.startsWith("file://"));
    assert.ok(str.includes("/home/user/file.txt"));
  });

  it("serializes a path-only URI without scheme prefix", () => {
    const uri = URI.from({ path: "relative/path" });
    assert.equal(uri.toString(), "relative/path");
  });
});

// ---------------------------------------------------------------------------
// 7. joinPath
// ---------------------------------------------------------------------------
describe("joinPath", () => {
  it("joins a basic path segment", () => {
    const uri = URI.parse("http://host/a");
    const joined = URI.joinPath(uri, "b/c");
    assert.equal(joined.path, "/a/b/c");
  });

  it("resolves .. segments", () => {
    const uri = URI.parse("http://host/a/b");
    const joined = URI.joinPath(uri, "../c");
    assert.equal(joined.path, "/a/c");
  });

  it("resolves . segments", () => {
    const uri = URI.parse("http://host/a");
    const joined = URI.joinPath(uri, "./b");
    assert.equal(joined.path, "/a/b");
  });

  it("joins multiple path segments", () => {
    const uri = URI.parse("http://host/a");
    const joined = URI.joinPath(uri, "b", "c", "d");
    assert.equal(joined.path, "/a/b/c/d");
  });

  it("preserves other URI components", () => {
    const uri = URI.parse("http://host/a?q=1#f");
    const joined = URI.joinPath(uri, "b");
    assert.equal(joined.scheme, "http");
    assert.equal(joined.authority, "host");
    assert.equal(joined.query, "q=1");
    assert.equal(joined.fragment, "f");
  });
});

// ---------------------------------------------------------------------------
// 8. dirname
// ---------------------------------------------------------------------------
describe("dirname", () => {
  it("returns parent directory path", () => {
    const uri = URI.parse("file:///a/b/c.txt");
    const dir = URI.dirname(uri);
    assert.equal(dir.path, "/a/b");
    assert.equal(dir.scheme, "file");
  });

  it("returns empty for a path without slashes", () => {
    const uri = URI.from({ path: "file.txt" });
    const dir = URI.dirname(uri);
    assert.equal(dir.path, "");
  });
});

// ---------------------------------------------------------------------------
// 9. basename
// ---------------------------------------------------------------------------
describe("basename", () => {
  it("returns the filename", () => {
    const uri = URI.parse("file:///a/b/c.txt");
    assert.equal(URI.basename(uri), "c.txt");
  });

  it("returns the only segment if no slash", () => {
    const uri = URI.from({ path: "file.txt" });
    assert.equal(URI.basename(uri), "file.txt");
  });
});

// ---------------------------------------------------------------------------
// 10. extname
// ---------------------------------------------------------------------------
describe("extname", () => {
  it("returns the extension including dot", () => {
    const uri = URI.parse("file:///a/b/c.txt");
    assert.equal(URI.extname(uri), ".txt");
  });

  it("returns empty string for no extension", () => {
    const uri = URI.parse("file:///a/b/Makefile");
    assert.equal(URI.extname(uri), "");
  });

  it("returns empty string for dotfiles", () => {
    const uri = URI.parse("file:///a/b/.hidden");
    assert.equal(URI.extname(uri), "");
  });

  it("returns the last extension for multiple dots", () => {
    const uri = URI.parse("file:///a/b/archive.tar.gz");
    assert.equal(URI.extname(uri), ".gz");
  });
});

// ---------------------------------------------------------------------------
// 11. toJSON
// ---------------------------------------------------------------------------
describe("toJSON", () => {
  it("returns an object with all components", () => {
    const uri = URI.parse("https://host/path?q=1#f");
    const json = uri.toJSON();
    assert.deepEqual(json, {
      scheme: "https",
      authority: "host",
      path: "/path",
      query: "q=1",
      fragment: "f",
    });
  });
});

// ---------------------------------------------------------------------------
// 12. Edge cases
// ---------------------------------------------------------------------------
describe("Edge cases", () => {
  it("handles data URIs", () => {
    const uri = URI.parse("data:text/plain;base64,SGVsbG8=");
    assert.equal(uri.scheme, "data");
    assert.equal(uri.path, "text/plain;base64,SGVsbG8=");
  });

  it("handles mailto URIs", () => {
    const uri = URI.parse("mailto:user@example.com");
    assert.equal(uri.scheme, "mailto");
    assert.equal(uri.path, "user@example.com");
  });

  it("parses complex query strings", () => {
    const uri = URI.parse("http://host/path?a=1&b=2&c=hello%20world");
    assert.equal(uri.query, "a=1&b=2&c=hello%20world");
  });

  it("constructor stores all components", () => {
    const uri = new URI("s", "a", "/p", "q", "f");
    assert.equal(uri.scheme, "s");
    assert.equal(uri.authority, "a");
    assert.equal(uri.path, "/p");
    assert.equal(uri.query, "q");
    assert.equal(uri.fragment, "f");
  });
});
