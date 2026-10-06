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
   * Mask sections of inline text (e.g. inline math) that are managed by an
   * extension, so emphasis and strong delimiters inside them are not matched.
   * The returned string is only used to determine emphasis boundaries and must
   * have the same length as the string passed in; the original text is still
   * tokenized and rendered.
   */
  emStrongMask(text: string) {
    return text;
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
