/**
 * URI class — RFC 3986 standard URI parsing and manipulation
 *
 * Provides parse, file, from factory methods, fsPath accessor,
 * joinPath/dirname/basename/extname path utilities
 *
 * @example
 * ```ts
 * import { URI } from '@flitter/util';
 * const uri = URI.parse('https://example.com/path?q=1#frag');
 * const fileUri = URI.file('/home/user/file.txt');
 * console.log(fileUri.fsPath); // /home/user/file.txt
 * ```
 */

// RFC 3986 Appendix B regex
const URI_REGEX = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;

// Characters that should NOT be percent-encoded in path segments (beyond unreserved)
const PATH_SAFE = /%(2F|3A|40|21|24|26|27|28|29|2A|2B|2C|3B|3D|2D)/gi;
const PATH_SAFE_MAP: Record<string, string> = {
  "%2F": "/",
  "%2f": "/",
  "%3A": ":",
  "%3a": ":",
  "%40": "@",
  "%21": "!",
  "%24": "$",
  "%26": "&",
  "%27": "'",
  "%28": "(",
  "%29": ")",
  "%2A": "*",
  "%2a": "*",
  "%2B": "+",
  "%2b": "+",
  "%2C": ",",
  "%2c": ",",
  "%3B": ";",
  "%3b": ";",
  "%3D": "=",
  "%3d": "=",
  "%2D": "-",
  "%2d": "-",
};

function encodePath(path: string): string {
  return encodeURIComponent(path).replace(
    PATH_SAFE,
    (match) => PATH_SAFE_MAP[match] ?? match,
  );
}

// Characters allowed unencoded in query: pchar / "/" / "?" (RFC 3986 3.4)
// We selectively unescape =, &, :, @, /, ?, +, ,, ;, !, $, ', (, ), *
const QUERY_SAFE = /%(3D|26|3A|40|2F|3F|2B|2C|3B|21|24|27|28|29|2A)/gi;
const QUERY_SAFE_MAP: Record<string, string> = {
  "%3D": "=", "%3d": "=",
  "%26": "&",
  "%3A": ":", "%3a": ":",
  "%40": "@",
  "%2F": "/", "%2f": "/",
  "%3F": "?", "%3f": "?",
  "%2B": "+", "%2b": "+",
  "%2C": ",", "%2c": ",",
  "%3B": ";", "%3b": ";",
  "%21": "!",
  "%24": "$",
  "%27": "'",
  "%28": "(", "%29": ")",
  "%2A": "*", "%2a": "*",
};

// Characters allowed unencoded in fragment: pchar / "/" / "?" (RFC 3986 3.5)
const FRAGMENT_SAFE = QUERY_SAFE;
const FRAGMENT_SAFE_MAP = QUERY_SAFE_MAP;

// Characters allowed unencoded in authority: userinfo@host:port
const AUTHORITY_SAFE = /%(3A|40|2D|2E|5F|7E|21|24|26|27|28|29|2A|2B|2C|3B|3D|5B|5D)/gi;
const AUTHORITY_SAFE_MAP: Record<string, string> = {
  "%3A": ":", "%3a": ":",
  "%40": "@",
  "%2D": "-", "%2d": "-",
  "%2E": ".", "%2e": ".",
  "%5F": "_", "%5f": "_",
  "%7E": "~", "%7e": "~",
  "%21": "!",
  "%24": "$",
  "%26": "&",
  "%27": "'",
  "%28": "(", "%29": ")",
  "%2A": "*", "%2a": "*",
  "%2B": "+", "%2b": "+",
  "%2C": ",", "%2c": ",",
  "%3B": ";", "%3b": ";",
  "%3D": "=", "%3d": "=",
  "%5B": "[", "%5b": "[",
  "%5D": "]", "%5d": "]",
};

function encodeAuthority(value: string): string {
  return encodeURIComponent(value).replace(
    AUTHORITY_SAFE,
    (match) => AUTHORITY_SAFE_MAP[match] ?? match,
  );
}

function encodeQuery(value: string): string {
  return encodeURIComponent(value).replace(
    QUERY_SAFE,
    (match) => QUERY_SAFE_MAP[match] ?? match,
  );
}

function encodeFragment(value: string): string {
  return encodeURIComponent(value).replace(
    FRAGMENT_SAFE,
    (match) => FRAGMENT_SAFE_MAP[match] ?? match,
  );
}

/**
 * Normalize a path by resolving `.` and `..` segments.
 */
function normalizePath(path: string): string {
  const isAbsolute = path.startsWith("/");
  const segments = path.split("/");
  const result: string[] = [];

  for (const seg of segments) {
    if (seg === "." || seg === "") {
      // skip empty segments (except we need to preserve leading slash)
      continue;
    } else if (seg === "..") {
      // Pop the last segment if possible
      if (result.length > 0 && result[result.length - 1] !== "..") {
        result.pop();
      }
    } else {
      result.push(seg);
    }
  }

  let normalized = result.join("/");
  if (isAbsolute) {
    normalized = "/" + normalized;
  }

  return normalized;
}

