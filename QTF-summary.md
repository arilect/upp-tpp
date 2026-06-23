# QTF (Quixotic Text Format)

**QTF** is the lightweight rich text markup language used throughout the Ultimate++ framework. It is used for:

- `RichText`
- `RichEdit`
- `DocEdit`
- Reports
- Help (`.tpp` topics)
- Printing
- PDF generation

It is **not** Markdown or HTML. It has its own compact syntax optimized for C++ strings.

---

## Basic Formatting

| Feature     | QTF                 |
| ----------- | ------------------- |
| Bold        | `[* bold]`          |
| Italic      | `[/ italic]`        |
| Underline   | `[_ underline]`     |
| Strikeout   | `[- strikeout]`     |
| Superscript | ``[` superscript]`` |
| Subscript   | `[, subscript]`     |

**Example:**

```qtf
Normal text.

[*Bold]

[/Italic]

[_Underline]

[-Strikeout]

[* [/Bold Italic]]
```

---

## Headings

```qtf
[s0; Heading]
[s1; Heading 2]
[s2; Heading 3]
```

or using paragraph styles defined in the document.

---

## Paragraphs

Paragraphs end with newline.

```qtf
First paragraph.

Second paragraph.
```

---

## Colors

**Foreground:**

```qtf
@R Red
@G Green
@B Blue
```

**Custom color:**

```qtf
@(255.0.0) Red
```

**Background:**

```qtf
$Y Yellow background
```

---

## Fonts

```qtf
[A Arial]
[R Roman]
[C Courier]
```

**Font size:**

```qtf
+100
```

or

```qtf
{font size}
```

depending on context.

---

## Links

```qtf
[^https://example.com^ Example]
```

or help-topic links:

```qtf
[^topic://package/topic^Open topic]
```

---

## Tables

Tables are a major QTF feature.

**Example:**

```qtf
{{1000:1000
:: Name::Age
:: John::25
:: Alice::30
}}
```

Columns are separated by `::`.

---

## Images

Embedded objects:

```qtf
{{image:MyImage}}
```

or

```qtf
{{IMG ...}}
```

depending on object type.

---

## Character Escaping

Special characters:

```
[
]
{
}
@
$
^
```

are escaped with backtick:

```qtf
`[
`]
`@
```

---

## Raw Formatting Block

Formatting applies inside brackets.

```qtf
[* this is bold]
```

**Nested:**

```qtf
[* bold [/italic]]
```

---

## Bullets

```qtf
- first
- second
```

or paragraph styles for lists.

---

## Tabs

```qtf
-|\n
```

creates a tab.

---

## New Line

Inside formatted text:

```qtf
&
```

or paragraph break depending on context.

---

## Common Inline Modifiers

| Modifier | Meaning          |
| -------- | ---------------- |
| `*`      | Bold             |
| `/`      | Italic           |
| `_`      | Underline        |
| `-`      | Strikeout        |
| `^`      | Link             |
| `@`      | Text color       |
| `$`      | Background color |
| `A`      | Font             |
| `+`      | Font size        |
| `` ` ``  | Escape           |

---

## Example

```qtf
[s0;=* Ultimate++]

This is normal text.

[*Bold]

[/Italic]

[_Underline]

[^https://ultimatepp.org^Visit Ultimate++]

{{1000:1000
::Name::Language
::Ultimate++::C++
::Qt::C++
}}
```

---

## Advanced Features

QTF is considerably richer than this summary. It supports:

- Paragraph styles (`s0`, `s1`, etc.)
- Margins, spacing, alignment, tab stops
- Numbering and outline levels
- Headers/footers
- Frames
- Embedded objects
- Fields
- Indexes
- Labels
- Page breaks
- Floating tables
- Custom styles
- HTML import/export (limited)

---

## Authoritative Reference

For developers working with `.tpp` help topics, the most authoritative reference is the built-in **QTF reference topic** (`https://www.ultimatepp.org/srcdoc$RichText$QTF$en-us.html`), which documents the full grammar, paragraph attributes, character formatting codes, tables, objects, fields, and style system in detail.

The U++ website generator (`uppbox/uppweb`) uses its own QTF→HTML pipeline (`EncodeHtml.cpp`, `Htmls.cpp`) to produce the documentation at [ultimatepp.org](https://ultimatepp.org).

## Complete QTF Grammar Reference

### Basic Syntax

QTF is a bracket-based markup language where paragraphs are enclosed in `[...]` and formatting codes appear within brackets.

### Paragraph Format

A paragraph follows this pattern:
```
[format_codes content&]
```

**Format codes** (before the first space):
- `sN` - Style reference (N = 0-9, refers to a named style defined elsewhere)
- `H`N` - Horizontal ruler height (N = 0-9, 0 = no ruler)
- `h`C` - Ruler color (C = 0-9, color code)
- `L`N` - Ruler style (0 = solid, 1 = dots, 2 = dashes)
- `b`N` - Space before (N = dots)
- `a`N` - Space after (N = dots)
- `i`N` - Indent (N = dots)
- `l`N` - Left margin (N = dots)
- `r`N` - Right margin (N = dots)
- `O` - Bullet (0 = bullet, 1 = bullet, 2 = bullet, 3 = bullet, 9 = →)
- `k` - Keep with next paragraph
- `:` - Label start (followed by label name, ends with `:`)
- `<` - Left align
- `=` - Center align
- `>` - Right align
- `#` - Justify align

**Content** (after the first space):
- Regular text
- Inline formatting: `[* bold]`, `[/ italic]`, `[_ underline]`, `[- strikeout]`, ``[` superscript]``, `[, subscript]`
- Links: `[^url^ text]` or `[^topic://...^ text]`
- Images: `@@image:W&H` or `@@rawimage:W&H`
- Tables: `{{width:width ... :: cell :: cell ...}}`
- Special characters: `` `[ `` , `` `] `` , `` `{ `` , `` `} `` , `` `@ `` , `` `$ `` , `` `^ ``

### Character Formatting

**Bold:** `[* text]`
**Italic:** `[/ text]`
**Underline:** `[_ text]`
**Strikeout:** `[- text]`
**Superscript:** `` [` text]``
**Subscript:** `[, text]`

**Color codes:**
- Foreground: `@R`, `@G`, `@B`, `@(255.0.0)`, `@(128.0.255)`
- Background: `$R`, `$G`, `$B`, `$(255.0.0)`, `$@(128.0.255)`

**Font:**
- Font family: `[A]`, `[R]`, `[C]`, `[G]`
- Font size: `+N` (N = 0-9, 0 = 6pt, 1 = 8pt, ..., 9 = 48pt)

### Special Characters

```
[  ->  &nbsp;
]  ->  &gt;
{  ->  &lt;
}  ->  &gt;
@  ->  &amp;
$  ->  &dollar;
^  ->  &circ;
`  ->  escape
```

### Tabs and Newlines

**Tab:** `-|` (dash pipe)
**Newline in formatted text:** `&`
**Paragraph break:** `&` (outside formatting)

### Style Definitions

Styles are defined with `$$`:
```
[format_codes $$N,uuid:name]
```

Example:
```
[b83;*+117 $$6,6#...:subtitle]
```

### Horizontal Ruler

A ruler is created with `H` followed by a number:
```
[H4; ...]  // Ruler height 4 dots
```

### Tables

```
{{col1:col2:col3
:: cell1::cell2::cell3
:: cell4::cell5::cell6
}}
```\n
### Images

**Base64 images:**
```
{{image:W&H(base64data)}}
```

**Binary images (7→8 encoding):**
```
{{image:W&H}}
```

### Fields

```
[:field_name:]
```

### Index Entries

```
[;index_name]
```

### Page Breaks

```
[P]
```

### Code Blocks

```
[l320; code line 1
l320; code line 2
]
```

### Raw Binary Images

```
{{image:W&H}}
```

Where W and H are width and height in dots. The image data follows
in 7→8 encoded format (see U++ Image.cpp for details).

### Important Notes

1. **Escape character**: `` ` `` escapes special characters `[`, `]`, `{`, `}`, `@`, `$`, `^`
2. **Backtick handling**: `` ` `` also used for superscript/subscript
3. **Tab character**: `-|` creates a tab character with tab-size: 4 CSS
4. **Newline handling**: `&` creates newline in formatted text
5. **Paragraph continuation**: Multiple paragraphs can be combined with `&`
6. **Style inheritance**: Paragraphs can reference styles with `sN`
7. **Mixed formatting**: Inline formatting can be combined within paragraphs

### Complete Character Set

**Format codes:**
- `[` - paragraph start
- `]` - paragraph end
- `{` - raw formatting block start
- `}` - raw formatting block end
- `(` - color parentheses
- `)` - color parentheses end
- `*` - bold
- `/` - italic
- `_` - underline
- `-` - strikeout
- `^` - link
- `@` - foreground color
- `$` - background color
- `A` - font family
- `+` - font size
- `s` - style reference
- `H` - horizontal ruler
- `L` - ruler style
- `b` - space before
- `a` - space after
- `i` - indent
- `l` - left margin
- `r` - right margin
- `O` - bullet
- `k` - keep
- `:` - label
- `<` - align left
- `=` - align center

**Special characters:**
- `[` - escaped as `` `[ ``
- `]` - escaped as `` `] ``
- `{` - escaped as `` `{ ``
- `}` - escaped as `` `} ``
- `@` - escaped as `` `@ ``
- `$` - escaped as `` `$ ``
- `^` - escaped as `` `^ ``

### Examples

**Simple paragraph:**
```
[s0; This is normal text.]
```

**Bold text:**
```
[* Bold text]
```

**Italic text:**
```
[/ Italic text]
```

**Link:**
```
[^https://example.com^ Example link]
```

**Table:**
```
{{1000:1000
:: Name::Age
:: John::25
:: Alice::30
}}
```

**Image:**
```
{{image:100&100(base64data)}}
```

**Formatted text:**
```
[* Bold] and [/italic] and [_underline]
```

**Nested formatting:**
```
[* bold [/italic]]
```

**Tab:**
```
[tab; &]
```

**New line in formatted text:**
```
[*- This is bold
and continues on the next line]
```

**Code block:**
```
[l320; code line 1
l320; code line 2
]
```

**Horizontal ruler:**
```
[H4; This paragraph has a ruler above it]
```

**Style reference:**
```
[s3; This paragraph uses style 3]
```

**Label:**
```
[:my_label: This paragraph has an ID]
```

**Alignment:**
```
[<; Center aligned
=>; Right aligned
#; Justified aligned
```

**Mixed formatting:**
```
[*Bold] [/Italic] [_Underline] and normal text
```

**Color:**
```
@R Red text
$Y Yellow background
```

**Font size:**
```
+3; Large text
```

**Font family:**
```
[A; Arial font
[R; Times New Roman
[C; Courier
```

**Table with formatting:**
```
{{100:100
:: Name::Age::City
:: John::25::New York
:: Alice::30::London
}}
```

**Image with formatting:**
```
{{image:100&100(base64data) @R border}}
```

**Hyperlink:**
```
[^topic://package/topic^ Navigate to topic]
```

**Field:**
```
[:field_name:]
```

**Index entry:**
```
[;index_name]
```

**Page break:**
```
[P]
```

**Code block with Courier font:**
```
[s7; code block with Courier font]
```

**Formatted with superscript:**
```
[2; x`2]
```

**Formatted with subscript:**
```
[2; y`,z]
```

**Multiple paragraphs:**
```
[s0; First paragraph.

[s0; Second paragraph.

[s0; Third paragraph.]
```

**Complex example:**
```
[s0;=* Ultimate++ Framework

This is a **bold** and *italic* formatted paragraph with a
[/italic] link [^https://ultimatepp.org^to Ultimate++] and a table:

{{100:100
::Name::Age::City
::John::25::New York
::Alice::30::London
}}

And a code block:

[l320; int main() {
    return 0;
}]
```

This reference covers most if not all QTF syntax elements and provides examples for common use cases.