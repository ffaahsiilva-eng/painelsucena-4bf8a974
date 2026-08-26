# ANTIGRAVITY V6 — FIX DEFINITIVO DO APP SHELL + DASHBOARD NO TOPO

## NÃO CRIE PLANO. NÃO DESCREVA. EDITE OS ARQUIVOS REAIS.

A tela atual ainda mostra somente:
- sidebar
- topbar
- background
- footer

O Dashboard continua fora da primeira dobra.

Nesta versão, NÃO tente mais resolver o fluxo atual com pequenos ajustes.
Reconstrua somente o APP SHELL para uma composição fixa/absoluta, preservando as rotas e os componentes reais.

Use:
- `00_REFERENCIA_ALVO.png` = alvo visual
- `00_ESTADO_ATUAL.png` = estado atual incorreto
- `11_APP_SHELL_ABSOLUTE.css` = especificação estrutural obrigatória

============================================================
1. OBJETIVO VISUAL
============================================================

Ao abrir a rota Destaques, SEM ROLAR, deve aparecer imediatamente:

- Dashboard
- Visão geral da operação
- data
- Clima
- Total de funcionários
- Avanço mensal
- Presentes hoje
- Ausências
- Trabalho externo
- Equipamentos ativos

A primeira dobra deve parecer com `00_REFERENCIA_ALVO.png`.

Se o usuário precisar rolar para ver "Dashboard", a implementação está ERRADA.

============================================================
2. NÃO USE MAIS O BACKGROUND NO FLUXO NORMAL
============================================================

A estrutura final deve ser:

<div className="app-shell-v6">
  <div className="app-bg-v6" />
  <div className="app-overlay-v6" />

  <Sidebar />

  <Topbar />

  <main className="app-main-v6">
    <Outlet />
  </main>

  <Footer />
</div>

O background é FIXED.

O main é ABSOLUTE/FIXED entre:
- topbar
- sidebar
- footer

Ele NÃO deve vir depois de um bloco de 100vh.

============================================================
3. ESTRUTURA GEOMÉTRICA OBRIGATÓRIA
============================================================

Desktop:

--sidebar-w: clamp(142px, 10.65vw, 178px);

Sidebar:
left: 0
top: 0
bottom: 0
width: var(--sidebar-w)

Topbar:
position: fixed
top: 20px
left: calc(var(--sidebar-w) + 36px)
right: 22px
height: 58px

Footer:
position: fixed
left: var(--sidebar-w)
right: 0
bottom: 0
height: 92px

MAIN:
position: fixed
top: 112px
left: calc(var(--sidebar-w) + 42px)
right: 48px
bottom: 96px
overflow-y: auto
overflow-x: hidden

IMPORTANTE:
O main deve começar em y aproximado 112–125.
Não em 500, 600 ou 700px.

============================================================
4. NO MAIN, O DASHBOARD COMEÇA IMEDIATAMENTE
============================================================

.dashboard-glass-v4 {
  margin: 0 !important;
  padding: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  position: relative !important;
  top: auto !important;
  transform: none !important;
  opacity: 1 !important;
  visibility: visible !important;
}

Não usar:
- margin-top gigante
- padding-top gigante
- min-height: 100vh
- h-screen
- translateY
- top negativo
- bottom alignment

============================================================
5. TITULO
============================================================

O título da referência NÃO é serifado.

Force:

font-family: Inter, Geist, Manrope, system-ui, sans-serif !important;
font-size: clamp(44px, 3.35vw, 56px);
font-weight: 400;
letter-spacing: -0.045em;
line-height: .98;
color: #2c3032;

Subtítulo:
17px
#74797d

============================================================
6. SIDEBAR
============================================================

Na referência:
- estreita
- grafite translúcida
- contrato no topo
- avatar pequeno
- nome/cargo
- SAIR no rodapé

Na tela atual:
- avatar ainda está grande
- sidebar ainda está larga
- existem elementos extras

Use:

width: clamp(142px, 10.65vw, 178px);

Avatar:
width/height: clamp(70px, 5.2vw, 86px);

Contrato:
label 10px
número 18–19px

Nome:
13–14px

Cargo:
11–12px

Remova duplicação visual de SAIR/ícones extras.

============================================================
7. TOPBAR
============================================================

A topbar deve ocupar praticamente toda a largura útil.

Itens:
Destaques
Lembretes
InstaCena
Almoxarifado
Documentos
Equipamentos
Segurança
RH
Relatório Diário Obra
Meio Ambiente
Planejamento
IA (Gemini)
logout

Se faltar espaço:
font-size 11.5–13px
padding horizontal 6–10px

Não cortar "Meio Ambiente".
Não esconder Planejamento/IA.

============================================================
8. BACKGROUND
============================================================

Use:

filter:
brightness(1.02)
contrast(.84)
saturate(.64)

Overlay:

