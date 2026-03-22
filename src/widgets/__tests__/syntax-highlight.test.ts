// Tests for syntax highlighting function
// Covers: each supported language, extension mapping, config color application, edge cases

import { describe, it, expect } from 'bun:test';
import { syntaxHighlight, detectLanguage } from '../syntax-highlight';
import { AppTheme } from '../app-theme';
import type { SyntaxHighlightConfig } from '../app-theme';
import { Color } from '../../core/color';
import { TextSpan } from '../../core/text-span';

// ---------------------------------------------------------------------------
// Helper: default config
// ---------------------------------------------------------------------------

function defaultConfig(): SyntaxHighlightConfig {
  return AppTheme.defaultTheme().syntaxHighlight;
}

/**
 * Collect all plain text from an array of TextSpan, concatenating lines with newlines.
 */
function collectText(spans: TextSpan[]): string {
  return spans.map((s) => s.toPlainText()).join('\n');
}

/**
 * Check if any TextSpan in the array (or their children) has a specific foreground color.
 */
function hasColor(spans: TextSpan[], color: Color): boolean {
  for (const span of spans) {
    if (span.style?.foreground && span.style.foreground.equals(color)) return true;
    if (span.children) {
      for (const child of span.children) {
        if (child.style?.foreground && child.style.foreground.equals(color)) return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// detectLanguage
// ---------------------------------------------------------------------------

describe('detectLanguage', () => {
  it('maps .ts to typescript', () => {
    expect(detectLanguage('foo.ts')).toBe('typescript');
  });

  it('maps .tsx to typescript', () => {
    expect(detectLanguage('foo.tsx')).toBe('typescript');
  });

  it('maps .js to typescript', () => {
    expect(detectLanguage('foo.js')).toBe('typescript');
  });

  it('maps .jsx to typescript', () => {
    expect(detectLanguage('foo.jsx')).toBe('typescript');
  });

  it('maps .py to python', () => {
    expect(detectLanguage('foo.py')).toBe('python');
  });

  it('maps .go to go', () => {
    expect(detectLanguage('foo.go')).toBe('go');
  });

  it('maps .rs to rust', () => {
    expect(detectLanguage('foo.rs')).toBe('rust');
  });

  it('maps .json to json', () => {
    expect(detectLanguage('foo.json')).toBe('json');
  });

  it('maps .yaml and .yml to yaml', () => {
    expect(detectLanguage('foo.yaml')).toBe('yaml');
    expect(detectLanguage('foo.yml')).toBe('yaml');
  });

  it('maps .md to markdown', () => {
    expect(detectLanguage('foo.md')).toBe('markdown');
  });

  it('maps .sh .bash .zsh to shell', () => {
    expect(detectLanguage('foo.sh')).toBe('shell');
    expect(detectLanguage('foo.bash')).toBe('shell');
    expect(detectLanguage('foo.zsh')).toBe('shell');
  });

  it('returns undefined for unknown extensions', () => {
    expect(detectLanguage('foo.xyz')).toBeUndefined();
    expect(detectLanguage('foo')).toBeUndefined();
    expect(detectLanguage('')).toBeUndefined();
  });

  it('handles full paths', () => {
    expect(detectLanguage('/home/user/project/src/main.rs')).toBe('rust');
    expect(detectLanguage('C:\\Users\\dev\\app.py')).toBe('python');
  });
});

// ---------------------------------------------------------------------------
// syntaxHighlight — basic behavior
// ---------------------------------------------------------------------------

describe('syntaxHighlight', () => {
  describe('basic behavior', () => {
    it('returns one TextSpan per line', () => {
      const config = defaultConfig();
      const content = 'line1\nline2\nline3';
      const result = syntaxHighlight(content, config, 'test.ts');
      expect(result.length).toBe(3);
    });

    it('preserves original text content', () => {
      const config = defaultConfig();
      const content = 'const x = 42;';
      const result = syntaxHighlight(content, config, 'test.ts');
      expect(collectText(result)).toBe(content);
    });

    it('returns single TextSpan for empty content', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('', config, 'test.ts');
      expect(result.length).toBe(1);
      expect(result[0]!.toPlainText()).toBe('');
    });

    it('returns empty-line TextSpans for lines with no content', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('\n\n', config, 'test.ts');
      expect(result.length).toBe(3);
      expect(result[0]!.toPlainText()).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // Unknown extension — default color
  // ---------------------------------------------------------------------------

  describe('unknown extension', () => {
    it('returns lines with default color for unknown file extension', () => {
      const config = defaultConfig();
      const content = 'some random text';
      const result = syntaxHighlight(content, config, 'test.unknown');
      expect(result.length).toBe(1);
      expect(result[0]!.style?.foreground?.equals(config.default)).toBe(true);
    });

    it('handles file with no extension', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('content', config, 'Makefile');
      expect(result.length).toBe(1);
      expect(result[0]!.style?.foreground?.equals(config.default)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // TypeScript / JavaScript highlighting
  // ---------------------------------------------------------------------------

  describe('TypeScript/JavaScript', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('const x = 1;', config, 'test.ts');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights strings', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('const s = "hello";', config, 'test.ts');
      expect(hasColor(result, config.string)).toBe(true);
    });

    it('highlights single-quoted strings', () => {
      const config = defaultConfig();
      const result = syntaxHighlight("const s = 'hello';", config, 'test.ts');
      expect(hasColor(result, config.string)).toBe(true);
    });

    it('highlights line comments', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('// a comment', config, 'test.ts');
      expect(hasColor(result, config.comment)).toBe(true);
    });

    it('highlights numbers', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('const n = 42;', config, 'test.ts');
      expect(hasColor(result, config.number)).toBe(true);
    });

    it('highlights type names (PascalCase)', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('const x: MyType = {};', config, 'test.ts');
      expect(hasColor(result, config.type)).toBe(true);
    });

    it('highlights function calls', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('doSomething();', config, 'test.ts');
      expect(hasColor(result, config.function)).toBe(true);
    });

    it('handles template literals', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('const s = `hello ${name}`;', config, 'test.ts');
      expect(hasColor(result, config.string)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Python highlighting
  // ---------------------------------------------------------------------------

  describe('Python', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('def foo():', config, 'test.py');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights strings', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('s = "hello"', config, 'test.py');
      expect(hasColor(result, config.string)).toBe(true);
    });

    it('highlights comments', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('# comment', config, 'test.py');
      expect(hasColor(result, config.comment)).toBe(true);
    });

    it('highlights decorators', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('@staticmethod', config, 'test.py');
      expect(hasColor(result, config.attribute)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Go highlighting
  // ---------------------------------------------------------------------------

  describe('Go', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('func main() {', config, 'test.go');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights strings', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('s := "hello"', config, 'test.go');
      expect(hasColor(result, config.string)).toBe(true);
    });

    it('highlights comments', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('// comment', config, 'test.go');
      expect(hasColor(result, config.comment)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Rust highlighting
  // ---------------------------------------------------------------------------

  describe('Rust', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('fn main() {', config, 'test.rs');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights strings', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('let s = "hello";', config, 'test.rs');
      expect(hasColor(result, config.string)).toBe(true);
    });

    it('highlights comments', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('// a comment', config, 'test.rs');
      expect(hasColor(result, config.comment)).toBe(true);
    });

    it('highlights macros', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('println!("hello");', config, 'test.rs');
      expect(hasColor(result, config.function)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // JSON highlighting
  // ---------------------------------------------------------------------------

  describe('JSON', () => {
    it('highlights property names', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('{ "name": "value" }', config, 'test.json');
      expect(hasColor(result, config.property)).toBe(true);
    });

    it('highlights string values', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('{ "key": "value" }', config, 'test.json');
      expect(hasColor(result, config.string)).toBe(true);
    });

    it('highlights numbers', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('{ "count": 42 }', config, 'test.json');
      expect(hasColor(result, config.number)).toBe(true);
    });

    it('highlights booleans and null', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('{ "flag": true, "empty": null }', config, 'test.json');
      expect(hasColor(result, config.keyword)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // YAML highlighting
  // ---------------------------------------------------------------------------

  describe('YAML', () => {
    it('highlights comments', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('# a comment', config, 'test.yaml');
      expect(hasColor(result, config.comment)).toBe(true);
    });

    it('highlights keys', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('name: value', config, 'test.yml');
      expect(hasColor(result, config.property)).toBe(true);
    });

    it('highlights strings', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('name: "hello"', config, 'test.yaml');
      expect(hasColor(result, config.string)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Markdown highlighting
  // ---------------------------------------------------------------------------

  describe('Markdown', () => {
    it('highlights headings', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('# Heading', config, 'test.md');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights inline code', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('use `code` here', config, 'test.md');
      expect(hasColor(result, config.string)).toBe(true);
    });

    it('highlights bold text', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('this is **bold** text', config, 'test.md');
      expect(hasColor(result, config.variable)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Shell highlighting
  // ---------------------------------------------------------------------------

  describe('Shell', () => {
    it('highlights comments', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('# comment', config, 'test.sh');
      expect(hasColor(result, config.comment)).toBe(true);
    });

    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('if [ -f file ]; then', config, 'test.sh');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights strings', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('echo "hello"', config, 'test.sh');
      expect(hasColor(result, config.string)).toBe(true);
    });

    it('highlights variable references', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('echo $HOME', config, 'test.sh');
      expect(hasColor(result, config.variable)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Config color application
  // ---------------------------------------------------------------------------

  describe('config color application', () => {
    it('uses custom colors from config', () => {
      const customKeyword = Color.rgb(255, 0, 255);
      const config: SyntaxHighlightConfig = {
        ...defaultConfig(),
        keyword: customKeyword,
      };
      const result = syntaxHighlight('const x = 1;', config, 'test.ts');
      expect(hasColor(result, customKeyword)).toBe(true);
    });

    it('uses custom string color', () => {
      const customString = Color.rgb(0, 255, 255);
      const config: SyntaxHighlightConfig = {
        ...defaultConfig(),
        string: customString,
      };
      const result = syntaxHighlight('const s = "hi";', config, 'test.ts');
      expect(hasColor(result, customString)).toBe(true);
    });

    it('uses custom default color for unknown extensions', () => {
      const customDefault = Color.rgb(123, 123, 123);
      const config: SyntaxHighlightConfig = {
        ...defaultConfig(),
        default: customDefault,
      };
      const result = syntaxHighlight('random text', config, 'file.xyz');
      expect(result[0]!.style?.foreground?.equals(customDefault)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles very long lines without hanging', () => {
      const config = defaultConfig();
      const longLine = 'const ' + 'x'.repeat(1000) + ' = 42;';
      const result = syntaxHighlight(longLine, config, 'test.ts');
      expect(result.length).toBe(1);
      expect(collectText(result).length).toBe(longLine.length);
    });

    it('handles special regex characters in source code', () => {
      const config = defaultConfig();
      const content = 'const re = /[a-z]+/g;';
      // Should not throw
      const result = syntaxHighlight(content, config, 'test.ts');
      expect(result.length).toBe(1);
    });

    it('handles multiline content correctly', () => {
      const config = defaultConfig();
      const content = 'const a = 1;\nconst b = 2;\nconst c = 3;';
      const result = syntaxHighlight(content, config, 'test.ts');
      expect(result.length).toBe(3);
    });

    it('preserves whitespace', () => {
      const config = defaultConfig();
      const content = '  const x = 1;';
      const result = syntaxHighlight(content, config, 'test.ts');
      expect(collectText(result)).toBe(content);
    });

    it('handles file path with mixed case extension', () => {
      // Extension detection is case-insensitive
      expect(detectLanguage('test.TS')).toBe('typescript');
      expect(detectLanguage('test.PY')).toBe('python');
    });
  });
});
