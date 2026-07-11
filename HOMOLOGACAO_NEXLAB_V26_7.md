# Homologação NEXLAB v26.7.6

## O que foi entregue

- Página `homologacao.html` com verificações somente leitura e checklist por perfil.
- Teste estático de todas as páginas HTML do pacote.
- Testes E2E com Playwright para desktop e celular.
- Workflow `.github/workflows/nexlab-quality.yml` usando `npm ci`.
- `package-lock.json` com Playwright fixado em `1.53.0`.
- Suporte opcional a credenciais de homologação por GitHub Secrets.

## GitHub Secrets opcionais

- `NEXLAB_TEST_EMAIL`
- `NEXLAB_TEST_PASSWORD`

Use uma conta de teste sem dados pessoais e sem privilégios administrativos desnecessários.

## Separação recomendada

A homologação real deve possuir:

1. URL ou repositório separado;
2. projeto Supabase separado;
3. contas fictícias para ADM, Coordenador, Bolsista, Coworking Júnior e pendente;
4. dados descartáveis;
5. migrations iguais às da produção.

## Limitação atual

O pacote é compilado e a configuração do Supabase está embutida no JavaScript principal. Trocar com segurança entre produção e homologação por variáveis de ambiente exige o projeto-fonte React/Vite e nova compilação.

A página de homologação incluída testa a publicação e organiza validações manuais, mas não transforma o banco de produção em ambiente de testes.
