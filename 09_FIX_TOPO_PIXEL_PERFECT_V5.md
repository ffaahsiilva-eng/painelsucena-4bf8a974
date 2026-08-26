# ANTIGRAVITY V5 — CORRIGIR ESPAÇO GIGANTE E SUBIR TODO O DASHBOARD

## NÃO CRIE PLANO. EDITE O CÓDIGO DIRETAMENTE.

A tela atual melhorou, mas ainda está estruturalmente errada.

O maior erro agora é objetivo:
o Dashboard está sendo renderizado MUITO ABAIXO, quase no rodapé, deixando uma enorme área vazia entre a topbar e o conteúdo.

Isso NÃO deve ser resolvido com `transform: translateY(-...)`.
Isso NÃO deve ser resolvido com margem negativa.
A causa estrutural precisa ser encontrada e removida.

Use como comparação:
- `00_REFERENCIA_ALVO.png` = alvo correto
- `00_ESTADO_ATUAL_V5.png` = estado atual incorreto

Leia também:
- `10_FORCE_TOP_LAYOUT.css`

============================================================
1. PRIMEIRO CORRIJA A CAUSA DO GRANDE ESPAÇO VAZIO
============================================================

No print atual, o título "Dashboard" aparece somente perto da parte inferior da tela.

Na referência, o título começa logo abaixo da topbar.

Procure no DOM e no código o elemento que está empurrando o Dashboard para baixo.

Verifique especificamente:

- background image em fluxo normal;
- elemento de background com `height: 100vh`;
- elemento de background com `min-height: 100vh`;
- hero vazio antes do Dashboard;
- spacer;
- `margin-top: 100vh`;
- `padding-top: 100vh`;
- `padding-top: calc(100vh...)`;
- `justify-content: flex-end`;
- `justify-content: center`;
- `align-items` incorreto;
- grid com linha `1fr` vazia;
- `min-height: 100vh` no wrapper anterior ao Dashboard;
- pseudo-elemento `::before` ocupando espaço;
- componente Background renderizado como bloco normal;
- `<div>` de background sem `position: fixed/absolute`;
- wrapper que renderiza o Dashboard depois de um bloco de altura total.

### REGRA

As camadas de fundo NÃO PODEM ocupar espaço no fluxo do documento.

Todas precisam ser:

position: fixed;
inset: 0;
pointer-events: none;

ou `position:absolute` dentro de um shell isolado.

Exemplo correto:

<div className="app-shell">
  <div className="app-bg-photo" />
  <div className="app-bg-overlay" />
  <div className="app-bg-haze" />

  <Sidebar />
  <Topbar />

  <main className="app-content">
    <Outlet />
  </main>

  <Footer />
</div>

ERRADO:

<div className="background min-h-screen">...</div>
<main>Dashboard...</main>

O background acima do main cria exatamente o espaço gigante que está aparecendo.

============================================================
2. POSIÇÃO VERTICAL CORRETA
============================================================

Após corrigir o fluxo:

TOPBAR:
top aproximado 20px.

CONTEÚDO:
deve começar imediatamente abaixo da topbar.

Use:

.app-content {
  position: relative;
  z-index: 10;
  padding-top: 124px;
  padding-left: 34px;
  padding-right: 36px;
  padding-bottom: 105px;
  min-height: 0;
  height: auto;
}

.dashboard-glass-v4 {
  margin-top: 0 !important;
  padding-top: 0 !important;
  top: auto !important;
  transform: none !important;
}

O título Dashboard deve aparecer aproximadamente entre y=125 e y=150 da área útil.

NÃO pode aparecer em y=600, y=700 ou próximo ao rodapé.

============================================================
3. REMOVER QUALQUER HERO / SPACER VAZIO
============================================================

Se existir algo como:

.hero
.dashboard-hero
.page-hero
.background-section
main-spacer
content-spacer
dashboard-spacer
min-h-screen
h-screen

antes do Dashboard:

- remova do fluxo;
- ou transforme em layer fixed;
- ou delete se for apenas decorativo.

Não apague lógica.
Remova apenas o espaço visual artificial.

