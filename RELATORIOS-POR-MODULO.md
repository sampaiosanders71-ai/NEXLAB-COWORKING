# Central de Relatórios por módulo

Sete cards: Usuários, Equipes, Projetos, Estoque e Patrimônio, Reservas e Reuniões, Marketing e Eventos. O relatório geral reúne os sete módulos em um único PDF ou Excel. Cada módulo é exportado com suas seções, em vez de receber um card separado por aba.

Removidos da central: cards de Permissões, Mural Interno, Agenda, Pendências, Feedback, Configurações e Atividades do Sistema; lista de exportações anteriores, contador de exportações e atalho de gerenciamento desse histórico.

A central deixa de consultar e gravar o histórico de exportações destinado à interface. A auditoria técnica continua registrada na cadeia de segurança; a auditoria usada pelo fluxo existente de Estoque e Patrimônio foi preservada. Nenhum registro histórico preexistente, dado de negócio ou permissão foi excluído.

O backend novo usa SECURITY INVOKER, preserva RLS e reutiliza as verificações dos relatórios existentes. O relatório geral exige acesso aos sete módulos. Dados pessoais de Usuários são opcionais, ficam no mesmo arquivo e mantêm finalidade institucional, permissão sensível e MFA.

Todo o período é a seleção inicial. Datas filtram cadastros, agendamentos, eventos e publicações. Estoque e patrimônio são posições atuais; o período filtra movimentações. Publicações sem data permanecem incluídas. Consultas não confirmadas não são tratadas como conjuntos vazios.

Verificações: funções com usuário autorizado, bloqueio de chamadas anônimas e de usuário desconhecido, período inválido e fuso brasileiro. Cenários locais com dados fictícios: sete módulos, PDF/Excel, geral, seções vazias, 260 projetos, recuperação de falha, cancelamento, perfil restrito e dados pessoais com MFA. Fontes SQL e testes de esquema acompanham o pacote.
