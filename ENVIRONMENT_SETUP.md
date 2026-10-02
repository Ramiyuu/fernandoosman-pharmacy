# Configuração de ambiente, banco e Cloudflare R2

Use Node 24 e npm. O arquivo `.env.example` contém somente exemplos. Copie para `.env.local` (PowerShell: `Copy-Item .env.example .env.local`) e substitua os valores. Nunca coloque credenciais em arquivos versionados. `.env.credentials-backup`, se existir, é uma cópia local ignorada, não é carregada pela aplicação. Credenciais que tenham sido compartilhadas devem ser revogadas/substituídas no provedor.

Na Railway, abra o projeto → serviço **web** → **Variables** → **New Variable** (ou **Raw Editor**), informe cada nome/valor e confirme as alterações. Variáveis de referência `${{...}}` funcionam na Railway; elas não são interpoladas em `.env.local`. Variáveis já exportadas no processo prevalecem sobre os arquivos.

## Todas as variáveis da aplicação

| Nome | Obrigatória / escopo | Formato e exemplo fictício | Onde obter e uso |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Sim; pública, build e runtime | `http://localhost:3000`; produção `https://cobaltteam.com.br` | URL canônica do serviço/domínio. Usada por SEO, sitemap, origem CSRF e Better Auth. Sem caminho/barra final. Rebuild após mudar. |
| `DATABASE_URL` | Sim; servidor | `postgresql://portfolio_app:SENHA_HEX_48@HOST:5432/railway` | Montar com host/porta/banco do Postgres e senha própria. Conexão de privilégio mínimo da aplicação. |
| `MIGRATION_DATABASE_URL` | Sim para migrations/admin/manutenção; servidor | `postgresql://postgres:SENHA@HOST:5432/railway` | Railway Postgres → Variables → connection string privada. No web, usar referência ao valor real disponível no serviço Postgres. Não usar no navegador. |
| `DATABASE_POOL_MAX` | Opcional; servidor, padrão 10 | Inteiro 1–50: `10` | Limita conexões por instância. Ajuste conforme capacidade do banco e número de réplicas. |
| `BETTER_AUTH_SECRET` | Sim; servidor | Pelo menos 32 caracteres aleatórios | Gere pelo comando abaixo; assina sessões e cifra segredos TOTP. |
| `R2_ACCOUNT_ID` | Sim; servidor e build | 32 dígitos hexadecimais | R2 → Account details. Identifica o endpoint e o host permitido na CSP; não é uma chave secreta. |
| `R2_ACCESS_KEY_ID` | Sim; servidor | Access Key ID do token S3 | Gerado no token R2; nunca disponibilizar ao navegador. |
| `R2_SECRET_ACCESS_KEY` | Sim; servidor | Secret Access Key do token S3 | Exibido uma vez ao criar token; assinatura SigV4. |
| `R2_BUCKET` | Sim; servidor | `fernando-portfolio` | Nome exato do bucket privado. |
| `R2_ENDPOINT` | Opcional; servidor/build local | `http://127.0.0.1:54330` | Somente S3 local/testes. Deixe vazio no R2 real; endpoint derivado do Account ID. Não inclua nome do bucket. |
| `PDF_MAX_SIZE_MB` | Opcional; servidor; padrão 30 | Inteiro até 100: `30` | Limite de PDF em MB; corpo real é limitado no handler. |
| `IMAGE_MAX_SIZE_MB` | Opcional; servidor; padrão 4 | Inteiro até 10: `4` | Limite de imagem. |
| `CONTACT_RETENTION_DAYS` | Opcional; servidor; padrão 365 | Inteiro 30–3650 | Retenção de mensagens de contato. |
| `TRUSTED_IP_HEADER` | Opcional; servidor | `x-forwarded-for` | Cabeçalho sobrescrito pelo proxy confiável. Railway: manter padrão. Cloudflare: veja o guia de deploy antes de mudar. |
| `PORT` | Automática na Railway; opcional local | `3000` | Porta lida por `next start`. Não hardcode a porta atribuída pela Railway. |
| `NODE_ENV` | Automática por Next/Docker | `development`, `test`, `production` | Controla otimizações e bloqueio do seed em produção. Não definir `production` para o servidor dev. |
| `NEXT_TELEMETRY_DISABLED` | Opcional; build/runtime | `1` | Desativa telemetria do framework; Docker já define. |

Não existe `BETTER_AUTH_URL` separado: a configuração segura equivalente usa `NEXT_PUBLIC_SITE_URL` como `baseURL` e origem permitida. Não adicionar duas URLs divergentes. O limite de vídeo é 500 MB, definido no servidor; não depende de env.

Geração de senhas/chaves (funciona em PowerShell, macOS e Linux):

```sh
node -e "console.log(require('node:crypto').randomBytes(24).toString('hex'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Use a primeira saída como senha do `portfolio_app`; a segunda como `BETTER_AUTH_SECRET`. Não use esses comandos dentro de logs de CI compartilhados. Se usar outra senha na connection string, escape caracteres reservados com percent encoding.

## PostgreSQL na Railway, passo a passo

1. Abra o projeto Railway → **New** → **Database** → **PostgreSQL**. Aguarde o serviço iniciar. Use PostgreSQL 16 ou superior.
2. Clique no serviço Postgres → **Variables**. Identifique `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` e a connection string privada disponível. Os nomes de conexão podem variar por template; confira que o host aponta para a rede interna.
3. No serviço web → **Variables**, configure `MIGRATION_DATABASE_URL` referenciando a string do proprietário. Exemplo quando ela existe: `${{Postgres.DATABASE_URL}}`. Se o serviço se chama diferente, use o nome mostrado na interface.
4. Configure **outra** conexão em `DATABASE_URL`: `postgresql://portfolio_app:SENHA_HEX@${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}`. Não copie a conexão do proprietário nos dois campos. O migrador recusa esse caso.
5. Configure o pre-deploy `npm run db:migrate`. O comando cria as tabelas, papéis, políticas e o login `portfolio_app` com a senha escolhida. O web só usa esse login.
6. Faça deploy. `/api/health` deve retornar HTTP 200 e `{"status":"ok"}`. HTTP 503 indica erro de env, banco, permissões ou migrations; consulte logs sem copiar segredos.
7. Localmente, use um PostgreSQL local com banco vazio e suas respectivas strings em `.env.local`. A rede privada `*.railway.internal` não é acessível do computador. Para manutenção produtiva, prefira `railway ssh` dentro do serviço; não abra permanentemente o banco ao público.

