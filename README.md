PandoraX402 is a production-ready, open source implementation of the HTTP 402 Payment Required standard for agent-to-agent commerce. It enables autonomous agents to conduct monetary transactions with real USDC transfers on EVM chains, featuring dynamic pricing, robust verification, and a modular gateway architecture.
Key Features

Mainnet-ready for Base (8453), Polygon (137), and Ethereum (1)
Real USDC settlement with on-chain verification and digital receipts
Dynamic pricing engine adjusting for reputation, demand, gas costs, and time of day
Reputation scoring (0-100) with configurable discount tiers
HTTP 402 Gateway for invoice generation, verification, and secure callbacks
Clean dashboard for monitoring transactions and agent interactions
Production-grade security with replay protection and idempotent operations

System Architecture
mermaidflowchart TD
  A[Buyer Agent] --> B[Dashboard]
  B -->|POST /invoices| C[402 Gateway]
  C -->|Quote + Breakdown| B
  B -->|Approve + Sign Tx| D[Wallet]
  D --> E[(EVM Chain)]
  E -->|Finality + Receipts| C
  C -->|Signed Callback| F[Merchant Agent]
  F -->|Fulfill| G[Delivery / Access Token]
  B -->|Show Receipt| A

  subgraph Pricing Engine
    P1[Reputation]
    P2[Gas Price]
    P3[Demand]
    P4[Peak Hours]
  end
  P1 -.-> C
  P2 -.-> C
  P3 -.-> C
  P4 -.-> C
Quick Start
bash# Clone the repository
git clone https://github.com/your-org/pandoraX402.git
cd pandoraX402

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in RPC URLs, USDC token addresses, and API keys

# Start infrastructure (PostgreSQL, Redis)
npm run dev:db

# Initialize database schemas
npm run db:push

# Start all services
npm run dev
Component Overview
PandoraX402 is organized as a monorepo with the following components:
ComponentDescriptiona2a-x402HTTP 402 Gateway service for invoice generation, payment verification, and callbacksclient-agentExample buyer agent implementation, powered by Claude API for negotiationmerchant-agentExample merchant agent for fulfillment and service deliverydashboardWeb dashboard (Next.js) for monitoring and debugging
Gateway Service (a2a-x402)
The HTTP 402 Gateway is the core component of PandoraX402, handling:

Invoice generation via /x402/quote endpoint
Payment verification with on-chain confirmation
Receipt issuance with cryptographic proof
Callback execution to merchant services

API Endpoints
POST /x402/quote       # Generate payment invoice (returns 402 + JSON)
POST /x402/verify      # Verify on-chain payment
POST /x402/proxy       # Verify + forward to merchant service
GET  /healthz          # Health check endpoint
Quote Request Example
json{
  "resource": "food/menu",
  "currency": "USDC",
  "priceBaseUnits": "500000",  // 0.5 USDC (6 decimals)
  "payTo": "0x1234567890abcdef1234567890abcdef12345678",
  "mint": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"  // USDC token address
}
Quote Response (HTTP 402)
json{
  "code": 402,
  "reason": "Payment Required",
  "chain": "base",
  "currency": "USDC",
  "price": "0.5",
  "priceBaseUnits": "500000",
  "payTo": "0x1234567890abcdef1234567890abcdef12345678",
  "mint": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  "resource": "food/menu",
  "nonce": "a7f9c2e1"
}
Client Agent Implementation
The client agent demonstrates an AI-powered buyer that:

Negotiates pricing with merchant bots
Decides on a fair counter-offer based on market conditions
Executes USDC transactions to purchase services
Verifies receipts and accesses purchased resources

Example Negotiation Flow
typescript// 1. Start negotiation with merchant
const firstResponse = await fetch(`${MERCHANT}/negotiate`, {
  method: "POST", 
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ 
    convoId, 
    userMsg: "I need your service today. What's your price?", 
    scenario: "food" 
  })
});

// 2. Generate AI-powered counter-offer
const counterOffer = await aiModel.createCompletion({
  prompt: `Merchant says: "${merchantReply}". Make a fair counter offer.`
});

// 3. Obtain payment quote from gateway
const quote = await fetch(`${MERCHANT}/quote`, {
  method: "POST", 
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ convoId, scenario, baseUnits: counterOffer })
});

// 4. Execute payment transaction
const paymentResult = await executePayment(quote);

