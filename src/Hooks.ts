import { _defaults } from './defaults.ts';
import { _Lexer } from './Lexer.ts';
import { _Parser } from './Parser.ts';
import type { MarkedOptions } from './MarkedOptions.ts';
import type { Token, TokensList } from './Tokens.ts';

export class _Hooks<ParserOutput = string, RendererOutput = string> {
  options: MarkedOptions<ParserOutput, RendererOutput>;
  block?: boolean;

  constructor(options?: MarkedOptions<ParserOutput, RendererOutput>) {
    this.options = options || _defaults;
  }

  static passThroughHooks = new Set([
    'preprocess',
    'postprocess',
    'processAllTokens',
  ]);

  /**
   * Process markdown before marked
   */
  preprocess(markdown: string) {
    return markdown;
  }

  /**
   * Process HTML after marked is finished
   */
  postprocess(html: ParserOutput) {
    return html;
  }

  /**
   * Process all tokens before walk tokens
   */
  processAllTokens(tokens: Token[] | TokensList) {
    return tokens;
  }

  /**
   * Mask sections of inline text that extensions are responsible for
   * tokenizing so the em/strong scanner does not treat characters (such as
   * `*` or `_`) inside those sections as emphasis delimiters.
   *
   * The returned string must be the same length as `src`; the actual
   * tokenization continues to read the original text. Multiple hooks are
   * composed in order, each receiving the result of the previous hook.
   */
  emStrongMask(src: string) {
    return src;
  }

  /**
   * Provide function to tokenize markdown
   */
  provideLexer() {
    return this.block ? _Lexer.lex : _Lexer.lexInline;
  }

  /**
   * Provide function to parse tokens
   */
  provideParser() {
    return this.block ? _Parser.parse<ParserOutput, RendererOutput> : _Parser.parseInline<ParserOutput, RendererOutput>;
  }
}
