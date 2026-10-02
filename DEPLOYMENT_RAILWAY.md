# Deploy na Railway — passo a passo

## Preparação

Tenha conta GitHub com acesso ao repositório, conta Railway, conta Cloudflare/R2 e controle do DNS do domínio. A marca continua Fernando Osman / FO; `cobaltteam.com.br` é somente o domínio provisório.

Leia `ENVIRONMENT_SETUP.md` e crie um bucket privado/token R2. Não importe o seed em produção. Para um banco existente, primeiro faça backup e valide o release em ambiente separado com uma cópia dos dados.

## Criar os serviços

1. Acesse Railway, crie a conta e abra **New Project** → **Deploy from GitHub repo**.
2. Autorize a integração GitHub para este repositório e selecione `fernandoosman-pharmacy`. O serviço web será criado. Confira a branch desejada nas configurações de origem; não conecte uma branch de testes por engano.
3. Adicione Postgres pelo botão **New** → **Database** → **PostgreSQL** dentro do mesmo projeto.
4. Abra o web → **Variables** e cadastre todas as variáveis obrigatórias do guia de ambiente. Use a conexão privada do dono somente em `MIGRATION_DATABASE_URL`; monte `DATABASE_URL` com `portfolio_app` e senha própria. O migrador cria esse usuário.
5. Em **Settings → Networking**, gere inicialmente um domínio Railway para validar o serviço, ou cadastre o domínio final. Defina `NEXT_PUBLIC_SITE_URL` com essa URL HTTPS.

## Build, início e migrations

O `railway.json` versionado configura:

| Configuração | Valor |
|---|---|
| Builder | Dockerfile |
| Node | 24 (`node:24-bookworm-slim`) |
| Instalação | `npm ci` |
| Build | `npm run build` |
| Pre-deploy | `npm run db:migrate` |
| Start | `npm start` |
| Healthcheck | `/api/health`, timeout 120 s |
| Restart | on failure, até 5 tentativas |

O Dockerfile usa dois estágios e executa o servidor como usuário não-root. Não é necessário Procfile. O build não consulta o banco, não faz seed e não recebe chaves secretas. `NEXT_PUBLIC_SITE_URL` e `R2_ACCOUNT_ID` são argumentos de build para URLs e CSP; deixe essas variáveis cadastradas antes de construir a imagem. Todos os segredos são fornecidos em runtime.

As migrations são executadas em ordem, com transação por arquivo, checksum e advisory lock. As migrations novas são aditivas; preservam o conteúdo existente. As anteriores permanecem intactas. Enum de arquivo é atualizado em uma transação anterior ao seu uso. O release aplica schema antes de iniciar a versão nova. Uma migration com erro impede o deploy.

6. Confirme **Deploy**. Acompanhe **Build logs** até o build concluir e **Deploy logs** para as migrations. Depois confira o healthcheck: `/api/health` retorna 200 somente quando consegue ler o perfil no banco. Esse endpoint não testa a disponibilidade do R2; valide também um upload.
7. Crie o primeiro admin: instale/autentique a CLI Railway, vincule o projeto/serviço (`railway link`) e execute `railway ssh`. No shell remoto execute `npm run admin -- create --email SEU_EMAIL --name "Fernando Osman"`. Siga o fluxo de TOTP descrito no guia de ambiente.
8. No painel, preencha perfil, foto, formação, experiência, certificados e links reais. Publique um artigo e teste upload/download anônimo. Não há dados acadêmicos inventados em uma instalação sem seed.

## Domínio provisório cobaltteam.com.br

1. No web → **Settings → Networking → Custom Domain**, adicione `cobaltteam.com.br`. Use a porta de destino indicada para o serviço (o Next atende `PORT`).
2. Copie exatamente o destino DNS e, se solicitado, o registro de verificação exibidos pela Railway. Não invente um IP fixo.
3. No provedor DNS crie o registro solicitado. Na Cloudflare, o domínio raiz pode usar **CNAME** com nome `@` e o destino fornecido, graças ao flattening. Remova somente registros conflitantes desse hostname; preserve MX, TXT e os demais serviços.
4. Comece com **DNS only** (nuvem cinza). Aguarde a validação do domínio e a emissão do certificado Railway. A propagação depende do TTL/provedor; acompanhe os indicadores na Railway.
5. Para `www.cobaltteam.com.br`, adicione também esse hostname no serviço e crie o CNAME indicado. Escolha o apex como URL canônica. Se quiser redirecionar `www` para o apex, configure uma regra de redirecionamento no provedor; não assuma que cadastrar os dois hostnames cria esse redirecionamento automaticamente.
6. Um registro A só deve ser usado se Railway fornecer explicitamente o IP correto para essa configuração. Para provedores sem CNAME no apex, procure ALIAS/ANAME/flattening ou use `www` como domínio canônico.
7. Após HTTPS estar válido, atualize `NEXT_PUBLIC_SITE_URL=https://cobaltteam.com.br` e refaça o build/deploy. Better Auth usa essa mesma URL. Atualize também o CORS do bucket. Teste login, link de retorno, canonical, sitemap e RSS.

