# Horde Heroes (Kid-Friendly Horde Game)

A simple browser game for PC, tablets, and phones. No installs—just open `index.html`.

## Controls
- **Keyboard:** Arrows / WASD to move, **Space** to shoot
- **Touch:** On-screen D‑pad + Shoot button (tap anywhere in top half also shoots)
- **Buttons:** ⏸ pause, ⛶ fullscreen
- **Save:** High score is saved locally

## How to run locally
1. Open `index.html` in Chrome/Edge/Safari.
2. It loads Phaser from a CDN; internet required the first time.
3. A service worker caches files so it works offline after the first load.

## Deploy (GitHub Pages)
1. Create a public repo (e.g., `horde-heroes`).
2. Upload these files at the **root** of the repo.
3. Repo → **Settings → Pages** → Source: `main` (root) → Save.
4. Your link will be `https://<username>.github.io/horde-heroes/`

## Customize
- Open `game.js`:
  - Add heroes (search for `heroes = [...]`).
  - Add enemies or adjust speed/health in factories (`makeGrunt`, `makeRunner`, etc.).
  - Tweak difficulty via the `modes` array.
