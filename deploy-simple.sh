#!/data/data/com.termux/files/usr/bin/bash
# deploy-simple.sh - DEPLOY COMPLETO SEM USAR /tmp
# Versão otimizada para Android/Termux
# Todos os logs salvos na pasta atual

set -e

# Cores
G='\033[0;32m'
Y='\033[1;33m'
B='\033[0;34m'
R='\033[0;31m'
C='\033[0;36m'
M='\033[0;35m'
NC='\033[0m'

# Log na pasta atual (não usa /tmp)
LOG_FILE="./deploy-log.txt"
echo "=== TONMOVES DEPLOY ===" > "$LOG_FILE"
echo "Iniciado em: $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

clear
echo -e "${C}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}║     🚀 TONMOVES - DEPLOY AUTOMÁTICO 🚀                   ║${NC}"
echo -e "${C}║   Setup → GitHub → Vercel                                ║${NC}"
echo -e "${C}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${B}📝 Log: ./deploy-log.txt${NC}"
echo ""

# ============================================
# FASE 1: DEPENDÊNCIAS
# ============================================
echo -e "${M}▶▶▶ FASE 1/5: DEPENDÊNCIAS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Node.js
if ! command -v node &> /dev/null; then
    echo -e "${Y}Instalando Node.js...${NC}"
    pkg update -y >> "$LOG_FILE" 2>&1
    pkg install -y nodejs >> "$LOG_FILE" 2>&1
fi
echo -e "${G}✅ Node.js $(node --version)${NC}"

# Git
if ! command -v git &> /dev/null; then
    echo -e "${Y}Instalando Git...${NC}"
    pkg install -y git >> "$LOG_FILE" 2>&1
fi
echo -e "${G}✅ Git $(git --version | cut -d' ' -f3)${NC}"

# Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo -e "${Y}Instalando Vercel CLI (1-2 min)...${NC}"
    npm install -g vercel >> "$LOG_FILE" 2>&1
fi
echo -e "${G}✅ Vercel CLI instalado${NC}"

# ============================================
# FASE 2: GIT CONFIG
# ============================================
echo ""
echo -e "${M}▶▶▶ FASE 2/5: GIT${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! git config --global user.name &> /dev/null; then
    read -p "Seu nome: " git_name
    read -p "Seu email: " git_email
    git config --global user.name "$git_name"
    git config --global user.email "$git_email"
    git config --global credential.helper store
fi
echo -e "${G}✅ Git: $(git config --global user.name)${NC}"

# ============================================
# FASE 3: CRIAR ARQUIVOS
# ============================================
echo ""
echo -e "${M}▶▶▶ FASE 3/5: CRIANDO ARQUIVOS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

mkdir -p api services public

echo -e "${B}Criando api/chat.js...${NC}"
cat > api/chat.js << 'EOF'
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
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    
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
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

export const config = { maxDuration: 30, regions: ['iad1'] };
EOF

echo -e "${B}Criando services/apiClient.ts...${NC}"
cat > services/apiClient.ts << 'EOF'
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
interface ChatResponse {
  success: boolean;
  data: string;
  usage?: any;
}
export interface ChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}
export class ApiClient {
  private baseUrl = import.meta.env.DEV ? 'http://localhost:3000' : '';
  async chat(messages: Message[], options: ChatOptions = {}): Promise<string> {
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
    if (!response.ok) throw new Error((await response.json()).message || 'API failed');
    return (await response.json()).data;
  }
  static createSystemMessage(content: string): Message { return { role: 'system', content }; }
  static createUserMessage(content: string): Message { return { role: 'user', content }; }
}
export const apiClient = new ApiClient();
EOF

echo -e "${B}Criando vercel.json...${NC}"
cat > vercel.json << 'EOF'
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{"source": "/api/:path*", "destination": "/api/:path*"}],
  "functions": {"api/**/*.js": {"maxDuration": 30, "memory": 1024}}
}
EOF

cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
.env*.local
.vercel
*.log
.DS_Store
EOF

cat > .env.local.example << 'EOF'
GROQ_API_KEY=gsk_your_api_key_here
EOF

cat > public/manifest.json << 'EOF'
{
  "name": "TONMOVES",
  "short_name": "TONMOVES",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#667eea"
}
EOF

echo -e "${G}✅ Arquivos criados!${NC}"

