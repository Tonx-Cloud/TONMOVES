# ACTION_PLAN

## Visão geral do produto
- FREE → Preview → PAY (PIX) → PRO
- Primeiro vídeo: sempre GRATUITO, baixa resolução, duração/fps limitados, watermark central (“tonmovies.app”) no canvas, sem uso de Gemini/OpenAI; usuário assiste o vídeo inteiro.
- Paywall: após ver/baixar versão FREE, mostrar CTA “Gerar versão PRO”; modal com valor, chave PIX (Mercado Pago) para copiar/QR; pagamento confirmado libera PRO.
- PRO: alta resolução (1080p), sem watermark, recursos extras; usa clipes VO2 curtos (Gemini) combinados com loops/animação/edição para vídeos longos (2–5 min).

## Princípio central (custo/viabilidade)
- Vídeos longos (2–5 min) NÃO são gerados integralmente por IA.
- Usar poucos clipes curtos gerados por IA (Gemini VO2) + animação/looping/edição inteligente para completar o vídeo.
- Limitar número de clipes VO2 e duração de cada clipe; nunca gerar vídeo contínuo longo via VO2.

## Regras de monetização e segurança
- FREE não consome chaves pagas (Gemini/OpenAI); transcrição local/disable; imagens de provedores gratuitos; render 100% client-side.
- PRO só via pagamento confirmado (PIX Mercado Pago) ou créditos de assinatura/recarga; feature gates no backend e frontend; parâmetros PRO validados no backend antes de render/export.
- Watermark obrigatória no FREE, não removível via UI ou parâmetros.
- Env vars só na Vercel/backend; chaves nunca no frontend.

## Modelo de créditos e planos
- Créditos: unidade ABSTRATA de consumo PRO (não minutos/segundos); representam custo interno (clipes IA, resolução, variações).
- Consumo deve ser determinístico (calculado ANTES do render) e bloqueado se saldo insuficiente.
- Perfis de render (estimativa, ajustável):
  - S (leve): poucos clipes, 720p, consumo baixo.
  - M (padrão): 1080p, clipes moderados.
  - L (pesado): mais clipes/efeitos; uso controlado.
- Planos mensais (Starter / Creator / Studio):
  - Créditos renovados mensalmente.
  - Limites técnicos: duração máx do vídeo final, nº clipes IA, resolução, concorrência, rate limit diário.
  - Regras anti-abuso: rate limit diário + limite de renders simultâneos; validação backend.
- FREE nunca gera, consome ou acumula créditos.
- Recarga: não recorrente (one-off); créditos somam ao saldo atual; créditos de assinatura renovam mensalmente.

## Stack de provedores (responsabilidades)
- Gemini (PRO, prioridade): gerar clipes curtos VO2 (5–8s) em quantidade controlada por plano; chave GEMINI_* somente backend (/api/pro/render). Não usar para FREE.
- OpenAI (PRO): transcrição e análise de letra/prompts (/api/pro/transcribe, /api/pro/analyze); chave OPENAI_* somente backend.
- FREE: sem Gemini/OpenAI; transcrição opcional local ou desativada; imagens Pexels/Pollinations/Unsplash; render canvas + MediaRecorder/WebCodecs com pan/zoom/crossfade; vídeo completo da música em baixa resolução.

## Limites econômicos (obrigatórios)
- Número máximo de clipes VO2 por vídeo (por plano PRO).
- Duração máxima de cada clipe (5–8s).
- Nunca gerar vídeo contínuo longo via VO2; composição final usa loops/animação/cortes rítmicos.

## Preços de referência
- PRO avulso: R$19,90–29,90
- Plano Starter: R$29,90/mês (5 vídeos)
- Plano Creator: R$59,90/mês (15 vídeos)
- Plano Studio: R$99,90/mês (40 vídeos)

## Calibração de custos
- Coletar métricas de 30–50 renders reais (S/M/L).
- Registrar: nº de clipes IA, duração total gerada por IA, custo estimado por render.
- Ajustar tabela de créditos e preços com base nesses dados.

## KANBAN por Fases
Status atual: F0 e F1 concluídos; demais TODO.

### FASE 0 — Preparação / Infra
- [ ] F0-T01 — Mapear tokens/variables existentes e criar plano de migração para tokens CSS
  Depends on: —
  Acceptance: inventário de estilos/tokens anotado; decisão de namespace CSS vars
  Status: DONE
- [ ] F0-T02 — Organizar pastas core/features/ui e planejar migração (sem código ainda)
  Depends on: F0-T01
  Acceptance: árvore alvo definida e validada; nenhum break no app
  Status: DONE

### FASE 1 — UI + Design System
- [ ] F1-T01 — Criar tokens de design (tokens.css) e aplicar em DS base
  Depends on: F0-T01
  Acceptance: tokens usados em Button/Input/Card sem valores hardcoded; build OK
  Status: DONE