============================================================
4. O TÍTULO AINDA ESTÁ COM FONTE ERRADA
============================================================

No print atual, "Dashboard" está em fonte serifada.

Na referência é sans-serif limpa.

Force:

.dashboard-glass-v4 h1,
.dashboard-title {
  font-family: Inter, Geist, Manrope, system-ui, sans-serif !important;
  font-size: clamp(42px, 3.2vw, 56px);
  font-weight: 400 !important;
  letter-spacing: -0.045em;
  line-height: .98;
  color: #2c3032;
}

NÃO usar:
Georgia
Times
Playfair
serif
font-script
font-display ornamental.

============================================================
5. SIDEBAR AINDA ESTÁ LARGA
============================================================

No screenshot atual, a viewport do app é menor do que 1672px.

Use largura proporcional:

width: clamp(140px, 10.65vw, 178px);

Para uma viewport de aproximadamente 1320px:
alvo ≈ 140px.

No print atual a sidebar está visualmente perto de 175px.
Reduza.

O main e topbar devem acompanhar automaticamente:

main:
margin-left: var(--sidebar-w);

topbar:
left: calc(var(--sidebar-w) + 28px);

============================================================
6. AVATAR
============================================================

Reduza o avatar.

Viewport ~1320:
68–76px.

Viewport 1672:
82–88px.

Não usar avatar de 110–140px.

Nome:
13–14px.

Cargo:
11–12px.

============================================================
7. TOPBAR
============================================================

A topbar está razoável, mas ainda deve ser refinada.

Use:

top: 18–20px;
left: calc(sidebar + 28–36px);
right: 20–24px;
height: 58px;

background:
rgba(249,250,249,.55);

border:
1px solid rgba(255,255,255,.68);

border-radius:
16px;

backdrop-filter:
blur(22px) saturate(130%);

Todos os itens devem caber.
Se necessário:
font-size 11.5–13px;
padding horizontal 7–10px.

Não cortar:
Meio Ambiente
Planejamento
IA (Gemini).

============================================================
8. FUNDO
============================================================

O fundo atual ainda está claro demais em alguns pontos.

Quero montanha visível, suave, semelhante à referência.

Use:

filter:
brightness(1.02)
contrast(.82)
saturate(.62);

Overlay:

linear-gradient(
  100deg,
  rgba(239,240,238,.70) 0%,
  rgba(239,240,238,.61) 30%,
  rgba(236,238,236,.53) 62%,
  rgba(232,235,234,.47) 100%
);

Não transformar em tela branca.

============================================================
9. DASHBOARD — COMPOSIÇÃO COMPLETA NO TOPO
============================================================

Depois que o espaço vazio for removido, a primeira dobra deve mostrar:

Dashboard
Visão geral da operação

e logo abaixo os cards.

Não quero scroll para chegar ao Dashboard.

Em desktop, ao abrir a página, devem estar visíveis:
- título;
- subtítulo;
- data;
- Clima;
- Total de funcionários;
- Avanço mensal;
- Presentes hoje;
- Ausências;
- Trabalho externo;
- Equipamentos ativos.

============================================================
10. GRID
============================================================

Use:

grid-template-columns:
1.08fr 1.04fr .95fr .92fr;

gap:
20px a 24px nessa viewport menor.

Não deixe o grid começar abaixo de uma section de 100vh.

============================================================
11. CARDS GLASS
============================================================

background:
linear-gradient(
  145deg,
  rgba(249,250,249,.60),
  rgba(245,247,246,.40)
);

border:
1px solid rgba(255,255,255,.68);

border-radius:
18px;

backdrop-filter:
blur(17px) saturate(118%);

box-shadow:
0 12px 32px rgba(32,35,37,.06),
inset 0 1px 0 rgba(255,255,255,.62);

Não usar branco opaco.
Não usar amarelo sólido.
Não usar preto sólido.

============================================================
12. RODAPÉ NÃO PODE COBRIR O DASHBOARD
============================================================

O footer pode continuar fixed apenas se:
- não cobrir os cards;
- o conteúdo possuir padding-bottom suficiente;
- a altura visual permanecer discreta.

Use aproximadamente:
height: 82–96px;

