## Editor de Mapas Avançado (estilo Wikiloc) — página Aspersores

Vou estender o editor SVG que já existe em `src/pages/Aspersores.tsx` (que já tem pan/zoom, ícones, texto, imagem, linha, seta, snap, seleção e alças) até um editor GIS completo, sem trocar o motor de renderização nem o PDF-mapa atual. Nada existente é removido — só adiciono.

### Escopo

1. **Modo Edição explícito**
   - Botão "Editar Mapa" que alterna `editMode`. Fora do modo edição: só pan/zoom e visualização. Dentro: barra de ferramentas + alças + atalhos.

2. **Barra de ferramentas GIS** (topo, recolhível, responsiva)
   - Marcador, Aspersor, Número, Seta, Texto, Linha, Polígono, Círculo, Medição, Rota, Camadas, Cor, Agrupar, Excluir, Desfazer/Refazer, Salvar.

3. **Biblioteca de ícones** (painel lateral com abas)
   - Irrigação (aspersor 360/180, microaspersor, difusor, registro, válvula, bomba, caixa, tubulação, filtro).
   - Geral (local, casa, empresa, depósito, poste, árvore, obstáculo, portão, cerca, entrada, saída).
   - Numeração (1–1000+, número editável inline).
   - Direções (seta simples, dupla, curva, circular, grande, pequena).
   - Cursor "carrega" o ícone selecionado e cria no clique.

4. **Novas primitivas**
   - **Polígono**: cliques criam vértices, duplo clique fecha; vértices editáveis (mover, adicionar por clique na aresta, remover por duplo clique), preenchimento + opacidade.
   - **Círculo**: centro + raio, alça de raio.
   - **Rota (Wikiloc)**: sequência de pontos, duplo clique finaliza; edição de pontos, inverter direção, indicadores de sentido, distância acumulada e comprimento total, contagem de pontos.
   - **Medição**: régua (distância) e área/perímetro em m/km e m²/ha, com base na escala do mapa PDF.
   - **Texto livre**: já existe — adiciono negrito/itálico, contorno, sombra, transparência.
   - **Linha**: adiciono pontilhada/tracejada, curva (bezier), setas nas extremidades, edição posterior dos pontos.

5. **Painel de Propriedades (lateral direito)**
   - Ao selecionar qualquer objeto: nome, descrição, cor, escala, rotação, opacidade, espessura, tamanho, fonte, negrito, itálico, cor do texto, contorno, sombra, camada, visibilidade, travas (posição/rotação/escala), duplicar, excluir.

6. **Alças e manipulação**
   - Mantenho as alças grandes já existentes (redimensionar, rotacionar). Adiciono: espelhar horizontal/vertical, ajuste fino (setas do teclado = 1px, Shift = 10px), escala proporcional (Shift) vs. independente.

7. **Camadas**
   - Painel lateral esquerdo com camadas: Aspersores, Tubulação, Rotas, Texto, Numeração, Áreas, Linhas, Ícones.
   - Cada camada: mostrar/ocultar, bloquear, renomear, reordenar (drag), cor padrão.

8. **Agrupamento e seleção múltipla**
   - Ctrl/Cmd + clique, marquee de seleção (arrastar em área vazia com ferramenta Seta), Ctrl+A, inverter seleção. Agrupar/desagrupar, mover/duplicar/excluir em bloco.

9. **Snap inteligente**
   - Snap a grade (já existe), snap a ângulo (já existe), snap a outros objetos (centros e bordas), guias dinâmicas horizontais/verticais, alinhamento (esquerda/centro/direita/topo/meio/base) e distribuição igual.

10. **Histórico**
    - Undo/redo ilimitado por "commit" (cada operação encerrada). Estados imutáveis com estrutura compartilhada. Atalhos Ctrl+Z / Ctrl+Shift+Z.

11. **Persistência**
    - Cada objeto salva: id, tipo, coordenadas (SVG + lat/lng aproximada via transform do PDF), escala, rotação, cor, texto, ícone, camada, descrição, created_at, created_by, updated_at, updated_by.
    - Autosave debounced (2s) + botão Salvar. Continua usando a tabela de objetos do mapa já existente.

12. **Import/Export**
    - Export: JSON e GeoJSON nativos; PNG e SVG via serialização do `<svg>`; PDF via `pdfDownload.ts`; KML/KMZ gerados a partir do GeoJSON.
    - Import: JSON, GeoJSON, KML, KMZ (KMZ = unzip do KML + assets via JSZip).

13. **Pesquisa**
    - Campo de busca (nome, número, descrição, tipo, ícone). Resultado: centraliza no objeto, seleciona, pisca 3x, abre painel de propriedades.

14. **Mobile**
    - Gestos: pinça = zoom, dois dedos = pan, toque longo = selecionar/editar, arrastar = mover, alças ampliadas (já são grandes) para toque. Barra vira gaveta inferior recolhível.

15. **Performance**
    - Renderização com `<g>` por camada + `will-change: transform`. Virtualização por viewport (culling: só renderiza objetos dentro do bbox visível com margem). Memoização por objeto. Cache local dos ícones (sprite SVG). Autosave em worker de idle. Realtime via canal Supabase já usado.

### Detalhes técnicos

- Estado central: `useReducer` com ações tipadas (`ADD`, `UPDATE`, `DELETE`, `GROUP`, `REORDER_LAYER`, ...) e pilha undo/redo baseada em snapshots do reducer.
- Tipos de objeto unificados: `MapObject = Marker | Sprinkler | NumberMark | Arrow | Text | Line | Polygon | Circle | Route | Measure | Image | Icon`.
- Camadas: array ordenado; cada objeto tem `layerId`.
- Snap: função `snapPoint(p, others, opts)` consultada em drag/create.
- Import KML/KMZ: `jszip` + parser XML nativo; conversão bidirecional com GeoJSON.
- Coordenadas: mantenho sistema SVG do PDF-mapa atual; conversão para lat/lng só na exportação usando os âncoras de calibração existentes (se não houver, exporto em coordenadas do mapa).
- Estrutura de arquivos nova (sem tocar em nada existente):
  ```text
  src/pages/Aspersores.tsx                (integra o editor)
  src/features/map-editor/
    MapEditor.tsx
    Toolbar.tsx
    IconLibrary.tsx
    PropertyPanel.tsx
    LayersPanel.tsx
    SearchBar.tsx
    hooks/useEditorState.ts               (reducer + undo/redo)
    hooks/useSnap.ts
    hooks/useSelection.ts
    hooks/useAutosave.ts
    render/                               (um componente por tipo)
    io/exportJson.ts exportGeoJson.ts exportKml.ts exportPng.ts exportSvg.ts
    io/importKml.ts importGeoJson.ts
    icons/irrigacao.ts geral.ts direcoes.ts numeros.ts
    types.ts
  ```
- Banco: reaproveito a tabela atual de objetos do mapa da página Aspersores; se faltar coluna para `layer_id`, `locked`, `description`, `style_json`, adiciono via migration aditiva (sem quebrar linhas antigas).
- Dependências novas: `jszip` (KMZ). Nada mais.

### Fora de escopo desta entrega
- Trocar o mapa base (continua o mesmo já carregado).
- Autenticação, usuários, RLS existente — inalterados.
- Reescrever o PDF-mapa ou o pan/zoom atuais.

### Como será entregue
Por ser um módulo grande, entrego em uma única leva mas em arquivos separados e pequenos. Depois de aprovar este plano, começo pelos tipos + reducer + toolbar + polígono/círculo/rota, depois camadas + propriedades + histórico, e por fim import/export + busca + mobile.
