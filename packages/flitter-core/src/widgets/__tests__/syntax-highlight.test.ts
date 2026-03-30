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

    it('handles file with truly unknown name', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('content', config, 'UNKNOWNFILE');
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

  // ---------------------------------------------------------------------------
  // Gap #69 — New language detection (extension mapping)
  // ---------------------------------------------------------------------------

  describe('new language detection (Gap #69)', () => {
    it('maps .c to c', () => {
      expect(detectLanguage('main.c')).toBe('c');
    });

    it('maps .cpp .cc .cxx .hpp .hh .h to cpp', () => {
      expect(detectLanguage('main.cpp')).toBe('cpp');
      expect(detectLanguage('main.cc')).toBe('cpp');
      expect(detectLanguage('main.cxx')).toBe('cpp');
      expect(detectLanguage('main.hpp')).toBe('cpp');
      expect(detectLanguage('main.hh')).toBe('cpp');
      expect(detectLanguage('main.h')).toBe('cpp');
    });

    it('maps .java to java', () => {
      expect(detectLanguage('Main.java')).toBe('java');
    });

    it('maps .html .htm to html', () => {
      expect(detectLanguage('index.html')).toBe('html');
      expect(detectLanguage('index.htm')).toBe('html');
    });

    it('maps .css to css', () => {
      expect(detectLanguage('style.css')).toBe('css');
    });

    it('maps .sql to sql', () => {
      expect(detectLanguage('query.sql')).toBe('sql');
    });

    it('maps .toml to toml', () => {
      expect(detectLanguage('config.toml')).toBe('toml');
    });

    it('maps .rb .rake .gemspec to ruby', () => {
      expect(detectLanguage('app.rb')).toBe('ruby');
      expect(detectLanguage('build.rake')).toBe('ruby');
      expect(detectLanguage('test.gemspec')).toBe('ruby');
    });

    it('maps .php to php', () => {
      expect(detectLanguage('index.php')).toBe('php');
    });

    it('maps .swift to swift', () => {
      expect(detectLanguage('main.swift')).toBe('swift');
    });

    it('maps .kt .kts to kotlin', () => {
      expect(detectLanguage('Main.kt')).toBe('kotlin');
      expect(detectLanguage('build.kts')).toBe('kotlin');
    });

    it('maps .cs to csharp', () => {
      expect(detectLanguage('Program.cs')).toBe('csharp');
    });

    it('maps .lua to lua', () => {
      expect(detectLanguage('init.lua')).toBe('lua');
    });

    it('maps .scss .sass to scss', () => {
      expect(detectLanguage('style.scss')).toBe('scss');
      expect(detectLanguage('style.sass')).toBe('scss');
    });

    it('maps .xml .svg .xsl to xml', () => {
      expect(detectLanguage('data.xml')).toBe('xml');
      expect(detectLanguage('icon.svg')).toBe('xml');
      expect(detectLanguage('transform.xsl')).toBe('xml');
    });

    it('maps .scala .sc to scala', () => {
      expect(detectLanguage('Main.scala')).toBe('scala');
      expect(detectLanguage('script.sc')).toBe('scala');
    });

    it('maps .ex .exs to elixir', () => {
      expect(detectLanguage('app.ex')).toBe('elixir');
      expect(detectLanguage('test.exs')).toBe('elixir');
    });

    it('maps .hs to haskell', () => {
      expect(detectLanguage('Main.hs')).toBe('haskell');
    });

    it('maps .zig to zig', () => {
      expect(detectLanguage('main.zig')).toBe('zig');
    });

    it('maps .ml .mli to ocaml', () => {
      expect(detectLanguage('main.ml')).toBe('ocaml');
      expect(detectLanguage('main.mli')).toBe('ocaml');
    });

    it('maps .mk to makefile', () => {
      expect(detectLanguage('build.mk')).toBe('makefile');
    });

    it('detects Dockerfile by filename', () => {
      expect(detectLanguage('Dockerfile')).toBe('dockerfile');
      expect(detectLanguage('/path/to/Dockerfile')).toBe('dockerfile');
    });

    it('detects Makefile by filename', () => {
      expect(detectLanguage('Makefile')).toBe('makefile');
      expect(detectLanguage('/path/to/Makefile')).toBe('makefile');
      expect(detectLanguage('GNUmakefile')).toBe('makefile');
    });
  });

  // ---------------------------------------------------------------------------
  // Gap #69 — New language highlighting (basic token coverage)
  // ---------------------------------------------------------------------------

  describe('C highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('int main(void) {', config, 'test.c');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights preprocessor directives', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('#include <stdio.h>', config, 'test.c');
      expect(hasColor(result, config.attribute)).toBe(true);
    });

    it('highlights comments', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('// a comment', config, 'test.c');
      expect(hasColor(result, config.comment)).toBe(true);
    });
  });

  describe('C++ highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('class Foo : public Bar {', config, 'test.cpp');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights strings', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('auto s = "hello";', config, 'test.cpp');
      expect(hasColor(result, config.string)).toBe(true);
    });
  });

  describe('Java highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('public class Main {', config, 'test.java');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights annotations', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('@Override', config, 'test.java');
      expect(hasColor(result, config.attribute)).toBe(true);
    });
  });

  describe('HTML highlighting', () => {
    it('highlights tags', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('<div class="foo">', config, 'test.html');
      expect(hasColor(result, config.tag)).toBe(true);
    });

    it('highlights attribute values', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('<div class="foo">', config, 'test.html');
      expect(hasColor(result, config.string)).toBe(true);
    });
  });

  describe('CSS highlighting', () => {
    it('highlights selectors', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('.container { color: red; }', config, 'test.css');
      expect(hasColor(result, config.tag)).toBe(true);
    });

    it('highlights property names', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('color: red;', config, 'test.css');
      expect(hasColor(result, config.property)).toBe(true);
    });
  });

  describe('SQL highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('SELECT * FROM users WHERE id = 1;', config, 'test.sql');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights line comments', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('-- a comment', config, 'test.sql');
      expect(hasColor(result, config.comment)).toBe(true);
    });
  });

  describe('TOML highlighting', () => {
    it('highlights section headers', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('[package]', config, 'test.toml');
      expect(hasColor(result, config.tag)).toBe(true);
    });

    it('highlights keys', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('name = "app"', config, 'test.toml');
      expect(hasColor(result, config.property)).toBe(true);
    });
  });

  describe('Ruby highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('def hello', config, 'test.rb');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights symbols', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('x = :symbol', config, 'test.rb');
      expect(hasColor(result, config.attribute)).toBe(true);
    });
  });

  describe('PHP highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('<?php function foo() {', config, 'test.php');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights variables', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('$name = "test";', config, 'test.php');
      expect(hasColor(result, config.variable)).toBe(true);
    });
  });

  describe('Swift highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('func main() {', config, 'test.swift');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights attributes', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('@objc class Foo {}', config, 'test.swift');
      expect(hasColor(result, config.attribute)).toBe(true);
    });
  });

  describe('Kotlin highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('fun main() {', config, 'test.kt');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights annotations', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('@JvmStatic', config, 'test.kt');
      expect(hasColor(result, config.attribute)).toBe(true);
    });
  });

  describe('C# highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('public class Foo {', config, 'test.cs');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights strings', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('var s = "hello";', config, 'test.cs');
      expect(hasColor(result, config.string)).toBe(true);
    });
  });

  describe('Lua highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('local x = 10', config, 'test.lua');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights comments', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('-- comment', config, 'test.lua');
      expect(hasColor(result, config.comment)).toBe(true);
    });
  });

  describe('SCSS highlighting', () => {
    it('highlights variables', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('$primary: #333;', config, 'test.scss');
      expect(hasColor(result, config.variable)).toBe(true);
    });

    it('highlights at-rules', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('@mixin flex {', config, 'test.scss');
      expect(hasColor(result, config.keyword)).toBe(true);
    });
  });

  describe('XML highlighting', () => {
    it('highlights tags', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('<root attr="val">', config, 'test.xml');
      expect(hasColor(result, config.tag)).toBe(true);
    });

    it('highlights attribute values', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('<item name="foo"/>', config, 'test.xml');
      expect(hasColor(result, config.string)).toBe(true);
    });
  });

  describe('Dockerfile highlighting', () => {
    it('highlights instructions', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('FROM node:18-alpine', config, 'Dockerfile');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights variables', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('ENV APP_HOME=$HOME/app', config, 'Dockerfile');
      expect(hasColor(result, config.variable)).toBe(true);
    });
  });

  describe('Scala highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('def main(args: Array[String]): Unit = {', config, 'test.scala');
      expect(hasColor(result, config.keyword)).toBe(true);
    });
  });

  describe('Elixir highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('defmodule App do', config, 'test.ex');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights atoms', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('x = :hello', config, 'test.ex');
      expect(hasColor(result, config.attribute)).toBe(true);
    });
  });

  describe('Haskell highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('module Main where', config, 'test.hs');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights line comments', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('-- a comment', config, 'test.hs');
      expect(hasColor(result, config.comment)).toBe(true);
    });
  });

  describe('Zig highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('const std = @import("std");', config, 'test.zig');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights built-in functions', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('@import("std")', config, 'test.zig');
      expect(hasColor(result, config.function)).toBe(true);
    });
  });

  describe('OCaml highlighting', () => {
    it('highlights keywords', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('let x = 42 in x', config, 'test.ml');
      expect(hasColor(result, config.keyword)).toBe(true);
    });

    it('highlights strings', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('let s = "hello"', config, 'test.ml');
      expect(hasColor(result, config.string)).toBe(true);
    });
  });

  describe('Makefile highlighting', () => {
    it('highlights comments', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('# comment', config, 'Makefile');
      expect(hasColor(result, config.comment)).toBe(true);
    });

    it('highlights directives', () => {
      const config = defaultConfig();
      const result = syntaxHighlight('include common.mk', config, 'Makefile');
      expect(hasColor(result, config.keyword)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Gap #70 — Multi-line construct support
  // ---------------------------------------------------------------------------

  describe('multi-line constructs (Gap #70)', () => {
    describe('block comments', () => {
      it('highlights multi-line block comments in JS/TS', () => {
        const config = defaultConfig();
        const content = 'x = 1;\n/* this is\na comment */\ny = 2;';
        const result = syntaxHighlight(content, config, 'test.ts');
        // Line 2 should have comment color
        expect(hasColor([result[1]!], config.comment)).toBe(true);
        // Line 3 should have comment color (up to */) and then other tokens
        expect(hasColor([result[2]!], config.comment)).toBe(true);
      });

      it('preserves text content across multi-line blocks', () => {
        const config = defaultConfig();
        const content = '/* start\nmiddle\nend */';
        const result = syntaxHighlight(content, config, 'test.ts');
        expect(collectText(result)).toBe(content);
      });

      it('highlights C multi-line block comments', () => {
        const config = defaultConfig();
        const content = '/* block\ncomment */\nint x;';
        const result = syntaxHighlight(content, config, 'test.c');
        expect(hasColor([result[0]!], config.comment)).toBe(true);
        expect(hasColor([result[1]!], config.comment)).toBe(true);
      });

      it('handles inline block comment (opens and closes on same line)', () => {
        const config = defaultConfig();
        const content = 'x = /* inline */ 42;';
        const result = syntaxHighlight(content, config, 'test.ts');
        expect(hasColor(result, config.comment)).toBe(true);
        expect(hasColor(result, config.number)).toBe(true);
      });

      it('handles block comment spanning blank lines', () => {
        const config = defaultConfig();
        const content = '/*\n\n*/';
        const result = syntaxHighlight(content, config, 'test.ts');
        expect(result.length).toBe(3);
        // All three lines should relate to the comment
        expect(hasColor([result[0]!], config.comment)).toBe(true);
      });

      it('highlights Haskell block comments {- ... -}', () => {
        const config = defaultConfig();
        const content = '{- multi\nline -}';
        const result = syntaxHighlight(content, config, 'test.hs');
        expect(hasColor([result[0]!], config.comment)).toBe(true);
        expect(hasColor([result[1]!], config.comment)).toBe(true);
      });

      it('highlights OCaml block comments (* ... *)', () => {
        const config = defaultConfig();
        const content = '(* multi\nline *)';
        const result = syntaxHighlight(content, config, 'test.ml');
        expect(hasColor([result[0]!], config.comment)).toBe(true);
        expect(hasColor([result[1]!], config.comment)).toBe(true);
      });

      it('highlights HTML comments <!-- ... -->', () => {
        const config = defaultConfig();
        const content = '<!-- multi\nline -->';
        const result = syntaxHighlight(content, config, 'test.html');
        expect(hasColor([result[0]!], config.comment)).toBe(true);
        expect(hasColor([result[1]!], config.comment)).toBe(true);
      });

      it('highlights Lua block comments --[[ ... ]]', () => {
        const config = defaultConfig();
        const content = '--[[ multi\nline ]]';
        const result = syntaxHighlight(content, config, 'test.lua');
        expect(hasColor([result[0]!], config.comment)).toBe(true);
        expect(hasColor([result[1]!], config.comment)).toBe(true);
      });
    });

    describe('multi-line strings', () => {
      it('highlights Python triple-quoted strings across lines', () => {
        const config = defaultConfig();
        const content = 'x = """\nhello\nworld"""';
        const result = syntaxHighlight(content, config, 'test.py');
        // Line 2 and 3 should be string-colored
        expect(hasColor([result[1]!], config.string)).toBe(true);
        expect(hasColor([result[2]!], config.string)).toBe(true);
      });

      it('highlights JS template literals across lines', () => {
        const config = defaultConfig();
        const content = 'const s = `hello\nworld`;';
        const result = syntaxHighlight(content, config, 'test.ts');
        // Both lines should have string color
        expect(hasColor([result[0]!], config.string)).toBe(true);
        expect(hasColor([result[1]!], config.string)).toBe(true);
      });

      it('highlights Go raw strings across lines', () => {
        const config = defaultConfig();
        const content = 's := `hello\nworld`';
        const result = syntaxHighlight(content, config, 'test.go');
        expect(hasColor([result[0]!], config.string)).toBe(true);
        expect(hasColor([result[1]!], config.string)).toBe(true);
      });

      it('highlights TOML multi-line strings', () => {
        const config = defaultConfig();
        const content = 'desc = """\nhello\n"""';
        const result = syntaxHighlight(content, config, 'test.toml');
        expect(hasColor([result[1]!], config.string)).toBe(true);
      });

      it('highlights Elixir heredoc strings', () => {
        const config = defaultConfig();
        const content = '"""\nhello\n"""';
        const result = syntaxHighlight(content, config, 'test.ex');
        expect(hasColor([result[1]!], config.string)).toBe(true);
      });

      it('highlights Markdown fenced code blocks', () => {
        const config = defaultConfig();
        const content = '```js\nconst x = 1;\n```';
        const result = syntaxHighlight(content, config, 'test.md');
        // The fenced content line should be string color
        expect(hasColor([result[1]!], config.string)).toBe(true);
      });
    });

    describe('multi-line comment with code after close', () => {
      it('resumes normal tokenization after block comment ends', () => {
        const config = defaultConfig();
        const content = '/* comment */const x = 42;';
        const result = syntaxHighlight(content, config, 'test.ts');
        // Should have both comment and keyword colors
        expect(hasColor(result, config.comment)).toBe(true);
        expect(hasColor(result, config.keyword)).toBe(true);
      });
    });

    describe('text preservation', () => {
      it('preserves all text content across multi-line constructs', () => {
        const config = defaultConfig();
        const content = 'a = 1;\n/* block\ncomment */\nb = 2;';
        const result = syntaxHighlight(content, config, 'test.ts');
        expect(collectText(result)).toBe(content);
      });
    });
  });
});