export class URI {
  readonly scheme: string;
  readonly authority: string;
  readonly path: string;
  readonly query: string;
  readonly fragment: string;

  constructor(
    scheme: string,
    authority: string,
    path: string,
    query: string,
    fragment: string,
  ) {
    this.scheme = scheme;
    this.authority = authority;
    this.path = path;
    this.query = query;
    this.fragment = fragment;
  }

  /**
   * Parse a URI string according to RFC 3986.
   */
  static parse(value: string): URI {
    const match = URI_REGEX.exec(value);
    if (!match) {
      return new URI("", "", "", "", "");
    }
    return new URI(
      match[2] ?? "",
      match[4] ?? "",
      match[5] ?? "",
      match[7] ?? "",
      match[9] ?? "",
    );
  }

  /**
   * Create a file URI from a filesystem path.
   * Detects Windows paths and normalizes backslashes.
   */
  static file(path: string): URI {
    let normalized = path;

    // Detect Windows path: C:\ or C:/
    if (/^[a-zA-Z]:[\\\/]/.test(normalized)) {
      // Normalize backslashes to forward slashes
      normalized = normalized.replace(/\\/g, "/");
      // Ensure leading slash for URI path component
      normalized = "/" + normalized;
    }

    return new URI("file", "", normalized, "", "");
  }

  /**
   * Create a URI from component parts. Missing components default to "".
   */
  static from(components: {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): URI {
    return new URI(
      components.scheme ?? "",
      components.authority ?? "",
      components.path ?? "",
      components.query ?? "",
      components.fragment ?? "",
    );
  }

  /**
   * Returns the filesystem path for file URIs.
   * Handles UNC paths and Windows drive letters.
   */
  get fsPath(): string {
    // UNC path: authority present
    if (this.authority) {
      return `//${this.authority}${this.path}`;
    }

    // Windows drive letter: /C: → C:\...
    if (/^\/[a-zA-Z]:/.test(this.path)) {
      // Strip leading slash and convert forward slashes to backslashes
      return this.path.slice(1).replace(/\//g, "\\");
    }

    return this.path;
  }

  /**
   * Return a new URI with the specified components overridden.
   */
  with(change: {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): URI {
    return new URI(
      change.scheme ?? this.scheme,
      change.authority ?? this.authority,
      change.path ?? this.path,
      change.query ?? this.query,
      change.fragment ?? this.fragment,
    );
  }

  /**
   * Serialize the URI to a string following RFC 3986.
   */
  toString(): string {
    let result = "";

    if (this.scheme) {
      result += this.scheme + ":";
    }

    if (this.authority || this.scheme) {
      // Only add // if we have authority or this is a hierarchical URI with a scheme
      if (this.authority || this.path.startsWith("/")) {
        result += "//";
      }
    }

    if (this.authority) {
      result += encodeAuthority(this.authority);
    }

    result += encodePath(this.path);

    if (this.query) {
      result += "?" + encodeQuery(this.query);
    }

    if (this.fragment) {
      result += "#" + encodeFragment(this.fragment);
    }

    return result;
  }

  /**
   * Return a JSON-serializable representation of the URI components.
   */
  toJSON(): {
    scheme: string;
    authority: string;
    path: string;
    query: string;
    fragment: string;
  } {
    return {
      scheme: this.scheme,
      authority: this.authority,
      path: this.path,
      query: this.query,
      fragment: this.fragment,
    };
  }

  /**
   * Join additional path segments to a URI, resolving `.` and `..`.
   */
  static joinPath(uri: URI, ...paths: string[]): URI {
    const combined = [uri.path, ...paths].join("/");
    const normalized = normalizePath(combined);
    return uri.with({ path: normalized });
  }

  /**
   * Return a URI with the path set to the directory portion (everything up to last /).
   */
  static dirname(uri: URI): URI {
    const lastSlash = uri.path.lastIndexOf("/");
    if (lastSlash < 0) {
      return uri.with({ path: "" });
    }
    return uri.with({ path: uri.path.slice(0, lastSlash) });
  }

  /**
   * Return the last path segment (filename).
   */
  static basename(uri: URI): string {
    const lastSlash = uri.path.lastIndexOf("/");
    return uri.path.slice(lastSlash + 1);
  }

  /**
   * Return the file extension including dot, or "" if none.
   * Dotfiles like `.hidden` return "" (no extension).
   */
  static extname(uri: URI): string {
    const base = URI.basename(uri);
    const dotIndex = base.lastIndexOf(".");
    // No dot, or dot at position 0 (dotfile like .hidden), or trailing dot
    if (dotIndex <= 0) {
      return "";
    }
    return base.slice(dotIndex);
  }
}
