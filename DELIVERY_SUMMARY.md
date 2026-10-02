# Entrega — Fernando Osman / FO

## 1. O que já existia

Next.js 16.3.8/React 19, TypeScript strict, Tailwind/Radix, PostgreSQL com SQL parametrizado e RLS, Better Auth com TOTP obrigatório, R2 privado, Tiptap/KaTeX, artigos, projetos, perfil/CV, taxonomias, mensagens e busca. Não havia dependência de Supabase.

## 2. O que foi preservado

Arquitetura, dados e contratos existentes, autenticação privada, editor, autosave, publicação/lixeira, autorização no servidor, componentes reutilizáveis, assets FO e fontes locais. Migrations históricas `0001`–`0009` permanecem intactas. Nenhum banco produtivo foi acessado.

## 3. O que foi corrigido

Exemplo de ambiente com credenciais reais foi substituído por placeholders; a cópia original permanece somente no arquivo local ignorado `.env.credentials-backup`. Uploads passaram a limitar o corpo efetivamente lido. O migrador recusa credenciais de proprietário como conexão da aplicação. Seed não roda em produção ou sobre banco com artigos/projetos. Corrigidos transbordamentos responsivos do dashboard/tabelas, títulos semânticos nos editores e privilégios/consulta do relatório de analytics encontrados nos testes.

## 4. O que foi adicionado

- Perfil ampliado, formação/experiência com ordem, visibilidade e logos, certificados com imagem/PDF/credenciais e páginas públicas próprias.
- PDFs vinculados a projetos e certificados, eventos separados de visualização/download e relatórios por período, arquivo e conteúdo, além de audit log.
- Upload direto MP4/WebM para R2 com quarentena, verificação de assinatura e cópia condicional por ETag; proteção de rascunhos e biblioteca de vídeos. YouTube por allowlist e carregamento sob demanda.
- Notas de rodapé, seções científicas, metadata de referências, PMID, OG image e data de publicação no editor. Busca full text em referências e RSS.
- Healthcheck, Dockerfile, configuração Railway, manutenção de retenção, documentação e suíte Playwright. Playwright é a única nova dependência direta e fica em desenvolvimento.

## 5. O que foi removido

Nenhuma funcionalidade existente foi eliminada. Foram retirados os segredos do exemplo versionado e o layout antigo do hero. `next.config.ts` foi convertido para `next.config.mjs` para permitir runtime Docker sem dependências de desenvolvimento.

## 6. Banco de dados

Seis migrations aditivas (`0010`–`0015`) incluem tipo de recurso, campos de perfil, associação de PDFs a projetos, analytics com RLS/índices/deduplicação, vídeos, metadata científica, busca em referências e ações de auditoria de vídeos. Instalação sem seed cria apenas um perfil básico editável, sem estatísticas acadêmicas inventadas. As funções de artigo/busca foram atualizadas por novas migrations. Fazer backup e testar a atualização sobre uma cópia real antes do deploy.

## 7. Ambiente

Nenhum novo secret obrigatório. `PORT` foi acrescentado ao exemplo (a Railway fornece automaticamente); todas as variáveis existentes e exclusivas de teste estão documentadas em [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md). `R2_ACCOUNT_ID` também é necessário no build para a CSP. `NEXT_PUBLIC_SITE_URL` concentra o domínio, inclusive a configuração de Better Auth. Troca de domínio exige rebuild e ajuste de CORS.

## 8. Design

Hero navy com identidade FO e composição orbital leve, hierarquia tipográfica renovada, perfil em destaque, cards e métricas reorganizados, navegação administrativa e uso moderado de gradiente/profundidade. CSS com movimento reduzido e simplificação mobile, sem dependências 3D pesadas. Regras completas em [DESIGN.md](DESIGN.md).

## 9. Riscos e limites

Testes locais usam PostgreSQL em memória e um S3 isolado que valida assinatura/expiração; não comprovam contas Railway/R2 reais, DNS ou certificados HTTPS. O Dockerfile foi preparado, mas a imagem não foi construída neste computador sem Docker. O build Next e o servidor de produção foram executados localmente.

Rotacione as credenciais que estavam no exemplo local. Configure backup, cron de manutenção e lifecycle `pending/` antes do primeiro release. Imagens são públicas por desenho; PDFs/vídeos passam por autorização. A verificação de uploads não é um antivírus completo. URLs assinadas já emitidas permanecem utilizáveis até expirar, mesmo após despublicar. Os analytics medem acesso/emissão de links, não salvamento efetivo, e respeitam Do Not Track. Retenção e limpeza de objetos órfãos dependem da configuração operacional descrita nos guias. Testes de navegador foram feitos em Chromium; não representam uma auditoria completa de acessibilidade nem teste de todos os codecs/navegadores.

## 10. Deploy

Siga [DEPLOYMENT_RAILWAY.md](DEPLOYMENT_RAILWAY.md) e [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md). O repositório configura automaticamente build, pre-deploy e início na Railway:

```sh
npm ci
npm run check
npm run db:migrate
npm run admin -- create --email SEU_EMAIL --name "Fernando Osman"
npm start
```

O primeiro admin é criado por prompt seguro, sem senha padrão. O banco usa `portfolio_app` na aplicação e credencial separada para migrations. Cadastre domínio/DNS, variáveis e bucket; valide `/api/health`, login/TOTP e upload/download no ambiente real. Publicar o código no GitHub não configura automaticamente esses recursos.
