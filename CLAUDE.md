## Projektstruktur och Deployment

### Webbplatsen är uppbyggd så här:
- **Landing page**: `index.html` i root → https://ximonse.github.io/
  - Listar alla tre appar (Spatial View, Spatial Notes v2, Spatial Notes legacy)

- **Spatial View app**: `spatial-view/` → https://ximonse.github.io/spatial-view/
  - Källkod: `spatial-view/src/`
  - Byggd version serveras direkt från `spatial-view/index.html` och `spatial-view/assets/`
  - **Viktigt**: Måste byggas med Vite (`npm run build`) innan push till GitHub
  - Se `spatial-view/BUILD.md` för detaljerad build-process
  - Se `spatial-view/ARCHITECTURE.md` för kodstruktur
  - Se `spatial-view/FEATURES.md` för funktionalitet

### GitHub Pages deployment:
- Repository source code (master branch) = samma som lokal kod
- Publicerad webbplats serveras från committade filer (inte från dist/)
- Spatial View måste rebuilddas när källkod ändras

## Övriga instruktioner
- när ett nytt kortkommando eller funktion görs, lägg till den till command-palett