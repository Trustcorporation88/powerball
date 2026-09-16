# Trust Corp Financeiro

Painel financeiro completo com DRE, Fluxo de Caixa, Dashboard analítico e Gerador Inteligente de Palpites para Loterias Caixa.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Fastify + Prisma + PostgreSQL
- **Deploy:** Vercel (frontend) + Railway (backend)

## Estrutura do Gerador de Loterias

Os módulos do gerador de palpites inteligentes estão localizados em:

| Arquivo | Descrição |
|---------|------------|
| `src/pages/LotteryPalpites.tsx` | Tela principal do gerador |
| `src/services/lotteryGenerator.ts` | Motor de geração dos palpites |
| `src/services/lotteryFechamento.ts` | Lógica de fechamentos |
| `src/services/lotteryHistoricalData.ts` | Dados históricos e estatísticas |
| `src/constants/lotteryConstants.ts` | Configurações Lotofácil e Mega-Sena |

## Executando localmente

```bash
# Frontend
pnpm install
pnpm dev

# Backend (em outro terminal)
cd server
pnpm install
pnpm dev
```

## Variáveis de ambiente

Veja `.env.example` e `server/.env.example` para as configurações necessárias.

## Documentação adicional

- [Tutorial DRE](./TUTORIAL-DRE.md)
- [Auditor IA](./AUDITOR-IA.md)
- [Backend README](./server/README.md)
