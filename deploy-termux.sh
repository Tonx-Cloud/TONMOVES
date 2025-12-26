#!/data/data/com.termux/files/usr/bin/bash
# deploy-termux.sh - DEPLOY CORRETO NO TERMUX
# Move projeto para ~/TONMOVES e faz tudo lá
# Resolve problema de symlinks no /sdcard

set -e

G='\033[0;32m'
Y='\033[1;33m'
B='\033[0;34m'
R='\033[0;31m'
C='\033[0;36m'
M='\033[0;35m'
NC='\033[0m'

clear
echo -e "${C}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}║     🚀 TONMOVES - DEPLOY TERMUX FIX 🚀                   ║${NC}"
echo -e "${C}║                                                           ║${NC}"
echo -e "${C}║   Resolve problema de permissão no /sdcard               ║${NC}"
echo -e "${C}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# VERIFICAR LOCALIZAÇÃO ATUAL
# ============================================
CURRENT_DIR=$(pwd)
echo -e "${B}📍 Localização atual: $CURRENT_DIR${NC}"

if [[ "$CURRENT_DIR" == /sdcard/* ]] || [[ "$CURRENT_DIR" == /storage/* ]]; then
    echo -e "${Y}⚠️  Você está no /sdcard - npm não funciona aqui!${NC}"
    echo -e "${B}Vamos copiar o projeto para ~/TONMOVES${NC}"
    echo ""
    
    # Ir para home
    cd ~
    
    # Remover pasta antiga se existir
    if [ -d "TONMOVES" ]; then
        echo -e "${Y}Removendo ~/TONMOVES antigo...${NC}"
        rm -rf TONMOVES
    fi
    
    # Copiar projeto
    echo -e "${B}Copiando projeto de $CURRENT_DIR para ~/TONMOVES...${NC}"
    cp -r "$CURRENT_DIR" ~/TONMOVES
    
    # Entrar na nova pasta
    cd ~/TONMOVES
    
    echo -e "${G}✅ Projeto copiado para: $(pwd)${NC}"
    echo ""
else
    echo -e "${G}✅ Já está em local correto: $CURRENT_DIR${NC}"
    echo ""
fi

# ============================================
# LOG
# ============================================
LOG_FILE="./deploy.log"
echo "=== TONMOVES DEPLOY ===" > "$LOG_FILE"
echo "Data: $(date)" >> "$LOG_FILE"
echo "Local: $(pwd)" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# ============================================
# FASE 1: DEPENDÊNCIAS
# ============================================
echo -e "${M}▶▶▶ FASE 1/5: DEPENDÊNCIAS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v node &> /dev/null; then
    echo -e "${Y}Instalando Node.js...${NC}"
    pkg update -y >> "$LOG_FILE" 2>&1
    pkg install -y nodejs >> "$LOG_FILE" 2>&1
fi
echo -e "${G}✅ Node.js $(node --version)${NC}"

if ! command -v git &> /dev/null; then
    echo -e "${Y}Instalando Git...${NC}"
    pkg install -y git >> "$LOG_FILE" 2>&1
fi
echo -e "${G}✅ Git $(git --version | cut -d' ' -f3)${NC}"

if ! command -v vercel &> /dev/null; then
    echo -e "${Y}Instalando Vercel CLI...${NC}"
    npm install -g vercel >> "$LOG_FILE" 2>&1
fi
echo -e "${G}✅ Vercel CLI${NC}"

# ============================================
# FASE 2: GIT
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
echo -e "${G}✅ $(git config --global user.name)${NC}"

# ============================================
# FASE 3: ARQUIVOS
# ============================================
echo ""
echo -e "${M}▶▶▶ FASE 3/5: ARQUIVOS${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

mkdir -p api services public

cat > api/chat.js << 'EOF'
import Groq from 'groq-sdk';
const allowedOrigins = ['http://localhost:5173','http://localhost:3000',process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:''].filter(Boolean);
export default async function handler(req,res){const origin=req.headers.origin;if(allowedOrigins.includes(origin))res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');if(req.method==='OPTIONS')return res.status(200).end();if(req.method!=='POST')return res.status(405).json({error:'Method Not Allowed'});try{const apiKey=process.env.GROQ_API_KEY;if(!apiKey)return res.status(500).json({error:'GROQ_API_KEY not configured'});const{messages,model,temperature,max_tokens}=req.body;if(!messages||!Array.isArray(messages))return res.status(400).json({error:'Invalid messages format'});const groq=new Groq({apiKey});const completion=await groq.chat.completions.create({messages,model:model||'llama-3.1-8b-instant',temperature:temperature||0.7,max_tokens:max_tokens||1024});return res.status(200).json({success:true,data:completion.choices[0]?.message?.content||'',usage:completion.usage})}catch(error){return res.status(500).json({error:'Internal Server Error',message:error.message})}}
export const config={maxDuration:30,regions:['iad1']};
EOF

cat > services/apiClient.ts << 'EOF'
export interface Message{role:'system'|'user'|'assistant';content:string}interface ChatResponse{success:boolean;data:string;usage?:any}export interface ChatOptions{model?:string;temperature?:number;max_tokens?:number}export class ApiClient{private baseUrl=import.meta.env.DEV?'http://localhost:3000':'';async chat(messages:Message[],options:ChatOptions={}):Promise<string>{const response=await fetch(`${this.baseUrl}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages,model:options.model||'llama-3.1-8b-instant',temperature:options.temperature??0.7,max_tokens:options.max_tokens??1024})});if(!response.ok)throw new Error((await response.json()).message||'API failed');return(await response.json()).data}static createSystemMessage(content:string):Message{return{role:'system',content}}static createUserMessage(content:string):Message{return{role:'user',content}}}export const apiClient=new ApiClient();
EOF

cat > vercel.json << 'EOF'
{"version":2,"buildCommand":"npm run build","outputDirectory":"dist","framework":"vite","rewrites":[{"source":"/api/:path*","destination":"/api/:path*"}],"functions":{"api/**/*.js":{"maxDuration":30,"memory":1024}}}
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
GROQ_API_KEY=gsk_your_key_here
EOF

cat > public/manifest.json << 'EOF'
{"name":"TONMOVES","short_name":"TONMOVES","start_url":"/","display":"standalone","background_color":"#667eea","theme_color":"#667eea"}
EOF

echo -e "${G}✅ Arquivos criados${NC}"

# ============================================
# FASE 4: NPM INSTALL
# ============================================
echo ""
echo -e "${M}▶▶▶ FASE 4/7: NPM INSTALL (AGORA VAI FUNCIONAR!)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -f "package.json" ]; then
    echo -e "${R}❌ package.json não encontrado!${NC}"
    echo -e "${Y}Execute este script dentro da pasta TONMOVES${NC}"
    exit 1
fi

# Limpar node_modules antigo do /sdcard
if [ -d "node_modules" ]; then
    echo -e "${Y}Limpando node_modules antigo...${NC}"
    rm -rf node_modules package-lock.json
fi

echo -e "${Y}📦 npm install (1-3 min)...${NC}"
echo ""

# Install com progresso
npm install 2>&1 | tee -a "$LOG_FILE" | while IFS= read -r line; do
    if [[ "$line" == *"added"* ]] || [[ "$line" == *"packages"* ]] || [[ "$line" == *"audited"* ]]; then
        echo "$line"
    fi
done

if [ $? -ne 0 ]; then
    echo -e "${R}❌ Erro no npm install${NC}"
    echo -e "${Y}Veja: $LOG_FILE${NC}"
    exit 1
fi

echo ""
echo -e "${Y}📦 groq-sdk...${NC}"
npm install groq-sdk 2>&1 | tee -a "$LOG_FILE" | grep -E "(added|packages)"

echo ""
echo -e "${G}✅ Pacotes instalados com sucesso!${NC}"

# Verificar instalação
if [ -d "node_modules/groq-sdk" ]; then
    echo -e "${G}✅ groq-sdk verificado em node_modules/${NC}"
else
    echo -e "${R}❌ groq-sdk não foi instalado corretamente${NC}"
    exit 1
fi

# ============================================
# FASE 5: API KEY
# ============================================
echo ""
echo -e "${C}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${C}║            🔑 GROQ API KEY                               ║${NC}"
echo -e "${C}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${Y}https://console.groq.com/keys${NC}"
echo ""
read -p "Cole sua GROQ_API_KEY: " groq_key

[ -z "$groq_key" ] && { echo -e "${R}❌ Obrigatório${NC}"; exit 1; }

echo "GROQ_API_KEY=$groq_key" > .env.local
echo -e "${G}✅ .env.local criado${NC}"

# ============================================
# FASE 6: GITHUB
# ============================================
echo ""
echo -e "${M}▶▶▶ FASE 6/7: GITHUB${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d ".git" ]; then
    git init >> "$LOG_FILE" 2>&1
    read -p "URL repo: " repo_url
    git remote add origin "$repo_url" >> "$LOG_FILE" 2>&1
fi

current_branch=$(git branch --show-current 2>/dev/null || echo "")
[ -z "$current_branch" ] && git checkout -b main >> "$LOG_FILE" 2>&1

git add api/ services/ vercel.json .gitignore .env.local.example public/ >> "$LOG_FILE" 2>&1

if ! git diff --staged --quiet; then
    git commit -m "feat: serverless [$(date '+%Y%m%d-%H%M')]" >> "$LOG_FILE" 2>&1
    echo -e "${G}✅ Commit${NC}"
fi

echo -e "${Y}Push para GitHub...${NC}"
if git push -u origin $(git branch --show-current) 2>&1 | tee -a "$LOG_FILE"; then
    echo -e "${G}✅ GitHub atualizado${NC}"
else
    read -p "Username: " gh_user
    read -sp "Token: " gh_token
    echo ""
    remote_url=$(git remote get-url origin)
    repo_path=$(echo "$remote_url" | sed 's|^https://||' | sed 's|\.git$||')
    git remote set-url origin "https://${gh_user}:${gh_token}@${repo_path}.git"
    git push -u origin $(git branch --show-current) >> "$LOG_FILE" 2>&1
    echo -e "${G}✅ Enviado${NC}"
fi

# ============================================
# FASE 7: VERCEL
# ============================================
echo ""
echo -e "${M}▶▶▶ FASE 7/7: VERCEL${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

vercel whoami &> /dev/null || { read -p "Login (ENTER)..." dummy; vercel login; }
echo -e "${G}✅ $(vercel whoami)${NC}"

[ ! -f ".vercel/project.json" ] && vercel link

echo "$groq_key" | vercel env add GROQ_API_KEY production 2>&1 | tee -a "$LOG_FILE" || true
echo "$groq_key" | vercel env add GROQ_API_KEY preview 2>&1 | tee -a "$LOG_FILE" || true

echo ""
echo -e "${Y}🚀 Deploy...${NC}"
echo ""

if vercel --prod 2>&1 | tee -a "$LOG_FILE"; then
    echo ""
    echo -e "${G}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${G}║           🎉 SUCESSO! 🎉                                 ║${NC}"
    echo -e "${G}╚═══════════════════════════════════════════════════════════╝${NC}"
    
    url=$(vercel ls --prod 2>/dev/null | grep "https://" | head -1 | awk '{print $1}')
    [ -n "$url" ] && echo -e "${C}🌐 ${Y}$url${NC}"
else
    echo -e "${R}❌ Erro${NC}"
fi

echo ""
echo -e "${B}📝 Log: $LOG_FILE${NC}"
echo -e "${B}📍 Projeto em: $(pwd)${NC}"
echo ""
