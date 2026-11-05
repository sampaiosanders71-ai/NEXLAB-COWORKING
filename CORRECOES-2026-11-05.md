# Correções após a análise do NexLab oficial

## Comportamento corrigido

- Mural: Atualizar refaz as tentativas de carregar capas, sem sair do módulo. Quando a imagem não pode ser exibida, o card mantém seu texto e oferece uma nova tentativa individual.
- Configurações: as confirmações recebem foco em Cancelar, permitem Esc quando não estão processando, mantêm Tab dentro da janela e devolvem o foco ao controle de origem. O conteúdo interno usa uma seção, preservando um único marco principal.
- Exportações: o menu define o foco ao abrir, sem o temporizador que podia devolver o foco ao PDF após a escolha rápida de Excel pelo teclado.
- Auditoria: a função interna reserva o horário depois da trava de gravação e usa um instante estritamente posterior ao registro anterior. Gravação e verificação de hashes usam UTC.

## Banco de dados

A migração gerenciada `audit_chain_serialized_timestamp` foi aplicada pelo conector Supabase. O SQL correspondente está em `supabase/sql/audit_chain_clock_fix.sql`. A assinatura e as permissões das funções foram preservadas.

Os registros anteriores não foram alterados. As duas divergências históricas continuam visíveis; esta correção impede a repetição da causa identificada, sem reconstruir hashes antigos.

## Verificação

Foram examinadas recuperação global e individual de imagens, foco e cancelamento em 1440, 390 e 320 pixels, além do caso de seleção rápida de Excel com comparação entre código anterior e corrigido. As verificações do pacote incluem hashes dos recursos, carregamento por módulos nativos e Service Worker. As operações de formulários e os downloads de teste usam dados simulados.

O teste SQL `supabase/sql/audit_chain_clock_rollback_test.sql` executa uma transação integralmente revertida: simula relógio anterior ao último registro, verifica ordem estrita, ligação com o predecessor, hash em UTC e bloqueio de chamada sem autenticação. Não deixa registros de teste no banco. O teste contém a definição candidata dentro da transação e não é uma migração de produção.

## Pontos que exigem acompanhamento

O titular ainda deve cadastrar e verificar seu segundo fator em Configurações > Segurança. A alteração não força MFA em contas sem fator cadastrado nem encerra sessões. Recebimento de push e restauração de backup em ambiente isolado permanecem pendentes de validação operacional. Não foram alterados os tipos permitidos de anexos nem as configurações de senha do serviço de autenticação nesta correção.
