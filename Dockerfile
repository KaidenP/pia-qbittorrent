FROM kaidenprince/pia AS base
LABEL authors="Kaiden"

COPY --from=qbittorrentofficial/qbittorrent-nox  /usr/bin/qbittorrent-nox /usr/bin/qbittorrent-nox
# run-time dependencies
RUN \
  apk --no-cache add \
    7zip \
    bash \
    curl \
    doas \
    python3 \
    qt6-qtbase \
    qt6-qtbase-sqlite \
    tini \
    tzdata

RUN mkdir -p /data/.qbittorrent

COPY app.js /app/
COPY qBittorrent.conf /app
