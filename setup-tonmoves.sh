#!/data/data/com.termux/files/usr/bin/bash
# setup-tonmoves.sh - MASTER SETUP SCRIPT
# Cria TODOS os arquivos necessários automaticamente
# Versão: 2.0 - Ultra Completo

set -e

# Cores
G='\033[0;32m'
Y='\033[1;33m'
B='\033[0;34m'
R='\033[0;31m'
C='\033[0;36m'
NC='\033[0m'

clear
echo -e "${C}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}║                                                        ║${NC}"
echo -e "${C}║         🚀 TONMOVES MASTER SETUP SCRIPT 🚀           ║${NC}"
echo -e "${C}║                                                        ║${NC}"
echo -e "${C}║    Cria TODOS os arquivos automaticamente             ║${NC}"
echo -e "${C}║                                                        ║${NC}"
echo -e "${C}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# 1. VERIFICAR DEPENDÊNCIAS
# ============================================
echo -e "${B}[1/9] Verificando dependências...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${Y}Instalando Node.js...${NC}"
    pkg install -y nodejs
fi

if ! command -v git &> /dev/null; then
    echo -e "${Y}Instalando Git...${NC}"
    pkg install -y git
fi

echo -e "${G}✅ Dependências OK${NC}"
echo ""

# ============================================
# 2. CRIAR ESTRUTURA DE PASTAS
# ============================================
echo -e "${B}[2/9] Criando estrutura de pastas...${NC}"

mkdir -p api
mkdir -p services
mkdir -p public
mkdir -p src

echo -e "${G}✅ Pastas criadas${NC}"
echo ""

# ============================================
# 3. CRIAR api/chat.js
# ============================================
echo -e "${B}[3/9] Criando api/chat.js...${NC}"

cat > api/chat.js << 'EOFAPI'
import Groq from 'groq-sdk';

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
].filter(Boolean);

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('GROQ_API_KEY not configured');
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    const { messages, model, temperature, max_tokens } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      messages,
      model: model || 'llama-3.1-8b-instant',
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 1024,
    });

    return res.status(200).json({
      success: true,
      data: completion.choices[0]?.message?.content || '',
      usage: completion.usage,
    });

  } catch (error) {
    console.error('Groq API Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
}

export const config = {
  maxDuration: 30,
  regions: ['iad1'],
};
EOFAPI

echo -e "${G}✅ api/chat.js criado${NC}"
echo ""

# ============================================
# 4. CRIAR services/apiClient.ts
# ============================================
echo -e "${B}[4/9] Criando services/apiClient.ts...${NC}"

cat > services/apiClient.ts << 'EOFSERVICE'
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  success: boolean;
  data: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: options.model || 'llama-3.1-8b-instant',
          temperature: options.temperature ?? 0.7,
          max_tokens: options.max_tokens ?? 1024,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API request failed');
      }

      const data: ChatResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error('API Client Error:', error);
      throw error;
    }
  }

  static createSystemMessage(content: string): Message {
    return { role: 'system', content };
  }

  static createUserMessage(content: string): Message {
    return { role: 'user', content };
  }
}

export const apiClient = new ApiClient();
EOFSERVICE

echo -e "${G}✅ services/apiClient.ts criado${NC}"
echo ""

# ============================================
# 5. CRIAR vercel.json
# ============================================
echo -e "${B}[5/9] Criando vercel.json...${NC}"

cat > vercel.json << 'EOFVERCEL'
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ],
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
EOFVERCEL

echo -e "${G}✅ vercel.json criado${NC}"
echo ""

# ============================================
# 6. ATUALIZAR .gitignore
# ============================================
echo -e "${B}[6/9] Criando .gitignore...${NC}"

cat > .gitignore << 'EOFGITIGNORE'
node_modules/
dist/
.env
.env.local
.env*.local
.vercel
*.log
.DS_Store
Thumbs.db
EOFGITIGNORE

echo -e "${G}✅ .gitignore criado${NC}"
echo ""

# ============================================
# 7. CRIAR .env.local.example
# ============================================
echo -e "${B}[7/9] Criando .env.local.example...${NC}"

cat > .env.local.example << 'EOFENV'
# GROQ API KEY
# Obtenha em: https://console.groq.com/keys
GROQ_API_KEY=gsk_your_api_key_here
EOFENV

echo -e "${G}✅ .env.local.example criado${NC}"
echo ""

# ============================================
# 8. CRIAR public/manifest.json
# ============================================
echo -e "${B}[8/9] Criando PWA manifest...${NC}"