- [ ] F1-T02 — Componentes base (Button, Input, Select, Card, Badge, Banner, Tabs)
  Depends on: F1-T01
  Acceptance: componentes exportados e usados em uma seção piloto; foco visível e estados (hover/disabled/loading)
  Status: DONE
- [ ] F1-T03 — Reorganizar tela principal em seções (Áudio, Estilo, Export, Providers, Preview) com layout 2 colunas
  Depends on: F1-T02
  Acceptance: tela usa componentes base; layout responsivo; sem gradientes/emojis
  Status: DONE
- [ ] F1-T04 — PlanBar e locks FREE vs PRO (chips, CTA Upgrade)
  Depends on: F1-T02
  Acceptance: plano exibido, limites listados, CTA upgrade visível; opções PRO desabilitadas com tooltip
  Status: DONE

### FASE 2 — Fluxo FREE (client-side, preview completo)
- [ ] F2-T01 — Render client-side (canvas + MediaRecorder/WebCodecs) em baixa resolução
  Depends on: F1-T03
  Acceptance: usuário gera vídeo FREE 480p/720p com fps/duração limitados; exporta MP4/WebM; vídeo inteiro da música
  Status: DONE
- [ ] F2-T02 — Watermark central obrigatória no FREE
  Depends on: F2-T01
  Acceptance: watermark texto “tonmovies.app” aplicada no canvas, opacidade baixa, não removível
  Status: DONE
- [ ] F2-T03 — Pipelines FREE sem Gemini/OpenAI; provedores gratuitos habilitados
  Depends on: F2-T01
  Acceptance: geração roda sem chamadas pagas; transcrição local opcional/desativada; imagens gratuitas
  Status: DONE
- [ ] F2-T04 — Animação/edição FREE (pan/zoom/crossfade) cobrindo toda a trilha
  Depends on: F2-T01
  Acceptance: vídeo final cobre 100% da duração; sem uso de VO2; loops/efeitos leves aplicados
  Status: TODO

### FASE 3 — Preview + Paywall (PIX)
- [ ] F3-T01 — Tela/modal Paywall após vídeo FREE (CTA “Gerar versão PRO”)
  Depends on: F2-T02
  Acceptance: modal com valor, chave PIX copiar, instruções
  Status: TODO
- [ ] F3-T02 — Estado pós-pagamento (flag PRO pronta para uso)
  Depends on: F3-T01
  Acceptance: mock/flag de pagamento setado e propagado ao UI/gates
  Status: TODO

### FASE 4 — Pagamento PIX (Mercado Pago) para PRO avulso
- [ ] F4-T01 — Criar cobrança PIX via Mercado Pago (API)
  Depends on: F3-T02
  Acceptance: endpoint serverless cria charge PIX; retorna payload para modal
  Status: TODO
- [ ] F4-T02 — Modal PIX (QR + copia-e-cola) no UI
  Depends on: F4-T01
  Acceptance: modal exibe valor, QR e texto copia-e-cola; ação copiar funcional
  Status: TODO
- [ ] F4-T03 — Webhook de confirmação PIX
  Depends on: F4-T01
  Acceptance: webhook recebe confirmação, valida assinatura, registra evento
  Status: TODO
- [ ] F4-T04 — Validação de pagamento e liberação PRO para um render específico
  Depends on: F4-T03
  Acceptance: pagamento confirmado libera 1 render PRO; estado persistido no backend
  Status: TODO
- [ ] F4-T05 — /api/me inclui entitlement de render PRO avulso
  Depends on: F4-T04
  Acceptance: frontend recebe flag de render PRO disponível; expiração/regra clara
  Status: TODO

### FASE 5 — Fluxo PRO (clipes VO2 curtos + edição)
- [ ] F5-T01 — Segmentação da música em blocos/beat para clipes curtos
  Depends on: F4-T05
  Acceptance: algoritmo retorna segmentos alvo (5–8s) para VO2; parâmetros limitados
  Status: TODO
- [ ] F5-T02 — Geração de clipes VO2 (Gemini) com limites de quantidade e duração
  Depends on: F5-T01
  Acceptance: número máx de clipes e duração por plano; backend aplica limites; sem vídeo longo direto
  Status: TODO
- [ ] F5-T03 — Estratégia de looping/crossfade/cortes rítmicos para completar 2–5 min
  Depends on: F5-T02
  Acceptance: composição final usa clipes VO2 + loops + animação para cobrir a faixa inteira; sem custo explosivo
  Status: TODO
- [ ] F5-T04 — Transcrição/análise PRO com OpenAI (/api/pro/transcribe, /api/pro/analyze)
  Depends on: F4-T05
  Acceptance: chamada backend segura; chaves não vazam; resultado aplicado no flow de prompts e cortes
  Status: TODO
- [ ] F5-T05 — Feature gates PRO (resolução 1080p, fps/duração, providers premium, sem watermark)
  Depends on: F5-T02, F5-T04
  Acceptance: parâmetros validados no backend; UI reflete bloqueios; tentativa de burlar é negada
  Status: TODO
