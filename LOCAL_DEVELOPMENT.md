# Desenvolvimento local

## Instalação

```sh
git clone https://github.com/Ramiyuu/fernandoosman-pharmacy.git
cd fernandoosman-pharmacy
npm ci
```

Requisitos: Node 24, npm e PostgreSQL 16+ para o ambiente persistente. Windows/PowerShell é suportado. Copie `.env.example` para `.env.local` e preencha conforme `ENVIRONMENT_SETUP.md`.

## Com Postgres e R2 de desenvolvimento

1. Crie um banco vazio, por exemplo `portfolio`, com seu proprietário local. Use credenciais locais em `MIGRATION_DATABASE_URL`.
2. Em `DATABASE_URL`, use o usuário `portfolio_app` com senha aleatória de 24+ caracteres e o mesmo host/banco. Não é necessário criar esse usuário manualmente.
3. Crie um bucket R2 de desenvolvimento, configure token e CORS para `http://localhost:3000`. Não use o bucket produtivo.
4. Execute `npm run db:migrate`. Um perfil básico editável é criado; estatísticas acadêmicas ficam vazias até preencher com dados reais.
5. Opcionalmente, somente em um banco de desenvolvimento vazio, execute `npm run db:migrate -- --seed`. Isso carrega exemplos de artigos/projetos para testar layout. O seed é bloqueado em produção e se houver conteúdo no banco. Não serve para publicar seu portfólio real.
6. Crie administrador com `npm run admin -- create --email voce@exemplo.com --name "Fernando Osman"`. Digite a senha no prompt.
7. Execute `npm run dev`, abra `http://localhost:3000/admin/login` e configure TOTP. Guarde códigos de backup.
8. Edite perfil, crie rascunho, anexe PDF, publique e confira acesso em janela anônima. Teste imagem e vídeo real pelo editor; para vídeo, salve o artigo antes do upload.

## Stack isolado sem instalar Postgres/R2

Terminal 1:

```sh
npm run e2e:stack
```

Isso cria PostgreSQL 17 em memória via PGlite, aplica as migrations reais, carrega fixtures, cria contas exclusivamente de teste e inicia um simulador S3 que valida SigV4 e expiração. Tudo desaparece ao parar o processo. **Nunca execute esse stack em produção.**

Terminal 2, PowerShell:

```powershell
Get-Content .e2e/env | ForEach-Object {
  if ($_ -match '^([^=]+)=(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}
npm run dev
```

Terminal 2, Bash:

```sh
set -a
. ./.e2e/env
set +a
npm run dev
```

As contas do stack estão em `tests/e2e/fixtures.mjs`, só funcionam nesse banco temporário e ainda exigem 2FA. Para executar a suíte, mantenha o banco recém-iniciado: o primeiro teste configura TOTP. Não use fixtures para criar contas produtivas.

Terminal 3:

```sh
npx playwright install chromium
npm run test:e2e
```

O Playwright verifica os fluxos críticos e captura páginas em 1440/1280/1024/768/430/390 px. Screenshots em `test-results/visual/`; traces ficam nos resultados de falhas. `.e2e/` e `test-results/` são ignorados, pois podem conter sessão e TOTP de teste. Para repetir a suíte inteira, reinicie o stack e o Next; para repetir somente QA visual, mantenha a sessão gerada pelo primeiro teste.

## Validação e build produtivo local

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Pare `next dev` antes de `next build` para evitar competição pelo diretório `.next`. O build não precisa do banco; `npm start` precisa das env e serviços. Testes unitários/RLS criam seu próprio banco em memória. Testes de navegador precisam do stack e servidor separados. Se o sandbox bloquear subprocessos com EPERM, execute no terminal local autorizado.

## Rotina de trabalho

- Nunca edite uma migration aplicada: adicione um arquivo numerado em `db/migrations/`.
- Leia a documentação correspondente em `node_modules/next/dist/docs/` antes de alterar APIs desta versão.
- O editor salva JSON sanitizado; para adicionar um nó, ajuste extensão Tiptap, sanitizador, renderer e testes juntos.
- Use sempre autorização server-side nas ações/handlers administrativos. O proxy é apenas conveniência de navegação.
- Banco guarda metadata/chaves; não grave uploads permanentemente em `public/` ou no filesystem do deploy.
- Use `npm run maintenance` para a política de retenção no banco selecionado.
