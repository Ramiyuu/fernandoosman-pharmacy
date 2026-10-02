# Fernando Osman — portfólio acadêmico e blog científico

Site pessoal de um estudante de Farmácia com foco em **Clinical Research, Medical Affairs, Biostatistics, Evidence-Based Medicine, Pharmacology e Data Analysis**. Funciona como portfólio profissional, blog científico, repositório de artigos e análises de estudos clínicos, vitrine de projetos de dados e CV online, com um **painel administrativo privado** em `/admin`.

- **Frontend**: Next.js 16 (App Router, React Server Components, Server Actions), TypeScript strict, Tailwind CSS v4, Radix UI (primitivos acessíveis no estilo shadcn/ui), Lucide, Tiptap 3, KaTeX, `next/image`, `next/font`.
- **Backend**: Supabase — PostgreSQL com Row Level Security, Supabase Auth e Supabase Storage. Nenhum Firebase.
- **Validação**: Zod no servidor (e React Hook Form no cliente).
- **Rate limiting**: Upstash Redis (recomendado em produção) com fallback em memória.

---

## Sumário

1. [Estrutura do projeto](#estrutura-do-projeto)
2. [Instalação](#instalação)
3. [Variáveis de ambiente](#variáveis-de-ambiente)
4. [Configurar o Supabase](#configurar-o-supabase)
5. [Migrations, seed e buckets](#migrations-seed-e-buckets)
6. [Criar o primeiro administrador](#criar-o-primeiro-administrador)
7. [Executar localmente](#executar-localmente)
8. [Testes](#testes)
9. [Build e deploy na Vercel](#build-e-deploy-na-vercel)
10. [Como o conteúdo funciona](#como-o-conteúdo-funciona)
11. [Segurança](#segurança)
12. [Operação e manutenção](#operação-e-manutenção)

---

## Estrutura do projeto

```
supabase/
  migrations/           SQL versionado (tipos, tabelas, RLS, storage, funções RPC)
  seed.sql              dados de exemplo (GERADO por scripts/seed)
  config.toml           configuração do Supabase CLI (desenvolvimento local)
scripts/seed/           conteúdo de exemplo em JS → gera supabase/seed.sql
src/
  app/
    (site)/             páginas públicas: /, /articles, /topics, /projects, /about, /cv, /contact, /search
    admin/              /admin/login, /admin/auth/confirm e o painel em (panel)/
    preview/            /preview/articles/[id] (pré-visualização privada de rascunhos)
    api/                /api/files/[id], /api/cv, /api/admin/uploads/image
    sitemap.ts, robots.ts, not-found.tsx, forbidden.tsx (403), global-error.tsx
  components/           UI reutilizável (ui/, layout/, editor/, content/, forms/, seo/)
  features/             módulos por domínio: articles, projects, files, auth, contact, profile, taxonomy...
                        (componentes + Server Actions de cada domínio)
  lib/                  supabase (clientes), auth (sessão/permissões), security (rate limit, assinatura
                        de arquivos, origem), content (sanitização do rich text), seo, storage, logger, env
  services/             acesso a dados (público, admin, storage, activity log)
  schemas/              schemas Zod
  types/                tipos do banco e do conteúdo
  hooks/, utils/, config/
  proxy.ts              (antigo middleware) renovação de sessão + redirecionamento rápido
tests/
  db/                   testes de RLS/migrations em Postgres real (PGlite)
  e2e/                  gateway local compatível com Supabase, só para testes (ver “Testes”)
```

---

## Instalação

Requisitos: **Node.js 20.9+** (testado com Node 24) e npm.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Preencha `.env.local` (próxima seção). **Nunca** faça commit de `.env.local` — o `.gitignore` já ignora todos os `.env*` exceto `.env.example`.

---

## Variáveis de ambiente

| Variável | Onde é usada | Obrigatória |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave pública (`anon` ou `sb_publishable_…`) | sim |
| `NEXT_PUBLIC_SITE_URL` | URL canônica, sem barra final (SEO, sitemap, links de e-mail, checagem de origem) | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | **somente servidor** (`service_role` ou `sb_secret_…`) — storage privado, URLs assinadas, inserção de mensagens de contato | sim |
| `PDF_MAX_SIZE_MB` | limite de PDF (padrão 30) | não |
| `IMAGE_MAX_SIZE_MB` | limite de imagens (padrão 4, máx. 4,4 por causa do limite de 4,5 MB de body na Vercel) | não |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | rate limiting distribuído | recomendado em produção |
| `AUTH_MAGIC_LINK_ENABLED` | `true` habilita “Email me a sign-in link” no login | não |

Regras de segurança aplicadas:

- A chave de service role **nunca** recebe o prefixo `NEXT_PUBLIC_`. O `next.config.ts` **interrompe o build** se encontrar qualquer variável `NEXT_PUBLIC_*` contendo `SERVICE_ROLE`, `SECRET` ou `PRIVATE`.
- O cliente com service role vive em `src/lib/supabase/admin.ts`, marcado com `import 'server-only'` (importá-lo num componente de cliente quebra o build).
- Erros de configuração informam **quais** variáveis estão inválidas, nunca os valores.

---

## Configurar o Supabase

1. Crie um projeto em <https://supabase.com/dashboard>.
2. **Settings → API**: copie a URL, a chave `anon`/publishable e a `service_role`/secret para o `.env.local`.
3. **Authentication → Sign In / Providers → Email**:
   - desative **“Allow new users to sign up”** (não existe cadastro público; contas são criadas manualmente);
   - mantenha Email/Password habilitado.
4. **Authentication → URL Configuration**:
   - *Site URL*: a URL de produção (ex.: `https://seu-dominio.com`);
   - *Redirect URLs*: `https://seu-dominio.com/admin/auth/confirm` e, para desenvolvimento, `http://localhost:3000/admin/auth/confirm`.
5. (Opcional, para magic link) **Authentication → Email Templates → Magic Link**: troque o link por

   ```html
   <a href="{{ .SiteURL }}/admin/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/admin">Entrar</a>
   ```

   e defina `AUTH_MAGIC_LINK_ENABLED=true`. O app chama `signInWithOtp` com `shouldCreateUser: false`, então o link **nunca cria contas**. A rota de confirmação também aceita o fluxo PKCE (`?code=`).

---

## Migrations, seed e buckets

As migrations ficam em `supabase/migrations` e devem ser aplicadas **em ordem**:

| Arquivo | Conteúdo |
| --- | --- |
| `…0100_types_and_domains.sql` | enums (status, roles, visibilidade de arquivos) e domínios (`slug`, `http_url`, `doi`) |
| `…0200_tables.sql` | tabelas e índices (inclui `tsvector` gerado para busca full-text) |
| `…0300_functions_and_triggers.sql` | `is_admin()`, `is_staff()`, `slugify()`, `updated_at`, criação de perfil sem role, proteção do último admin |
| `…0400_rls_policies.sql` | privilégios explícitos + **RLS em todas as tabelas** |
| `…0500_storage.sql` | buckets e limites |
| `…0600_public_rpc.sql` | funções de leitura pública (listagem, filtros, busca, métricas, sitemap) |
| `…0700_admin_rpc.sql` | funções do painel (salvar artigo/projeto atomicamente, dashboard, arquivos, tags) |

**Opção A — Supabase CLI (recomendado)**

```bash
npx supabase login
```

```bash
npx supabase link --project-ref SEU_PROJECT_REF
```

```bash
npx supabase db push
```

Depois rode o seed (dados de exemplo) no **SQL Editor** colando o conteúdo de `supabase/seed.sql`.

**Opção B — SQL Editor do dashboard**: cole e execute cada arquivo de `supabase/migrations` na ordem, e por fim `supabase/seed.sql`.

O seed é idempotente (pode ser executado mais de uma vez) e é **gerado** a partir de `scripts/seed/*.mjs`. Para alterar os exemplos, edite esses arquivos e rode:

```bash
npm run seed:generate
```

### Buckets criados pela migration de storage

| Bucket | Público? | Conteúdo | Limite | Tipos aceitos |
| --- | --- | --- | --- | --- |
| `documents` | **privado** | PDFs de artigos e o CV | 30 MB | `application/pdf` |
| `article-images` | público | capas e figuras dos artigos | 5 MB | JPG, PNG, WebP, AVIF, GIF |
| `profile-images` | público | foto de perfil | 5 MB | idem |
| `project-images` | público | capas e galerias de projetos | 5 MB | idem |

Não existem policies de `storage.objects` para `anon`/`authenticated`: o navegador **não consegue** listar, ler (bucket privado), enviar, sobrescrever nem apagar objetos diretamente. Toda escrita passa pelo servidor Next.js, que autentica o admin, valida o arquivo e usa a service role. SVG não é aceito em nenhum bucket.

---

## Criar o primeiro administrador

1. **Authentication → Users → Add user → Create new user**: informe e-mail e uma senha forte e marque *Auto Confirm User*.
2. O trigger `on_auth_user_created` cria automaticamente uma linha em `public.profiles` **sem nenhuma role** (sem acesso).
3. No **SQL Editor**, conceda a role:

   ```sql
   update public.profiles
   set role = 'admin', display_name = 'Fernando Osman'
   where email = 'seu-email@exemplo.com';
   ```

4. (Opcional) Atribua os artigos e projetos do seed ao admin:

   ```sql
   update public.articles set author_id = (select id from public.profiles where role = 'admin' limit 1) where author_id is null;
   update public.projects set author_id = (select id from public.profiles where role = 'admin' limit 1) where author_id is null;
   ```

5. Acesse `/admin/login`.

Roles: `admin` (ativa) e `editor` (preparada). Editores já têm policies RLS (criam e editam **apenas os próprios rascunhos**, não publicam nem excluem), mas não têm acesso ao painel. Para ativar, conceda permissões em `src/lib/auth/permissions.ts` (ex.: `'admin:access'`, `'articles:write'`). Um trigger impede rebaixar ou desativar o último admin ativo.

---

## Executar localmente

```bash
npm run dev
```

Abra <http://localhost:3000>. Para usar um Supabase local em vez do projeto hospedado (requer Docker):

```bash
npx supabase start
```

O CLI aplica as migrations e o seed automaticamente e mostra as chaves locais para o `.env.local`.

Scripts disponíveis:

| Script | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build e servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | gera os tipos de rotas e roda `tsc --noEmit` |
| `npm test` | testes unitários e de banco (Vitest) |
| `npm run test:db` | só os testes de RLS/migrations |
| `npm run check` | lint + typecheck + testes + build |
| `npm run seed:generate` | regenera `supabase/seed.sql` |
| `npm run e2e:supabase` | sobe o gateway local de testes (ver abaixo) |

---

## Testes

**Unitários** (`src/**/*.test.ts`): validação de URLs e de redirecionamento (open redirect), sanitização de nomes de arquivo (path traversal, caracteres de controle, extensões bloqueadas, dupla extensão), detecção por *magic bytes* (PDF, imagens, executáveis, scripts, HTML/SVG), sanitizador de rich text (payloads de XSS) e utilidades.

**Banco de dados** (`tests/db`): aplica **as mesmas migrations e o mesmo seed** num PostgreSQL real em memória (PGlite) e verifica as policies como `anon`, usuário autenticado sem role, `editor` e `admin` — por exemplo, que visitantes só leem conteúdo publicado, não escrevem em nenhuma tabela, não acessam `profiles`/`contacts`/`activity_logs`, não chamam RPCs administrativas, não veem rascunhos nem PDFs privados por nenhuma rota, e que o log de atividades é *append-only*.

**Ponta a ponta sem Docker** (`tests/e2e/mock-supabase.mjs`): ferramenta **apenas de teste** que expõe um subconjunto compatível das APIs do Supabase (Auth, PostgREST e Storage) sobre o PGlite com as migrations reais, aplicando RLS com os mesmos papéis e claims JWT. Serve para rodar o app de verdade localmente sem um projeto Supabase:

```bash
npm run e2e:supabase
```

Ele grava as variáveis correspondentes em `.mock-supabase/env` (ignorado pelo git). As contas de teste ficam em `tests/e2e/fixtures.mjs`. **Nunca use isso em produção.**

---

## Build e deploy na Vercel

```bash
npm run check
```

1. Faça push do repositório para o GitHub/GitLab.
2. Na Vercel: **Add New → Project**, importe o repositório (framework detectado: Next.js).
3. Em **Settings → Environment Variables**, cadastre todas as variáveis da tabela acima para *Production* (e *Preview*, se quiser). `SUPABASE_SERVICE_ROLE_KEY` e as do Upstash **sem** `NEXT_PUBLIC_`.
4. `NEXT_PUBLIC_SITE_URL` deve ser a URL final com `https://` — isso ativa HSTS, `upgrade-insecure-requests` e cookies `Secure`.
5. Atualize *Site URL* e *Redirect URLs* no Supabase com o domínio final.
6. Crie um banco no Upstash (plano gratuito basta) e configure as duas variáveis — sem isso o rate limiting é por instância.

O build pré-renderiza as páginas públicas lendo o Supabase, então as variáveis precisam estar disponíveis no momento do build.

---

## Como o conteúdo funciona

- **Páginas públicas** são estáticas com revalidação (ISR) a cada 5 minutos e **revalidadas imediatamente** após qualquer alteração no painel. Elas usam um cliente Supabase sem cookies (sempre `anon`), então o cache só pode conter o que o RLS expõe ao público.
- **Métricas da home** (artigos publicados, revisões de artigos, tópicos cobertos, projetos, referências revisadas, semestre, última publicação) vêm de `get_public_metrics()` — nada é fixo no código. As contagens de *Paper reviews* e *Research notes* usam as categorias com slugs `paper-review` e `research-note`; métricas zeradas desse tipo não são exibidas.
- **Tópicos × categorias**: *topics* (Clinical Research, Biostatistics…) agrupam por assunto (vários por artigo, tabela `article_topics`); *categories* (Concept Explainer, Paper Review…) descrevem o formato (uma por artigo).
- **Editor** (Tiptap): títulos, negrito/itálico/sublinhado, links, listas, tabelas, citações, callouts (Info, Note, Caution, Key point), separadores, imagens, código, fórmulas LaTeX (KaTeX), citações numeradas `[n]` ligadas às referências, e o menu **Sections** que insere a estrutura de revisão de estudo (*Why this study matters*, *Research Question*, *Study Design*, *Population*, *Intervention*, *Endpoints*, *Results*, *Understanding the Numbers*, *Statistical Analysis*, *Limitations*, *My Takeaways*). Rascunhos são salvos automaticamente; artigos publicados só mudam com “Save changes”.
- **Referências** são estruturadas (título, autores, journal, ano, DOI, URL, PMID); DOIs aceitam `10.xxxx/…`, `doi:…` ou URLs `doi.org` e viram links.
- **Slugs** são gerados do título, editáveis e únicos (sufixo `-2`, `-3`… no banco).
- **Idiomas**: cada artigo tem `language` (`en`/`pt`) e pode apontar `translation_of_article_id`; a página mostra “Também disponível em…”.
- **Exclusão**: artigos vão para a lixeira (*soft delete*, `deleted_at`), podem ser restaurados (voltam como rascunho) ou excluídos permanentemente junto com seus PDFs.
- **Pré-visualização privada**: `/preview/articles/[id]` (só admin; lê com a sessão do admin, então o RLS também protege).
- **SEO**: metadata dinâmica, Open Graph e Twitter Cards (com imagem OG gerada por artigo), URLs canônicas, `sitemap.xml`, `robots.txt` e JSON-LD (`Article`, `Person`, `BreadcrumbList`, `WebSite`). Páginas filtradas e de busca são `noindex`.

### Fluxo de upload de PDF

1. O navegador envia só os metadados para uma Server Action, que valida admin, rate limit, extensão (incluindo dupla extensão como `x.exe.pdf`), MIME declarado e tamanho, gera um **nome interno aleatório** (`articles/<id>/<uuid>.pdf`) e reserva o registro como `pending`.
2. O servidor devolve uma **URL de upload assinada de uso único** para aquele caminho (sem sobrescrita). O arquivo vai direto ao Storage — necessário porque a Vercel limita o body das funções a 4,5 MB e o limite de PDF é 30 MB. O progresso é exibido.
3. O bucket recusa arquivos acima do limite ou com MIME diferente de `application/pdf`.
4. Uma segunda Server Action **verifica o objeto armazenado**: tamanho real, tipo gravado, assinatura `%PDF-` **no byte 0** (bloqueia executáveis, scripts, HTML/SVG renomeados e poliglotas) e o marcador `%%EOF`. Se algo falhar, o objeto e o registro são apagados.
5. Downloads passam por `/api/files/[id]`, que consulta o banco **com o RLS do visitante** (ou do admin) e só então redireciona para uma **URL assinada de 60 segundos**. URLs assinadas nunca são gravadas no banco — só o `storage_path`.

PDFs de artigos são **privados por padrão**; o admin pode marcá-los como públicos (aparecem no artigo publicado). O mesmo bucket privado guarda o CV, servido por `/api/cv`.

---

## Segurança

### Revisão realizada

| Área | Como está protegido | Verificado com |
| --- | --- | --- |
| Autenticação | Supabase Auth; `getUser()` valida o JWT no servidor; sem cadastro público; erros genéricos (sem enumerar contas); cookies de sessão **HttpOnly**, `SameSite=Lax`, `Secure` em HTTPS | e2e: senha errada, conta sem role, login/logout |
| Autorização | `requireAdminPage()` em layouts e **em cada página**; `guardAction()` na **primeira linha de cada Server Action**; Route Handlers com `authorizeAdmin()`; role lida só do banco | e2e: 307 para login sem sessão, **HTTP 403** real para conta sem role (páginas e API) |
| RLS | ativado em **todas** as tabelas; privilégios concedidos explicitamente; policies separadas por operação; funções auxiliares `SECURITY DEFINER` com `search_path` fixo | 23 testes no Postgres real (`tests/db`) |
| Rascunhos | negados por RLS em tabela, RPC, busca e sitemap; preview exige admin | e2e: página 404, preview → login, REST `[]`, RPC `null`, cookie forjado rejeitado |
| Uploads | validação no servidor (tamanho, extensão, MIME, *magic bytes*, `image-size` para imagens), nomes aleatórios, caminhos gerados no servidor, constraints SQL contra path traversal, sem SVG | e2e: executável e HTML disfarçados, `.exe.pdf`, 31 MB, SVG renomeado — todos rejeitados e removidos |
| Storage / URLs assinadas | bucket privado, sem policies públicas, URLs de 60 s geradas no servidor após checagem RLS | e2e: arquivo privado 404 para visitantes, token adulterado/reutilizado recusado, expiração após 60 s |
| Segredos | service role só em módulo `server-only`; build falha com `NEXT_PUBLIC_*SECRET*`; logger mascara chaves sensíveis | revisão de código e logs |
| XSS | conteúdo salvo como JSON e **reconstruído por allow-list** no servidor; renderizado por componentes React (nunca HTML do banco); links e imagens revalidados na renderização; KaTeX com `trust: false`; JSON-LD escapado; CSP e `nosniff` | testes unitários com payloads de XSS |
| CSRF | Server Actions verificam a origem (Next.js); Route Handlers de escrita checam `Origin`/`Sec-Fetch-Site`; cookies `SameSite=Lax` | e2e: POST cross-site → 403 |
| SQL injection | apenas consultas parametrizadas (supabase-js / RPC); busca reduz o termo a tokens alfanuméricos e escapa curingas de `LIKE` | testes de banco com entradas hostis |
| Open redirect | `next` só aceita caminhos internos sob `/admin` ou `/preview` | testes unitários e e2e |
| Rate limiting | login (por IP e por conta), magic link, uploads, formulário de contato e downloads | e2e: 6ª tentativa de login e 4ª mensagem bloqueadas |
| Headers | CSP, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`, HSTS (HTTPS), `no-store` + `noindex` em `/admin`, `/preview` e `/api` | inspeção das respostas |

### Pontos de atenção

- Sem Upstash, o rate limiting é por instância (serverless pode ter várias). Configure Upstash em produção.
- O IP do cliente vem de `x-forwarded-for`/`x-real-ip`, que a Vercel define de forma confiável. Em hospedagem própria, garanta que o proxy reescreva esses cabeçalhos.
- Imagens ficam em buckets públicos: quem souber a URL (nome aleatório) consegue vê-las, inclusive a capa de um rascunho. Não envie imagens sensíveis.
- A CSP usa `'unsafe-inline'` para scripts porque as páginas públicas são estáticas (nonces exigiriam renderização dinâmica). Como nenhum HTML vindo do banco é renderizado, o risco residual é baixo.
- A view `public_authors` roda com os privilégios do dono (expõe apenas `id` e `display_name` da equipe ativa); o *Security Advisor* do Supabase a sinalizará — é intencional.

---

## Operação e manutenção

- **Alterar o limite de PDF**: ajuste `PDF_MAX_SIZE_MB` **e** o `file_size_limit` do bucket `documents` (nova migration ou Storage → bucket → Settings). A lógica fica centralizada em `src/config/uploads.ts`.
- **Tipos de arquivo aceitos**: `src/config/uploads.ts` e `allowed_mime_types` dos buckets.
- **Tipos do banco**: após mudar o schema, regenere com
  `npx supabase gen types typescript --project-id SEU_PROJECT_REF --schema public > src/types/database.types.ts`
  (as RPCs que retornam JSON têm tipos detalhados em `src/types/content.ts`).
- **Logs**: JSON estruturado no console do servidor (Vercel → Logs), sem tokens, cookies ou senhas.
- **Arquivos órfãos**: uploads interrompidos são descartados automaticamente; registros restantes aparecem em `/admin/files` com status e podem ser excluídos.
- **Mensagens** do formulário de contato ficam em `/admin/messages`.
