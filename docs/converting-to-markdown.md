# Converting T++ (QTF) to Markdown

## What would be lost converting from QTF source

### Inline syntax coloring
QTF embeds per-token colors in code via `@(R.G.B)` codes (e.g., `@(0.0.255)` for operators, `@(0.128.128)` for types). Markdown has no equivalent — code blocks are monochrome until a syntax highlighter (Shiki) runs at render time. The original QTF preserves the U++ documentation team's *intentional* color choices per token.

### Paragraph-level formatting codes
QTF's `[s7;C@(0.0.255) text]` encodes font family, size, bold, italic, underline, strikeout, color, and alignment *per paragraph*. Markdown only has headings (`#`), bold (`**`), italic (`*`), and code blocks. You'd lose:
- Custom left margins (code indentation via `l320`/`l321`)
- Inline font size overrides
- Mixed font families within a paragraph
- Center alignment on individual paragraphs
- Horizontal rules tied to heading styles

### Tables with colored cells
QTF tables use `@(R.G.B)` background colors and per-cell formatting. Markdown tables are plain text only.

### Labels and section numbering
QTF paragraphs carry numeric labels (`;14.1`) used for anchor links and auto-numbering headings. Markdown has no built-in equivalent.

### Embedded images
QTF uses `@@image:...` with inline binary data. Markdown uses `![](url)` which requires external files.

### Bullet list sub-indentation
QTF controls exact pixel margins for nested bullets. Markdown's indentation is renderer-dependent.

### Superscript/subscript
QTF supports these natively. Markdown requires HTML tags or extensions.

### Links with custom display text and topic:// protocol
QTF's `[^topic://path^ Display Text]` links to other .tpp files. Markdown links are just URLs.

## Converting from rendered HTML would be simpler

Converting from the **current internal HTML** (output of `parseQtfContent`) is more feasible because the HTML already has structure. You'd lose:
- Per-token code coloring (would need Shiki re-highlighting in markdown renderer)
- Exact pixel margins (markdown renderers don't support this)
- Table cell background colors
- Anchor/label mapping (would need manual `#id` attributes)
- topic:// link protocol (would need URL rewriting)

## What would survive

- Headings (class C/F/G -> `#`/`##`/`###`)
- Bold text
- Italic text
- Code blocks (class M -> fenced code blocks)
- Bullet lists (basic `-` / `*`)
- Links (if rewritten to standard URLs)
- Tables (basic pipe syntax, no colors)
- Horizontal rules

## Bottom line

Converting from QTF source: you lose fine-grained formatting and per-token code coloring. Converting from rendered HTML: you lose styling precision but keep structure. Either way, the documents would need manual cleanup. The biggest loss is the intentional per-token color annotations in code blocks — those are hand-crafted by the U++ team and would need to be re-done with syntax highlighter config or lost entirely.
