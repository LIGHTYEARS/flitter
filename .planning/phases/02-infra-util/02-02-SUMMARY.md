---
phase: 2
plan: 02
status: complete
---

# URI Parsing and Manipulation -- Summary

## One-Liner
Implemented an RFC 3986 compliant URI class with parse/file/from factory methods, fsPath accessor for OS path conversion, immutable `with()` transform, toString serialization with proper percent-encoding, and joinPath/dirname/basename/extname path utilities.

## What Was Built
- `URI` class with readonly `scheme`, `authority`, `path`, `query`, `fragment` properties
- `URI.parse(value)` -- RFC 3986 regex-based parser extracting all five components
- `URI.file(path)` -- filesystem path to file:// URI factory with Windows backslash normalization and drive letter handling
- `URI.from(components)` -- component-based factory with empty-string defaults
- `fsPath` getter -- converts file:// URIs back to OS paths, handling UNC paths (`//server/share`) and Windows drive letters (`C:\`)
- `with(change)` -- immutable transform returning a new URI with overridden components
- `toString()` -- RFC 3986 serialization with context-aware percent-encoding (path-safe chars like `/`, `:` not encoded; separate encoding for authority, query, fragment)
- `toJSON()` -- returns plain object with all five components
- `URI.joinPath(uri, ...paths)` -- path segment joining with `..`/`.` normalization
- `URI.dirname(uri)` -- parent directory URI
- `URI.basename(uri)` -- last path segment extraction
- `URI.extname(uri)` -- file extension extraction (dotfiles return empty string)
- Internal helpers: `encodePath`, `encodeAuthority`, `encodeQuery`, `encodeFragment`, `normalizePath`
- Barrel export at `packages/util/src/uri/index.ts`

## Key Decisions
- Used RFC 3986 Appendix B regex (`/^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/`) for parsing rather than the URL constructor, enabling support for non-standard schemes and relative paths
- Encoding implemented via `encodeURIComponent` followed by selective un-escaping of safe characters using lookup maps, avoiding over-encoding of path-legal characters
- `fsPath` uses pattern detection (`/^\/[a-zA-Z]:/`) to identify Windows drive letters rather than OS detection, making it portable
- `normalizePath` resolves `.` and `..` segments via a stack-based algorithm
- `extname` treats dotfiles (e.g., `.hidden`) as having no extension (dotIndex <= 0 check)
- No scheme validation regex enforced in constructor -- permissive parsing, consistent with VS Code's URI implementation

## Test Coverage
48 test cases in `packages/util/src/uri/uri.test.ts` covering:
- URI.parse (11 tests): full HTTP URI, authority with userinfo/port, Unix file URI, Windows file URI, custom scheme, relative path, empty string, scheme-only, path-only, IPv6 host, query-only, fragment-only
- URI.file (4 tests): Unix path, Windows backslash path, Windows forward-slash path, path with spaces
- URI.from (3 tests): full components, partial components with defaults, empty components
- fsPath (4 tests): Unix path, Windows path with backslashes, UNC path, non-Windows path
- with (3 tests): change scheme, change path, immutability verification
- toString (4 tests): round-trip parse-toString-parse consistency, query/fragment preservation, file URI serialization, path-only URI without scheme prefix
- joinPath (5 tests): basic join, `..` resolution, `.` resolution, multiple segments, component preservation
- dirname (2 tests): parent directory, no-slash path
- basename (2 tests): filename extraction, single segment
- extname (4 tests): `.txt` extension, no extension, dotfile, multiple dots
- toJSON (1 test): component object output
- Edge cases (4 tests): data URIs, mailto URIs, complex query strings, constructor storage

## Artifacts
- `packages/util/src/uri/uri.ts`
- `packages/util/src/uri/uri.test.ts`
- `packages/util/src/uri/index.ts`