cat > public/manifest.json << 'EOFMANIFEST'
{
  "name": "TONMOVES - Gerador de Prompts Musicais",
  "short_name": "TONMOVES",
  "description": "Crie prompts para vídeos musicais com IA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#667eea",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
EOFMANIFEST

echo -e "${G}✅ public/manifest.json criado${NC}"
echo ""

# ============================================
# 9. INSTALAR DEPENDÊNCIAS
# ============================================
echo -e "${B}[9/9] Instalando dependências...${NC}"

if [ -f "package.json" ]; then
    echo -e "${Y}Instalando pacotes npm...${NC}"
    npm install > /dev/null 2>&1
    
    echo -e "${Y}Instalando groq-sdk...${NC}"
    npm install groq-sdk > /dev/null 2>&1
    
    echo -e "${G}✅ Dependências instaladas${NC}"
else
    echo -e "${R}⚠️  package.json não encontrado${NC}"
    echo -e "${Y}Execute 'npm install' manualmente depois${NC}"
fi

echo ""

# ============================================
# CONFIGURAR API KEY
# ============================================
echo ""
echo -e "${C}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}║                                                        ║${NC}"
echo -e "${C}║              🔑 CONFIGURAÇÃO DA API KEY               ║${NC}"
echo -e "${C}║                                                        ║${NC}"
echo -e "${C}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${Y}Obtenha sua chave em:${NC} https://console.groq.com/keys"
echo ""

read -p "Cole sua GROQ_API_KEY aqui: " groq_key

if [ -n "$groq_key" ]; then
    echo "GROQ_API_KEY=$groq_key" > .env.local
    echo -e "${G}✅ .env.local criado com sua API Key${NC}"
else
    echo -e "${R}⚠️  API Key não configurada${NC}"
    echo -e "${Y}Configure manualmente depois em .env.local${NC}"
fi

# ============================================
# RESUMO FINAL
# ============================================
echo ""
echo -e "${G}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${G}║                                                        ║${NC}"
echo -e "${G}║           ✨ SETUP CONCLUÍDO COM SUCESSO! ✨         ║${NC}"
echo -e "${G}║                                                        ║${NC}"
echo -e "${G}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${B}📁 Arquivos Criados:${NC}"
echo ""
echo "  ✅ api/chat.js"
echo "  ✅ services/apiClient.ts"
echo "  ✅ vercel.json"
echo "  ✅ .gitignore"
echo "  ✅ .env.local.example"
echo "  ✅ .env.local (com sua API Key)"
echo "  ✅ public/manifest.json"
echo ""
echo -e "${B}📋 Próximos Passos:${NC}"
echo ""
echo -e "${Y}1️⃣  Testar localmente:${NC}"
echo "   npm run dev"
echo ""
echo -e "${Y}2️⃣  Fazer commit:${NC}"
echo "   git add ."
echo "   git commit -m \"feat: add serverless architecture\""
echo "   git push"
echo ""
echo -e "${Y}3️⃣  Instalar Vercel CLI (se ainda não tem):${NC}"
echo "   npm install -g vercel"
echo ""
echo -e "${Y}4️⃣  Login na Vercel:${NC}"
echo "   vercel login"
echo ""
echo -e "${Y}5️⃣  Configurar API Key na Vercel:${NC}"
echo "   vercel env add GROQ_API_KEY production"
echo "   (Cole a mesma chave quando solicitado)"
echo ""
echo -e "${Y}6️⃣  Deploy:${NC}"
echo "   vercel --prod"
echo ""
echo -e "${C}═══════════════════════════════════════════════════════${NC}"
echo -e "${G}🎉 Tudo pronto! Seu TONMOVES está configurado!${NC}"
echo -e "${C}═══════════════════════════════════════════════════════${NC}"
echo ""

# ============================================
# VERIFICAÇÃO FINAL
# ============================================
echo -e "${B}🔍 Verificação Final:${NC}"
echo ""
[ -f "api/chat.js" ] && echo "  ✅ api/chat.js" || echo "  ❌ api/chat.js"
[ -f "services/apiClient.ts" ] && echo "  ✅ services/apiClient.ts" || echo "  ❌ services/apiClient.ts"
[ -f "vercel.json" ] && echo "  ✅ vercel.json" || echo "  ❌ vercel.json"
[ -f ".gitignore" ] && echo "  ✅ .gitignore" || echo "  ❌ .gitignore"
[ -f ".env.local" ] && echo "  ✅ .env.local" || echo "  ⚠️  .env.local (configure manualmente)"
[ -f "public/manifest.json" ] && echo "  ✅ public/manifest.json" || echo "  ❌ public/manifest.json"
echo ""
