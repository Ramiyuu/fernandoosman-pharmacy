# Auditoria do projeto — 02/10/2026

Auditoria realizada antes das alterações. O repositório existente será ampliado, não recriado.

## Stack e funcionalidades existentes

Next.js 16.3.8 App Router, React 19, TypeScript strict, Tailwind 4, Radix, React Hook Form/Zod, Tiptap/KaTeX. PostgreSQL com SQL parametrizado, migrations com checksum, RLS e papéis mínimos; Kysely no adaptador Better Auth. Não há Supabase. R2 privado com SigV4, PDFs assinados por 60 segundos e imagens via proxy. Autenticação privada sem cadastro, sessões HttpOnly, TOTP obrigatório, códigos de recuperação, limites persistentes no banco. Artigos, referências, taxonomias, projetos, perfil/CV, mensagens, configurações, busca full text e logs já existem.

## Lacunas e riscos encontrados

- Não existem eventos de visualização/download nem relatórios de analytics. Abrir PDF e baixar usam o mesmo handler sem contagem.
- Formação, experiência e certificados são arrays no perfil; faltam atributos, visibilidade individual e documentos de certificados. Preservar dados existentes ao ampliar.
- Não existem upload de vídeo, RSS, healthcheck nem configuração Railway versionada.
- `.env.example` foi modificado localmente com credenciais. Preservar cópia ignorada, retirar valores do arquivo versionado e recomendar rotação. Não publicar segredos.
- O exemplo local usa a conexão do dono do banco também como conexão da aplicação; isso elimina a defesa de privilégio mínimo. Documentar e impedir configuração insegura.
- Seed é opcional, mas permite sobrescrever conteúdo; bloquear em produção e em bancos com conteúdo existente.
- Uploads multipart confiam no tamanho declarado antes de carregar o corpo; adicionar limite real de leitura.
- Imagens têm URLs públicas imutáveis, incluindo imagens do editor. Não armazenar material confidencial nelas; PDFs são privados e passam pelo RLS.
- CSP existente permite scripts inline necessários ao Next.js; sanitização estruturada do editor já evita HTML arbitrário. Melhorias devem preservar hidratação e matemática.
- Layout atual é plano: hero tipográfico sem composição visual forte, cartões pouco distintos, perfil pequeno e navegação administrativa extensa. Reorganizar mantendo identidade FO e fontes locais.
- Testes unitários/RLS existem. Não há suíte de navegador automatizada; o stack E2E em memória já oferece PostgreSQL e S3 com validação de assinatura. Execução inicial de Vitest encontrou bloqueio de subprocesso (EPERM) no sandbox, não falha de asserção.

## Plano de implementação

1. Proteger exemplos de ambiente e operações de banco. Preservar migrations antigas e dados; adicionar somente migrations incrementais.
2. Ampliar perfil/certificados e anexos, implementar analytics com dados mínimos, autorização e deduplicação, biblioteca de mídia e vídeo seguro.
3. Redesenhar home, navegação, cartões, leitura, perfil e painel com navy/azul/teal, tipografia consistente, mobile e reduced motion.
4. Completar RSS, healthcheck, configuração Railway e guias de ambiente, desenvolvimento, deploy, domínio e recuperação de acesso.
5. Executar lint, typecheck, testes de banco/segurança, build e navegador nas seis larguras solicitadas. Registrar limitações reais de serviços externos.
6. Revisar diff e segredos, commit e push conforme solicitado.

## Limite da auditoria de dados

Nenhum banco de produção foi acessado ou alterado. As referências Railway no arquivo local não são uma conexão utilizável fora da plataforma. Validar migrations em banco isolado, documentar backup antes de aplicar em produção e não executar seed produtivo.