background:
linear-gradient(
  180deg,
  rgba(66,69,71,.16),
  rgba(55,58,60,.32)
);

Remova:
- vignette preta;
- box-shadow preto para cima;
- pseudo-elemento preto;
- gradient preto com alta opacidade.

============================================================
13. REMOVER DUPLICAÇÃO VISUAL
============================================================

No print atual ainda aparecem elementos duplicados no rodapé/sidebar.

Deixe:
- somente um SAIR;
- logo central;
- recarregar;
- avisos/WhatsApp;
- status "Cor proibida".

Agrupe/remova visualmente atalhos redundantes, sem quebrar rotas.

============================================================
14. DEBUG TEMPORÁRIO PARA GARANTIR POSIÇÃO
============================================================

Durante a correção, adicione temporariamente:

.dashboard-glass-v4 {
  outline: 2px solid red !important;
}

Depois abra o browser.

O topo do outline vermelho deve começar logo abaixo do cabeçalho, aproximadamente y=120–150.

Se o outline começar perto do rodapé:
a causa estrutural NÃO foi corrigida.

Continue investigando o elemento anterior no DOM.

Depois de corrigido, REMOVA o outline.

============================================================
15. INSPECIONE O ELEMENTO ANTERIOR NO DOM
============================================================

No DevTools/browse do Antigravity:

1. selecione `.dashboard-glass-v4`;
2. olhe o elemento pai;
3. olhe o irmão imediatamente anterior;
4. veja `getBoundingClientRect()`;
5. descubra qual elemento ocupa os ~500px vazios;
6. corrija esse elemento.

Execute no console se necessário:

const d = document.querySelector('.dashboard-glass-v4');
console.log('dashboard', d?.getBoundingClientRect());
console.log('parent', d?.parentElement?.getBoundingClientRect());
console.log('previous', d?.previousElementSibling?.getBoundingClientRect());

Também:

[...document.querySelectorAll('body *')]
  .filter(el => {
    const r = el.getBoundingClientRect();
    return r.height > 400 && r.top >= 80 && r.top < 650;
  })
  .map(el => ({
    tag: el.tagName,
    cls: el.className,
    rect: el.getBoundingClientRect()
  }));

Use isso para encontrar o bloco que está ocupando o espaço.

============================================================
16. NÃO USE "MARGEM NEGATIVA" COMO REMENDO
============================================================

Proibido resolver com:

margin-top: -500px;
transform: translateY(-500px);
top: -500px;

Isso só mascara o bug.

Corrija o elemento que ocupa espaço no fluxo.

============================================================
17. VALIDAÇÃO PELO PRÓPRIO ANTIGRAVITY
============================================================

Antes de concluir:

1. abra localhost:8080;
2. clique Destaques;
3. role para o TOPO absoluto;
4. tire screenshot;
5. confirme que "Dashboard" está visível sem scroll;
6. confirme que cards começam logo abaixo;
7. confirme que não existe grande vazio;
8. compare com `00_REFERENCIA_ALVO.png`.

NÃO peça ao usuário para testar antes de você verificar.

============================================================
18. CRITÉRIO DE ACEITAÇÃO
============================================================

Só conclua se:

[ ] Dashboard aparece no topo.
[ ] Não existe hero/espaço vazio de centenas de pixels.
[ ] Título é sans-serif.
[ ] Sidebar está mais estreita.
[ ] Avatar está menor.
[ ] Topbar está completa.
[ ] Montanha está visível sem estar lavada.
[ ] Cards aparecem na primeira dobra.
[ ] Footer não cobre o conteúdo.
[ ] Não há duplicação de SAIR.
[ ] Não há cards dourados sólidos.
[ ] Layout lembra imediatamente `00_REFERENCIA_ALVO.png`.

============================================================
19. RESPOSTA FINAL DO AGENTE
============================================================

Ao concluir, informe:
- qual elemento causava o espaço gigante;
- qual arquivo foi corrigido;
- quais valores de height/min-height/margin/padding foram removidos;
- arquivos modificados;
- confirmação de que validou visualmente no browser.

NÃO finalize apenas dizendo "pronto".
