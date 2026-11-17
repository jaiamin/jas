# Allo 1.0.1

By Josh Puckett, based on Inter. Distributed under the
[SIL Open Font License](Allo-OFL.txt).

Source: https://allo.joshpuckett.me/downloads/Allo-1.0.1.zip
Project: https://github.com/joshpuckett/allo

The Friendly variable WOFF2 retains weights 100–900 and optical sizes 9–32,
with roundness fixed at 50. Real regular/bold oblique faces load only for italic
text. The docs use the same Friendly font and license under `docs/site/fonts`.
These interface fonts are unmodified upstream assets.

`allo-playful-jas-800-1.0.1.woff2` is a derived `jas` subset of Allo Variable,
renamed Allo Playful JAS: weight 800, optical size 22 and roundness 100. It retains
kerning and the single-story `a` alternate (`ss01`). The wordmark uses upright
letters without extra gaps or vertical offsets. The same OFL applies.

`frontend/src/index.css` owns the interface family through `--font-sans`.
Remove `"Allo",` from that token to preview Geist again; the existing import is
retained as a fallback. The JAS wordmark and code font keep their own tokens.
