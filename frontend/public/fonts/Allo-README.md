# Allo 1.0.1

By Josh Puckett, based on Inter. Distributed unmodified under the
[SIL Open Font License](Allo-OFL.txt).

Source: https://allo.joshpuckett.me/downloads/Allo-1.0.1.zip
Project: https://github.com/joshpuckett/allo

The Friendly variable WOFF2 retains weights 100–900 and optical sizes 9–32,
with roundness fixed at 50. Real regular/bold oblique faces load only for italic
text. The docs use the same Friendly font and license under `docs/site/fonts`.

`frontend/src/index.css` owns the interface family through `--font-sans`.
Remove `"Allo",` from that token to preview Geist again; the existing import is
retained as a fallback. The JAS wordmark and code font keep their own tokens.
