# Runbook de incidentes — NEXLAB v26.7

## 1. Confirmar o incidente

- Verifique se o problema ocorre em mais de um dispositivo.
- Consulte Saúde do Sistema → NEXLAB v26.7.
- Confira o GitHub Pages e o último deployment.
- Diferencie falha do aplicativo, internet, Supabase ou permissão.

## 2. Conter

- Pause novas migrations e alterações administrativas.
- Não apague logs.
- Caso o erro seja de publicação, restaure a versão estática anterior.
- Caso seja de permissão, não desative RLS globalmente como atalho.

## 3. Diagnosticar

Registre:

- horário;
- versão do app;
- perfil afetado;
- módulo;
- ação executada;
- mensagem de erro;
- dispositivos afetados;
- mudanças recentes.

## 4. Corrigir

- Aplique a menor correção necessária.
- Valide primeiro em homologação.
- Use migration idempotente para mudanças no banco.
- Teste todos os perfis afetados.

## 5. Recuperar

- Publique a correção.
- Aguarde o deployment terminar.
- Limpe Service Worker quando necessário.
- Confirme que a fila de erros diminuiu.
- Acompanhe por 24–48 horas.

## 6. Encerrar

- Documente a causa.
- Registre a correção.
- Atualize testes para impedir recorrência.
- Confirme backup e ponto de restauração.
