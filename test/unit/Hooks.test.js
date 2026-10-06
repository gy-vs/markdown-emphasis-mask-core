import { Marked, marked as markedGlobal } from '../../lib/marked.esm.js';
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

// Inline math extension whose contents frequently contain '*' used as a
// multiplication sign, and the matching emStrongMask hook that hides math
// spans from em/strong delimiter matching.
const mathExtension = {
  extensions: [{
    name: 'math',
    level: 'inline',
    start(src) {
      return src.indexOf('$');
    },
    tokenizer(src) {
      const match = /^\$([^$]+)\$/.exec(src);
      if (match) {
        return {
          type: 'math',
          raw: match[0],
          text: match[1],
        };
      }
    },
    renderer(token) {
      return `<span class="math">${token.text}</span>`;
    },
  }],
  hooks: {
    emStrongMask(src) {
      return src.replace(/\$[^$]*\$/g, match => ' '.repeat(match.length));
    },
  },
};

const highlightExtension = {
  extensions: [{
    name: 'highlight',
    level: 'inline',
    start(src) {
      return src.indexOf('==');
    },
    tokenizer(src) {
      const match = /^==([^=]+)==/.exec(src);
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
  }],
  hooks: {
    emStrongMask(src) {
      return src.replace(/==[^=]*==/g, match => ' '.repeat(match.length));
    },
  },
};

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

  it('should not split math inside em', () => {
    marked.use(mathExtension);
    const html = marked.parse('*area $a*b*c$ total*');
    assert.strictEqual(html, '<p><em>area <span class="math">a*b*c</span> total</em></p>\n');
  });

  it('should not split math inside strong', () => {
    marked.use(mathExtension);
    const html = marked.parse('**area $a*b*c$ total**');
    assert.strictEqual(html, '<p><strong>area <span class="math">a*b*c</span> total</strong></p>\n');
  });

  it('should not close strong early on stars inside math', () => {
    marked.use(mathExtension);
    // without emStrongMask the closing ** is found inside the formula,
    // leaving two literal '*' at the end
    const html = marked.parse('**area $a*b**c$ total**');
    assert.strictEqual(html, '<p><strong>area <span class="math">a*b**c</span> total</strong></p>\n');
  });

  it('should leave emphasis without math unchanged', () => {
    marked.use(mathExtension);
    assert.strictEqual(marked.parse('*a* and **b**'), '<p><em>a</em> and <strong>b</strong></p>\n');
    assert.strictEqual(marked.parse('area $a*b*c$ total'), '<p>area <span class="math">a*b*c</span> total</p>\n');
  });

  it('should keep the original text for the extension tokenizer and renderer', () => {
    let tokenizerSrc = '';
    marked.use({
      extensions: [{
        name: 'math',
        level: 'inline',
        start(src) {
          return src.indexOf('$');
        },
        tokenizer(src) {
          const match = /^\$([^$]+)\$/.exec(src);
          if (match) {
            tokenizerSrc = match[0];
            return { type: 'math', raw: match[0], text: match[1] };
          }
        },
        renderer(token) {
          return `<span class="math">${token.text}</span>`;
        },
      }],
      hooks: {
        emStrongMask(src) {
          return src.replace(/\$[^$]*\$/g, match => 'x'.repeat(match.length));
        },
      },
    });
    const html = marked.parse('*area $a*b*c$ total*');
    assert.strictEqual(tokenizerSrc, '$a*b*c$');
    assert.strictEqual(html, '<p><em>area <span class="math">a*b*c</span> total</em></p>\n');
  });

  it('should work with parseInline', () => {
    marked.use(mathExtension);
    const html = marked.parseInline('*area $a*b*c$ total*');
    assert.strictEqual(html, '<em>area <span class="math">a*b*c</span> total</em>');
  });

  it('should work with standalone marked module', () => {
    markedGlobal.use(mathExtension);
    const html = markedGlobal.parse('*area $a*b*c$ total*');
    assert.strictEqual(html, '<p><em>area <span class="math">a*b*c</span> total</em></p>\n');
    // other test files import the same module instance, reset its options
    markedGlobal.setOptions(new Marked().defaults);
  });

  it('should give the same result in async mode', async() => {
    marked.use({
      ...mathExtension,
      async: true,
      walkTokens() {
        return timeout();
      },
    });
    const promise = marked.parse('*area $a*b*c$ total*');
    assert.ok(promise instanceof Promise);
    const html = await promise;
    assert.strictEqual(html, '<p><em>area <span class="math">a*b*c</span> total</em></p>\n');
  });

  it('should keep preprocess/postprocess/processAllTokens promise behavior in async mode', async() => {
    marked.use({
      ...mathExtension,
      async: true,
      hooks: {
        ...mathExtension.hooks,
        async preprocess(src) {
          await timeout();
          return src;
        },
        async postprocess(html) {
          await timeout();
          return html;
        },
        async processAllTokens(tokens) {
          await timeout();
          return tokens;
        },
      },
    });
    const html = await marked.parse('*area $a*b*c$ total*');
    assert.strictEqual(html, '<p><em>area <span class="math">a*b*c</span> total</em></p>\n');
  });

  it('should compose emStrongMask hooks from multiple extensions', () => {
    marked.use(mathExtension, highlightExtension);
    const html = marked.parse('*x $a*b*c$ and ==p*q== done*');
    assert.strictEqual(html, '<p><em>x <span class="math">a*b*c</span> and <mark>p*q</mark> done</em></p>\n');
  });

  it('should compose emStrongMask hooks from multiple extensions in marked.use order', () => {
    marked.use(highlightExtension, mathExtension);
    const html = marked.parse('*x $a*b*c$ and ==p*q== done*');
    assert.strictEqual(html, '<p><em>x <span class="math">a*b*c</span> and <mark>p*q</mark> done</em></p>\n');
  });

  it('should throw when emStrongMask returns a string of a different length', () => {
    marked.use({
      hooks: {
        emStrongMask(src) {
          return src + 'x';
        },
      },
    });
    assert.throws(
      () => marked.parse('*text*'),
      /emStrongMask hook must return a string of the same length/,
    );
  });

  it('should reject when emStrongMask returns a string of a different length in async mode', async() => {
    marked.use({
      async: true,
      hooks: {
        emStrongMask(src) {
          return src.slice(1);
        },
      },
    });
    await assert.rejects(
      marked.parse('*text*'),
      /emStrongMask hook must return a string of the same length/,
    );
  });
});
