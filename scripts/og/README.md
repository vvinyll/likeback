Generate the 1200×630 social preview from any working directory:

```sh
npm ci --prefix scripts/og
npm run generate --prefix scripts/og
```

`generate.mjs` renders its SVG directly to `public/og.png` using resvg.
It loads only the bundled Noto Sans JP fonts; no system fonts are required.

The fonts are static 400/800 weight subsets of Google Fonts' Noto Sans JP,
containing the characters used in this image. Source:
https://github.com/google/fonts/tree/main/ofl/notosansjp
The SIL Open Font License is included in `fonts/OFL.txt`.
If changing the copy to use new characters, replace or expand the subsets.
