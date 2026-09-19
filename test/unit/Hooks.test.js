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

  describe('emStrongMask', () => {
    // custom ++underline++ syntax that allows `*` and `_` in its text
    const underlineExtension = {
      name: 'underline',
      level: 'inline',
      start(src) { return src.indexOf('++'); },
      tokenizer(src) {
        const match = /^\+\+([^+]+)\+\+/.exec(src);
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
      childTokens: ['tokens'],
    };

    const underlineMask = function(src) {
      return src.replace(/\+\+[^+]+\+\+/g, m => 'a'.repeat(m.length));
    };

    it('should mask custom inline syntax containing asterisks', () => {
      marked.use({
        extensions: [underlineExtension],
        hooks: { emStrongMask: underlineMask },
      });
      const html = marked.parse('++a*b++ and *em*');
      assert.strictEqual(html.trim(), '<p><u>a*b</u> and <em>em</em></p>');

      // without the mask the inner * would be paired with the outer em delimiters
      const masked = marked.parseInline('*++a*b++*');
      assert.strictEqual(masked, '<em><u>a*b</u></em>');
    });

    it('should mask custom inline syntax in parseInline', () => {
      marked.use({
        extensions: [underlineExtension],
        hooks: { emStrongMask: underlineMask },
      });
      const html = marked.parseInline('++a*b++ and *em*');
      assert.strictEqual(html, '<u>a*b</u> and <em>em</em>');
    });

    it('should not mistake asterisks inside custom syntax for strong boundaries', () => {
      marked.use({
        extensions: [underlineExtension],
        hooks: { emStrongMask: underlineMask },
      });
      const html = marked.parse('**++a*b++**');
      assert.strictEqual(html.trim(), '<p><strong><u>a*b</u></strong></p>');
    });

    it('should handle nested emphasis around masked text', () => {
      marked.use({
        extensions: [underlineExtension],
        hooks: { emStrongMask: underlineMask },
      });
      const html = marked.parse('*em ++x*y++ em*');
      assert.strictEqual(html.trim(), '<p><em>em <u>x*y</u> em</em></p>');
    });

    it('should not interfere with escaped asterisks', () => {
      marked.use({
        extensions: [underlineExtension],
        hooks: { emStrongMask: underlineMask },
      });
      assert.strictEqual(
        marked.parse('\\*a* ++b\\*c++').trim(),
        '<p>*a* <u>b*c</u></p>',
      );
      assert.strictEqual(
        marked.parse('++a\\*b++').trim(),
        '<p><u>a*b</u></p>',
      );
    });

    it('should work in async mode with the same synchronous mask', async() => {
      let maskCalls = 0;
      marked.use({
        async: true,
        extensions: [underlineExtension],
        hooks: {
          emStrongMask(src) {
            maskCalls++;
            return underlineMask(src);
          },
        },
        walkTokens() {
          return timeout();
        },
      });
      const promise = marked.parse('++a*b++ and *em*');
      assert.ok(promise instanceof Promise);
      const html = await promise;
      assert.strictEqual(html.trim(), '<p><u>a*b</u> and <em>em</em></p>');
      // one call for the paragraph text, one recursive call for the
      // underline contents and one for the em contents, not one call
      // per em/strong boundary search
      assert.strictEqual(maskCalls, 3);
    });

    it('should compute the mask once per inlineTokens context', () => {
      let maskCalls = 0;
      marked.use({
        extensions: [underlineExtension],
        hooks: {
          emStrongMask(src) {
            maskCalls++;
            return underlineMask(src);
          },
        },
      });
      marked.parse('*a* *b* ++x++ ++y++');
      // one top-level call plus one recursive call per em/strong and underline token
      assert.strictEqual(maskCalls, 5);
    });

    it('should combine multiple masks in reverse registration order', () => {
      const markExtension = {
        name: 'mark',
        level: 'inline',
        start(src) { return src.indexOf('=='); },
        tokenizer(src) {
          const match = /^==([^=]+)==/.exec(src);
          if (match) {
            return {
              type: 'mark',
              raw: match[0],
              text: match[1],
              tokens: this.lexer.inlineTokens(match[1]),
            };
          }
        },
        renderer(token) {
          return `<mark>${this.parser.parseInline(token.tokens)}</mark>`;
        },
        childTokens: ['tokens'],
      };
      const markMask = function(src) {
        return src.replace(/==[^=]+==/g, m => 'a'.repeat(m.length));
      };

      const order = [];
      marked.use({
        extensions: [underlineExtension],
        hooks: {
          emStrongMask(src) {
            order.push(['underline', src]);
            return underlineMask(src);
          },
        },
      });
      marked.use({
        extensions: [markExtension],
        hooks: {
          emStrongMask(src) {
            // newest hook runs first and receives the original source
            order.push(['mark', src]);
            return markMask(src);
          },
        },
      });

      const html = marked.parse('++a*b++ ==c*d== *e*');
      assert.strictEqual(html.trim(), '<p><u>a*b</u> <mark>c*d</mark> <em>e</em></p>');

      // the hook assigned last (mark) runs before the one assigned first (underline)
      assert.deepStrictEqual(order.slice(0, 2).map(([name]) => name), ['mark', 'underline']);
      // newest hook saw the original source, older hook saw the newer mask result
      assert.strictEqual(order[0][1], '++a*b++ ==c*d== *e*');
      assert.strictEqual(order[1][1], '++a*b++ aaaaaaa *e*');
    });

    it('should throw if a mask changes the length synchronously', () => {
      marked.use({
        hooks: {
          emStrongMask(src) {
            return src.replace(/a/g, '');
          },
        },
      });
      assert.throws(
        () => marked.parse('a*b*'),
        /emStrongMask hook returned a string of length \d+ for a string of length \d+/,
      );
    });

    it('should reject if a mask changes the length in async mode', async() => {
      marked.use({
        async: true,
        hooks: {
          emStrongMask(src) {
            return src.replace(/a/g, '');
          },
        },
      });
      await assert.rejects(
        marked.parse('a*b*'),
        /emStrongMask hook returned a string of length \d+ for a string of length \d+/,
      );
    });

    it('should throw if a mask does not return a string', () => {
      marked.use({
        hooks: {
          emStrongMask() {
            // returning a Promise is not allowed during synchronous tokenization
            return Promise.resolve('x');
          },
        },
      });
      assert.throws(
        () => marked.parse('x'),
        /emStrongMask hook must return a string/,
      );
    });
  });
});
