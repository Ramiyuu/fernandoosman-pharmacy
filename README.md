# Fernando Osman — portfólio acadêmico e blog científico

Site pessoal de um estudante de Farmácia com foco em **Clinical Research, Medical Affairs, Biostatistics, Evidence-Based Medicine, Pharmacology e Data Analysis**. Funciona como portfólio profissional, blog científico, repositório de artigos e análises de estudos clínicos, vitrine de projetos de dados e CV online, com um **painel administrativo privado** em `/admin`. Visitantes não têm conta: só leem o site e baixam os PDFs públicos.

- **Aplicação**: Next.js 16 (App Router, Server Components, Server Actions), TypeScript strict, Tailwind CSS v4, Radix UI, Lucide, Tiptap 3, KaTeX, `next/image`, `next/font`. Hospedada na **Railway**.
- **Identidade visual**: logo FO, paleta Navy `#0B1F44`, Blue `#2563EB`, Teal `#14B8A6`, branco e cinza `#E5E7EB`, wordmark em Montserrat, a partir de `identidade_fernandoosman_portfolio/`.
- **Banco**: **PostgreSQL** na Railway (sem porta pública), com Row Level Security em todas as tabelas e papéis de banco com privilégio mínimo.
- **Login do admin**: **Better Auth** (biblioteca, não autenticação caseira) com e-mail, senha e **verificação em duas etapas obrigatória** (app autenticador + códigos de backup). Sem cadastro público.
- **Arquivos**: **Cloudflare R2**, um bucket **privado**. PDFs são entregues por links assinados de 60 segundos; imagens são servidas pelo próprio site em `/media/...`.
- **LGPD**: aviso de privacidade em `/privacy`, consentimento no formulário de contato, retenção automática de mensagens, nenhum cookie ou rastreador nas páginas públicas.

---

## Sumário

