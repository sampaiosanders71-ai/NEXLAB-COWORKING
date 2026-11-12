# Modo de uso

Coordenadores e Administradores oficiais podem alternar para os perfis existentes. Administrador só aparece para quem é Administrador oficial, para retornar ao próprio perfil.

O menu fica no botão da conta, no canto superior direito, no computador e no celular. Em Meu Perfil há uma linha discreta com o modo atual e o mesmo botão de troca.

O servidor mantém o perfil oficial protegido. O campo legado role e as permissões efetivas representam o modo em uso; todas as verificações existentes de RPC e RLS continuam limitando o acesso. Em outro modo são usadas as permissões padrão desse perfil, sem permissões individuais do cargo oficial. Ao retornar, as permissões oficiais voltam a valer.

O modo é da conta e aparece nas outras sessões quando o perfil é sincronizado. Alterações simultâneas são verificadas pelo servidor. Uma alteração administrativa de cargo encerra o modo anterior; cargos abaixo de Coordenador perdem a opção de troca.

Contadores e listas usam o acesso atual. Avisos de trabalho acompanham o modo, enquanto avisos da própria conta e segurança permanecem visíveis. As notificações ocultas ficam preservadas e não são marcadas como lidas por “Marcar todas”.

As trocas são auditadas. Registros de segurança e atividade identificam o autor real, o perfil oficial e o modo usado.

A migração sql/usage_mode_v02682.sql foi aplicada e verificada no projeto conectado antes da publicação. Não contém dados de demonstração nem altera senhas.
