import { Marked } from '../../lib/marked.esm.js';
import { timeout } from './utils.js';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

function createHeadingToken(text) {
  return {
    type: 'heading',
    raw: `# ${text}`,
    depth: 1,
    text,
    tokens: [
      { type: 'text', raw: text, text },
    ],
  };
}

// Custom inline `++underline++` syntax whose content may contain `*`/`_`
function underlineExtension() {
  return {
    name: 'underline',
    level: 'inline',
    start(src) {
      return src.indexOf('++');
    },
    tokenizer(src) {
      const match = /^\+\+([^+\n]+)\+\+/.exec(src);
      if (match) {
        return {
          type: 'underline',
          raw: match[0],
          text: match[1],
          tokens: this.lexer.inlineTokens(match[1]),
        };
      }
    },
    renderer(token) {
      return `<u>${this.parser.parseInline(token.tokens)}</u>`;
    },
  };
}

// Custom inline `==highlight==` syntax
function highlightExtension() {
  return {
    name: 'highlight',
    level: 'inline',
    start(src) {
      return src.indexOf('==');
    },
    tokenizer(src) {
      const match = /^==([^=\n]+)==/.exec(src);
      if (match) {
        return {
          type: 'highlight',
          raw: match[0],
          text: match[1],
          tokens: this.lexer.inlineTokens(match[1]),
        };
      }
    },
    renderer(token) {
      return `<mark>${this.parser.parseInline(token.tokens)}</mark>`;
    },
  };
}

