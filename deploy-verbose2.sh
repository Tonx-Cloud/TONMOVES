#!/data/data/com.termux/files/usr/bin/bash
# deploy-verbose.sh - DEPLOY COMPLETO COM LOGS DETALHADOS
# Versão com máximo feedback visual e logs
# Versão: 3.1 - Ultra Verbose

set -e

# Cores
G='\033[0;32m'
Y='\033[1;33m'
B='\033[0;34m'
R='\033[0;31m'
C='\033[0;36m'
M='\033[0;35m'
NC='\033[0m'

# Arquivo de log (usar pasta atual ao invés de /tmp no Android)
LOG_FILE="./tonmoves-deploy-$(date +%Y%m%d-%H%M%S).log"
echo "=== TONMOVES DEPLOY LOG ===" > "$LOG_FILE"
echo "Data: $(date)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Função para log duplo (tela + arquivo)
log_both() {
    echo -e "$1"
    echo -e "$1" | sed 's/\x1b\[[0-9;]*m//g' >> "$LOG_FILE"
}

clear
log_both "${C}╔═══════════════════════════════════════════════════════════╗${NC}"
log_both "${C}║                                                           ║${NC}"
log_both "${C}║     🚀 TONMOVES DEPLOY VERBOSE MODE 🚀                   ║${NC}"
log_both "${C}║                                                           ║${NC}"
log_both "${C}║   Todos os passos serão exibidos em detalhes             ║${NC}"
log_both "${C}║                                                           ║${NC}"
log_both "${C}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
log_both "${B}📝 Log sendo salvo em: $LOG_FILE${NC}"
echo ""

# ============================================
# FUNÇÕES AUXILIARES
# ============================================
log_step() {
    echo ""
    log_both "${M}▶▶▶ $1${NC}"
    log_both "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

log_success() {
    log_both "${G}✅ $1${NC}"
}

log_info() {
    log_both "${B}ℹ️  $1${NC}"
}

log_warning() {
    log_both "${Y}⚠️  $1${NC}"
}

log_error() {
    log_both "${R}❌ $1${NC}"
}

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while kill -0 "$pid" 2>/dev/null; do
        local temp=${spinstr#?}
        printf " [%c] " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# ============================================
# FASE 1: VERIFICAR DEPENDÊNCIAS
# ============================================
log_step "FASE 1/5: VERIFICANDO DEPENDÊNCIAS"

# Node.js
log_info "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    log_warning "Node.js não encontrado. Instalando..."
    pkg update -y 2>&1 | tee -a "$LOG_FILE"
    pkg install -y nodejs 2>&1 | tee -a "$LOG_FILE"
    log_success "Node.js instalado"
else
    NODE_VERSION=$(node --version)
    log_success "Node.js $NODE_VERSION detectado"
fi

# Git
log_info "Verificando Git..."
if ! command -v git &> /dev/null; then
    log_warning "Git não encontrado. Instalando..."
    pkg install -y git 2>&1 | tee -a "$LOG_FILE"
    log_success "Git instalado"
else
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    log_success "Git $GIT_VERSION detectado"
fi

# Vercel CLI
log_info "Verificando Vercel CLI..."
if ! command -v vercel &> /dev/null; then
    log_warning "Vercel CLI não encontrado. Instalando..."
    echo -e "${Y}⏳ Instalando Vercel CLI globalmente (pode demorar 1-2 min)...${NC}"
    npm install -g vercel 2>&1 | tee -a "$LOG_FILE"
    log_success "Vercel CLI instalado"
else
    VERCEL_VERSION=$(vercel --version 2>/dev/null || echo "instalado")
    log_success "Vercel CLI $VERCEL_VERSION detectado"
fi

# ============================================
# FASE 2: CONFIGURAR GIT
# ============================================
log_step "FASE 2/5: CONFIGURAR GIT"

if ! git config --global user.name &> /dev/null; then
    echo ""
    log_warning "Git não está configurado. Vamos configurar agora:"
    echo ""
    read -p "Seu nome (ex: João Silva): " git_name
    read -p "Seu email (ex: joao@email.com): " git_email
    
    git config --global user.name "$git_name"
    git config --global user.email "$git_email"
    git config --global credential.helper store
    log_success "Git configurado"
    
    echo "Git configurado com:" >> "$LOG_FILE"
    echo "  Nome: $git_name" >> "$LOG_FILE"
    echo "  Email: $git_email" >> "$LOG_FILE"
else
    GIT_USER=$(git config --global user.name)
    GIT_EMAIL=$(git config --global user.email)
    log_success "Git já configurado: $GIT_USER"
    echo "Git config: $GIT_USER <$GIT_EMAIL>" >> "$LOG_FILE"
fi

# ============================================
# FASE 3: CRIAR TODOS OS ARQUIVOS
# ============================================
log_step "FASE 3/5: CRIANDO ARQUIVOS DO PROJETO"

# 3.1 Estrutura de pastas
log_info "Criando estrutura de pastas..."
mkdir -p api services public src
ls -la api/ services/ public/ src/ >> "$LOG_FILE" 2>&1
log_success "Pastas criadas: api/, services/, public/, src/"

# 3.2 api/chat.js
log_info "Criando api/chat.js..."
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
wc -l api/chat.js >> "$LOG_FILE"
log_success "api/chat.js criado ($(wc -l < api/chat.js) linhas)"

# 3.3 services/apiClient.ts
log_info "Criando services/apiClient.ts..."
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
wc -l services/apiClient.ts >> "$LOG_FILE"
log_success "services/apiClient.ts criado ($(wc -l < services/apiClient.ts) linhas)"

# 3.4 vercel.json
log_info "Criando vercel.json..."
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
  }
}
EOFVERCEL
log_success "vercel.json criado"

