# HLS Transcoding with FFmpeg

This document records the exact `ffmpeg` commands used to generate multiple HLS renditions (360p, 480p, 720p, 1080p) and explains the most important flags.

> NOTE: Replace `input.mp4` with the actual path to your high‑quality source file before running these commands.

```bash
SOURCE="input.mp4"
OUTPUT_DIR="hls_output"
mkdir -p "$OUTPUT_DIR"

# 360p rendition
ffmpeg -i "$SOURCE" \
  -vf "scale=w=640:h=360:force_original_aspect_ratio=decrease" \
  -c:a aac -ar 48000 \
  -c:v h264 -profile:v main -crf 23 -sc_threshold 0 \
  -g 48 -keyint_min 48 \
  -hls_time 4 -hls_playlist_type vod \
  -b:v 800k -maxrate 856k -bufsize 1200k -b:a 96k \
  -hls_segment_filename "$OUTPUT_DIR/360p_%03d.ts" \
  "$OUTPUT_DIR/360p.m3u8"

# 480p rendition
ffmpeg -i "$SOURCE" \
  -vf "scale=w=842:h=480:force_original_aspect_ratio=decrease" \
  -c:a aac -ar 48000 \
  -c:v h264 -profile:v main -crf 23 -sc_threshold 0 \
  -g 48 -keyint_min 48 \
  -hls_time 4 -hls_playlist_type vod \
  -b:v 1400k -maxrate 1498k -bufsize 2100k -b:a 128k \
  -hls_segment_filename "$OUTPUT_DIR/480p_%03d.ts" \
  "$OUTPUT_DIR/480p.m3u8"

# 720p rendition
ffmpeg -i "$SOURCE" \
  -vf "scale=w=1280:h=720:force_original_aspect_ratio=decrease" \
  -c:a aac -ar 48000 \
  -c:v h264 -profile:v main -crf 23 -sc_threshold 0 \
  -g 48 -keyint_min 48 \
  -hls_time 4 -hls_playlist_type vod \
  -b:v 2800k -maxrate 2996k -bufsize 4200k -b:a 128k \
  -hls_segment_filename "$OUTPUT_DIR/720p_%03d.ts" \
  "$OUTPUT_DIR/720p.m3u8"

# 1080p rendition
ffmpeg -i "$SOURCE" \
  -vf "scale=w=1920:h=1080:force_original_aspect_ratio=decrease" \
  -c:a aac -ar 48000 \
  -c:v h264 -profile:v main -crf 23 -sc_threshold 0 \
  -g 48 -keyint_min 48 \
  -hls_time 4 -hls_playlist_type vod \
  -b:v 5000k -maxrate 5350k -bufsize 7500k -b:a 192k \
  -hls_segment_filename "$OUTPUT_DIR/1080p_%03d.ts" \
  "$OUTPUT_DIR/1080p.m3u8"

# Master playlist
echo -e "#EXTM3U\n#EXT-X-VERSION:3" > "$OUTPUT_DIR/master.m3u8"
echo -e "#EXT-X-STREAM-INF:BANDWIDTH=928000,RESOLUTION=640x360\n360p.m3u8" >> "$OUTPUT_DIR/master.m3u8"
echo -e "#EXT-X-STREAM-INF:BANDWIDTH=1592000,RESOLUTION=842x480\n480p.m3u8" >> "$OUTPUT_DIR/master.m3u8"
echo -e "#EXT-X-STREAM-INF:BANDWIDTH=3004000,RESOLUTION=1280x720\n720p.m3u8" >> "$OUTPUT_DIR/master.m3u8"
echo -e "#EXT-X-STREAM-INF:BANDWIDTH=5384000,RESOLUTION=1920x1080\n1080p.m3u8" >> "$OUTPUT_DIR/master.m3u8"
```

## Key FFmpeg Flags Explained

- `-vf scale=w=WIDTH:h=HEIGHT:force_original_aspect_ratio=decrease`  
  Uses the **video filter** (`-vf`) named `scale` to resize the video so that it fits within the target resolution while preserving the original aspect ratio.

- `-c:v h264 -profile:v main -crf 23`  
  Encodes the video (`-c:v`) using the H.264 codec with the `main` profile and a **constant rate factor** (`-crf`) of 23, which balances quality and bitrate.

- `-c:a aac -ar 48000 -b:a 96k/128k/192k`  
  Encodes audio (`-c:a`) using AAC at a 48 kHz sample rate (`-ar 48000`) and sets the audio bitrate (`-b:a`).

- `-b:v 800k/1400k/2800k/5000k -maxrate ... -bufsize ...`  
  `-b:v` sets the target video bitrate. `-maxrate` limits the peak bitrate and `-bufsize` sets the size of the rate‑control buffer; together they keep the stream ABR‑friendly and compliant for HLS.

- `-g 48 -keyint_min 48`  
  Forces a keyframe every 48 frames, which (for a 24 fps source) gives a keyframe roughly every 2 seconds; this aligns segment boundaries with keyframes and improves seeking and bitrate switching.

- `-hls_time 4 -hls_playlist_type vod`  
  `-hls_time 4` creates HLS segments of about **4 seconds** each. `-hls_playlist_type vod` tells FFmpeg to generate a VOD‑style playlist with an `#EXT-X-ENDLIST` tag.

- `-hls_segment_filename "$OUTPUT_DIR/360p_%03d.ts"`  
  Defines the naming pattern for segment files; `%03d` is replaced with a zero‑padded segment index (e.g., `360p_000.ts`).

- `master.m3u8` with `#EXT-X-STREAM-INF` entries  
  Creates the **master manifest** that lists each rendition, its bandwidth, and resolution so that the HLS client (hls.js) can perform adaptive bitrate selection.