describe('Hooks', () => {
  let marked;
  beforeEach(() => {
    marked = new Marked();
  });

  it('should preprocess markdown', () => {
    marked.use({
      hooks: {
        preprocess(markdown) {
          return `# preprocess\n\n${markdown}`;
        },
      },
    });
    const html = marked.parse('*text*');
    assert.strictEqual(html.trim(), '<h1>preprocess</h1>\n<p><em>text</em></p>');
  });

  it('should preprocess async', async() => {
    marked.use({
      async: true,
      hooks: {
        async preprocess(markdown) {
          await timeout();
          return `# preprocess async\n\n${markdown}`;
        },
      },
    });
    const promise = marked.parse('*text*');
    assert.ok(promise instanceof Promise);
    const html = await promise;
    assert.strictEqual(html.trim(), '<h1>preprocess async</h1>\n<p><em>text</em></p>');
  });

  it('should preprocess options', () => {
    marked.use({
      hooks: {
        preprocess(markdown) {
          this.options.breaks = true;
          return markdown;
        },
      },
    });
    const html = marked.parse('line1\nline2');
    assert.strictEqual(html.trim(), '<p>line1<br>line2</p>');
  });

  it('should preprocess options async', async() => {
    marked.use({
      async: true,
      hooks: {
        async preprocess(markdown) {
          await timeout();
          this.options.breaks = true;
          return markdown;
        },
      },
    });
    const html = await marked.parse('line1\nline2');
    assert.strictEqual(html.trim(), '<p>line1<br>line2</p>');
  });

  it('should postprocess html', () => {
    marked.use({
      hooks: {
        postprocess(html) {
          return html + '<h1>postprocess</h1>';
        },
      },
    });
    const html = marked.parse('*text*');
    assert.strictEqual(html.trim(), '<p><em>text</em></p>\n<h1>postprocess</h1>');
  });

  it('should postprocess async', async() => {
    marked.use({
      async: true,
      hooks: {
        async postprocess(html) {
          await timeout();
          return html + '<h1>postprocess async</h1>\n';
        },
      },
    });
    const promise = marked.parse('*text*');
    assert.ok(promise instanceof Promise);
    const html = await promise;
    assert.strictEqual(html.trim(), '<p><em>text</em></p>\n<h1>postprocess async</h1>');
  });

  it('should process tokens before walkTokens', () => {
    marked.use({
      hooks: {
        processAllTokens(tokens) {
          tokens.push(createHeadingToken('processAllTokens'));
          return tokens;
        },
      },
      walkTokens(token) {
        if (token.type === 'heading') {
          token.tokens[0].text += ' walked';
        }
        return token;
      },
    });
    const html = marked.parse('*text*');
    assert.strictEqual(html.trim(), '<p><em>text</em></p>\n<h1>processAllTokens walked</h1>');
  });

  it('should process tokens async before walkTokens', async() => {
    marked.use({
      async: true,
      hooks: {
        async processAllTokens(tokens) {
          await timeout();
          tokens.push(createHeadingToken('processAllTokens async'));
          return tokens;
        },
      },
      walkTokens(token) {
        if (token.type === 'heading') {
          token.tokens[0].text += ' walked';
        }
        return token;
      },
    });
    const promise = marked.parse('*text*');
    assert.ok(promise instanceof Promise);
    const html = await promise;
    assert.strictEqual(html.trim(), '<p><em>text</em></p>\n<h1>processAllTokens async walked</h1>');
  });

  it('should process all hooks in reverse', async() => {
    marked.use({
      hooks: {
        preprocess(markdown) {
          return `# preprocess1\n\n${markdown}`;
        },
        postprocess(html) {
          return html + '<h1>postprocess1</h1>\n';
        },
        processAllTokens(tokens) {
          tokens.push(createHeadingToken('processAllTokens1'));
          return tokens;
        },
      },
    });
    marked.use({
      async: true,
      hooks: {
        preprocess(markdown) {
          return `# preprocess2\n\n${markdown}`;
        },
        async postprocess(html) {
          await timeout();
          return html + '<h1>postprocess2 async</h1>\n';
        },
        processAllTokens(tokens) {
          tokens.push(createHeadingToken('processAllTokens2'));
          return tokens;
        },
      },
    });
    const promise = marked.parse('*text*');
    assert.ok(promise instanceof Promise);
    const html = await promise;
    assert.strictEqual(html.trim(), `\
<h1>preprocess1</h1>
<h1>preprocess2</h1>
<p><em>text</em></p>
<h1>processAllTokens2</h1>
<h1>processAllTokens1</h1>
<h1>postprocess2 async</h1>
<h1>postprocess1</h1>`);
  });

  it('should provide lexer', () => {
    marked.use({
      hooks: {
        provideLexer() {
          return (src) => [createHeadingToken(src)];
        },
      },
    });
    const html = marked.parse('text');
    assert.strictEqual(html.trim(), '<h1>text</h1>');
  });

  it('should provide lexer async', async() => {
    marked.use({
      async: true,
      hooks: {
        provideLexer() {
          return async(src) => {
            await timeout();
            return [createHeadingToken(src)];
          };
        },
      },
    });
    const html = await marked.parse('text');
    assert.strictEqual(html.trim(), '<h1>text</h1>');
  });

  it('should provide parser return object', () => {
    marked.use({
      hooks: {
        provideParser() {
          return (tokens) => ({ text: 'test parser' });
        },
      },
    });
    const html = marked.parse('text');
    assert.strictEqual(html.text, 'test parser');
  });

  it('should provide parser', () => {
    marked.use({
      hooks: {
        provideParser() {
          return (tokens) => 'test parser';
        },
      },
    });
    const html = marked.parse('text');
    assert.strictEqual(html.trim(), 'test parser');
  });

  it('should provide parser async', async() => {
    marked.use({
      async: true,
      hooks: {
        provideParser() {
          return async(tokens) => {
            await timeout();
            return 'test parser';
          };
        },
      },
    });
    const html = await marked.parse('text');
    assert.strictEqual(html.trim(), 'test parser');
  });
});

