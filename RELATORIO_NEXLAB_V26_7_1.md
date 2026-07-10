# NEXLAB v26.7.1 — Hotfix da Sidebar

## Corrigido

- Somente o módulo aberto recebe destaque laranja.
- Estados ativos antigos são removidos dos demais botões.
- O item atual recebe `aria-current="page"` diretamente no componente.
- A barra de rolagem visual da Sidebar foi ocultada.
- A rolagem por toque, roda do mouse e teclado continua disponível.
- O cartão do usuário permanece separado no rodapé.
- Os últimos módulos deixam de ser cortados em telas menores.

## Supabase

Nenhum SQL novo é necessário.

A migration da v26.7 continua necessária somente para o monitoramento da
versão final e permanece dentro da pasta `supabase/`.
