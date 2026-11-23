# MyMuse local fonts

These four OFL-licensed families replace the build-time `next/font/google`
download with `next/font/local`. Export names, CSS variables, normal styles,
display mode and the existing weight ranges are retained.

`manifest.json` records immutable upstream URLs, upstream and bundled SHA-256
hashes, versions, axes, copyright/license files and the preparation steps.
The versions were checked against the font files published by MyMuse on
2026-11-23. This is a build reliability change, not a font redesign.

- Inter 4.001: variable weights 100–900, optical size fixed at 14 as in the
  published Google Fonts face. The upstream Inter OFL does not declare a
  Reserved Font Name.
- Unbounded 1.701: existing CSS weights 400–900.
- Playfair Display 1.203: existing CSS weights 400–700.
- Space Grotesk 2.000: existing CSS weights 400–700. This family does not
  contain Cyrillic; the existing font stack continues to provide that fallback.

Full glyph coverage and OpenType layout/metadata are retained. In particular,
Inter, Unbounded and Playfair Display include Cyrillic. The local files total
652,244 bytes; unlike the previous subset downloads, each family is a single
WOFF2 file. No font conversion or download happens during an application build.

To reproduce the assets, use Python with `fonttools[woff]==4.63.0`, download
each `sourceUrl` from the manifest and verify `sourceSha256`. Open with
`TTFont(io.BytesIO(source), recalcTimestamp=False)`. For Inter only, use
`instantiateVariableFont(font, {'opsz': 14}, inplace=False, optimize=True)`.
Then set `font.flavor = 'woff2'` and save to the manifest filename. Do not
subset, rename, strip metadata or replace the source with another font version.
Keep the original family-specific OFL text with the distributed files.

WOFF2 compression preserves the font data and metadata, except for the
explicit Inter optical-axis instantiation. This follows the OFL's webfont
guidance: https://openfontlicense.org/ofl-faq/#22-can-i-make-and-use-woff-web-open-font-format-versions-of-ofl-fonts
