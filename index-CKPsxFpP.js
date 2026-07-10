name: NEXLAB Production Smoke

on:
  workflow_dispatch:
  schedule:
    - cron: '17 11 * * *'

permissions:
  contents: read

jobs:
  smoke:
    if: ${{ vars.NEXLAB_PRODUCTION_URL != '' }}
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Verificar página principal
        shell: bash
        env:
          APP_URL: ${{ vars.NEXLAB_PRODUCTION_URL }}
        run: |
          set -euo pipefail
          BASE="${APP_URL%/}"
          curl --fail --silent --show-error --location "$BASE/" -o index.html
          grep -q 'name="nexlab-version" content="26.7"' index.html

      - name: Verificar manifesto e Service Worker
        shell: bash
        env:
          APP_URL: ${{ vars.NEXLAB_PRODUCTION_URL }}
        run: |
          set -euo pipefail
          BASE="${APP_URL%/}"
          curl --fail --silent --show-error --location "$BASE/manifest.webmanifest" -o manifest.webmanifest
          curl --fail --silent --show-error --location "$BASE/nexlab-sw.js" -o nexlab-sw.js
          grep -q '"name": "NEXLAB"' manifest.webmanifest
          grep -q 'nexlab-v26-7-shell-r1' nexlab-sw.js

      - name: Verificar prontidão
        shell: bash
        env:
          APP_URL: ${{ vars.NEXLAB_PRODUCTION_URL }}
        run: |
          set -euo pipefail
          BASE="${APP_URL%/}"
          curl --fail --silent --show-error --location "$BASE/release.json" -o release.json
          grep -q '"version": "26.7"' release.json
