# NEXLAB v26.7 — Monitoramento e prontidão final

## Implementado

- Captura de erros JavaScript não tratados.
- Captura de rejeições de Promise.
- Registro de erros protegidos por módulo.
- Registro de carregamentos parciais.
- Registro de degradações relevantes de desempenho.
- Sanitização de tokens, e-mails e parâmetros sensíveis.
- Deduplicação por cinco minutos.
- Fila local limitada a vinte eventos.
- Limite de trinta eventos por usuário/minuto no Supabase.
- Painel administrativo na Saúde do Sistema.
- Resumo de erros, críticos, usuários afetados e módulos.
- Retenção manual administrativa de 30 a 365 dias.
- Página de prontidão final.
- Plano de backup e recuperação.
- Runbook de incidentes.
- `release.json` com metadados da versão estável.
- Smoke test diário opcional pelo GitHub Actions.

## Privacidade

O monitoramento não envia senhas, tokens ou conteúdo de formulários. Mensagens são sanitizadas e truncadas. A URL registrada contém somente o caminho, sem query string.

## Backup

A v26.7 fornece processo e checklist, mas não ativa automaticamente backups do Supabase. O recurso disponível deve ser confirmado no projeto real.

## SQL obrigatório

`supabase/supabase_v26_7_observabilidade_prontidao.sql`

## Versão

A v26.7 encerra a série planejada e deve ser validada como release estável após os testes finais.