// 5. Verify and access resource
const resource = await fetch(`${GATEWAY}/x402/proxy`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ 
    signature: paymentResult.signature, 
    quote, 
    forward: { method: "GET", url: resourceUrl } 
  })
});
Merchant Service
The merchant service handles:

Negotiation with buyer agents
Quote generation
Payment verification callbacks
Resource delivery

Resource Endpoints
GET /food/menu             # Menu data (requires payment)
GET /tools/linter          # Linter service (requires payment)
POST /negotiate            # AI-driven negotiation endpoint
POST /quote                # Generate payment quote
Configuration
Key environment variables:
VariableDescriptionDefaultDATABASE_URLPostgreSQL connection stringpostgresql://app:app@localhost:5432/llmcity?schema=publicETH_RPC_URLEthereum RPC URL-BASE_RPC_URLBase Chain RPC URL-POLYGON_RPC_URLPolygon RPC URL-USDC_MINTUSDC token address-OPENAI_API_KEYOpenAI API key (for agent negotiation)-CLAUDE_API_KEYClaude API key (for agent negotiation)-MERCHANT_WALLETMerchant wallet address-AGENT_SECRET_KEYBuyer agent wallet private key-
Security Considerations
PandoraX402 includes several security features:

Replay protection using cryptographic nonces
Idempotent invoice tokens to prevent double-processing
Confirmation thresholds (configurable per chain)
USDC token allowlists to prevent token spoofing
HMAC signature verification for callbacks

Advanced Usage
Dynamic Pricing Engine
The pricing engine considers multiple factors:
typescriptfunction calculatePrice(basePrice, context) {
  // Reputation adjustment (0-100 score)
  const repDiscount = context.reputation >= 90 ? 0.1 : 
                     context.reputation >= 75 ? 0.05 : 0;
  
  // Gas congestion multiplier
  const gasMul = context.gasPrice > HIGH_GAS ? 1.05 : 1.0;
  
  // Demand-based pricing
  const demandMul = context.recentTransactions > THRESHOLD ? 1.1 : 1.0;
  
  // Time of day pricing
  const peakHourMul = isPeakHour() ? 1.15 : 1.0;
  
  return basePrice * (1 - repDiscount) * gasMul * demandMul * peakHourMul;
}
Cross-Chain Configuration
Configure different chain settings in your .env file:
# Ethereum Mainnet
ETH_RPC_URL=https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY
ETH_USDC=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
ETH_CONFIRMATIONS=3

# Base
BASE_RPC_URL=https://mainnet.base.org
BASE_USDC=0x833589fcd6edb6e08f4c7c32d4f71b54bda02913
BASE_CONFIRMATIONS=1

# Polygon
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_USDC=0x2791bca1f2de4661ed88a30c99a7a9449aa84174
POLYGON_CONFIRMATIONS=5
Development
bash# Start development environment
npm run dev

# Run individual services
npm run dev:gateway    # Start the HTTP 402 Gateway
npm run dev:dash       # Start the dashboard
npm run dev:merchants  # Start the merchant services
npm run dev:agent      # Start the client agent

# Database operations
npm run db:push        # Push schema to database
Testing and Debugging
The dashboard provides real-time monitoring at http://localhost:3000 with:

Transaction logs and status
Agent conversation history
Task queue visualization
Payment verification details

Contributing
Contributions are welcome! Please see CONTRIBUTING.md for guidelines.
Frequently Asked Questions
Why HTTP 402?
The HTTP 402 status code ("Payment Required") was reserved in the HTTP specification but rarely implemented. PandoraX402 provides a standardized implementation that keeps payment at the protocol layer, making integration simple and auditable.
How does fulfillment work?
Once payment finality is reached on-chain, the gateway emits a signed webhook to the merchant agent, which then fulfills the order by providing access to the requested resource.
Can I enable reputation-based discounts?
Yes, reputation scoring is included and configurable. Set ENABLE_REPUTATION_DISCOUNTS=true and adjust the thresholds in config.js.
Is this suitable for production?
Yes, PandoraX402 is designed for production use with proper risk controls, but start with small test amounts and thoroughly verify your configuration before handling significant value.
License
PandoraX402 is MIT licensed. The project maintainers provide no warranties. Operators are responsible for their own keys, compliance, and risk management.
