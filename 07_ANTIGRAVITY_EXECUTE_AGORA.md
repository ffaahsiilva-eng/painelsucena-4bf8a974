# ANTIGRAVITY — EXECUTE AGORA, NÃO CRIE PLANO

## SITUAÇÃO ATUAL
O preview continua incorreto e, no painel do Antigravity, aparece **0 Files With Changes**.
Isso significa que a etapa anterior não aplicou alterações reais no código ou foi interrompida.

Também houve um erro de rede durante a execução.

Portanto, nesta tentativa:
- NÃO crie Implementation Plan;
- NÃO crie Task;
- NÃO crie Walkthrough como resultado principal;
- NÃO apenas descreva o que faria;
- EDITE os arquivos reais do projeto.

## REGRA DE EXECUÇÃO
Comece localizando os arquivos reais responsáveis por:
1. AppShell / Layout principal;
2. Sidebar;
3. Topbar;
4. Footer;
5. rota "Destaques";
6. componente Dashboard;
7. Outlet/children do React Router;
8. CSS global/Tailwind;
9. background principal.

Depois faça alterações reais nesses arquivos.

Ao terminar, o painel deve mostrar **Files With Changes > 0**.

Se continuar em 0, NÃO considere a tarefa concluída.

---

# ETAPA 1 — FAZER O DASHBOARD EXISTENTE APARECER

Antes de estilizar, abra a rota atual de Destaques/Dashboard em localhost:8080 e inspecione por que o conteúdo não aparece.

Verifique explicitamente:
- <Outlet />
- {children}
- return do componente Dashboard
- display:none
- visibility:hidden
- opacity:0
- z-index negativo
- position:absolute/fixed cobrindo o conteúdo
- overflow:hidden
- height:0 / min-height incorreto
- animação que mantém opacity 0
- rota errada
- componente não montado
- overlay acima do conteúdo

A página correta PRECISA mostrar:
- Dashboard
- Visão geral da operação
- seletor/data
- card Clima
- Total de funcionários
- Avanço mensal
- Presentes hoje
- Ausências
- Trabalho externo
- Equipamentos ativos

Se esses elementos não estiverem visíveis, não siga para polimento.

---

# ETAPA 2 — STACKING CORRETO

Use a seguinte ordem de camadas:

background photo: z-index -30
background overlay: z-index -20
background haze: z-index -10
main shell: z-index 1
conteúdo principal: z-index 10
footer: z-index 20
topbar: z-index 40
sidebar: z-index 50

Overlay:
pointer-events: none;

Nunca aplique opacity/filter no wrapper que contém <Outlet /> ou {children}.

---

# ETAPA 3 — SIDEBAR

No viewport atual, use aproximadamente:
width: 152px

Em 1672px de largura:
width: 178px

Use:
width: clamp(152px, 10.65vw, 178px);

Conteúdo:
CONTRATO
460001269

avatar pequeno e centralizado
nome
cargo
divisor fino
SAIR no rodapé

Não mostrar logo Sucena gigante no topo.
Não duplicar SAIR.
Não deixar atalhos soltos no meio.

Avatar no viewport atual:
74–82px.

---

# ETAPA 4 — TOPBAR

Viewport atual:
left aproximado: 183px
top: 19px
right: 38px
height: 54–58px

Background:
rgba(249,250,249,.56)

Border:
1px solid rgba(255,255,255,.68)

backdrop-filter:
blur(22px) saturate(132%)

border-radius:
16px

Menu inteiro precisa caber:
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

Não cortar "Meio Ambiente".
Não esconder Planejamento.
Não esconder IA.

---

# ETAPA 5 — FUNDO

A imagem atual está lavada demais.

Use:

filter:
brightness(1.04)
contrast(.80)
saturate(.60)

Overlay:
linear-gradient(
  100deg,
  rgba(239,240,238,.76) 0%,
  rgba(239,240,238,.66) 30%,
  rgba(236,238,236,.57) 62%,
  rgba(232,235,234,.50) 100%
)

A montanha deve continuar claramente visível.

---

# ETAPA 6 — CABEÇALHO DO DASHBOARD

No viewport 1428x884:

Dashboard:
x aproximado: 206px
y aproximado: 127px

font-family:
Inter, Geist, Manrope, sans-serif

font-size:
42–48px

font-weight:
400

color:
#2c3032

Subtítulo:
Visão geral da operação
15–16px
#74797d

Data:
x aproximado 1109px
y aproximado 137px
w aproximado 258px
h aproximado 55px

---

# ETAPA 7 — GRID

No desktop:

grid-template-columns:
1.08fr 1.04fr .95fr .92fr

gap:
21px no viewport atual
26px em 1672x941

Estrutura:

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

---

# ETAPA 8 — CARDS GLASS

Todos os cards:

background:
linear-gradient(
  145deg,
  rgba(249,250,249,.62),
  rgba(245,247,246,.42)
)

border:
1px solid rgba(255,255,255,.69)

border-radius:
18px

backdrop-filter:
blur(17px) saturate(118%)

box-shadow:
0 12px 32px rgba(32,35,37,.065),
inset 0 1px 0 rgba(255,255,255,.65)

NÃO usar card dourado sólido.
NÃO usar card preto.
NÃO usar borda dourada grossa.

Dourado somente em:
- underline ativo
- progresso
- pequeno ícone
- detalhes de hover

---

# ETAPA 9 — TAMANHOS APROXIMADOS NO VIEWPORT ATUAL 1428x884

Clima:
305 x 285

Funcionários:
305 x 227

Avanço mensal:
292 x 351

Presentes:
269 x 167

Ausências:
269 x 157

Trabalho externo:
269 x 156

Equipamentos:
247 x 533

---

# ETAPA 10 — RODAPÉ

No viewport atual:
começar aproximadamente em y=787
altura aproximada 97px

Use:

background:
linear-gradient(
  180deg,
  rgba(66,69,71,.20),
  rgba(55,58,60,.38)
)

backdrop-filter:
blur(15px)

Não usar fundo preto.
Não usar vignette preta.
Não usar gradiente preto subindo pela tela.

Logo central:
36–44px de altura
opacity .80

Direita:
Recarregar
WhatsApp/avisos existentes
Cor proibida

---

# ETAPA 11 — VALIDAÇÃO REAL NO BROWSER

Depois de editar os arquivos:

1. abra localhost:8080;
2. recarregue;
3. confirme visualmente que Dashboard + 7 cards aparecem;
4. verifique console;
5. corrija erros;
6. tire screenshot;
7. compare com a referência;
8. faça ajustes de 2–8px se necessário.

NÃO finalize se a tela continuar mostrando apenas:
sidebar + topbar + background + footer.

---

# ETAPA 12 — PROVA DE EXECUÇÃO

Antes de responder como concluído, informe:
- quais arquivos foram modificados;
- quais componentes foram corrigidos;
- qual era a causa do Dashboard não aparecer;
- quantos arquivos aparecem em "Files With Changes".

Se o número for 0:
CONTINUE TRABALHANDO.

## INSTRUÇÃO FINAL
Aplique as mudanças agora diretamente no código.
Não gere apenas plano, task ou walkthrough.
Não responda somente com explicações.
Modifique os arquivos reais do workspace.