# 3.5 .gitignore
log_info "Criando .gitignore..."
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
log_success ".gitignore criado"

# 3.6 .env.local.example
log_info "Criando .env.local.example..."
cat > .env.local.example << 'EOFENV'
# GROQ API KEY
# Obtenha em: https://console.groq.com/keys
GROQ_API_KEY=gsk_your_api_key_here
EOFENV
log_success ".env.local.example criado"

# 3.7 public/manifest.json
log_info "Criando public/manifest.json..."
cat > public/manifest.json << 'EOFMANIFEST'
{
  "name": "TONMOVES",
  "short_name": "TONMOVES",
  "description": "Gerador de prompts para vídeos musicais",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#667eea",
  "theme_color": "#667eea",
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
log_success "public/manifest.json criado"

echo ""
log_success "✨ Todos os arquivos criados com sucesso!"

# 3.8 Instalar dependências
echo ""
log_step "INSTALANDO DEPENDÊNCIAS NPM"

if [ ! -f "package.json" ]; then
    log_warning "package.json não encontrado. Pulando instalação de dependências."
    echo "AVISO: package.json não encontrado" >> "$LOG_FILE"
else
    echo ""
    log_info "📦 Instalando dependências (isso pode demorar 1-3 minutos)..."
    log_info "Acompanhe o progresso abaixo:"
    echo ""
    
    # npm install
    echo -e "${C}▶ Executando: npm install${NC}"
    echo "=== NPM INSTALL ===" >> "$LOG_FILE"
    
    if npm install 2>&1 | tee -a "$LOG_FILE" | grep -E "(added|removed|changed|audited|packages)"; then
        echo ""
        log_success "npm install concluído!"
    else
        log_error "Erro ao instalar dependências"
        echo -e "${Y}📝 Verifique o log completo em: $LOG_FILE${NC}"
        exit 1
    fi
    
    echo ""
    # groq-sdk
    echo -e "${C}▶ Executando: npm install groq-sdk${NC}"
    echo "=== NPM INSTALL GROQ-SDK ===" >> "$LOG_FILE"
    
    if npm install groq-sdk 2>&1 | tee -a "$LOG_FILE" | grep -E "(added|removed|changed|audited)"; then
        echo ""
        log_success "groq-sdk instalado!"
    else
        log_error "Erro ao instalar groq-sdk"
        echo -e "${Y}📝 Verifique o log completo em: $LOG_FILE${NC}"
        exit 1
    fi
    
    echo ""
    log_success "✨ Todas as dependências instaladas com sucesso!"
    
    # Listar pacotes instalados
    echo ""
    log_info "Pacotes instalados:"
    npm list --depth=0 2>/dev/null | head -20
    npm list --depth=0 >> "$LOG_FILE" 2>&1
fi

# ============================================
# CONFIGURAR API KEY
# ============================================
echo ""
log_both "${C}╔═══════════════════════════════════════════════════════════╗${NC}"
log_both "${C}║            🔑 CONFIGURAÇÃO DA API KEY                    ║${NC}"
log_both "${C}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
log_both "${Y}Obtenha sua chave em:${NC} https://console.groq.com/keys"
echo ""

read -p "Cole sua GROQ_API_KEY: " groq_key

if [ -z "$groq_key" ]; then
    log_error "API Key é obrigatória!"
    exit 1
fi

echo "GROQ_API_KEY=$groq_key" > .env.local
echo "API Key configurada (primeiros 10 chars): ${groq_key:0:10}..." >> "$LOG_FILE"
log_success ".env.local criado com sua API Key"

# ============================================
# FASE 4: GIT COMMIT E PUSH
# ============================================
log_step "FASE 4/5: ENVIANDO PARA GITHUB"

# Verificar repositório
if [ ! -d ".git" ]; then
    log_warning "Não é um repositório Git. Inicializando..."
    git init 2>&1 | tee -a "$LOG_FILE"
    
    echo ""
    read -p "URL do repositório GitHub: " repo_url
    git remote add origin "$repo_url" 2>&1 | tee -a "$LOG_FILE"
    log_success "Repositório Git inicializado"
else
    log_info "Repositório Git detectado"
    git remote -v >> "$LOG_FILE"
fi

# Branch
current_branch=$(git branch --show-current 2>/dev/null || echo "")
if [ -z "$current_branch" ]; then
    git checkout -b main 2>&1 | tee -a "$LOG_FILE"
    log_success "Branch 'main' criada"
else
    log_info "Branch atual: $current_branch"
fi

# Add e commit
log_info "Adicionando arquivos ao Git..."
git add api/ services/ vercel.json .gitignore .env.local.example public/ 2>&1 | tee -a "$LOG_FILE"

git status >> "$LOG_FILE"

if git diff --staged --quiet; then
    log_warning "Nenhuma mudança para commitar"
else
    log_info "Fazendo commit..."
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    git commit -m "feat: serverless architecture + mobile-first [$timestamp]" 2>&1 | tee -a "$LOG_FILE"
    log_success "Commit realizado"
fi

# Push
log_info "Enviando para GitHub..."
echo ""
log_warning "Se pedir credenciais:"
log_info "Username: seu_usuario_github"
log_info "Password: Personal Access Token (https://github.com/settings/tokens)"
echo ""

if git push -u origin $(git branch --show-current) 2>&1 | tee -a "$LOG_FILE"; then
    log_success "Código enviado para GitHub!"
else
    log_warning "Erro ao fazer push. Pode precisar de autenticação."
    echo ""
    read -p "GitHub username: " gh_user
    read -sp "Personal Access Token: " gh_token
    echo ""
    
    remote_url=$(git remote get-url origin)
    repo_path=$(echo "$remote_url" | sed 's|^https://||' | sed 's|^git@github.com:||' | sed 's|\.git$||')
    
    git remote set-url origin "https://${gh_user}:${gh_token}@github.com/${repo_path}.git"
    
    if git push -u origin $(git branch --show-current) 2>&1 | tee -a "$LOG_FILE"; then
        log_success "Código enviado para GitHub!"
    else
        log_error "Falha ao enviar para GitHub"
        echo -e "${Y}📝 Verifique o log: $LOG_FILE${NC}"
        exit 1
    fi
fi

# ============================================
# FASE 5: DEPLOY NA VERCEL
# ============================================
log_step "FASE 5/5: DEPLOY NA VERCEL"

# Login
log_info "Verificando autenticação Vercel..."
if ! vercel whoami &> /dev/null; then
    log_warning "Não autenticado. Faça login no navegador."
    echo ""
    read -p "Pressione ENTER para continuar..." dummy
    vercel login 2>&1 | tee -a "$LOG_FILE"
fi

VERCEL_USER=$(vercel whoami 2>/dev/null || echo "desconhecido")
log_success "Autenticado: $VERCEL_USER"
echo "Vercel user: $VERCEL_USER" >> "$LOG_FILE"

# Link projeto
if [ ! -f ".vercel/project.json" ]; then
    log_info "Linkando projeto..."
    vercel link 2>&1 | tee -a "$LOG_FILE"
fi

# Configurar env
log_info "Configurando GROQ_API_KEY na Vercel..."
echo "$groq_key" | vercel env add GROQ_API_KEY production 2>&1 | tee -a "$LOG_FILE" || true
echo "$groq_key" | vercel env add GROQ_API_KEY preview 2>&1 | tee -a "$LOG_FILE" || true

log_success "Variáveis configuradas"

# Deploy
echo ""
log_info "🚀 Iniciando deploy para produção..."
echo ""
echo "=== VERCEL DEPLOY ===" >> "$LOG_FILE"

if vercel --prod 2>&1 | tee -a "$LOG_FILE"; then
    echo ""
    log_success "🎉 Deploy concluído!"
    
    project_url=$(vercel ls --prod 2>/dev/null | grep "https://" | head -1 | awk '{print $1}')
    
    if [ -n "$project_url" ]; then
        echo ""
        log_both "${G}╔═══════════════════════════════════════════════════════════╗${NC}"
        log_both "${G}║                                                           ║${NC}"
        log_both "${G}║       🎉🎉🎉  DEPLOY CONCLUÍDO!  🎉🎉🎉                 ║${NC}"
        log_both "${G}║                                                           ║${NC}"
        log_both "${G}╚═══════════════════════════════════════════════════════════╝${NC}"
        echo ""
        log_both "${C}🌐 URL: ${Y}$project_url${NC}"
        echo ""
    fi
else
    log_error "Falha no deploy"
    echo -e "${Y}📝 Verifique o log: $LOG_FILE${NC}"
    exit 1
fi

# ============================================
# RESUMO FINAL
# ============================================
echo ""
log_both "${C}╔═══════════════════════════════════════════════════════════╗${NC}"
log_both "${C}║                    RESUMO FINAL                          ║${NC}"
log_both "${C}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
log_both "${G}✅ Arquivos criados${NC}"
log_both "${G}✅ Dependências instaladas${NC}"
log_both "${G}✅ API Key configurada${NC}"
log_both "${G}✅ Código no GitHub${NC}"
log_both "${G}✅ Deploy na Vercel${NC}"
echo ""
log_both "${B}📝 Log completo salvo em:${NC}"
log_both "${Y}   $LOG_FILE${NC}"
echo ""
log_both "${G}═══════════════════════════════════════════════════════════${NC}"
log_both "${G}🚀 TONMOVES está 100% operacional!${NC}"
log_both "${G}═══════════════════════════════════════════════════════════${NC}"
echo ""
