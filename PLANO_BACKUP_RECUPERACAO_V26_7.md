# Plano de backup e recuperação — NEXLAB v26.7

## Escopo mínimo do backup

1. Banco PostgreSQL do Supabase.
2. Buckets do Storage e seus arquivos.
3. Configurações de autenticação e URLs autorizadas.
4. Edge Functions e variáveis necessárias para recriá-las.
5. SQLs/migrations da pasta `supabase/`.
6. Repositório GitHub e release estável anterior.
7. Logos, ícones e documentos operacionais.

## Antes de cada publicação

- Confirmar o recurso de backup disponível no plano atual do Supabase.
- Criar ou confirmar um ponto de recuperação recente.
- Exportar dados críticos quando necessário.
- Registrar o commit estável anterior.
- Evitar alterações simultâneas no banco durante a publicação.

## Estratégia de rollback do aplicativo

1. Identificar o último commit estável.
2. Restaurar os arquivos dessa versão no branch publicado.
3. Aguardar o GitHub Pages finalizar o deployment.
4. Limpar o Service Worker e o cache.
5. Validar login, Dashboard e módulos essenciais.

## Estratégia de recuperação do Supabase

1. Interromper alterações administrativas.
2. Identificar a extensão do incidente.
3. Preservar logs e evidências.
4. Restaurar o banco pelo mecanismo disponível no projeto ou por exportação validada.
5. Restaurar arquivos do Storage separadamente, quando necessário.
6. Reaplicar migrations posteriores somente após conferência.
7. Testar com contas de cada perfil antes de reabrir o uso normal.

## Frequência recomendada de verificação

- Antes de toda migration ou publicação relevante.
- Após mudanças em RLS, RPCs, triggers ou constraints.
- Periodicamente, conforme a importância e o volume dos dados.
- Sempre realizar teste de restauração, não apenas confirmar que o backup existe.

## Responsabilidades

Defina internamente:

- responsável por autorizar restauração;
- responsável técnico pelo Supabase;
- responsável pela publicação no GitHub;
- canal para comunicar indisponibilidade;
- prazo aceitável de recuperação.

O NEXLAB v26.7 não ativa nem substitui o serviço de backup do Supabase. O plano deve ser configurado e verificado no ambiente real.
