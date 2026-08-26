# ANTIGRAVITY V4 — FORCE RENDER + RECONSTRUÇÃO DO DASHBOARD

## OBJETIVO
O shell (sidebar/topbar/background/footer) já está parcialmente próximo, mas o conteúdo principal do Dashboard continua sem aparecer.

Nesta tarefa, NÃO tente corrigir o componente antigo apenas com CSS.
Faça um teste de rota, prove que a rota renderiza e depois monte um Dashboard novo e isolado, visualmente fiel à referência.

ARQUIVO VISUAL PRINCIPAL:
`00_REFERENCIA_ALVO.png`

ARQUIVOS TÉCNICOS:
`DashboardGlassReference.tsx`
`dashboard-glass-reference.css`

## REGRAS
- Não alterar banco de dados.
- Não alterar Supabase.
- Não remover autenticação.
- Não remover rotas.
- Não remover PWA.
- Não remover integrações.
- Não apagar o Dashboard antigo; mantenha-o como backup até o novo estar validado.
- Não usar animações de entrada nesta etapa.
- Não usar classes antigas do Dashboard no novo componente.
- Não usar wrapper antigo que possa conter opacity/display/z-index problemático.

==================================================
ETAPA A — PROVAR QUAL ROTA "DESTAQUES" ESTÁ SENDO RENDERIZADA
==================================================

1. Localize no projeto o item de navegação "Destaques".
2. Descubra exatamente para qual pathname ele navega.
3. Localize a definição dessa rota no React Router.
4. Localize o componente realmente renderizado nessa rota.
5. No topo do RETURN desse componente, coloque TEMPORARIAMENTE:

<div
  id="dashboard-route-debug"
  style={{
    position: "fixed",
    top: 150,
    left: 230,
    zIndex: 99999,
    background: "red",
    color: "white",
    padding: 20,
    fontSize: 24
  }}
>
  DASHBOARD_ROUTE_OK
</div>

6. Use o browser do próprio Antigravity e abra localhost:8080.
7. Clique em "Destaques".
8. Confirme VISUALMENTE se `DASHBOARD_ROUTE_OK` aparece.

### Se NÃO aparecer:
O problema está na rota, no Outlet ou no AppShell.
NÃO continue para o design.
Corrija:
- rota;
- <Outlet />;
- children;
- navegação;
- redirect;
- layout pai;
até o marcador aparecer.

### Se aparecer:
A rota está correta.
Remova o marcador e siga para a Etapa B.

==================================================
ETAPA B — NÃO REAPROVEITAR O WRAPPER VISUAL BUGADO
==================================================

Crie um componente NOVO e isolado:

`DashboardGlassReference.tsx`

e um stylesheet:

`dashboard-glass-reference.css`

Use os arquivos de referência anexados como base.

O componente deve usar uma classe raiz EXCLUSIVA:

`dashboard-glass-v4`

NÃO usar classes antigas:
- dashboard-page
- dashboard-content
- page-enter
- fade-in
- animate-in
- opacity-0
- old-dashboard
ou qualquer outra classe global que tenha sido usada nas tentativas anteriores.

Não envolver o novo Dashboard em motion.div nesta etapa.

O RETURN da rota Destaques deve ficar conceitualmente assim:

return <DashboardGlassReference ...dados... />;

Se a rota usa AppShell com Outlet, o AppShell deve renderizar normalmente:
<Outlet />

O novo componente deve ficar dentro da área principal, com:
position: relative;
z-index: 10;
opacity: 1;
visibility: visible;
display: block;

==================================================
ETAPA C — PRIMEIRO RENDERIZE O VISUAL, DEPOIS LIGUE OS DADOS
==================================================

Primeiro faça o componente aparecer VISUALMENTE com toda a estrutura da referência.

Ele precisa mostrar, nesta ordem:

1. Cabeçalho:
   Dashboard
   Visão geral da operação
   seletor de data

2. Card Clima
3. Card Total de Funcionários
4. Card Avanço Mensal
5. Card Presentes Hoje
6. Card Ausências
7. Card Trabalho Externo
8. Card Equipamentos Ativos

Somente depois de a estrutura estar visível:
- reutilize os hooks/queries existentes do Dashboard antigo;
- passe os dados reais para o componente novo;
- preserve loading/error;
- não volte a usar o wrapper antigo que causava invisibilidade.

==================================================
ETAPA D — COMPOSIÇÃO VISUAL DA REFERÊNCIA
==================================================

A referência visual usa:

SIDEBAR:
- estreita;
- grafite translúcida;
- ~10,65% da viewport;
- 178px em 1672px;
- ~152px em 1428px.

MAIN:
margin-left igual à sidebar.

TOPBAR:
- clara;
- translúcida;
- glass;
- 20px do topo;
- ~36px após a sidebar;
- ~22px da direita;
- 58px de altura.

BACKGROUND:
- montanha visível;
- dessaturada;
- suave;
- NÃO branco lavado;
- NÃO escuro.

