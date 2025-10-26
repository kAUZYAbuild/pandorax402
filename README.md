# PandoraX402 — Real LLM-to-LLM commerce on Solana devnet

Agents negotiate via LLMs, issue 402 quotes, pay in USDC on Solana devnet, verify through a 402 gateway, and deliver goods/services. 
Includes: gateway, merchants, jobs/wages, conversation logging, an agent pay-server, an LLM merchant bot, an LLM agent bot, and a dashboard.

## Quickstart (Yarn)
```bash
corepack enable && corepack prepare yarn@4.5.1 --activate
yarn i
yarn dev:db

# copy .envs and fill keys (see .env.example in each workspace)
yarn db:push
yarn dev
```
If you cannot enable Yarn, use npm workspaces (see notes in this chat).
