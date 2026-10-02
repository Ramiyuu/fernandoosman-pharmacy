# Validação local — 02/10/2026

Executada sobre a versão final em Windows, Node 24.18.1, Next.js 16.3.8 e Chromium do Playwright. Banco PostgreSQL em memória (PGlite), migrations reais e S3 de teste com validação SigV4. Nenhuma conta ou base produtiva foi alterada.

## Resultados

| Verificação | Resultado |
|---|---|
| `npm run lint` | Passou |
| `npm run typecheck` | Passou |
| `npm test` | 121 testes passaram, 10 arquivos |
| `npm run build` | Passou, inclusive sem secrets de banco/auth/storage |
| `npm start` | Build de produção servido e testado |
| `npm run test:e2e` | 6 testes passaram, aproximadamente 2,5 minutos |
| Migrations | 15 aplicadas em banco vazio; históricas sem alteração |
| Responsividade | 29 páginas/estados × 6 larguras = 174 capturas; HTTP 200, h1 e ausência de transbordamento horizontal |
| Endpoints | `/api/health`, `/rss.xml`, `/sitemap.xml`, `/robots.txt`: HTTP 200 e content types corretos |
| Headers | CSP, nosniff, Referrer-Policy e Permissions-Policy presentes |
| `git diff --check` | Passou |
| Segredos | Credenciais conhecidas do arquivo local ausentes dos arquivos versionáveis; sessões/fixtures locais ignoradas |

## Fluxos exercitados no navegador

1. Redirecionamento de acesso anônimo ao painel, API administrativa retornando 401, login, configuração obrigatória de TOTP, bloqueio antes de concluir TOTP, logout e novo login com segundo fator. Cookie de sessão HttpOnly.
2. Atualização de perfil, criação/leitura/edição/exclusão de formação, experiência e certificado. Upload de PDF pelo widget e proteção até associar a certificado público; após excluir o certificado, o acesso anônimo ao PDF retorna 404.
3. PDF inválido rejeitado, requisição de origem externa bloqueada, imagem PNG real aceita, PDF visualizado e baixado por endpoints distintos, URL de 60 segundos e assinatura expirada rejeitada. Relatório administrativo mostra os eventos.
4. Artigo criado, salvo, editado, publicado e despublicado. Anexo marcado público continua protegido em rascunho. Vídeo WebM real gerado por MediaRecorder, enviado via URL assinada, validado e decodificado pelo Chromium. PDF/vídeo passam de 404 a redirect quando publicados e voltam a 404 após despublicar.
5. Navegação mobile abre e fecha por teclado. Capturas em 1440, 1280, 1024, 768, 430 e 390 px de home, artigos/listagem/leitura/editor, perfil, certificados, experiência, projetos/listagem/detalhe/editor, tópicos/detalhe, CV, contato, busca, privacidade e telas administrativas (dashboard, perfil, mídia PDF/imagens, analytics, artigos, projetos, taxonomias, audit, mensagens, segurança e configurações).

Capturas ficam em `test-results/visual/`, ignoradas no Git. As verificações geométricas são automatizadas; a inspeção visual é amostral e não equivale a certificação de acessibilidade. Corrigidos durante a validação: alias SQL do relatório, privilégios de inserção/deduplicação, transbordamentos do dashboard/biblioteca e títulos semânticos dos editores.

## Limites

- Sem deploy real, DNS/SSL, token R2 produtivo ou teste de recuperação de backup produtivo.
- Docker não disponível neste computador: build e execução Next validados; imagem Docker não construída localmente.
- Chromium somente; outros navegadores, leitores de tela e codecs precisam de validação adicional conforme o público.
- Testes RLS e migrations usam PostgreSQL/PGlite isolado, sem cópia dos dados reais. Fazer backup e validar as migrations no ambiente de homologação antes do release.
- Em uma execução intermediária, Vitest avisou sobre encerramento lento de workers; a execução final encerrou normalmente com código zero. Fechar páginas durante streaming gerou avisos de conexão interrompida em execuções intermediárias, sem falha nos fluxos finais.

Para reproduzir, siga [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md). Limitações operacionais e resumo das mudanças: [DELIVERY_SUMMARY.md](DELIVERY_SUMMARY.md).