1. [Arquitetura](#arquitetura)
2. [Estrutura do projeto](#estrutura-do-projeto)
3. [Instalação e variáveis de ambiente](#instalação-e-variáveis-de-ambiente)
4. [Executar localmente](#executar-localmente)
5. [Deploy: Railway + Cloudflare R2](#deploy-railway--cloudflare-r2)
6. [Administradores, 2FA e recuperação de acesso](#administradores-2fa-e-recuperação-de-acesso)
7. [Migrations e seed](#migrations-e-seed)
8. [Testes](#testes)
9. [Como o conteúdo funciona](#como-o-conteúdo-funciona)
10. [Segurança](#segurança)
11. [LGPD](#lgpd)
12. [Operação e manutenção](#operação-e-manutenção)

---

## Arquitetura

```
 visitante / admin ──HTTPS──▶ Railway: site Next.js ──rede privada──▶ Railway: PostgreSQL (sem porta pública)
                                   │
                                   ├── chaves S3 só no servidor ──▶ Cloudflare R2 (bucket privado)
                                   │
 download de PDF ◀── 302 para link assinado de 60 s ─────────────────┘
```

- **Toda leitura e escrita passa pelo servidor.** O navegador nunca fala com o banco nem com o R2 com credenciais próprias: não existe API pública de dados, chave pública de banco nem bucket público.
- **Papéis no banco** (`db/migrations/0001_roles_and_schemas.sql`):
  - `web_anon`: o que um visitante pode ver (só conteúdo publicado).
  - `web_admin`: a equipe, identificada pelo perfil verificado na sessão.
  - `web_server`: tarefas do servidor (tabelas de login, gravar mensagens de contato, limites de tentativas).
  - O site conecta com um usuário próprio (`portfolio_app`), que só herda `web_server`. A cada consulta ele troca para `web_anon` ou `web_admin` (`src/lib/db/client.ts`), não é dono de nenhuma tabela e não consegue alterar o esquema.
- **Páginas públicas** são renderizadas a cada acesso. Os dados vêm de um cache em memória de 60 s, limpo a cada alteração no painel. A Railway não dá acesso à rede privada durante o build, então nada é pré-renderizado com dados.

---

## Estrutura do projeto

```
db/
  migrations/           SQL versionado: papéis, tipos, tabelas do Better Auth, tabelas, funções,
                        privilégios + RLS, funções públicas e administrativas, rate limit e retenção
  seed.sql              conteúdo de exemplo (GERADO por scripts/seed)
identidade_fernandoosman_portfolio/  arte original da marca (logo, ícone, guia de identidade)
public/brand/           logo e ícone gerados para o site (npm run brand:assets)
scripts/
  brand/build-assets.mjs gera favicon, ícone Apple e logos a partir da arte original
  db/migrate.mjs        aplica as migrations e cria o usuário do site no banco
  admin.mjs             cria/gerencia administradores (não existe cadastro pelo site)
  seed/                 conteúdo de exemplo em JS → gera db/seed.sql
src/
  app/
    (site)/             páginas públicas: /, /articles, /topics, /projects, /about, /cv, /contact, /search, /privacy
    admin/              /admin/login e o painel em (panel)/, incluindo /admin/security
    preview/            /preview/articles/[id] (pré-visualização privada de rascunhos)
    media/              /media/<bucket>/<arquivo> — imagens servidas do bucket privado
    api/                /api/files/[id], /api/cv, /api/admin/uploads/{pdf,image}
  components/, features/, hooks/, utils/, config/, schemas/, types/
  lib/
    auth/               Better Auth, sessão, permissões, guarda das Server Actions
    db/                 pool, cliente por papel, template SQL parametrizado
    storage/            cliente R2 (SigV4), caminhos e URLs
    security/           rate limit, assinatura de arquivos, origem da requisição
    cache/, content/, seo/, logger.ts, env.ts
  services/             consultas públicas e do painel, storage, log de atividades
  proxy.ts              redireciona para o login quem não tem cookie de sessão (não é a barreira de segurança)
tests/
  db/                   migrations + RLS + papéis num PostgreSQL real em memória (PGlite)
  e2e/                  ambiente local completo para testar o site sem Railway nem R2
```

---

## Instalação e variáveis de ambiente

Requisitos: **Node.js 20.9+** (testado com Node 24), npm e **PostgreSQL 16+**.

```bash
npm install
```

```bash
cp .env.example .env.local
```

| Variável | Para quê | Obrigatória |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL canônica, sem barra final (SEO, cookies, checagem de origem). Em produção, `https://…` | sim |
| `DATABASE_URL` | conexão do site, com o usuário `portfolio_app` e uma senha de 24+ caracteres | sim |
| `MIGRATION_DATABASE_URL` | conexão do dono do banco, usada **só** por `npm run db:migrate` e `npm run admin` | sim |
| `BETTER_AUTH_SECRET` | 32+ caracteres aleatórios (`openssl rand -base64 32`); assina sessões e cifra os segredos de 2FA | sim |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | acesso ao bucket R2 | sim |
| `R2_ENDPOINT` | só para desenvolvimento/testes com outro servidor S3 | não |
| `PDF_MAX_SIZE_MB`, `IMAGE_MAX_SIZE_MB` | limites de upload (padrão 30 e 4) | não |
| `CONTACT_RETENTION_DAYS` | dias até apagar mensagens de contato (padrão 365; mínimo 30) | não |
| `TRUSTED_IP_HEADER` | cabeçalho com o IP real do visitante (padrão `x-forwarded-for`, correto na Railway) | não |
| `DATABASE_POOL_MAX` | conexões do pool (padrão 10) | não |

Regras aplicadas:

- **Nunca** faça commit de `.env.local`: o `.gitignore` ignora todos os `.env*`, exceto `.env.example`.
- Nenhum segredo usa o prefixo `NEXT_PUBLIC_`. O `next.config.ts` interrompe o build se encontrar `NEXT_PUBLIC_*` com `SECRET`, `PASSWORD`, `DATABASE`, `R2_`, `ACCESS_KEY` ou `AUTH` no nome.
- Os módulos com segredos importam `server-only`, então importá-los num componente de cliente quebra o build.
- Erros de configuração dizem **quais** variáveis estão erradas, nunca os valores.

---

## Executar localmente

**Com um PostgreSQL local** (por exemplo, um Postgres instalado ou em Docker):

1. Crie um banco vazio e preencha `MIGRATION_DATABASE_URL` com o usuário dono.
2. Escolha uma senha para `portfolio_app` em `DATABASE_URL`. O script cria esse usuário.
3. Aplique as migrations com o conteúdo de exemplo:

   ```bash
   npm run db:migrate -- --seed
   ```

4. Crie seu admin. O script pede a senha sem mostrá-la:

   ```bash
   npm run admin -- create --email voce@exemplo.com --name "Fernando Osman"
   ```

5. Para o R2 em desenvolvimento, use um bucket separado (por exemplo, `portfolio-dev`) com um token próprio.
6. Suba o site:

   ```bash
   npm run dev
   ```

**Sem Postgres nem R2** (ambiente de teste completo, tudo em memória):

```bash
npm run e2e:stack
```

O comando sobe um PostgreSQL 17 em WebAssembly (PGlite), aplica as migrations reais, cria as contas de teste de `tests/e2e/fixtures.mjs` e inicia um servidor compatível com S3 que **verifica as assinaturas** como o R2. As variáveis ficam em `.e2e/env` (ignorado pelo git). Em outro terminal:

```bash
set -a; . ./.e2e/env; set +a; npm run build && npm start
```

| Script | O que faz |
| --- | --- |
| `npm run dev` / `npm run build` / `npm start` | desenvolvimento, build e servidor de produção |
| `npm run lint` / `npm run typecheck` / `npm test` | ESLint, TypeScript e testes (Vitest) |
| `npm run check` | lint + typecheck + testes + build |
| `npm run db:migrate` | aplica as migrations pendentes e atualiza o usuário do site (`-- --seed` carrega os exemplos) |
| `npm run admin -- <comando>` | `create`, `reset-password`, `reset-2fa`, `revoke-sessions`, `list` |
| `npm run seed:generate` | regenera `db/seed.sql` a partir de `scripts/seed` |
| `npm run brand:assets` | regenera favicon, ícone Apple e logos a partir de `identidade_fernandoosman_portfolio/` |
| `npm run e2e:stack` | ambiente local de testes (acima) |

---

## Deploy: Railway + Cloudflare R2

### 1. Cloudflare R2 (arquivos)

1. No painel da Cloudflare, abra **R2 Object Storage → Create bucket** (ex.: `fernando-portfolio`) e deixe o **acesso público desativado**, que é o padrão. Não precisa de CORS: os uploads passam pelo servidor.
2. Em **R2 → Manage API tokens → Create API token**, escolha a permissão **Object Read & Write**, limitada **só a esse bucket**.
3. Anote o **Access Key ID**, o **Secret Access Key** (aparece uma vez) e o **Account ID** (na página inicial do R2).

### 2. Railway (site + banco)

1. **New Project → Deploy from GitHub repo** e escolha este repositório.
2. No projeto, **+ New → Database → PostgreSQL** (versão 16 ou mais nova).
3. **Feche a porta pública do banco**: no serviço Postgres, vá em **Settings → Networking** e remova o *TCP Proxy*, se existir. O site acessa o banco pela rede privada (`postgres.railway.internal`).
4. No serviço do site, em **Variables**:

   ```
   NEXT_PUBLIC_SITE_URL=https://seu-dominio.com
   MIGRATION_DATABASE_URL=${{Postgres.DATABASE_URL}}
   DATABASE_URL=postgresql://portfolio_app:SENHA_LONGA@${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
   BETTER_AUTH_SECRET=...
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=fernando-portfolio
   ```

   Gere a senha do `portfolio_app` com `openssl rand -hex 24` (só letras e números, então não precisa escapar na URL). O script de migração cria esse usuário com essa senha.
5. **Settings → Deploy → Pre-deploy command**: `npm run db:migrate`. A cada deploy, as migrations pendentes são aplicadas antes de o site novo entrar no ar. O build (`npm run build`) e o start (`npm start`) são detectados automaticamente.
6. **Settings → Networking**: gere um domínio da Railway ou ligue o seu. Atualize `NEXT_PUBLIC_SITE_URL` com a URL final em `https://`. Isso ativa HSTS, `upgrade-insecure-requests` e cookies `Secure`.
7. Depois do primeiro deploy, crie o administrador (veja a próxima seção).

Para carregar o conteúdo de exemplo uma única vez, rode `npm run db:migrate -- --seed` dentro do serviço (com `railway ssh`).

### 3. Domínio na Cloudflare (opcional)

Se o domínio estiver na Cloudflare, aponte um `CNAME` para o domínio da Railway e use SSL **Full (strict)**. Com o proxy da Cloudflare ligado (nuvem laranja), o site ganha proteção contra DDoS e WAF.

Nesse caso, o IP real do visitante chega em `cf-connecting-ip`; defina `TRUSTED_IP_HEADER=cf-connecting-ip`. Só faça isso se o tráfego passar **sempre** pela Cloudflare. Quem acessar direto o domínio `*.up.railway.app` poderia forjar esse cabeçalho e escapar do limite de tentativas por IP. Sem o proxy, mantenha o padrão (`x-forwarded-for`, que a Railway reescreve e o visitante não consegue forjar).

---

## Administradores, 2FA e recuperação de acesso

Não existe cadastro pelo site, nem rota de autenticação pública: o login acontece só pelas Server Actions do `/admin/login`. Contas são criadas **pelo terminal**, com acesso ao banco:

```bash
railway ssh
```

```bash
npm run admin -- create --email voce@exemplo.com --name "Fernando Osman"
```

A senha (mínimo de 12 caracteres; uma frase longa funciona bem) é digitada sem aparecer na tela e nunca vai para o histórico do terminal.

**Primeiro acesso:**

1. Entre em `/admin/login` com e-mail e senha.
2. O painel fica **bloqueado** até você configurar o 2FA em `/admin/security`: escaneie o QR code no app autenticador, guarde os 10 códigos de backup e confirme com um código do app.
3. A partir daí, todo login pede a senha **e** o código.

**Se algo der errado:**

| Situação | O que fazer |
| --- | --- |
| Perdeu o celular | entre com um **código de backup** (cada um vale uma vez) e gere novos em `/admin/security` |
| Perdeu o celular e os códigos | `npm run admin -- reset-2fa --email …` (no servidor); configure de novo no próximo login |
| Esqueceu a senha | `npm run admin -- reset-password --email …` |
| Suspeita de acesso indevido | `npm run admin -- revoke-sessions --email …`, troque a senha e gere novos códigos de backup |

**Proteções do login:**

- **Tentativas de senha:** 10 por IP a cada 10 minutos e 5 por conta a cada 15 minutos.
- **Códigos 2FA:** 10 por IP a cada 10 minutos, 5 por desafio, e 10 erros seguidos bloqueiam a conta por 15 minutos.
- **Sessão:** termina depois de 12 horas sem uso ou quando o navegador fecha. O cookie é `HttpOnly`, `SameSite=Lax` e `Secure` em HTTPS.

Papéis: `admin` (ativo) e `editor` (preparado: o RLS já limita editores aos próprios rascunhos, mas o painel ainda não dá acesso; veja `src/lib/auth/permissions.ts`). Um trigger impede rebaixar ou desativar o último admin ativo.

---

## Migrations e seed

`npm run db:migrate` aplica, em ordem e uma vez cada, os arquivos de `db/migrations`. Cada um roda numa transação e fica registrado com um checksum em `private.schema_migrations`; **alterar uma migration já aplicada é recusado** (crie uma nova). Depois, o script cria ou atualiza o usuário do site:
- a senha é enviada já em formato SCRAM, então nunca aparece em texto puro nos logs do Postgres;
- o usuário fica sem superusuário e sem poder criar bancos ou papéis;
- `statement_timeout` é de 20 s.

| Migration | Conteúdo |
| --- | --- |
| `0001_roles_and_schemas` | papéis `web_anon`/`web_admin`/`web_server`, esquemas `auth` e `private`, nenhuma função executável por `PUBLIC` |
| `0002_types_and_domains` | enums e domínios (`slug`, `http_url`, `doi`) |
| `0003_auth` | tabelas do Better Auth (usuários, sessões, contas, 2FA), acessíveis só ao servidor |
| `0004_tables` | conteúdo, arquivos, perfil, configurações, log de atividades, mensagens |
| `0005_functions_and_triggers` | identidade da transação, `is_admin()`/`is_staff()`, slugs, datas, perfil sem papel para novos usuários |
| `0006_privileges_and_rls` | privilégios explícitos e **RLS em todas as tabelas** |
| `0007_public_rpc` / `0008_admin_rpc` | leituras públicas (listagens, busca, métricas, sitemap) e funções do painel |
| `0009_rate_limits_and_retention` | contador de tentativas e exclusão automática de mensagens antigas |

O seed (`db/seed.sql`) é idempotente e gerado por `npm run seed:generate`.

---

## Testes

```bash
npm run check
```

- **Unitários** (`src/**/*.test.ts`):
  - template SQL: todo valor vira parâmetro, inclusive entradas hostis;
  - URLs de imagem e open redirect;
  - nomes de arquivo (path traversal, dupla extensão);
  - *magic bytes*: executáveis, HTML, SVG e poliglotas disfarçados de PDF ou imagem;
  - **PDFs com JavaScript, ações de abrir programas e arquivos embutidos**, inclusive nomes ofuscados;
  - sanitização do rich text contra XSS.
- **Banco** (`tests/db`, 31 testes num PostgreSQL real em memória), com as mesmas migrations e seed de produção:
  - visitantes só veem conteúdo publicado e não escrevem nada;
  - ninguém além do servidor alcança as tabelas de login;
  - o usuário do site não consegue ler conteúdo sem trocar de papel, criar tabela, apagar tabela nem desligar o RLS;
  - nenhum papel ignora o RLS nem é dono de tabela, e nenhuma função é executável por `PUBLIC`;
  - o log de atividades só aceita inserções;
  - mensagens antigas são apagadas, e o limite de tentativas bloqueia na hora certa.
- **Ponta a ponta** com `npm run e2e:stack` (veja [Executar localmente](#executar-localmente)).

---

## Como o conteúdo funciona

- **Perfil público** (foto, nome, cargo, áreas de foco, semestre atual e total, curso, universidade, idiomas, interesses, links, formação, experiência, habilidades, certificações e CV) é editado em **/admin/profile**, com uma prévia ao vivo de como aparece na home. As mudanças, inclusive a foto nova, vão ao ar ao clicar em *Save profile*. O dashboard mostra um resumo com atalho para editar.
- **Nome do site, slogan e descrição** (usados no título das páginas e nas imagens de compartilhamento) ficam em **/admin/settings**.
- **Métricas da home** vêm do banco (`get_public_metrics()`), nada é fixo no código.
- **Tópicos × categorias**: *topics* agrupam por assunto (vários por artigo); *categories* descrevem o formato (um por artigo).
- **Editor** (Tiptap): títulos, listas, tabelas, citações, callouts, imagens, código, fórmulas LaTeX, citações numeradas ligadas às referências e o menu **Sections** com a estrutura de revisão de estudo. Rascunhos são salvos automaticamente; artigos publicados só mudam com "Save changes".
- **Referências** estruturadas (título, autores, journal, ano, DOI, URL, PMID); **slugs** únicos gerados do título; **idiomas** `en`/`pt` com ligação entre traduções.
- **Lixeira**: artigos excluídos podem ser restaurados (voltam como rascunho) ou apagados de vez, junto com os PDFs.
- **Pré-visualização privada** em `/preview/articles/[id]`, só para o admin.
- **SEO**: metadata, Open Graph, Twitter Cards, imagem OG por artigo, URLs canônicas, `sitemap.xml`, `robots.txt` e JSON-LD.

### Upload e download de PDF

1. O navegador envia o arquivo para `POST /api/admin/uploads/pdf`, com barra de progresso.
2. **Antes de gravar qualquer coisa**, o servidor confere:
   - **origem:** a requisição vem do próprio site;
   - **acesso:** admin com 2FA, dentro do limite de envios;
   - **arquivo:** tamanho e extensão (bloqueia `.exe`, `.js`, `.html`, `.svg`, `.php`, `.sh`, `.bat`, `.cmd`, `.scr`, `.jar`, inclusive em dupla extensão);
   - **conteúdo:** tipo declarado, assinatura `%PDF-` **no byte 0** (pega executáveis, scripts, HTML e poliglotas renomeados), marcador `%%EOF`, e **ausência de JavaScript, ações de abrir programas, envio de formulários e arquivos embutidos**.
3. O objeto ganha um **nome aleatório** escolhido pelo servidor (`documents/articles/<id>/<uuid>.pdf`). O nome original é guardado só para exibição, já sanitizado.
4. O download passa por `/api/files/<id>`. A rota consulta o banco **com o papel de quem pede**: visitante só enxerga PDFs públicos de artigos publicados e o CV atual. Só então responde com um redirecionamento para um **link assinado de 60 s**, que força `Content-Type: application/pdf`. O link nunca é gravado no banco.

PDFs de artigos são **privados por padrão**; o admin escolhe quais ficam públicos. Imagens passam por `/api/admin/uploads/image` (assinatura real, dimensões, sem SVG) e são servidas em `/media/...` com cache longo.

---

## Segurança

| Área | Como está protegido | Verificado |
| --- | --- | --- |
| Login | Better Auth; senha com scrypt; **2FA obrigatório** antes de qualquer página ou ação; sem cadastro; nenhuma rota `/api/auth` exposta; mensagens genéricas; limite de tentativas por IP e por conta; bloqueio da conta após 10 códigos errados | e2e: senha errada, conta sem papel (403), painel travado sem 2FA, código errado, código de backup |
| Sessão | cookie `HttpOnly`, `SameSite=Lax`, `Secure` em HTTPS, inacessível ao JavaScript; conferida no banco a cada requisição; revogável pelo painel ou pelo terminal | e2e: sessão revogada pelo script deixa de valer na hora |
| Autorização | `requireAdminPage()` em cada página; `guardAction()` na primeira linha de cada Server Action; Route Handlers com `authorizeAdmin()`; papel lido só do banco | e2e: 307 para o login, 403 nas páginas e uploads |
| Banco | sem porta pública; usuário do site com privilégio mínimo; papel por transação; RLS em todas as tabelas; nenhuma função executável por `PUBLIC` | 31 testes em Postgres real |
| SQL injection | todas as consultas usam o template `sql` (valores sempre parametrizados); busca reduz o termo a palavras e escapa curingas | testes unitários e de banco com entradas hostis |
| Rascunhos | negados por RLS em tabela, função, busca e sitemap; preview exige admin; todo o `/admin` é renderizado por requisição | e2e: 404 para visitante, ausentes do sitemap |
| Arquivos | bucket privado; validação completa antes de gravar; nomes aleatórios; caminhos validados no banco; links de 60 s com assinatura SigV4 | e2e: executável, HTML, `.exe.pdf`, poliglota, PDF com JavaScript, 31 MB e SVG recusados; link adulterado ou expirado → 403 |
| XSS | conteúdo salvo como JSON e reconstruído por allow-list; renderizado por React (nunca HTML do banco); KaTeX sem `trust`; imagens no conteúdo só de `/media`; CSP restrita a `'self'` | testes unitários |
| CSRF | origem conferida pelo Next nas Server Actions e manualmente nos uploads; cookies `SameSite=Lax` | e2e: upload cross-site → 403 |
| Segredos | só no servidor; o build falha com segredos em `NEXT_PUBLIC_*`; logs mascaram senhas, tokens, e-mails e IPs | revisão de código e logs |
| Cabeçalhos | CSP, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, CORP, HSTS (HTTPS), `no-store` e `noindex` em `/admin`, `/preview` e `/api` | inspeção das respostas |

### Pontos de atenção

- **Segurança total não existe.** Os maiores riscos que sobram ficam fora do código:
  - a senha e o celular do admin (use um gerenciador de senhas);
  - as contas da Railway, da Cloudflare e do GitHub (**ative o 2FA nas três**);
  - as dependências (rode `npm audit` de vez em quando e mantenha o Next.js atualizado).
- A CSP usa `'unsafe-inline'` em scripts por causa dos scripts de inicialização do Next.js. Como nenhum HTML vindo do banco é renderizado, o risco restante é baixo.
- Imagens enviadas ficam acessíveis a quem souber a URL, que usa um nome aleatório (inclusive a capa de um rascunho). Não envie imagens sensíveis.
- Com mais de uma instância na Railway, cada uma tem o próprio cache das páginas públicas: alterações aparecem nas outras em até 60 s.

---

## LGPD

O que o código faz:

- **Coleta mínima:**
  - visitantes não têm conta;
  - as páginas públicas **não criam cookies** e não têm analytics, pixels nem anúncios; fontes e imagens vêm do próprio site;
  - o formulário de contato pede só nome, e-mail, assunto e mensagem.
- **Consentimento:** o formulário exige aceitar o aviso de `/privacy`, e a data do aceite é gravada. Nenhum IP é guardado com a mensagem.
- **Retenção:** mensagens são apagadas automaticamente após `CONTACT_RETENTION_DAYS` (padrão 12 meses). O admin pode apagar antes, a pedido do titular, em `/admin/messages`.
- **Pseudonimização:** o limite de tentativas guarda IPs e e-mails só como HMAC com chave secreta, por pouco tempo.
- **Logs** não registram senhas, tokens, cookies, e-mails nem IPs.
- **Segurança** (art. 46): as medidas da seção anterior.
- **Aviso de privacidade** em `/privacy` (português, com resumo em inglês), linkado no rodapé e no formulário.

O que é responsabilidade de quem mantém o site:

- Manter `/privacy` fiel à realidade, por exemplo ao adicionar analytics ou trocar de fornecedor.
- **Não publicar PDFs com dados de pacientes** ou de terceiros identificáveis. O painel de anexos lembra disso.
- Responder pedidos de titulares (acesso, correção, exclusão) em até 15 dias.
- Se o site virar atividade comercial, revisar o aviso com alguém da área jurídica.

---

## Operação e manutenção

- **Backups**: ative os backups do volume do Postgres na Railway (aba *Backups* do serviço, conforme o plano) ou agende um `pg_dump`. O R2 não guarda versões antigas: um arquivo apagado no painel some de vez.
- **Atualizar o esquema**: crie `db/migrations/00NN_descricao.sql`. O próximo deploy aplica a migration no pre-deploy.
- **Trocar o `BETTER_AUTH_SECRET`** encerra todas as sessões e invalida os segredos de 2FA. Depois disso, rode `npm run admin -- reset-2fa`.
- **Trocar a arte da marca**: substitua os arquivos em `identidade_fernandoosman_portfolio/` (mesmos nomes) e rode `npm run brand:assets`. Cores ficam em `src/app/globals.css`; o wordmark e o slogan em `src/components/brand/brand.tsx`.
- **Fontes** (Montserrat e Source Serif 4) vêm dos pacotes `@fontsource-variable/*` e são servidas pelo próprio site: o build não depende de CDN e o visitante não contata terceiros.
- **Limites e tipos de arquivo**: `src/config/uploads.ts` e as variáveis `PDF_MAX_SIZE_MB` e `IMAGE_MAX_SIZE_MB`.
- **Logs**: JSON estruturado na aba *Deployments → Logs* da Railway.
- **Mensagens** do formulário em `/admin/messages`; **arquivos** (com aviso de vínculo a artigos) em `/admin/files`; **segurança da conta** em `/admin/security`.
