name: NEXLAB Quality

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: nexlab-quality-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  validate:
    name: Integridade e E2E
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Baixar repositório
        uses: actions/checkout@v4

      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Instalar dependências de teste
        run: npm ci --no-audit --no-fund

      - name: Validar pacote estático
        run: npm run test:static

      - name: Instalar Chromium do Playwright
        run: npx playwright install --with-deps chromium

      - name: Executar testes E2E
        run: npm run test:e2e
        env:
          NEXLAB_TEST_EMAIL: ${{ secrets.NEXLAB_TEST_EMAIL }}
          NEXLAB_TEST_PASSWORD: ${{ secrets.NEXLAB_TEST_PASSWORD }}

      - name: Publicar relatório em caso de falha
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: nexlab-playwright-report
          path: |
            playwright-report/
            test-results/
          if-no-files-found: ignore