linear-gradient(
  100deg,
  rgba(239,240,238,.68) 0%,
  rgba(239,240,238,.58) 30%,
  rgba(236,238,236,.51) 62%,
  rgba(232,235,234,.45) 100%
)

A montanha deve continuar visível.

============================================================
9. DASHBOARD GRID
============================================================

Use 4 colunas:

grid-template-columns:
1.08fr 1.04fr .95fr .92fr

gap:
22px

Coluna 1:
Clima
Funcionários

Coluna 2:
Avanço mensal

Coluna 3:
Presentes
Ausências
Trabalho externo

Coluna 4:
Equipamentos

============================================================
10. ALTURAS PARA CABER NA PRIMEIRA DOBRA
============================================================

Como o main termina antes do footer, reduza os cards de forma proporcional para caber sem scroll excessivo.

Em viewport desktop aproximada 1300–1500px x 850–950px:

Clima:
260–285px

Funcionários:
205–225px

Avanço:
340–360px

Presentes:
155–170px

Ausências:
150–160px

Trabalho Externo:
150–160px

Equipamentos:
510–535px

O objetivo é mostrar tudo na primeira tela.

============================================================
11. GLASS
============================================================

Cards:

background:
linear-gradient(
  145deg,
  rgba(249,250,249,.60),
  rgba(245,247,246,.40)
)

border:
1px solid rgba(255,255,255,.68)

border-radius:
18px

backdrop-filter:
blur(17px) saturate(118%)

box-shadow:
0 12px 32px rgba(32,35,37,.06),
inset 0 1px 0 rgba(255,255,255,.62)

Não usar:
card amarelo sólido
card preto
borda dourada grossa

============================================================
12. FOOTER
============================================================

Reference:
faixa translúcida cinza/grafite.

Use:

height: 92px

background:
linear-gradient(
  180deg,
  rgba(66,69,71,.15),
  rgba(55,58,60,.30)
)

backdrop-filter:
blur(15px)

Remover:
- sombra preta subindo
- vignette
- pseudo-elemento preto
- gradient preto forte

Logo central:
38–44px

============================================================
13. AÇÃO OBRIGATÓRIA SOBRE O CÓDIGO ATUAL
============================================================

Localize:
- App.tsx
- Layout.tsx / AppShell.tsx
- Sidebar
- Topbar
- Footer
- Dashboard route
- CSS global

Faça alterações REAIS.

Não apenas adicionar um CSS que talvez não seja importado.

Confirme que `11_APP_SHELL_ABSOLUTE.css` ou suas regras equivalentes estão realmente importadas/aplicadas.

============================================================
14. TESTE SEM PLAYWRIGHT
============================================================

Se o browser automatizado estiver com erro 404 de Playwright, NÃO use isso como motivo para parar.

Você ainda pode validar estruturalmente:

- leia o DOM gerado;
- verifique computed CSS no navegador disponível;
- use console;
- use `document.querySelector(...).getBoundingClientRect()`.

Cheque:

const main = document.querySelector('.app-main-v6');
const dash = document.querySelector('.dashboard-glass-v4');
console.log(main?.getBoundingClientRect());
console.log(dash?.getBoundingClientRect());

Critério:
main.top deve estar aproximadamente entre 105 e 130.
dash.top deve estar próximo de main.top.

Se dash.top > 250:
continua errado.

============================================================
15. REMOVER CSS ANTIGO CONFLITANTE
============================================================

Procure e remova/substitua regras antigas que contenham:

min-height: 100vh;
height: 100vh;
padding-top: 100vh;
margin-top muito alto;
justify-content: flex-end;
place-content: end;
grid-template-rows: 1fr auto;
align-items: end;

somente nos wrappers que empurram o Dashboard.

Não aplique margin-top negativo.

============================================================
16. NÃO MEXER EM DADOS
============================================================

Preserve:
- hooks
- queries
- Supabase
- autenticação
- APIs
- rotas
- PWA
- service worker
- permissões

A mudança é de layout.

============================================================
17. CHECKLIST FINAL
============================================================

Só finalize quando:

[ ] Dashboard aparece sem scroll.
[ ] Título aparece logo abaixo da topbar.
[ ] Título é sans-serif.
[ ] Data aparece no topo direito.
[ ] 7 cards aparecem.
[ ] Sidebar está estreita.
[ ] Avatar está menor.
[ ] Topbar mostra todos os itens.
[ ] Fundo não está lavado.
[ ] Footer não cobre cards.
[ ] Não há grande espaço vazio.
[ ] Não existe duplicação visual de SAIR.
[ ] O visual lembra imediatamente `00_REFERENCIA_ALVO.png`.

============================================================
18. RESPOSTA FINAL
============================================================

Ao terminar, informe:
- arquivos modificados
- classe usada para o app shell
- boundingClientRect do main
- boundingClientRect do Dashboard
- qual regra antiga estava causando o espaço
- confirmação de que o Dashboard está na primeira dobra

Não finalize apenas dizendo que o CSS foi aplicado.
