# Otimização das leituras de comunicação

O painel mede separadamente a preparação, a requisição completa até a leitura do corpo e o total do teste. A seção recolhível **Etapas do teste** mostra esses valores e, quando disponíveis, os tempos internos informados pelo Worker. Usuário e permissão são verificados em paralelo; a duração conjunta não é a soma das duas verificações. **Leitura no servidor** inclui consultas ao D1 e montagem da resposta, não é uma medição isolada de SQL.

## Worker

`worker-otimizado.js` é o arquivo completo para substituir o Worker **nexlab-communication** em Cloudflare → Editar código. Preserve a vinculação `DB`, as variáveis e todos os segredos existentes. Salve uma cópia da versão anterior e publique a nova versão depois de revisar.

A versão anterior a esta otimização foi publicada pelo usuário e teve o backup D1 testado. O código do backup é preservado byte a byte nesta versão; a restauração D1 permanece indisponível. Somente GETs de comentários de projetos e mensagens de equipes executam as duas consultas de autorização em paralelo. POST, PATCH e DELETE mantêm a sequência anterior. Não há cache de usuário ou permissão. Falhas de qualquer verificação bloqueiam a leitura do D1, e o identificador do usuário retornado pela autorização precisa coincidir com o usuário autenticado.

As respostas autorizadas incluem o cabeçalho padrão `Server-Timing`, com durações de identidade, permissões, autorização conjunta, leitura e total no Worker. O cabeçalho é exposto ao navegador sem modificar a lista de origens permitidas. Não inclui token, segredo, identificador de usuário ou conteúdo dos registros. Requisições negadas continuam protegidas.

## Verificação

- Nove testes de medição e apresentação do painel, com relógio controlado, incluindo o tempo de consumo do corpo, preparação lenta, sessão/projeto ausentes e respostas inválidas.
- Nove testes do Worker: verificações simultâneas, bloqueio do D1 até aprovação de ambas, negações e usuário divergente, fluxo de escrita preservado, backup e handlers preservados e benchmark local.
- Dez testes de regressão de backup usando SQLite local e os validadores das funções Supabase existentes.
- Sete verificações do teste anterior do monitor, adaptado à função de medição extraída.
- Teste em Chromium com prévia local, seção recolhida e aberta, compatibilidade sem cabeçalho do Worker e larguras 320, 390, 768, 1440 e 1920. Sem requisições a serviços reais durante os testes de interface.

O benchmark injeta um atraso artificial de 100 ms em cada consulta Supabase. Foram comparadas cinco amostras de cada versão. Esse teste confirma a economia de espera pela execução paralela; **não é uma medição de desempenho em produção**, nem uma promessa de reduzir os 2133 ms pela metade. A conexão, o processamento do Supabase, o D1 e a transferência da resposta também contribuem para a duração real.

## Depois da implantação do Worker

Abra **Atividades do Sistema**, atualize o teste e expanda **Etapas do teste**. A versão anterior do Worker continua compatível, mas não envia durações internas. Faça várias medições na mesma rede e compare separadamente os valores de requisição completa, preparação e autorização. A implantação manual na Cloudflare e as medições reais do novo Worker continuam pendentes até serem confirmadas pelo usuário.

Não foram alterados dados, permissões no banco, agendamentos, retenção ou arquivos de backup durante esta otimização.
