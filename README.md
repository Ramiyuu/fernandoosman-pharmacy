# Fernando Osman / FO

Portfólio acadêmico e profissional, publicação científica e CMS privado para um estudante de Farmácia. Next.js App Router, TypeScript strict, Tailwind 4, PostgreSQL com RLS, Better Auth/TOTP, editor Tiptap e Cloudflare R2 privado. O projeto existente foi preservado e ampliado; não usa Supabase.

## Comece pelos guias

- [Auditoria e decisões](PROJECT_AUDIT.md)
- [Sistema visual](DESIGN.md)
- [Todas as variáveis, Postgres, R2 e primeiro administrador](ENVIRONMENT_SETUP.md)
- [Desenvolvimento local e testes](LOCAL_DEVELOPMENT.md)
- [Deploy Railway, domínio, backup e operação](DEPLOYMENT_RAILWAY.md)
- [Resumo da entrega](DELIVERY_SUMMARY.md)
- [Resultados e limites da validação](VALIDATION.md)

## Execução

Requer Node 24 e PostgreSQL 16+. Copie `.env.example` para `.env.local` e preencha os valores. Credenciais reais nunca devem entrar no Git.

```sh
npm ci
npm run db:migrate
npm run admin -- create --email seu-email@exemplo.com --name "Fernando Osman"
npm run dev
```

Entre em `/admin/login` e configure o TOTP obrigatório. Não existe cadastro público, senha padrão nem administrador criado automaticamente. Para recuperar acesso, veja o guia de ambiente.

## Conteúdo e painel

- Home redesenhada com identidade FO, composição científica leve em CSS, perfil administrável e estatísticas calculadas de conteúdo publicado.
- Artigos em `/articles`: editor com tabelas, fórmulas, imagens, vídeos, citações, seções de revisão de estudo, referências estruturadas, DOI, PMID, SEO e imagem de compartilhamento. Rascunhos privados, autosave, publicação, despublicação e lixeira preservados.
- Projetos com conteúdo, imagens, links, tecnologia e PDFs. Busca full text inclui artigos, conteúdo, taxonomias, referências e projetos.
- Perfil e CV em `/admin/profile`: identidade, foto, universidade, semestre, previsão de formatura, estudos atuais, interesses, idiomas, links, formação, experiência, habilidades e certificados. Formação/experiência têm ordem e visibilidade; certificados têm credenciais, imagem e PDF. Páginas públicas `/about`, `/cv`, `/experience` e `/certificates`.
- Biblioteca em `/admin/files` (alias `/admin/media`): imagens, PDFs e vídeos. Uploads de vídeo são feitos no editor de um artigo/projeto já salvo. Aliases `/admin/education`, `/admin/experiences`, `/admin/certificates` mantêm o CRUD integrado do perfil.
- `/admin/analytics` e `/admin/downloads`: views/downloads por período, arquivo, artigo, projeto e tópicos. `/admin/audit`: últimas 200 ações administrativas.
- Contato, mensagens, taxonomias, configurações e segurança existentes preservados.
- Metadata, canonical, Open Graph, Twitter, sitemap, robots, RSS e JSON-LD Person/Article/ScholarlyArticle/BreadcrumbList.

## Arquitetura e segurança

Visitante → Next.js na Railway → PostgreSQL privado e R2 privado. SQL parametrizado, Zod e autorização server-side em cada ação. `portfolio_app` tem privilégios mínimos; cada consulta assume `web_anon`, `web_admin` ou `web_server`. O proxy não substitui autenticação. Sessões HttpOnly, SameSite e Secure em HTTPS; TOTP, códigos de backup e rate limits persistentes.

PDFs têm limite real de corpo, extensão/MIME, `%PDF-`, trailer e rejeição de conteúdo ativo conhecido. Imagens têm assinatura e dimensões verificadas; SVG/HTML arbitrários são rejeitados. Essas validações não equivalem a antivírus completo. Imagens têm URLs públicas imutáveis, portanto não use esse fluxo para material confidencial. PDFs seguem autorização e usam URLs assinadas de 60 segundos, emitidas por `/api/files/ID` (visualizar) ou `/api/files/ID?download=1` (baixar). Nunca persista signed URLs.

Vídeos MP4/WebM até 500 MB são enviados diretamente para R2 por URL de 300 segundos. Ficam em `pending/` até validar metadata/assinatura e copiar condicionalmente por ETag para uma chave definitiva. Vídeos herdam a visibilidade do artigo/projeto. YouTube usa player de privacidade aprimorada ativado por clique; forneça transcrição e legendas. CORS e lifecycle estão documentados.

Analytics registra somente IDs de conteúdo, tipo, horário e hash diário de um identificador aleatório. Não guarda IP, user agent ou referrer junto ao evento. Leituras deduplicadas em 30 minutos; downloads em 1 minuto. Do Not Track é respeitado. Um clique não comprova que o arquivo foi salvo. Execute a manutenção diária para retenção de 365 dias; o cron e a regra R2 precisam ser configurados no provedor.

## Banco e deploy

Migrations `0001`–`0009` preservadas; `0010`–`0015` adicionam recursos, perfil, analytics, vídeos, metadata científica e busca em referências, sem remoção de dados. O migrador usa transações/checksum e recusa a aplicação conectada como proprietário. Seed é opcional, somente em banco de desenvolvimento vazio; bloqueado em produção.

O Dockerfile usa Node 24, build isolado e runtime não-root. `railway.json` define `npm run db:migrate` no pre-deploy, `npm start` e `/api/health`. Sem armazenamento permanente no filesystem. O domínio vem de `NEXT_PUBLIC_SITE_URL`; trocar o domínio exige atualizar env/CORS e rebuild, sem alterar o branding.

## Verificação

```sh
npm run check
npm run e2e:stack
# Em outro terminal, carregar .e2e/env e iniciar npm run dev ou build/start.
npx playwright install chromium
npm run test:e2e
```

Vitest cobre sanitização, URLs, SQL, assinaturas, limites de corpo, migrations, RLS e analytics. Playwright testa autenticação/2FA, perfil, certificados, uploads, links assinados, publicação e responsividade. Usa apenas serviços e contas isolados; detalhes em `LOCAL_DEVELOPMENT.md`. Screenshots e sessões de teste são ignorados pelo Git.

Validações locais não comprovam configuração das contas Railway/Cloudflare, DNS ou funcionamento de um token R2 real. Antes do primeiro release execute o checklist do guia de deploy, use dados reais, configure backups/retention e faça upload/download de um arquivo real no bucket produtivo.
