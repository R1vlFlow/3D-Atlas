# 3D Anatomy Atlas — Open Beta 0.8

GitHub Pages-ready anatomy atlas architecture.

## Key change in 0.8
The 3D viewer is now an independent layer. It tries to load a separated human skeleton GLB from an open-source anatomy project and falls back to the Khronos skull demo asset. The anatomy database is independent of the mesh.

## GitHub Pages
`index.html` must be at repository root.
Settings → Pages → Deploy from branch → `main` → `/ (root)`.

## Data
`data/bones.json`, `data/canals.json`, `data/questions.json`.

## Important licensing
The separated-skeleton source identified for integration is the public repository `DrMuratAltun/anatomi-simulatoru`, which documents its anatomical data as BodyParts3D → Z-Anatomy under CC BY-SA and its source code as MIT. Keep the upstream attribution and license notices when reusing the model/data.
The fallback Khronos ScatteringSkull asset is CC0.

This project does not claim ownership of third-party anatomical models. Third-party assets remain under their own licenses.

## Local development
Because this app uses ES modules and fetches JSON, serve it over HTTP rather than opening `index.html` with `file://`.
Example:
`python3 -m http.server 8000`
Then open `http://localhost:8000/`.

## GitHub Pages deployment

The repository includes `.github/workflows/deploy.yml`. Push the project to the `main` branch, then in **Settings → Pages** select **GitHub Actions** as the publishing source. The site entry point is the root `index.html`.