Cloudflare **Proxied** é opcional após a validação. Use SSL **Full (strict)**; nunca Flexible. O proxy pode aplicar limites de upload e cache próprios: imagens/PDF passam pelo web, vídeo vai direto ao R2. Não cacheie `/admin`, `/preview` ou `/api`. Se houver falha de certificado/validação, volte a DNS only para diagnosticar. Só use `TRUSTED_IP_HEADER=cf-connecting-ip` se o acesso direto à origem estiver bloqueado ou validado por uma camada confiável; caso contrário o header pode ser forjado. O padrão `x-forwarded-for` evita introduzir confiança adicional sem infraestrutura.

Troca futura de domínio: cadastrar novo hostname/SSL, atualizar `NEXT_PUBLIC_SITE_URL` e CORS, rebuild, testar autenticação e SEO, depois configurar redirecionamento do domínio antigo. O domínio não fica espalhado pelo código.

Fontes: [Railway domains](https://docs.railway.com/networking/domains/working-with-domains), [healthchecks](https://docs.railway.com/deployments/healthchecks), [pre-deploy](https://docs.railway.com/deployments/pre-deploy-command).

## Backup, manutenção e rollback

- Ative backups do Postgres no provedor. Antes de migrations, exporte com `pg_dump --format=custom --file=portfolio-backup.dump` usando uma conexão do proprietário via `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` e senha solicitada ou `PGPASSFILE` protegido. Não coloque a senha no histórico. Confirme que o dump pode ser restaurado em banco isolado com `pg_restore`; inclua as migrations de papéis no planejamento de restauração.
- Configure um serviço/cron Railway com a mesma imagem e env de banco, comando `npm run maintenance`, frequência diária (ex.: `0 3 * * *`). Ele elimina analytics após 365 dias e metadata de vídeos pendentes após um dia. No R2, mantenha a regra lifecycle de `pending/` do guia de ambiente. Sem o cron, eventos antigos permanecem; configure antes de abrir o site ao público.
- A versão anterior pode ser reimplantada sem remover as colunas adicionadas. Não execute down migration destrutiva para voltar o código. Se houver problema de dados, restaure primeiro numa base separada e planeje a troca; não sobrescreva produção sem conferir impacto.
- Arquivos ficam no R2, nunca no disco efêmero da Railway. Mantenha estratégia de backup do bucket. Apagar conteúdo não garante apagar cópias já baixadas. Objetos de vídeo cujos artigos/projetos sejam removidos podem exigir limpeza operacional; não aplique lifecycle indiscriminado ao prefixo `videos/`.
- Cache de conteúdo é local por processo por 60 s. Com múltiplas réplicas, alterações podem levar esse tempo para aparecer em outra réplica. Comece com uma réplica; autenticação e rate limits usam o banco.

## Diagnóstico

| Sintoma | Verificação |
|---|---|
| Build falha por env pública | Não prefixe secrets com `NEXT_PUBLIC_`. Confira a URL e o Account ID usados na imagem. |
| Healthcheck 503 | Env completas; Postgres disponível; pre-deploy concluído; `DATABASE_URL` com usuário correto; logs do serviço. |
| Migration recusa owner | `DATABASE_URL` deve usar `portfolio_app`; `MIGRATION_DATABASE_URL` usa dono. |
| Checksum alterado | Restaure a migration histórica; escreva uma nova. Não altere a tabela de checksums para esconder mudança. |
| Login retorna erro de origem | A URL usada no navegador deve coincidir com `NEXT_PUBLIC_SITE_URL`; refaça build após trocar domínio. |
| PDF 404 | Artigo publicado, anexo público e pronto; certificado visível com PDF associado; projeto publicado; ID correto. |
| R2 403 | Token Object Read & Write no bucket certo, Account ID correto, relógio correto e URL não expirada. |
| Vídeo não envia | CORS com origem exata e PUT, CSP com Account ID do build, arquivo MP4/WebM real, limite 500 MB. |
| Vídeo não reproduz | Codec suportado pelo navegador e contêiner válido; MIME correto; artigo/projeto publicado; token R2. |
| Contagem não muda no reload | Deduplicação de 30 min para views e 1 min para downloads; teste visitante anônimo; Do Not Track reduz contagem. |

## Comandos essenciais

```sh
npm ci
npm run check
npm run db:migrate
npm run admin -- create --email SEU_EMAIL --name "Fernando Osman"
npm start
```

Na Railway, build/pre-deploy/start são automáticos pelo arquivo de configuração. O deploy real e o DNS dependem da conta do proprietário; os testes locais não substituem o checklist do primeiro release.