Nunca executar migrations estruturais sem backup de um banco existente. O projeto usa SQL incremental com checksum; não edite arquivos já aplicados. Consulte `DEPLOYMENT_RAILWAY.md` para backup e rollout.

## Cloudflare R2, passo a passo

1. Crie/acesse sua conta no painel Cloudflare. Abra **R2 Object Storage**; ative o serviço, se solicitado.
2. Clique **Create bucket**, informe um nome como `fernando-portfolio` e crie. Use outro bucket/token para desenvolvimento. Deixe **Public access** e o domínio `r2.dev` desativados.
3. Na visão do R2, copie **Account ID** para `R2_ACCOUNT_ID`. O endpoint resultante é `https://ACCOUNT_ID.r2.cloudflarestorage.com`; não precisa preencher `R2_ENDPOINT`.
4. Abra **Manage R2 API Tokens** → **Create API Token**. Escolha **Object Read & Write**, restrito ao bucket criado. Salve o token com nome identificável, como `portfolio-production`.
5. Copie **Access Key ID** para `R2_ACCESS_KEY_ID` e **Secret Access Key** para `R2_SECRET_ACCESS_KEY`. A chave secreta é exibida uma vez. `R2_BUCKET` recebe o nome exato do bucket. Não confunda o token da API REST Cloudflare com essas credenciais S3.
6. No bucket → **Settings** → **CORS policy**, adicione a origem real do site para uploads diretos de vídeo:

```json
[
  {
    "AllowedOrigins": ["https://cobaltteam.com.br"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

No bucket de desenvolvimento, troque a origem por `http://localhost:3000`. Não use `*` indiscriminadamente. Imagens e PDFs passam pelo backend e não exigem CORS; vídeos passam diretamente ao R2.

7. Em **Object lifecycle rules**, crie regra para o prefixo `pending/` apagar objetos após 1 dia. É a área de quarentena dos vídeos. A URL de upload vale 300 segundos; a conclusão confere tamanho, MIME, assinatura do contêiner e ETag antes de copiar para uma chave definitiva, que não pode ser sobrescrita pela URL de upload. Arquivos pendentes não são servidos publicamente.
8. No painel do site, faça upload de imagem pelo perfil, PDF por artigo/certificado, e vídeo pelo editor após salvar o artigo/projeto. Vídeo precisa de título; forneça transcrição e legendas adequadas.
9. Para testar download, publique o artigo, marque o anexo público, abra uma janela anônima e use **Download**. A requisição ao próprio site deve responder 302, seguida pelo R2. A URL terá `X-Amz-Expires=60`; copiá-la após expirar deve falhar. Nunca salve essa URL no banco ou em posts. Use sempre `/api/files/ID?download=1`.
10. **View PDF** registra `file_view`; **Download** registra `file_download`. Consulte `/admin/analytics`. Previews de admin são excluídos da contagem de arquivos; teste em janela anônima. Os números medem emissão de links, não confirmação de salvamento em disco.

Fontes oficiais: [tokens R2](https://developers.cloudflare.com/r2/api/tokens/), [CORS](https://developers.cloudflare.com/r2/buckets/cors/), [URLs assinadas](https://developers.cloudflare.com/r2/api/s3/presigned-urls/).

## Primeiro administrador e recuperação

No ambiente configurado (local ou `railway ssh`):

```sh
npm run admin -- create --email seu-email@exemplo.com --name "Fernando Osman"
```

O terminal pede a senha duas vezes sem mostrá-la. Não há senha padrão, criação automática de admin ou cadastro público. Abra `/admin/login`, informe e-mail/senha, confirme a senha para iniciar TOTP, escaneie o QR no autenticador, guarde códigos de backup e confirme o código. O painel permanece bloqueado até concluir.

```sh
npm run admin -- reset-password --email seu-email@exemplo.com
npm run admin -- reset-2fa --email seu-email@exemplo.com
npm run admin -- revoke-sessions --email seu-email@exemplo.com
npm run admin -- list
```

Ao trocar `BETTER_AUTH_SECRET`, sessões e segredos TOTP antigos deixam de ser válidos. Revogue sessões, execute reset de 2FA para o administrador e refaça a configuração. Não coloque senha em argumento de linha de comando.

## Variáveis exclusivas dos testes

`E2E_SITE_URL` (URL, padrão `http://localhost:3000`), `E2E_DB_PORT` (inteiro, padrão 54329), `E2E_R2_PORT` (inteiro, padrão 54330), `E2E_VERBOSE` (`1` para log do storage). São lidas pelos scripts de teste/Playwright; nunca necessárias em produção. O stack escreve `.e2e/env`, com credenciais fictícias válidas só nos serviços locais. `CI` é opcional e gerenciada pelo ambiente de integração. Capturas, sessão de navegador e chave TOTP dos testes ficam em diretórios ignorados.
