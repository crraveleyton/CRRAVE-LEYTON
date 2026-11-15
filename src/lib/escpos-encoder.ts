
export class EscPosEncoder {
  private buffer: Uint8Array = new Uint8Array(0);

  /**
   * Sanitizes string data to ensure only clean single-byte PC850 / ASCII characters
   * are sent to the thermal printer. Prevents multi-byte UTF-8 sequences from corrupting
   * the printer's printhead position and causing character overlapping or text sticking.
   */
  private append(data: string | Uint8Array) {
    let newData: Uint8Array;
    if (typeof data === 'string') {
      const bytes: number[] = [];
      // Normalize Unicode (e.g. accented characters decomposed into base + diacritic)
      const normalized = data.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      for (let i = 0; i < normalized.length; i++) {
        const char = normalized[i];
        const code = normalized.charCodeAt(i);

        // Explicit single-byte mappings
        if (char === '£') {
          bytes.push(0x9C); // PC850 Pound Sterling symbol
        } else if (char === '•' || char === '·' || char === '●') {
          bytes.push(0x2D); // Convert bullet to '-'
        } else if (char === '‘' || char === '’' || char === '‚' || char === '‛' || char === '`') {
          bytes.push(0x27); // Standard single quote
        } else if (char === '“' || char === '”' || char === '„' || char === '‟') {
          bytes.push(0x22); // Standard double quote
        } else if (char === '–' || char === '—' || char === '―') {
          bytes.push(0x2D); // Hyphen
        } else if (char === '\u00A0') {
          bytes.push(0x20); // Non-breaking space to regular space
        } else if (char === '…') {
          bytes.push(0x2E, 0x2E, 0x2E); // '...'
        } else if (code < 128) {
          bytes.push(code); // Standard ASCII
        } else if (code >= 160 && code <= 255) {
          // Direct ISO-8859-1 / standard single-byte range, fallback to '?' if outside ASCII
          bytes.push(code < 128 ? code : 0x3F);
        } else {
          // Any unmapped high-unicode character: safe fallback to ASCII space or dash
          bytes.push(0x20);
        }
      }
      newData = new Uint8Array(bytes);
    } else {
      newData = data;
    }

    const combined = new Uint8Array(this.buffer.length + newData.length);
    combined.set(this.buffer);
    combined.set(newData, this.buffer.length);
    this.buffer = combined;
  }

  /**
   * Initializes printer with ESC @, selects Font A (12x24), PC850 code page,
   * standard line spacing (1/6 inch = ~30 dots), and zero extra char spacing.
   */
  initialize() {
    this.append(new Uint8Array([
      0x1B, 0x40,       // ESC @ : Initialize printer
      0x1B, 0x4D, 0x00, // ESC M 0 : Select Font A (standard 12x24 font)
      0x1B, 0x74, 0x02, // ESC t 2 : Select PC850 character table (Multilingual)
      0x1B, 0x32,       // ESC 2 : Set default 1/6 inch line spacing
      0x1B, 0x20, 0x00, // ESC SP 0 : Character spacing 0 dots
      0x1D, 0x21, 0x00, // GS ! 0 : Normal character size
      0x1B, 0x45, 0x00, // ESC E 0 : Bold off
      0x1B, 0x61, 0x00, // ESC a 0 : Left align
    ]));
    return this;
  }

  /**
   * Resets formatting (font size, bold mode, alignment, line spacing)
   * to prevent carry-over between sections.
   */
  reset() {
    this.append(new Uint8Array([
      0x1B, 0x4D, 0x00, // Font A
      0x1D, 0x21, 0x00, // Normal size (1x1)
      0x1B, 0x45, 0x00, // Bold off
      0x1B, 0x2D, 0x00, // Underline off
      0x1B, 0x35,       // Italic off (ESC 5)
      0x1D, 0x42, 0x00, // Invert off
      0x1B, 0x61, 0x00, // Left align
      0x1B, 0x32,       // Default line spacing (ESC 2)
      0x1B, 0x20, 0x00, // Default char spacing (ESC SP 0)
    ]));
    return this;
  }

  /**
   * Selects Font A (12x24 dots) or Font B (9x17 dots). Font A is standard for 80mm.
   */
  font(type: 'A' | 'B') {
    this.append(new Uint8Array([0x1B, 0x4D, type === 'A' ? 0x00 : 0x01]));
    return this;
  }

  bold(on: boolean) {
    this.append(new Uint8Array([0x1B, 0x45, on ? 0x01 : 0x00]));
    return this;
  }

  italic(on: boolean) {
    this.append(new Uint8Array([0x1B, on ? 0x34 : 0x35]));
    return this;
  }

  underline(on: boolean) {
    this.append(new Uint8Array([0x1B, 0x2D, on ? 0x01 : 0x00]));
    return this;
  }

  invert(on: boolean) {
    this.append(new Uint8Array([0x1D, 0x42, on ? 0x01 : 0x00]));
    return this;
  }

  align(pos: 'left' | 'center' | 'right') {
    const val = pos === 'left' ? 0x00 : pos === 'center' ? 0x01 : 0x02;
    this.append(new Uint8Array([0x1B, 0x61, val]));
    return this;
  }

  /**
   * Sets character size multiplier:
   * width: 1 to 4 (1 = normal)
   * height: 1 to 4 (1 = normal, 2 = double height)
   * Automatically adjusts vertical line spacing when double height is active
   * so characters don't collide with adjacent lines.
   */
  size(width: number, height: number) {
    const clampedW = Math.max(1, Math.min(4, width));
    const clampedH = Math.max(1, Math.min(4, height));
    const n = ((clampedW - 1) << 4) | (clampedH - 1);
    this.append(new Uint8Array([0x1D, 0x21, n]));

    // Adjust line spacing for double/multi-height characters
    if (clampedH >= 2) {
      // ESC 3 n: set line spacing to 54 dots (~1.8x default line height)
      this.append(new Uint8Array([0x1B, 0x33, 56]));
    } else {
      // ESC 2: restore default 1/6-inch line spacing (~30-33 dots)
      this.append(new Uint8Array([0x1B, 0x32]));
    }
    return this;
  }

  /**
   * Sets line spacing:
   * dots undefined: default 1/6 inch (ESC 2)
   * dots number: ESC 3 n dots
   */
  lineSpacing(dots?: number) {
    if (dots === undefined) {
      this.append(new Uint8Array([0x1B, 0x32]));
    } else {
      this.append(new Uint8Array([0x1B, 0x33, Math.max(0, Math.min(255, dots))]));
    }
    return this;
  }

  /**
   * Sets right-side character spacing in dots (ESC SP n).
   */
  charSpacing(dots: number = 0) {
    this.append(new Uint8Array([0x1B, 0x20, Math.max(0, Math.min(32, dots))]));
    return this;
  }

  currency(amount: number) {
    this.append('£' + amount.toFixed(2));
    return this;
  }

  line(text: string = '') {
    this.append(text + '\n');
    return this;
  }

  text(text: string) {
    this.append(text);
    return this;
  }

  hr(char: string = '-', width: number = 48) {
    this.append(char.repeat(width) + '\n');
    return this;
  }

  feed(n: number = 1) {
    const count = Math.max(1, Math.min(20, n));
    this.append(new Uint8Array([0x1B, 0x64, count]));
    return this;
  }

  cut() {
    // GS V 66 0 - Feed paper and cut (partial cut with feed)
    this.append(new Uint8Array([0x1D, 0x56, 0x42, 0x00]));
    return this;
  }

  encode() {
    return this.buffer;
  }
}
