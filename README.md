# HLS Video Streaming Player

Frontend project implementing a custom video streaming player using HLS.js, custom controls, and a CDN-hosted HLS manifest. This repository was built to satisfy a production-style assignment (HLS, adaptive bitrate, CDN, custom UI, Dockerized deployment).

---

## Features

- HLS streaming via **hls.js** attached to a standard HTML5 `<video>` element
- Custom player UI (no third‑party player UI libraries)
- Manual quality selection (per rendition) and automatic adaptive bitrate mode
- Current bitrate and resolution display
- Custom controls with `data-testid` attributes for automated tests:
  - `play-pause-button`
  - `progress-bar`
  - `volume-slider`
  - `mute-button`
  - `quality-selector`
  - `playback-speed-selector`
  - `fullscreen-button`
  - `current-bitrate-display`
- Watch progress persistence in `localStorage` (`video-progress`)
- Completion flag when >95% watched (`video-completed`)
- Keyboard shortcuts for accessibility (Space, M, Arrow keys, F)
- Fully containerized static site served by nginx with Docker & Docker Compose

---

## Project Structure

- `index.html` – main page with `<video>` element and custom controls
- `styles.css` – player layout and visual styling
- `config.js` – configuration for the HLS master manifest URL (CDN)
- `player.js` – player logic, hls.js integration, controls, persistence, keyboard shortcuts
- `transcoding.md` – FFmpeg commands and explanations for generating HLS renditions
- `Dockerfile` – nginx-based image serving the static site
- `docker-compose.yml` – runs the `web` service, exposes port 8080, with healthcheck
- `README.md` – this file

---

## HLS Manifest Configuration

The player reads the master HLS manifest URL from `window.HLS_CONFIG.manifestUrl` defined in `config.js`.

```js
// config.js
window.HLS_CONFIG = {
  manifestUrl: "https://res.cloudinary.com/demo/video/upload/sp_hd/master.m3u8",
};
```

This URL points to a **public Cloudinary demo** HLS stream hosted on the `res.cloudinary.com` CDN domain. You do **not** need your own Cloudinary account to run the project with this demo URL.

If you later generate and host your own HLS output (for example on Cloudinary or a Cloudflare‑proxied origin), simply replace the `manifestUrl` value with your own `master.m3u8` URL.

---

## Running with Docker (Recommended for Assignment)

Prerequisites:

- Docker Desktop (or compatible Docker engine)

Steps:

1. Open a terminal in the project root (where `docker-compose.yml` is):

   ```bash
   cd path/to/project
   docker-compose up --build
   ```

2. Once the build completes you should see nginx start. The `web` service exposes:

   - HTTP on `http://localhost:8080`

3. Open your browser and visit:

   - `http://localhost:8080`

4. Use the video player:

   - Play / Pause, scrub bar, volume & mute
   - Quality dropdown (Auto or fixed renditions, when available)
   - Playback speed selector
   - Fullscreen toggle

The `docker-compose.yml` file also defines a **healthcheck** using `curl` against `http://localhost` inside the container.

---

## Running Without Docker

You can also run the static site with any simple HTTP server.

### Option 1 – VS Code Live Server

1. Open the folder in VS Code.
2. Install the **Live Server** extension.
3. Right‑click `index.html` → **Open with Live Server**.
4. Your browser will open (e.g., `http://127.0.0.1:5500/...`).

### Option 2 – Python Built‑in Server

1. Ensure Python 3 is installed.
2. From the project root run:

   ```bash
   python -m http.server 8000
   ```

3. Open `http://localhost:8000` in your browser and navigate to `index.html`.

> Avoid opening `index.html` directly with `file:///...` (double‑clicking in the file explorer), because HLS and CORS can behave differently when not served over HTTP.

---

## Controls & Keyboard Shortcuts

### On‑Screen Controls

- **Play / Pause** – toggles video playback (`play-pause-button`)
- **Progress bar** – seek within the video (`progress-bar`)
- **Volume slider** – set `video.volume` between 0.0 and 1.0 (`volume-slider`)
- **Mute button** – toggles `video.muted` (`mute-button`)
- **Quality selector** – populated from `hls.levels`; selects a specific level or Auto (`quality-selector`)
- **Playback speed** – sets `video.playbackRate` (0.5x – 2x) (`playback-speed-selector`)
- **Fullscreen** – toggles fullscreen on the player container (`fullscreen-button`)
- **Current bitrate display** – shows active bitrate & resolution (`current-bitrate-display`)

### Keyboard Shortcuts

- **Space** – Play / Pause
- **M** – Mute / Unmute
- **→** – Seek forward 5 seconds
- **←** – Seek backward 5 seconds
- **↑** – Volume up
- **↓** – Volume down
- **F** – Toggle fullscreen

---

## Watch Progress & Completion Logic

Implemented in `player.js`:

- On `timeupdate`, the player periodically writes the current playback position to:

  - `localStorage["video-progress"]`

- On page load, the player reads `video-progress` and, once the metadata and duration are known, seeks back to that time.
- When the user has watched **more than 95%** of the video (`currentTime / duration >= 0.95`), the player sets:

  - `localStorage["video-completed"] = "true"`

These behaviors are designed to satisfy automated tests for persistence and completion.

---

## FFmpeg Transcoding (Offline Preparation)

The actual transcoding of a high‑quality source video into multiple HLS renditions is documented in `transcoding.md`.

That file contains:

- Exact `ffmpeg` commands used to generate:
  - 360p, 480p, 720p, 1080p renditions
  - Individual `.m3u8` playlists for each rendition
  - A master `master.m3u8` playlist that references all renditions
- Short explanations of key flags: `-vf scale`, `-b:v`, `-maxrate`, `-bufsize`, `-g`, `-hls_time`, `-hls_segment_filename`, and the master playlist entries.

You can run those commands locally to produce your own HLS output and upload it to a CDN, then update the manifest URL in `config.js`.

---

## Assignment Requirements Mapping

This section ties the implementation back to the key assignment requirements:

1. **Containerized with Docker + Compose**  
   Implemented via `Dockerfile` (nginx) and `docker-compose.yml` (`web` service, port `8080`, healthcheck).

2. **`transcoding.md` present with FFmpeg commands**  
   `transcoding.md` exists at the repo root and contains the exact commands plus flag explanations.

3. **HLS assets served from a CDN**  
   `config.js` points to `https://res.cloudinary.com/.../master.m3u8`, which is hosted on Cloudinary's CDN domain.

4. **Custom player UI with specific `data-testid`s**  
   Implemented in `index.html` and wired up in `player.js`.

5. **Manual quality override + bitrate display**  
   `player.js` uses `hls.levels` to populate `quality-selector` and sets `hls.currentLevel` based on user choice; `current-bitrate-display` shows bitrate and resolution.

6. **Watch progress persistence**  
   `video-progress` stored in `localStorage` and restored on load.

7. **Completion flag when >95% watched**  
   `video-completed` stored in `localStorage` when the user crosses the 95% threshold.

8. **Keyboard accessibility shortcuts**  
   `player.js` listens to `keydown` and implements Space, M, arrow keys, and F.

---

## Troubleshooting

- **Video does not load / CORS errors**  
  Ensure you are serving the app over `http://` (via Docker, Live Server, or another HTTP server), not `file:///`.

- **No quality options appear**  
  This can occur if the manifest URL is invalid or returns an error. Check the browser console network tab for the `master.m3u8` request.

- **LocalStorage keys missing**  
  Play the video for at least a few seconds so the `timeupdate` handler runs and writes `video-progress`. Watch past 95% to see `video-completed`.
