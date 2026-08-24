# Plano de Otimização Extrema de Desempenho Mobile

O objetivo é tornar a aplicação ainda mais rápida e fluida em dispositivos móveis, focando na redução de processamento da CPU, economia de memória e eliminação de atrasos na interface (lag).

## Alterações Propostas

### 1. Otimização de Listas e Renderização (RH e Presença)
- **Arquivo**: `src/pages/RH.tsx` e `src/pages/Presenca.tsx`
- **Ação**: Implementar `useDeferredValue` corretamente para que a filtragem de busca não bloqueie a thread principal durante a digitação.
- **Ação**: Aplicar `content-visibility: auto` nas linhas das tabelas e nos cards mobile para que o navegador ignore o processamento de elementos fora da tela.
- **Justificativa**: Melhora drástica na fluidez da rolagem e na resposta do teclado em listas longas.

### 2. Memoização de Componentes de Navegação
- **Arquivo**: `src/components/layout/AppSidebar.tsx`
- **Ação**: Envolver o componente `SortableNavItem` em `React.memo`.
- **Justificativa**: Evita re-renderizações desnecessárias de todos os itens do menu lateral quando o estado da sidebar muda ou durante o arraste (Drag & Drop).

### 3. Aceleração de Hardware e Refinamento de CSS
- **Arquivo**: `src/index.css`
- **Ação**: Adicionar a propriedade `will-change: transform, opacity` em elementos com transições frequentes (PageTransition, Sidebar).
- **Ação**: Criar utilitários de contenção de layout (`contain: layout paint`).
- **Ação**: Reduzir a duração das transições em mobile para 150ms.
- **Justificativa**: Garante que as animações sejam processadas pela GPU, liberando a CPU para outras tarefas.

### 4. Otimização de Efeitos e Ciclo de Vida
- **Arquivo**: `src/hooks/useRHEfetivo.ts`
- **Ação**: Otimizar o processamento de dados recebidos do backend para evitar loops de mapeamento desnecessários no client-side.
- **Justificativa**: Reduz o consumo de bateria e aquecimento do celular.

## Detalhes Técnicos
- Uso de `content-visibility` com `contain-intrinsic-size` para evitar saltos de layout (CLS).
- Substituição de `transition: all` por propriedades específicas para evitar o cálculo de todas as mudanças de estilo.
- Implementação de `pointer-events: none` em overlays durante transições para evitar cliques fantasmas e processamento de eventos.
