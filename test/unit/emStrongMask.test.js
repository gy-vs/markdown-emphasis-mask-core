import { Marked } from '../../lib/marked.esm.js';
import { describe, it } from 'node:test';
import assert from 'node:assert';

// Minimal inline math extension: $...$
const mathExtension = {
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
};

// Masks the contents of any $...$ section so its stars/underscores are not
// paired as emphasis. Replaces each character in the section with 'a', keeping
// the returned string the same length as the input.
const mathMask = {
  emStrongMask(src) {
    return src.replace(/\$[^$]*\$/g, match => 'a'.repeat(match.length));
  },
};

// Minimal inline highlight extension: ==...==
const highlightExtension = {
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
      };
    }
  },
  renderer(token) {
    return `<mark>${token.text}</mark>`;
  },
};

const highlightMask = {
  emStrongMask(src) {
    return src.replace(/==[^=]*==/g, match => 'a'.repeat(match.length));
  },
};

describe('emStrongMask', () => {
  it('should keep math intact inside em', () => {
    const marked = new Marked({
      extensions: [mathExtension],
      hooks: mathMask,
    });

    // These two inputs are the reported failures.
    assert.strictEqual(
      marked.parse('*area $a*b*c$ total*').trim(),
      '<p><em>area <span class="math">a*b*c</span> total</em></p>',
    );
  });

  it('should keep math intact inside strong', () => {
    const marked = new Marked({
      extensions: [mathExtension],
      hooks: mathMask,
    });

    assert.strictEqual(
      marked.parse('**area $a*b*c$ total**').trim(),
      '<p><strong>area <span class="math">a*b*c</span> total</strong></p>',
    );
  });

  it('should not pair stars inside math when not inside emphasis', () => {
    const marked = new Marked({
      extensions: [mathExtension],
      hooks: mathMask,
    });

    assert.strictEqual(
      marked.parse('a $a*b*c$ b').trim(),
      '<p>a <span class="math">a*b*c</span> b</p>',
    );
  });

  it('should work with parseInline', () => {
    const marked = new Marked({
      extensions: [mathExtension],
      hooks: mathMask,
    });

    assert.strictEqual(
      marked.parseInline('*area $a*b*c$ total*'),
      '<em>area <span class="math">a*b*c</span> total</em>',
    );
  });

  it('should stack masks registered by separate extensions in marked.use order', () => {
    const marked = new Marked({ extensions: [mathExtension, highlightExtension] });
    marked.use({ hooks: mathMask });
    marked.use({ hooks: highlightMask });

    assert.strictEqual(
      marked.parse('*area $a*b*c$ and ==x*y== total*').trim(),
      '<p><em>area <span class="math">a*b*c</span> and <mark>x*y</mark> total</em></p>',
    );
  });

  it('should produce the same output in async mode as in sync mode', async() => {
    const sync = new Marked({ extensions: [mathExtension, highlightExtension] });
    sync.use({ hooks: mathMask });
    sync.use({ hooks: highlightMask });

    const asyncMarked = new Marked({
      extensions: [mathExtension, highlightExtension],
      async: true,
      walkTokens: async() => {
        await Promise.resolve();
      },
    });
    asyncMarked.use({ hooks: mathMask });
    asyncMarked.use({ hooks: highlightMask });

    const src = '*area $a*b*c$ and ==x*y== total*';

    const promise = asyncMarked.parse(src);
    assert.ok(promise instanceof Promise);
    assert.strictEqual(await promise, sync.parse(src));
  });

  it('should throw when the returned string has a different length', () => {
    const marked = new Marked({
      hooks: {
        emStrongMask(src) {
          return src.replace(/\$[^$]*\$/g, '');
        },
      },
    });

    assert.throws(
      () => marked.parse('*a $b$ c*'),
      /emStrongMask hook must return a string of the same length as the input \(input length: 9, returned length: 6\)\./,
    );
  });

  it('should reject when the hook returns a Promise in async mode', async() => {
    const marked = new Marked({
      async: true,
      hooks: {
        async emStrongMask(src) {
          await Promise.resolve();
          return src;
        },
      },
    });

    await assert.rejects(
      () => marked.parse('*a*'),
      /emStrongMask hook must synchronously return a string, even when the async option is true\./,
    );
  });

  it('should not change output when no hook is registered', () => {
    const marked = new Marked({ extensions: [mathExtension] });

    assert.strictEqual(
      marked.parse('*text*').trim(),
      '<p><em>text</em></p>',
    );
  });
});
