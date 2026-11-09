# Atualização do contador de Pendências

Corrige o alerta NXL-02682-V267-14AC426: o tempo limite de uma leitura do contador em segundo plano era exibido como erro geral no módulo em uso.

A leitura agora usa cancelamento próprio e preserva o último contador confirmado. Há até três novas tentativas, após 5, 15 e 45 segundos, sem consultas simultâneas. A retomada da conexão, o retorno à aba e os eventos existentes podem solicitar uma nova leitura. Trocar de conta cancela leituras e tentativas anteriores; perder acesso limpa o contador.

O tempo limite é registrado como aviso do módulo Pendências, sem diálogo bloqueante. Outros erros continuam registrados e exibidos pelo tratamento existente. As operações de criação, edição e exclusão não foram alteradas.

Validação: 12 testes de comportamento e reprodução no Chromium a 1440 e 390 pixels, com transporte isolado. Confirmados contador preservado, recuperação automática, aviso técnico, erro real, perda de permissão e cancelamento da conta anterior. Nenhum dado real foi alterado.

Para executar a regressão local: `node tests/pending-counter.test.mjs`.