- [ ] F5-T06 — Controle de custo por render (contabilizar clipes VO2 e duração)
  Depends on: F5-T02
  Acceptance: métricas de custo por job; recusa se exceder limites; log estruturado
  Status: TODO

### FASE 6 — Segurança / Gates / Observabilidade
- [ ] F6-T01 — Central de gates (core/gates) aplicada a configs antes de render/export
  Depends on: F5-T05
  Acceptance: toda chamada passa por gates; logs de bloqueio
  Status: TODO
- [ ] F6-T02 — Observabilidade básica (logs, métricas mínimas nas serverless)
  Depends on: F6-T01
  Acceptance: logs estruturados nas APIs; smoke tests registrados
  Status: TODO

### FASE 7 — Assinaturas & Créditos
- [ ] F7-T01 — Modelo de dados (users, plans, subscriptions, credit_ledger, renders)
  Depends on: F4-T05
  Acceptance: schema definido e persistido; relacionamentos claros; migração pronta
  Status: TODO
- [ ] F7-T02 — Endpoint /api/credits/balance
  Depends on: F7-T01
  Acceptance: retorna saldo, perfil de render (S/M/L) e custo estimado; autenticado
  Status: TODO
- [ ] F7-T03 — Endpoint /api/credits/consume (backend gates)
  Depends on: F7-T02
  Acceptance: debita créditos por render de forma determinística antes de renderizar; valida limites e perfil; bloqueia se saldo insuficiente; nunca confia no frontend
  Status: TODO
- [ ] F7-T04 — Endpoint /api/subscription/status
  Depends on: F7-T01
  Acceptance: retorna plano mensal (Starter/Creator/Studio), créditos do ciclo e validade
  Status: TODO
- [ ] F7-T05 — Recarga de créditos via Mercado Pago (produto/checkout one-off)
  Depends on: F7-T01
  Acceptance: checkout/charge cria recarga; payload pronto para UI; integra com webhook; créditos somam ao saldo
  Status: TODO
- [ ] F7-T06 — Webhooks pagamento/recarga/assinatura (atualizar créditos)
  Depends on: F7-T05
  Acceptance: ledger atualizado na confirmação; idempotência garantida; suporta assinatura mensal e recarga
  Status: TODO
- [ ] F7-T07 — UI: mostrar saldo de créditos, custo estimado do render (S/M/L), bloqueios e CTA
  Depends on: F7-T02
  Acceptance: UI exibe saldo, custo S/M/L, bloqueios e CTA para recarga/upgrade
  Status: TODO
- [ ] F7-T08 — Auditoria/log de consumo por render (depuração/suporte)
  Depends on: F7-T03
  Acceptance: cada render registra consumo, clipes, duração e custo; consultável
  Status: TODO
- [ ] F7-T09 — Anti-abuso: rate limit diário e concorrência nos endpoints de render
  Depends on: F7-T03
  Acceptance: limites aplicados no backend; respostas de erro claras; logs
  Status: TODO

## Como retomar
- Comece do último DONE na fase mais baixa. Se nada DONE, iniciar em F0-T01 → F0-T02 → F1-T01.
- Antes da FASE 2 (FREE), garantir F0 e F1 concluídos (tokens/DS e layout).
- Antes da FASE 5 (PRO), garantir F4 (pagamento) e F3 (paywall) concluídas.
- Antes da FASE 7 (créditos), garantir F4/F5 bases prontas e decidir tabela de créditos inicial.

## Comandos de deploy/atualização (Vercel via terminal)
Pré-requisitos: Vercel CLI instalada, login feito, projeto linkado.
- vercel login
- vercel link
- vercel env add GEMINI_API_KEY
- vercel env add OPENAI_API_KEY
- vercel env add (PIX/WEBHOOK secrets, demais necessárias)
- vercel (deploy preview)
- vercel --prod (deploy produção)

Checklist de deploy:
- Env vars configuradas na Vercel (GEMINI_*, OPENAI_*, PIX/webhook secrets)
- Build local/CI passou (`npm run build`)
- Smoke test: fluxo FREE (gera vídeo completo com watermark, baixa res) e fluxo PRO (após pagamento/credits, gera vídeo 1080p sem watermark, com clipes VO2 curtos + loops)

## Novas tarefas adicionadas (resumo)
- Fase 4 detalhada para PIX (cobrança, modal QR/copia-e-cola, webhook, validação e liberação PRO avulso).
- Fase 5 reforçada para clipes VO2 curtos, segmentação, looping/crossfade e controle de custo.
- Fase 7 (Assinaturas & Créditos): modelo de dados, balance/consume, status assinatura, recarga one-off, webhooks, UI de saldo/custo, auditoria e anti-abuso.

## Primeira task a executar
- F1-T03 — Reorganizar tela principal em seções (Áudio, Estilo, Export, Providers, Preview) com layout 2 colunas usando o design system.