# ============================================
# INSTALAR NPM
# ============================================
echo ""
echo -e "${M}▶▶▶ INSTALANDO PACOTES NPM${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "package.json" ]; then
    echo -e "${Y}📦 npm install (1-3 min, aguarde...)${NC}"
    echo ""
    
    # Mostrar progresso em tempo real
    npm install 2>&1 | while read line; do
        echo "$line"
        echo "$line" >> "$LOG_FILE"
    done
    
    echo ""
    echo -e "${Y}📦 npm install groq-sdk...${NC}"
    echo ""
    
    npm install groq-sdk 2>&1 | while read line; do
        echo "$line"
        echo "$line" >> "$LOG_FILE"
    done
    
    echo ""
    echo -e "${G}✅ Pacotes instalados!${NC}"
else
    echo -e "${Y}⚠️  package.json não encontrado${NC}"
fi

# ============================================
# API KEY
# ============================================
echo ""
echo -e "${C}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}║            🔑 GROQ API KEY                               ║${NC}"
echo -e "${C}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${Y}Obtenha em: https://console.groq.com/keys${NC}"
echo ""
read -p "Cole sua GROQ_API_KEY: " groq_key

if [ -z "$groq_key" ]; then
    echo -e "${R}❌ API Key obrigatória!${NC}"
    exit 1
fi

echo "GROQ_API_KEY=$groq_key" > .env.local
echo -e "${G}✅ .env.local criado${NC}"

# ============================================
# FASE 4: GITHUB
# ============================================
echo ""
echo -e "${M}▶▶▶ FASE 4/5: GITHUB${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d ".git" ]; then
    git init
    read -p "URL do repo (https://github.com/user/repo.git): " repo_url
    git remote add origin "$repo_url"
fi

current_branch=$(git branch --show-current 2>/dev/null || echo "")
[ -z "$current_branch" ] && git checkout -b main

git add api/ services/ vercel.json .gitignore .env.local.example public/ >> "$LOG_FILE" 2>&1

if ! git diff --staged --quiet; then
    git commit -m "feat: serverless + mobile-first [$(date '+%Y-%m-%d %H:%M')]" >> "$LOG_FILE" 2>&1
    echo -e "${G}✅ Commit feito${NC}"
fi

echo -e "${Y}Enviando para GitHub...${NC}"
echo -e "${B}Se pedir senha: use Personal Access Token${NC}"
echo ""

if git push -u origin $(git branch --show-current) 2>&1 | tee -a "$LOG_FILE"; then
    echo -e "${G}✅ Enviado para GitHub!${NC}"
else
    read -p "GitHub username: " gh_user
    read -sp "Personal Token: " gh_token
    echo ""
    
    remote_url=$(git remote get-url origin)
    repo_path=$(echo "$remote_url" | sed 's|^https://||' | sed 's|\.git$||')
    git remote set-url origin "https://${gh_user}:${gh_token}@${repo_path}.git"
    
    git push -u origin $(git branch --show-current) >> "$LOG_FILE" 2>&1
    echo -e "${G}✅ Enviado!${NC}"
fi

# ============================================
# FASE 5: VERCEL
# ============================================
echo ""
echo -e "${M}▶▶▶ FASE 5/5: VERCEL${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! vercel whoami &> /dev/null; then
    echo -e "${Y}Faça login no navegador...${NC}"
    read -p "Pressione ENTER..." dummy
    vercel login
fi

echo -e "${G}✅ Logado: $(vercel whoami)${NC}"

[ ! -f ".vercel/project.json" ] && vercel link

echo -e "${B}Configurando API Key na Vercel...${NC}"
echo "$groq_key" | vercel env add GROQ_API_KEY production 2>&1 | tee -a "$LOG_FILE" || true
echo "$groq_key" | vercel env add GROQ_API_KEY preview 2>&1 | tee -a "$LOG_FILE" || true

echo ""
echo -e "${Y}🚀 Fazendo deploy...${NC}"
echo ""

if vercel --prod 2>&1 | tee -a "$LOG_FILE"; then
    echo ""
    echo -e "${G}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${G}║           🎉 DEPLOY CONCLUÍDO! 🎉                        ║${NC}"
    echo -e "${G}╚═══════════════════════════════════════════════════════════╝${NC}"
    
    url=$(vercel ls --prod 2>/dev/null | grep "https://" | head -1 | awk '{print $1}')
    [ -n "$url" ] && echo -e "${C}🌐 URL: ${Y}$url${NC}"
else
    echo -e "${R}❌ Erro no deploy${NC}"
    echo -e "${Y}Veja: ./deploy-log.txt${NC}"
fi

echo ""
echo -e "${G}✅ Processo completo!${NC}"
echo -e "${B}📝 Log completo: ./deploy-log.txt${NC}"
echo ""
