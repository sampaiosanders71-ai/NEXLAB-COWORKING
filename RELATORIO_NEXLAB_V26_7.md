# NEXLAB v26.7.6 — Testes autenticados e desempenho

## Implementado

- Captura autenticada de erros JavaScript, falhas de módulos e carregamentos parciais.
- Sanitização de metadados no cliente e novamente no Supabase.
- Separação entre produção, homologação, desenvolvimento e testes.
- Limite concorrente de trinta eventos por usuário/minuto.
- Painel administrativo na Saúde do Sistema.
- Retenção manual administrativa entre 30 e 365 dias.
- Retenção automática diária mantendo 90 dias de registros.
- Página de homologação e checklist de prontidão.
- Dependências de teste fixadas por `package-lock.json`.
- GitHub Actions usando `npm ci`.
- Teste estático de referências locais em todas as páginas HTML.
- Smoke test diário opcional da publicação.

## Retenção automática

O job `nexlab-observability-retention-v26-7-6` executa diariamente às 06:17 UTC e remove registros com mais de 90 dias. A migration é idempotente: antes de criar o agendamento atual, remove qualquer job anterior com o mesmo nome.

## Dependências e testes

A versão do Playwright está fixada em `1.53.0`. O `package-lock.json` deve permanecer no repositório e o workflow utiliza `npm ci`, evitando alterações silenciosas nas dependências.

O teste estático percorre as sete páginas HTML do pacote e valida referências locais declaradas em atributos, scripts inline, listas de ativos, `srcset` e `url()`.

## SQL obrigatório

1. `supabase/supabase_v26_7_4_observabilidade_seguranca.sql`
2. `supabase/supabase_v26_7_5_retencao_automatica.sql`

## Situação

A v26.7.6 conclui as correções 16 e 17. Não há migration nova: permanecem como pré-requisitos as migrations v26.7.4 e v26.7.5. A publicação depende da aprovação do workflow NEXLAB Quality com uma conta de homologação autorizada.


## Alterações da v26.7.6

- Navegação autenticada e somente leitura pelos módulos disponíveis ao perfil de homologação.
- Bibliotecas de PDF/XLSX transferidas para `assets/nexlab-export-vendor-v26-7-6.js`, carregado somente na exportação.
- Cache de consultas invalidado em mudanças Realtime do Supabase.
- Respostas iniciadas antes da invalidação não podem repovoar o cache com dados antigos.
