# Plano de Implementação: Efeito de Transição de Página "Caderno"

O objetivo é adicionar uma animação de transição entre as páginas que simule o virar de uma página de caderno/livro, proporcionando uma experiência visual fluida e temática.

## Alterações Propostas

### Frontend

- **`src/components/layout/PageTransition.tsx`**:
    - Substituir a animação simples de fade/deslocamento por uma animação 3D de "page flip".
    - Adicionar um estado para gerenciar o momento da troca de conteúdo durante a dobra da página.
    - Implementar estilos CSS para criar o efeito de profundidade e rotação lateral (eixo Y).
    - Garantir que a transição seja rápida o suficiente para não prejudicar a usabilidade, mas perceptível.

### Estilos (CSS)

- Adicionar animações `@keyframes` globais ou inline para:
    - `page-flip-out`: A página atual gira para a esquerda simulando a dobra.
    - `page-flip-in`: A nova página aparece girando a partir da dobra.
- Utilizar `perspective` no container pai para o efeito 3D funcionar corretamente.

## Detalhes Técnicos

- **Tecnologia**: Framer Motion ou CSS puro com React Hooks (conforme padrão atual do arquivo).
- **Performance**: Usar `will-change` e propriedades otimizadas para GPU (`transform`, `opacity`).
- **Responsividade**: O efeito será adaptado para mobile para evitar distorções no layout.

## Critérios de Aceite

- Ao navegar entre rotas (ex: Home para RH), o usuário deve ver a página atual "virar" e a nova página aparecer.
- A animação deve ser suave e não causar "jank" (travamentos).
- Respeitar a preferência do usuário de `prefers-reduced-motion`.
