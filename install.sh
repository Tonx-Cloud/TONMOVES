#!/data/data/com.termux/files/usr/bin/bash

# ============================================================================
# TONMOVES - Instalador One-Click (Termux)
# ============================================================================
# Use: curl -fsSL [URL] | bash
# ============================================================================

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${BLUE}"
cat << "BANNER"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   ████████╗ ██████╗ ███╗   ██╗███╗   ███╗ ██████╗       ║
║   ╚══██╔══╝██╔═══██╗████╗  ██║████╗ ████║██╔═══██╗      ║
║      ██║   ██║   ██║██╔██╗ ██║██╔████╔██║██║   ██║      ║
║      ██║   ██║   ██║██║╚██╗██║██║╚██╔╝██║██║   ██║      ║
║      ██║   ╚██████╔╝██║ ╚████║██║ ╚═╝ ██║╚██████╔╝      ║
║      ╚═╝    ╚═════╝ ╚═╝  ╚═══╝╚═╝     ╚═╝ ╚═════╝       ║
║                                                          ║
║            Instalador Automático - Termux               ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"

echo -e "${YELLOW}Iniciando instalação completa...${NC}\n"
sleep 2

# Função para mostrar progresso
show_progress() {
    echo -e "${GREEN}[✓]${NC} $1"
}

show_step() {
    echo -e "\n${BLUE}[→]${NC} $1"
}

# PASSO 1: Atualizar Termux
show_step "Atualizando Termux..."
pkg update -y > /dev/null 2>&1
show_progress "Termux atualizado"

# PASSO 2: Instalar dependências
show_step "Instalando dependências essenciais..."
pkg install -y git nodejs openssh > /dev/null 2>&1
show_progress "Git, Node.js e SSH instalados"

# PASSO 3: Configurar Git
show_step "Configurando Git..."
if [ -z "$(git config --global user.name)" ]; then
    echo -e "${YELLOW}Configure seu Git:${NC}"
    read -p "Nome: " git_name
    read -p "Email: " git_email
    git config --global user.name "$git_name"
    git config --global user.email "$git_email"
    show_progress "Git configurado"
else
    show_progress "Git já configurado ($(git config --global user.name))"
fi

# PASSO 4: Instalar Vercel CLI
show_step "Instalando Vercel CLI..."
npm install -g vercel > /dev/null 2>&1
show_progress "Vercel CLI instalado"

# PASSO 5: Criar diretório de trabalho
show_step "Preparando ambiente..."
mkdir -p ~/tonmoves-scripts
cd ~/tonmoves-scripts

# PASSO 6: Baixar script principal
show_step "Baixando scripts de correção..."

# Criar script principal
cat > fix-tonmoves-complete.sh << 'FIXSCRIPT'
#!/data/data/com.termux/files/usr/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[⚠]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         TONMOVES - Correção Automática Completa           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

PROJECT_DIR="$HOME/TONMOVES"

if [ ! -d "$PROJECT_DIR" ]; then
    log_info "Clonando repositório..."
    cd "$HOME"
    git clone https://github.com/Tonx-Cloud/TONMOVES.git
    cd TONMOVES
else
    cd "$PROJECT_DIR"
    BACKUP_DIR="${HOME}/tonmoves_backup_$(date +%Y%m%d_%H%M%S)"
    log_info "Criando backup em: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    cp -r . "$BACKUP_DIR/" 2>/dev/null || true
    log_success "Backup criado!"
    git fetch origin
    git checkout main
    git pull origin main || log_warning "Pull falhou"
fi

log_info "Corrigindo vercel.json..."
if [ -f "vercel.json" ]; then
    cp vercel.json vercel.json.backup
    node -e "
    const fs = require('fs');
    try {
        const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
        delete config.memory;
        if (config.functions) Object.keys(config.functions).forEach(k => delete config.functions[k].memory);
        if (config.builds) config.builds.forEach(b => delete b.config?.memory);
        if (!config.framework) config.framework = 'vite';
        if (!config.buildCommand) config.buildCommand = 'npm run build';
        if (!config.devCommand) config.devCommand = 'npm run dev';
        if (!config.installCommand) config.installCommand = 'npm install';
        fs.writeFileSync('vercel.json', JSON.stringify(config, null, 2));
    } catch(e) { console.error(e); process.exit(1); }
    "
    log_success "vercel.json corrigido!"
