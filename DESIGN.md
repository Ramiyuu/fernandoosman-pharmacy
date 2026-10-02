# FO — sistema visual

Direção: um portfólio de pesquisa contemporâneo, com a clareza de um periódico científico e a presença de uma marca pessoal. Os assets FO de `public/brand/` são derivados da identidade original; não há branding Cobalt.

## Cores e semântica

| Papel | Cor |
|---|---|
| Texto, estrutura, marca | Navy `#0B1F44` |
| Fundo profundo | `#071531` |
| Ações e links | Blue `#2563EB`; texto de links `#1D4ED8` |
| Destaques científicos | Teal `#14B8A6`; texto teal `#0F766E` |
| Superfícies | White `#FFFFFF`, Mist `#F5F7FA` |
| Bordas | Gray `#E5E7EB` |
| Texto secundário | `#545F70` |
| Sucesso / atenção / erro | `#1B6E45` / `#8A4B00` / `#B42318`, sempre com texto ou ícone |

Tokens em `src/app/globals.css`. Teal claro não é usado como texto pequeno sobre branco. Foco tem contorno visível; status não depende só da cor.

## Tipografia

Montserrat variável local para interface e identidade; Source Serif 4 local para leitura longa. Sem requisições a fontes externas. Escala: 12 px para metadata, 14 px para controles, 16 px para interface, 18–20 px para corpo editorial, 24/32/40/48 px para títulos. Hero usa `clamp(3.4rem,6.8vw,6.5rem)` e peso 550. Corpo 400, controles 500–600, títulos 600. Entrelinha 1.5–1.8 para leitura e 1.02–1.2 para títulos. Artigos limitados a aproximadamente 68 caracteres por linha.

## Layout e espaçamento

Escala base 4 px: 4, 8, 12, 16, 24, 32, 48, 64, 80, 96. Container principal 76 rem; conteúdo de leitura 68 ch; painel até 90 rem. Grelhas com `minmax(0,1fr)`, 1 coluna no celular, 2 no tablet e 3 em listagens desktop. Hero assimétrico em duas colunas acima de 1024 px. Perfil tem seção própria com fundo claro e espaço editorial. Cards contêm imagem, categoria, título, resumo e metadata nessa ordem.

## Superfícies e profundidade

Raios: 4/6/10/14 px. Sombras suaves apenas em cartões interativos, perfil e overlays. O hero combina navy, uma malha discreta, halo azul/teal e órbitas em CSS. Glass fica restrito às pequenas etiquetas científicas e aos cabeçalhos aderentes. Evitar blur sobre corpo de artigo e formulários. Sem texturas grandes ou imagens decorativas pesadas.

## Movimento e 3D

Entrada coordenada do hero (0.7–1 s) e movimento lento da marca (8 s), apenas desktop sem `prefers-reduced-motion`. Hover de cards: deslocamento máximo 4 px em 200 ms. Botões: feedback discreto de cor. A órbita usa perspectiva CSS; não inclui Three.js/WebGL, preservando carga leve. No mobile, a composição é menor e estática. Não animar números de forma que dificulte leitura; estatísticas vêm do banco. Não introduzir transições de página que atrasem navegação ou roubem foco.

## Artigos e mídia

Fonte serifada para texto, sans para títulos/metadata/referências e tabelas. Listas e citações mantêm hierarquia. Tabelas rolam em região própria; fórmulas usam KaTeX com `trust:false`. Imagens têm alt e carregamento adequado. Vídeos têm `preload=none`; players externos exigem clique antes de contatar o provedor. O autor deve fornecer legendas no vídeo e transcrição no artigo.

## Administração

Sidebar navy com marca FO / Studio, posição ativa marcada por cor e faixa lateral. Formulários em seções brancas; ações explícitas de salvar/publicar, estados de erro e aviso de alterações pendentes. Preview do perfil reaproveita o componente público. Formação, experiência e certificados permanecem no perfil para não duplicar CRUD. Biblioteca unifica mídia; analytics e auditoria são áreas próprias. Drawer no celular, navegação por teclado e confirmação para exclusões.

## Responsividade e revisão

Verificar 1440, 1280, 1024, 768, 430 e 390 px: sem overflow do documento, menu operável, controles visíveis, títulos sem recortes, foco, contraste e reduced motion. `npm run test:e2e` salva screenshots em `test-results/visual/`. Artefatos de teste não são versionados.
