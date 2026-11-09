# Atualização consolidada do NexLab oficial

Origem: NEXLAB-TESTE, commit a5ba51e3b4c964e3bc1fbea8412c6c139f2f0496.
Base oficial: db17dbe026c9b8029013df8adc4b16b51ef6a50f.

Inclui as atualizações publicadas e aprovadas no TESTE: contador de pendências,
relatórios por módulo com Marketing e relatório geral, patrimônio por grupos,
códigos digitáveis, edição completa, ocorrências e as interfaces de lista e cabeçalho.
Prévias de funcionalidades que ainda não foram implementadas não integram esta promoção.

As correções próprias do oficial foram mantidas: recuperação global/individual de
capas do Mural, foco das confirmações de Configurações, seleção de exportação pelo
teclado, estilos de legibilidade e preenchimento dos botões. O workflow de verificação,
os fontes do serviço de imagens e os SQLs de auditoria do oficial foram preservados.

A configuração dos serviços, a identidade e o escopo do PWA permanecem os do oficial.
O cache usa o namespace nxl-official-app-, evitando interferência no aplicativo de teste.
Esta publicação não executa migrações nem importa, exclui ou altera cadastros no banco
compartilhado. Os registros existentes continuam disponíveis no aplicativo.

Foram realizados testes em navegador com dados simulados e bloqueio de gravações
externas: relatórios PDF/Excel, propósito/MFA, estado vazio, paginação, falhas e cancelamento,
interface do patrimônio em sete larguras, cache do PWA e as correções preservadas do oficial.
A publicação também verifica hashes e tamanhos de todos os recursos essenciais e sob demanda.
A evidência física de homologação mantém seus controles e não foi substituída por estes testes.