DASHBOARD:
- começa abaixo da topbar;
- título grande e grafite;
- cards branco-gelo translucent.

==================================================
ETAPA E — GEOMETRIA EM 1672x941
==================================================

Sidebar:
x 0
w 178

Topbar:
x 214
y 20
right 22
h 58

Dashboard title:
x 241
y 135

Subtitle:
x 241
y 198

Date:
x 1298
y 146
w 303
h 58

Weather:
x 220
y 247
w 357
h 303

Employees:
x 220
y 573
w 357
h 241

Monthly progress:
x 602
y 247
w 342
h 374

Present:
x 970
y 247
w 315
h 178

Absence:
x 970
y 453
w 315
h 168

External:
x 970
y 648
w 315
h 166

Equipment:
x 1311
y 247
w 290
h 567

Footer starts:
y 838

==================================================
ETAPA F — CARD GLASS EXATO
==================================================

Use:

background:
linear-gradient(
  145deg,
  rgba(249,250,249,.62),
  rgba(245,247,246,.42)
);

border:
1px solid rgba(255,255,255,.69);

border-radius:
18px;

backdrop-filter:
blur(17px) saturate(118%);

box-shadow:
0 12px 32px rgba(32,35,37,.065),
inset 0 1px 0 rgba(255,255,255,.65);

Cor principal:
#2c3032

Secundária:
#74797d

Dourado:
#b58a48

Dourado claro:
#d6ae67

Dourado nunca pode preencher cards inteiros.

==================================================
ETAPA G — TÍTULO E DATA
==================================================

Dashboard:
font-family: Inter / Geist / Manrope
font-size: 54–56px em 1672
font-weight: 400
letter-spacing: -0.045em
color: #2c3032

Subtítulo:
17px
#74797d

Data:
glass card
58px altura
303px largura
ícone CalendarDays
data real
ChevronDown

==================================================
ETAPA H — GRID
==================================================

Use CSS Grid:

grid-template-columns:
1.08fr 1.04fr .95fr .92fr;

gap:
26px;

Estrutura:
coluna 1 = clima + funcionários
coluna 2 = avanço mensal
coluna 3 = presentes + ausências + trabalho externo
coluna 4 = equipamentos

NÃO usar position:absolute para os cards.
NÃO usar transform para empurrar cards.
NÃO esconder overflow do conteúdo principal.

==================================================
ETAPA I — GRÁFICOS
==================================================

Para evitar dependência adicional, nesta etapa use SVG/CSS simples.

ProgressRing:
- SVG circle;
- track cinza;
- stroke dourado;
- strokeLinecap round;
- sem animação inicialmente.

Mini charts:
- SVG polyline/path;
- linhas muito discretas;
- sem bibliotecas novas.

Depois, se o projeto já usa Recharts, pode migrar sem alterar visual.

==================================================
ETAPA J — WIREFRAME DE DADOS
==================================================

Use os hooks e queries reais existentes.

Mapeamento:
- clima existente -> Weather card
- colaboradores -> Employees
- metas/planejamento -> Monthly progress
- presentes -> Present
- ausências -> Absence
- trabalho externo -> External
- equipamentos -> Equipment

Durante loading:
skeleton glass.

Se dado for realmente vazio:
"Sem dados disponíveis"

Não deixar undefined/NaN.

==================================================
ETAPA K — NÃO PERMITIR QUE CSS GLOBAL ESCONDA O COMPONENTE
==================================================

Na raiz exclusiva:

.dashboard-glass-v4 {
  position: relative !important;
  z-index: 10 !important;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  transform: none !important;
  filter: none !important;
  min-height: 700px;
}

Não usar:
animation-fill-mode que termine opacity 0;
opacity em pai;
filter em pai;
z-index negativo;
pointer-events none no conteúdo.

==================================================
ETAPA L — BROWSER VALIDATION FEITA PELO PRÓPRIO AGENTE
==================================================

Você NÃO deve terminar e pedir para o usuário testar antes de verificar.

Use o browser do Antigravity:
1. abra localhost:8080;
2. clique em Destaques;
3. recarregue;
4. confirme que o texto "Dashboard" está visível;
5. confirme visualmente 7 cards;
6. confirme que a montanha aparece atrás;
7. confirme que a topbar permanece;
8. confirme que footer não cobre cards.

Se os 7 cards não aparecem:
CONTINUE corrigindo.

Só conclua depois que o seu próprio browser mostrar o Dashboard completo.

==================================================
ETAPA M — PROVA FINAL
==================================================

Na resposta final do agente, informe:
- pathname exato de Destaques;
- arquivo da rota;
- arquivo novo do Dashboard;
- arquivo CSS novo;
- causa exata do problema anterior;
- confirmação de que o browser mostrou título + 7 cards;
- lista dos arquivos realmente modificados.

NÃO responda com "agora peça ao usuário para atualizar".
Valide você mesmo antes de concluir.