describe('emStrongMask', () => {
  const underlineMask = src => src.replace(/\+\+[^+\n]*\+\+/g, m => 'a'.repeat(m.length));
  const highlightMask = src => src.replace(/==[^=\n]*==/g, m => 'b'.repeat(m.length));

  it('should mask asterisks inside a custom underline extension', () => {
    const marked = new Marked({
      extensions: [underlineExtension()],
      hooks: { emStrongMask: underlineMask },
    });

    // without the mask the em scanner closes at the `*` inside `++b*c++`
    assert.strictEqual(
      marked.parse('*a ++b*c++ d*').trim(),
      '<p><em>a <u>b*c</u> d</em></p>',
    );
  });

  it('should leave emphasis outside the masked section intact', () => {
    const marked = new Marked({
      extensions: [underlineExtension()],
      hooks: { emStrongMask: underlineMask },
    });

    assert.strictEqual(
      marked.parse('a ++foo * bar++ b *em*').trim(),
      '<p>a <u>foo * bar</u> b <em>em</em></p>',
    );
    assert.strictEqual(
      marked.parse('x ++a**b++ y **strong**').trim(),
      '<p>x <u>a**b</u> y <strong>strong</strong></p>',
    );
    assert.strictEqual(
      marked.parse('a ++foo_bar++ b _em_').trim(),
      '<p>a <u>foo_bar</u> b <em>em</em></p>',
    );
  });

  it('should compose two masks registered through marked.use', () => {
    const calls = [];
    const marked = new Marked(
      {
        extensions: [underlineExtension()],
        hooks: {
          emStrongMask(src) {
            calls.push('underline');
            return underlineMask(src);
          },
        },
      },
      {
        extensions: [highlightExtension()],
        hooks: {
          emStrongMask(src) {
            calls.push('highlight');
            return highlightMask(src);
          },
        },
      },
    );

    assert.strictEqual(
      marked.parse('*a ++b*c++ ==d*e== f*').trim(),
      '<p><em>a <u>b*c</u> <mark>d*e</mark> f</em></p>',
    );
    // both hooks participate in the same mask (last registered runs first)
    assert.deepStrictEqual(calls.slice(0, 2), ['highlight', 'underline']);
  });

  it('should handle nested emphasis around custom syntax', () => {
    const marked = new Marked({
      extensions: [underlineExtension()],
      hooks: { emStrongMask: underlineMask },
    });

    assert.strictEqual(
      marked.parse('*x ++y*++* z').trim(),
      '<p><em>x <u>y*</u></em> z</p>',
    );
  });

  it('should keep escaped asterisks masked as well', () => {
    const marked = new Marked({
      extensions: [underlineExtension()],
      hooks: { emStrongMask: underlineMask },
    });

    assert.strictEqual(
      marked.parse('a \\*not em\\* c *em*').trim(),
      '<p>a *not em* c <em>em</em></p>',
    );
  });

  it('should work with parseInline', () => {
    const marked = new Marked({
      extensions: [underlineExtension()],
      hooks: { emStrongMask: underlineMask },
    });

    assert.strictEqual(
      marked.parseInline('a ++foo*bar++ b'),
      'a <u>foo*bar</u> b',
    );
  });

  it('should produce the same result in sync and async parsing', async() => {
    const marked = new Marked({
      extensions: [underlineExtension()],
      hooks: { emStrongMask: underlineMask },
    });

    const src = '*a ++b*c++ d* and **x ++y** z**';
    const sync = marked.parse(src, { async: false });
    const asynced = await marked.parse(src, { async: true });
    assert.strictEqual(asynced, sync);
  });

  it('should run a mask hook only once per unique source', () => {
    const seen = [];
    const marked = new Marked({
      extensions: [underlineExtension()],
      hooks: {
        emStrongMask(src) {
          seen.push(src);
          return underlineMask(src);
        },
      },
    });

    marked.parse('*a ++b*c++ d*\n\n*a ++b*c++ d*');

    // inlineTokens is entered for the paragraph, for the em inner text and for
    // the underline inner text, but every unique source is masked only once
    // even though both paragraphs contain the same text
    assert.deepStrictEqual(seen, ['*a ++b*c++ d*', 'a ++b*c++ d', 'b*c']);
  });

  it('should throw when the mask has a different length', () => {
    const marked = new Marked({
      hooks: { emStrongMask: src => src + 'x' },
    });

    assert.throws(
      () => marked.parse('a *b*'),
      /emStrongMask hook must return a string of the same length as the input/,
    );
  });

  it('should reject with a length error when parsing async', async() => {
    const marked = new Marked({
      async: true,
      hooks: { emStrongMask: src => src.slice(1) },
    });

    await assert.rejects(
      marked.parse('a *b*'),
      /emStrongMask hook must return a string of the same length as the input/,
    );
  });

  it('should throw when the mask does not return a string', () => {
    const marked = new Marked({
      hooks: { emStrongMask: () => 42 },
    });

    assert.throws(
      () => marked.parse('a'),
      /emStrongMask hook must return a string of the same length as the input/,
    );
  });
});
