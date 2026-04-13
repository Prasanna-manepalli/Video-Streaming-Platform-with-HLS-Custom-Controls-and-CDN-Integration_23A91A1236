// Global constants
const PROGRESS_KEY = "video-progress";
const COMPLETED_KEY = "video-completed";
const PROGRESS_SAVE_INTERVAL = 2000; // ms

const video = document.getElementById("video-player");
const videoContainer = document.getElementById("video-container");

const playPauseButton = document.getElementById("play-pause-button");
const progressBar = document.getElementById("progress-bar");
const volumeSlider = document.getElementById("volume-slider");
const muteButton = document.getElementById("mute-button");
const qualitySelector = document.getElementById("quality-selector");
const playbackSpeedSelector = document.getElementById(
  "playback-speed-selector"
);
const fullscreenButton = document.getElementById("fullscreen-button");
const bitrateDisplay = document.getElementById("current-bitrate-display");

let hlsInstance = null;
let lastProgressSaveTime = 0;

function initPlayer() {
  const manifestUrl = window.HLS_CONFIG && window.HLS_CONFIG.manifestUrl;
  if (!manifestUrl) {
    bitrateDisplay.textContent = "Bitrate: manifest URL missing";
    bitrateDisplay.classList.add("bitrate-display--error");
    return;
  }

  if (window.Hls && window.Hls.isSupported()) {
    const hls = new window.Hls({
      enableWorker: true,
    });
    hls.loadSource(manifestUrl);
    hls.attachMedia(video);

    hls.on(window.Hls.Events.MANIFEST_PARSED, (_, data) => {
      hlsInstance = hls;
      setupQualityLevels(data.levels || []);
      restoreProgress();
      video.play().catch(() => {
        // Autoplay might be blocked; ignore.
      });
    });

    hls.on(window.Hls.Events.LEVEL_SWITCHED, (_, data) => {
      updateBitrateDisplay(hls.levels[data.level]);
    });

    hls.on(window.Hls.Events.LEVEL_UPDATED, (_, data) => {
      const level = hls.levels[data.level];
      updateBitrateDisplay(level);
    });

    hls.on(window.Hls.Events.ERROR, (_, data) => {
      if (data && data.fatal) {
        bitrateDisplay.classList.add("bitrate-display--error");
      }
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = manifestUrl;
    video.addEventListener("loadedmetadata", () => {
      restoreProgress();
      video.play().catch(() => {});
    });
  } else {
    bitrateDisplay.textContent = "Bitrate: HLS not supported";
    bitrateDisplay.classList.add("bitrate-display--error");
  }

  wireControls();
}

function wireControls() {
  // Play / pause
  playPauseButton.addEventListener("click", togglePlayPause);
  video.addEventListener("play", updatePlayPauseLabel);
  video.addEventListener("pause", updatePlayPauseLabel);

  // Progress bar
  video.addEventListener("timeupdate", onTimeUpdate);
  video.addEventListener("durationchange", onTimeUpdate);
  progressBar.addEventListener("input", onSeek);

  // Volume & mute
  volumeSlider.addEventListener("input", () => {
    video.volume = parseFloat(volumeSlider.value);
    if (video.volume === 0) {
      video.muted = true;
    } else if (video.muted) {
      video.muted = false;
    }
  });

  muteButton.addEventListener("click", () => {
    video.muted = !video.muted;
    updateMuteLabel();
  });

  video.addEventListener("volumechange", updateMuteLabel);

  // Playback speed
  playbackSpeedSelector.addEventListener("change", () => {
    const rate = parseFloat(playbackSpeedSelector.value);
    video.playbackRate = rate;
  });

  // Fullscreen
  fullscreenButton.addEventListener("click", toggleFullscreen);

  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyShortcuts);
}

function togglePlayPause() {
  if (video.paused || video.ended) {
    video.play();
  } else {
    video.pause();
  }
}

function updatePlayPauseLabel() {
  playPauseButton.textContent = video.paused ? "Play" : "Pause";
}

function onTimeUpdate() {
  if (!isFinite(video.duration) || video.duration <= 0) {
    return;
  }

  const progress = (video.currentTime / video.duration) * 100;
  progressBar.value = progress;

  const now = Date.now();
  if (now - lastProgressSaveTime > PROGRESS_SAVE_INTERVAL) {
    lastProgressSaveTime = now;
    try {
      window.localStorage.setItem(PROGRESS_KEY, String(video.currentTime));
    } catch (_) {}
  }

  // Mark completed when watched > 95%
  if (video.currentTime / video.duration >= 0.95) {
    try {
      window.localStorage.setItem(COMPLETED_KEY, "true");
    } catch (_) {}
  }
}

function restoreProgress() {
  try {
    const stored = window.localStorage.getItem(PROGRESS_KEY);
    const numeric = stored ? parseFloat(stored) : NaN;
    if (isNaN(numeric) || numeric <= 0) return;

    const applyTime = () => {
      if (!isFinite(video.duration) || video.duration <= 0) return;
      video.currentTime = Math.min(numeric, video.duration - 0.5);
      video.removeEventListener("loadedmetadata", applyTime);
    };

    if (isFinite(video.duration) && video.duration > 0) {
      applyTime();
    } else {
      video.addEventListener("loadedmetadata", applyTime);
    }
  } catch (_) {}
}

function onSeek() {
  if (!isFinite(video.duration) || video.duration <= 0) return;
  const targetTime = (parseFloat(progressBar.value) / 100) * video.duration;
  video.currentTime = targetTime;
}

function updateMuteLabel() {
  muteButton.textContent = video.muted || video.volume === 0 ? "Unmute" : "Mute";
}

function setupQualityLevels(levels) {
  // Clear existing options except Auto
  while (qualitySelector.options.length > 1) {
    qualitySelector.remove(1);
  }

  levels.forEach((level, index) => {
    const resolution = `${level.height}p`;
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = resolution;
    qualitySelector.appendChild(option);
  });

  qualitySelector.addEventListener("change", () => {
    if (!hlsInstance) return;
    const value = qualitySelector.value;
    if (value === "auto") {
      hlsInstance.currentLevel = -1; // automatic ABR
      bitrateDisplay.textContent = "Bitrate: Auto";
    } else {
      const index = parseInt(value, 10);
      hlsInstance.currentLevel = index;
      const level = hlsInstance.levels[index];
      updateBitrateDisplay(level);
    }
  });
}

function updateBitrateDisplay(level) {
  if (!level) {
    bitrateDisplay.textContent = "Bitrate: Auto";
    return;
  }
  const kbps = level.bitrate ? Math.round(level.bitrate / 1000) : null;
  const resolution = level.height ? `${level.height}p` : "";
  const parts = [];
  if (kbps) parts.push(`${kbps} kbps`);
  if (resolution) parts.push(resolution);
  bitrateDisplay.textContent = `Bitrate: ${parts.join(" ") || "Unknown"}`;
}

function toggleFullscreen() {
  const doc = document;
  const elem = videoContainer;

  const isFullscreen =
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.msFullscreenElement;

  if (!isFullscreen) {
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
  } else {
    if (doc.exitFullscreen) doc.exitFullscreen();
    else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    else if (doc.msExitFullscreen) doc.msExitFullscreen();
  }
}

function handleKeyShortcuts(event) {
  const key = event.key;

  switch (key) {
    case " ": // Space
      event.preventDefault();
      togglePlayPause();
      break;
    case "m":
    case "M":
      video.muted = !video.muted;
      break;
    case "ArrowRight":
      video.currentTime += 5;
      break;
    case "ArrowLeft":
      video.currentTime = Math.max(video.currentTime - 5, 0);
      break;
    case "ArrowUp":
      event.preventDefault();
      video.volume = Math.min(video.volume + 0.05, 1);
      break;
    case "ArrowDown":
      event.preventDefault();
      video.volume = Math.max(video.volume - 0.05, 0);
      break;
    case "f":
    case "F":
      toggleFullscreen();
      break;
    default:
      break;
  }
}

document.addEventListener("DOMContentLoaded", initPlayer);