fi

log_info "Limpando dependências..."
rm -rf node_modules package-lock.json
log_success "Cache limpo!"

log_info "Instalando dependências..."
npm install --legacy-peer-deps
log_success "Dependências instaladas!"

log_info "Corrigindo vulnerabilidades..."
npm audit fix --force || log_warning "Algumas vulnerabilidades não foram corrigidas"

log_info "Consolidando scripts de deploy..."
cat > deploy.sh << 'DEPLOYSCRIPT'
#!/data/data/com.termux/files/usr/bin/bash
set -e
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'
echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     TONMOVES - Deploy Vercel         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
if ! command -v vercel &> /dev/null; then
    npm install -g vercel
fi
if [[ -n $(git status -s) ]]; then
    git add .
    read -p "Mensagem do commit: " msg
    git commit -m "$msg"
    git push origin main
fi
vercel --prod
echo -e "${GREEN}[✓] Deploy concluído!${NC}"
DEPLOYSCRIPT
chmod +x deploy.sh
mkdir -p deploy_scripts_backup
mv deploy-*.sh fix-deploy.sh deploy_scripts_backup/ 2>/dev/null || true
log_success "Scripts consolidados!"

log_info "Testando build..."
npm run build
log_success "Build OK!"

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✓ CORREÇÕES CONCLUÍDAS!                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "\n${BLUE}Próximos passos:${NC}"
echo -e "  1. cd ~/TONMOVES"
echo -e "  2. npm run dev (testar local)"
echo -e "  3. ./deploy.sh (deploy)"
FIXSCRIPT

chmod +x fix-tonmoves-complete.sh
show_progress "Scripts criados com sucesso"

# PASSO 7: Criar atalhos úteis
show_step "Criando atalhos..."

cat > ~/tonmoves << 'SHORTCUT'
#!/data/data/com.termux/files/usr/bin/bash
cd ~/TONMOVES || { echo "Projeto não encontrado! Execute: bash ~/tonmoves-scripts/fix-tonmoves-complete.sh"; exit 1; }
SHORTCUT

chmod +x ~/tonmoves

cat > ~/.bashrc << 'BASHRC'
# Atalhos TONMOVES
alias tonmoves='cd ~/TONMOVES'
alias tonfix='bash ~/tonmoves-scripts/fix-tonmoves-complete.sh'
alias tondeploy='cd ~/TONMOVES && ./deploy.sh'
alias tondev='cd ~/TONMOVES && npm run dev'
alias tonbuild='cd ~/TONMOVES && npm run build'

# Banner
echo "🎵 TONMOVES - Atalhos disponíveis:"
echo "  tonfix    - Executar correções automáticas"
echo "  tonmoves  - Ir para pasta do projeto"
echo "  tondev    - Iniciar servidor dev"
echo "  tonbuild  - Build de produção"
echo "  tondeploy - Deploy no Vercel"
BASHRC

source ~/.bashrc 2>/dev/null || true
show_progress "Atalhos criados"

# PASSO 8: Finalização
show_step "Finalizando instalação..."

echo -e "\n${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║            ✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!           ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}📦 Versões instaladas:${NC}"
echo "  → Git: $(git --version)"
echo "  → Node: $(node --version)"
echo "  → NPM: $(npm --version)"
echo "  → Vercel: $(vercel --version 2>/dev/null || echo 'instalado')"

echo -e "\n${BLUE}🎯 Próximos passos:${NC}"
echo ""
echo "  ${YELLOW}1. Execute o script de correção:${NC}"
echo "     bash ~/tonmoves-scripts/fix-tonmoves-complete.sh"
echo ""
echo "  ${YELLOW}2. Ou use o atalho:${NC}"
echo "     tonfix"
echo ""
echo "  ${YELLOW}3. Para ver todos os atalhos:${NC}"
echo "     source ~/.bashrc"
echo ""

echo -e "${GREEN}✨ Tudo pronto para começar!${NC}\n"

# Perguntar se quer executar agora
read -p "Deseja executar as correções agora? (s/n): " run_now

if [[ $run_now == "s" || $run_now == "S" ]]; then
    echo ""
    bash ~/tonmoves-scripts/fix-tonmoves-complete.sh
fi

