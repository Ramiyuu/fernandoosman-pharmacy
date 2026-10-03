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

Montserrat variável local para interface e identidade; Source Serif 4 local para leitura longa. Sem requisições a fontes externas. Escala: 12 px para metadata, 14 px para controles, 16 px para interface, 18–20 px para corpo editorial, 24/32/40/48 px para títulos. Hero usa `clamp(3.2rem,6.6vw,6.25rem)`, peso 550 e tracking -0.04em; títulos das etapas da história usam `clamp(2rem,3.4vw,3rem)`. Corpo 400, controles 500–600, títulos 600. Entrelinha 1.5–1.8 para leitura e 1.02–1.2 para títulos. Artigos limitados a aproximadamente 68 caracteres por linha.

## Layout e espaçamento

Escala base 4 px: 4, 8, 12, 16, 24, 32, 48, 64, 80, 96. Container principal 76 rem; conteúdo de leitura 68 ch; painel até 90 rem. Grelhas com `minmax(0,1fr)`, 1 coluna no celular, 2 no tablet e 3 em listagens desktop. A abertura da home é uma seção navy contínua: hero com o texto à esquerda (até 37 rem) e três etapas da história (Molécula, Ensaio, Evidência), cada uma com cerca de 88 dvh quando o WebGL está ativo. Perfil tem seção própria com fundo claro e espaço editorial. Cards contêm imagem, categoria, título, resumo e metadata nessa ordem.

## Superfícies e profundidade

Raios: 4/6/10/14 px; botões do hero e o CTA de contato usam 10 px, com o ícone do botão principal num bloco próprio de 7 px. Sombras suaves e tingidas de navy apenas em cartões interativos, perfil e overlays. A abertura combina navy, uma malha discreta (papel milimetrado atrás dos gráficos), halos azul/teal e a nuvem de partículas. Glass fica restrito às pequenas etiquetas científicas e aos cabeçalhos aderentes. Evitar blur sobre corpo de artigo e formulários. Sem texturas grandes ou imagens decorativas pesadas.

## Movimento e 3D

Um único momento autoral: "da molécula à evidência". Em telas a partir de 768 px, com WebGL e sem `prefers-reduced-motion`, um canvas fixo atrás da abertura mostra uma nuvem de partículas (WebGL puro, GLSL ES 1.0, uma chamada de desenho, sem Three.js; 5–7 mil pontos, DPR até 1,75). Ela se monta como o ácido acetilsalicílico em bolas e bastões, vira duas curvas de Kaplan-Meier simuladas (rotuladas como ilustrativas) quando a etapa Ensaio entra, e vira a rede de tópicos reais do acervo na etapa Evidência. Partículas fogem do cursor; o render pausa fora da tela e com a aba oculta. Celular, reduced motion e navegadores sem WebGL recebem as mesmas formas como SVG estático (`src/features/home/evidence/figures.tsx`), geradas da mesma geometria.

Movimento de apoio, sempre explicando algo: o texto de cada etapa entra e sai com a própria etapa (linha do tempo de rolagem); cartões de artigo entram como lista, coluna a coluna; a "Tabela 1" de métricas se revela da esquerda para a direita; os marcadores do forest plot de tópicos crescem até a parcela de cada tópico; o cabeçalho ganha sombra ao rolar; artigos têm barra de progresso de leitura. Ponteiro: borda com luz que segue o cursor em cartões, inclinação de até 2,5° e elevação de 4 px nos cartões de artigo, deriva magnética de até 6 px no CTA principal e no de contato. Transições de página: a página antiga sai em 140 ms e a nova entra em 380 ms; a capa do artigo faz morph entre cartão e página quando existe. Easing padrão `cubic-bezier(0.16, 1, 0.3, 1)`.

Tudo que depende de `animation-timeline` é aprimoramento progressivo: sem suporte, o conteúdo aparece estático e visível. Sob `prefers-reduced-motion`, ficam só mudanças de cor e opacidade com sentido (seletor de idioma, luz da borda, progresso de leitura). Números não são animados; estatísticas vêm do banco.

## Artigos e mídia

Fonte serifada para texto, sans para títulos/metadata/referências e tabelas. Listas e citações mantêm hierarquia. Tabelas rolam em região própria; fórmulas usam KaTeX com `trust:false`. Imagens têm alt e carregamento adequado. Vídeos têm `preload=none`; players externos exigem clique antes de contatar o provedor. O autor deve fornecer legendas no vídeo e transcrição no artigo.

## Idiomas

O site público é bilíngue, com prefixo em todas as URLs: `/en/articles` e `/pt/artigos` (segmentos traduzidos; ver `src/i18n/routing.ts`). O seletor EN | PT no cabeçalho tem um marcador que desliza; ele leva para a versão traduzida quando a página publica `hreflang` e guarda a escolha num cookie funcional (`fo-locale`). Um texto exibido na interface do outro idioma (ainda sem tradução) leva um selo de idioma no cartão e um aviso na página. Textos da interface ficam em `src/i18n/dictionaries/`; conteúdo vem do banco no idioma do visitante.

## Administração

Sidebar navy com marca FO / Studio, posição ativa marcada por cor e faixa lateral. A interface do painel continua em inglês. Editores de artigo e projeto têm abas EN | PT na barra superior; o idioma que falta aparece como "Create … version" (borda tracejada teal). Campos em português de perfil, tópicos e configurações ficam em blocos "Portuguese version"; tópicos sem nome em português mostram "PT missing". Formulários em seções brancas; ações explícitas de salvar/publicar, estados de erro e aviso de alterações pendentes. Preview do perfil reaproveita o componente público. Formação, experiência e certificados permanecem no perfil para não duplicar CRUD. Biblioteca unifica mídia; analytics e auditoria são áreas próprias. Drawer no celular, navegação por teclado e confirmação para exclusões.

## Responsividade e revisão

Verificar 1440, 1280, 1024, 768, 430 e 390 px, em `/en` e `/pt`: sem overflow do documento, menu operável, controles visíveis, títulos sem recortes, foco, contraste e reduced motion. A cena WebGL deve ficar à direita da coluna de texto nos três estados. `npm run test:e2e` salva screenshots em `test-results/visual/`. Artefatos de teste não são versionados.
