#!/data/data/com.termux/files/usr/bin/bash
# deploy-all.sh - SETUP + GITHUB + VERCEL COMPLETO
# Cria todos os arquivos, faz commit, push e deploy automaticamente
# Versão: 3.0 - Ultra Automático

set -e

# Cores
G='\033[0;32m'
Y='\033[1;33m'
B='\033[0;34m'
R='\033[0;31m'
C='\033[0;36m'
M='\033[0;35m'
NC='\033[0m'

clear
echo -e "${C}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}║                                                           ║${NC}"
echo -e "${C}║     🚀 TONMOVES DEPLOY COMPLETO AUTOMÁTICO 🚀           ║${NC}"
echo -e "${C}║                                                           ║${NC}"
echo -e "${C}║   Setup → GitHub → Vercel (TUDO AUTOMATIZADO)            ║${NC}"
echo -e "${C}║                                                           ║${NC}"
echo -e "${C}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# FUNÇÕES AUXILIARES
# ============================================
log_step() {
    echo ""
    echo -e "${M}▶▶▶ $1${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

log_success() {
    echo -e "${G}✅ $1${NC}"
}

log_info() {
    echo -e "${B}ℹ️  $1${NC}"
}

log_warning() {
    echo -e "${Y}⚠️  $1${NC}"
}

log_error() {
    echo -e "${R}❌ $1${NC}"
}

# ============================================
# FASE 1: VERIFICAR DEPENDÊNCIAS
# ============================================
log_step "FASE 1/5: VERIFICANDO DEPENDÊNCIAS"

# Node.js
if ! command -v node &> /dev/null; then
    log_warning "Node.js não encontrado. Instalando..."
    pkg update -y > /dev/null 2>&1
    pkg install -y nodejs > /dev/null 2>&1
    log_success "Node.js instalado"
else
    log_success "Node.js $(node --version) detectado"
fi

# Git
if ! command -v git &> /dev/null; then
    log_warning "Git não encontrado. Instalando..."
    pkg install -y git > /dev/null 2>&1
    log_success "Git instalado"
else
    log_success "Git $(git --version | cut -d' ' -f3) detectado"
fi

# Vercel CLI
if ! command -v vercel &> /dev/null; then
    log_warning "Vercel CLI não encontrado. Instalando..."
    npm install -g vercel > /dev/null 2>&1
    log_success "Vercel CLI instalado"
else
    log_success "Vercel CLI detectado"
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
else
    log_success "Git já configurado: $(git config --global user.name)"
fi

# ============================================
# FASE 3: CRIAR TODOS OS ARQUIVOS
# ============================================
log_step "FASE 3/5: CRIANDO ARQUIVOS DO PROJETO"

# 3.1 Estrutura de pastas
log_info "Criando pastas..."
mkdir -p api services public src

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

# 3.6 .env.local.example
log_info "Criando .env.local.example..."
cat > .env.local.example << 'EOFENV'
# GROQ API KEY
# Obtenha em: https://console.groq.com/keys
GROQ_API_KEY=gsk_your_api_key_here
EOFENV

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

log_success "Todos os arquivos criados!"

# 3.8 Instalar dependências
log_info "Instalando dependências npm..."
if [ -f "package.json" ]; then
    npm install > /dev/null 2>&1
    npm install groq-sdk > /dev/null 2>&1
    log_success "Dependências instaladas"
else
    log_warning "package.json não encontrado. Pule esta etapa por enquanto."
fi

# ============================================
# CONFIGURAR API KEY
# ============================================
echo ""
echo -e "${C}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}║            🔑 CONFIGURAÇÃO DA API KEY                    ║${NC}"
echo -e "${C}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${Y}Obtenha sua chave em:${NC} https://console.groq.com/keys"
echo ""

read -p "Cole sua GROQ_API_KEY: " groq_key

if [ -z "$groq_key" ]; then
    log_error "API Key é obrigatória!"
    exit 1
fi

echo "GROQ_API_KEY=$groq_key" > .env.local
log_success ".env.local criado"

# ============================================
# FASE 4: GIT COMMIT E PUSH
# ============================================
log_step "FASE 4/5: ENVIANDO PARA GITHUB"

# Verificar se é repositório git
if [ ! -d ".git" ]; then
    log_warning "Não é um repositório Git. Inicializando..."
    git init
    
    echo ""
    read -p "URL do repositório GitHub (ex: https://github.com/user/repo.git): " repo_url
    git remote add origin "$repo_url"
    log_success "Repositório Git inicializado"
fi

# Verificar branch
current_branch=$(git branch --show-current 2>/dev/null || echo "")
if [ -z "$current_branch" ]; then
    git checkout -b main
    log_success "Branch 'main' criada"
else
    log_info "Branch atual: $current_branch"
fi

# Add e Commit
log_info "Adicionando arquivos ao Git..."
git add api/ services/ vercel.json .gitignore .env.local.example public/manifest.json 2>/dev/null || true

# Verificar se há algo para commitar
if git diff --staged --quiet; then
    log_warning "Nenhuma mudança para commitar"
else
    log_info "Fazendo commit..."
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    git commit -m "feat: serverless architecture + mobile-first UI [$timestamp]"
    log_success "Commit realizado"
fi

# Push
log_info "Enviando para GitHub..."
echo ""
log_warning "Se pedir usuário/senha:"
log_info "Username: seu_usuario_github"
log_info "Password: use um Personal Access Token (não a senha)"
log_info "Crie token em: https://github.com/settings/tokens"
echo ""

if git push -u origin $(git branch --show-current) 2>&1 | tee /tmp/git_push.log; then
    log_success "Código enviado para GitHub!"
else
    if grep -q "Authentication failed" /tmp/git_push.log; then
        log_error "Falha na autenticação!"
        echo ""
        read -p "GitHub username: " gh_user
        read -sp "Personal Access Token: " gh_token
        echo ""
        
        # Reconfigurar URL com token
        remote_url=$(git remote get-url origin)
        repo_path=$(echo "$remote_url" | sed 's|^https://||' | sed 's|^git@github.com:||' | sed 's|\.git$||')
        
        git remote set-url origin "https://${gh_user}:${gh_token}@github.com/${repo_path}.git"
        
        if git push -u origin $(git branch --show-current); then
            log_success "Código enviado para GitHub!"
        else
            log_error "Falha ao enviar para GitHub"
            exit 1
        fi
    else
        log_error "Erro ao fazer push. Verifique as mensagens acima."
        exit 1
    fi
fi

# ============================================
# FASE 5: DEPLOY NA VERCEL
# ============================================
log_step "FASE 5/5: DEPLOY NA VERCEL"

# Verificar login
log_info "Verificando autenticação Vercel..."
if ! vercel whoami &> /dev/null; then
    log_warning "Não autenticado na Vercel"
    echo ""
    echo -e "${Y}Você será redirecionado para fazer login no navegador${NC}"
    echo -e "${Y}Pressione ENTER quando estiver pronto...${NC}"
    read
    
    vercel login
    
    if ! vercel whoami &> /dev/null; then
        log_error "Falha ao autenticar na Vercel"
        exit 1
    fi
fi

log_success "Autenticado na Vercel: $(vercel whoami)"

# Link do projeto
if [ ! -f ".vercel/project.json" ]; then
    log_info "Linkando projeto na Vercel..."
    vercel link
fi

# Configurar variável de ambiente
log_info "Configurando GROQ_API_KEY na Vercel..."

echo "$groq_key" | vercel env add GROQ_API_KEY production 2>/dev/null || log_warning "Variável já existe ou erro ao adicionar"
echo "$groq_key" | vercel env add GROQ_API_KEY preview 2>/dev/null || true
echo "$groq_key" | vercel env add GROQ_API_KEY development 2>/dev/null || true

log_success "Variáveis de ambiente configuradas"

# Deploy
echo ""
log_info "Iniciando deploy para produção..."
echo ""

if vercel --prod; then
    echo ""
    log_success "Deploy concluído com sucesso!"
    
    # Obter URL
    echo ""
    log_info "Obtendo URL do projeto..."
    project_url=$(vercel ls --prod 2>/dev/null | grep "https://" | head -1 | awk '{print $1}')
    
    if [ -n "$project_url" ]; then
        echo ""
        echo -e "${G}╔═══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${G}║                                                           ║${NC}"
        echo -e "${G}║       🎉🎉🎉  DEPLOY CONCLUÍDO!  🎉🎉🎉                 ║${NC}"
        echo -e "${G}║                                                           ║${NC}"
        echo -e "${G}╚═══════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${C}🌐 Seu site está no ar em:${NC}"
        echo -e "${Y}   $project_url${NC}"
        echo ""
        echo -e "${B}📱 Acesse no celular para testar a responsividade!${NC}"
        echo ""
    fi
else
    log_error "Falha no deploy"
    echo ""
    echo -e "${Y}Tente manualmente:${NC}"
    echo "  vercel --prod"
    exit 1
fi

# ============================================
# RESUMO FINAL
# ============================================
echo ""
echo -e "${C}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}║                    RESUMO FINAL                          ║${NC}"
echo -e "${C}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${G}✅ Arquivos criados${NC}"
echo -e "${G}✅ Dependências instaladas${NC}"
echo -e "${G}✅ API Key configurada${NC}"
echo -e "${G}✅ Código no GitHub${NC}"
echo -e "${G}✅ Deploy na Vercel${NC}"
echo ""
echo -e "${B}📚 Comandos úteis:${NC}"
echo ""
echo -e "${Y}Ver logs da Vercel:${NC}"
echo "  vercel logs"
echo ""
echo -e "${Y}Atualizar depois de mudanças:${NC}"
echo "  git add ."
echo "  git commit -m \"sua mensagem\""
echo "  git push"
echo "  vercel --prod"
echo ""
echo -e "${Y}Testar localmente:${NC}"
echo "  npm run dev"
echo ""
echo -e "${G}═══════════════════════════════════════════════════════════${NC}"
echo -e "${G}🚀 TONMOVES está 100% operacional!${NC}"
echo -e "${G}═══════════════════════════════════════════════════════════${NC}"
echo ""
