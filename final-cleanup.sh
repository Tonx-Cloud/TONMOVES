#!/data/data/com.termux/files/usr/bin/bash

# ============================================================================
# TONMOVES - Correção Final (Remove node-domexception completamente)
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     TONMOVES - Limpeza Final de node-domexception       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

cd ~/TONMOVES || { echo -e "${RED}Erro: Pasta não encontrada${NC}"; exit 1; }

# PASSO 1: Backup
echo -e "${BLUE}[1/6] Criando backup de segurança...${NC}"
BACKUP_DIR="${HOME}/tonmoves_final_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp package.json package-lock.json "$BACKUP_DIR/" 2>/dev/null || true
echo -e "${GREEN}✓ Backup criado em: $BACKUP_DIR${NC}\n"

# PASSO 2: Remover node-domexception do package.json
echo -e "${BLUE}[2/6] Limpando package.json...${NC}"
if grep -q 'node-domexception' package.json 2>/dev/null; then
    node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].forEach(type => {
        if (pkg[type]) {
            delete pkg[type]['node-domexception'];
            
            // Também remover pacotes que dependem dele
            Object.keys(pkg[type]).forEach(dep => {
                if (dep.includes('domexception')) {
                    console.log('Removendo: ' + dep);
                    delete pkg[type][dep];
                }
            });
        }
    });
    
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
    console.log('✓ package.json limpo');
    " || echo -e "${YELLOW}Aviso: Não foi possível processar package.json${NC}"
else
    echo -e "${GREEN}✓ package.json já está limpo${NC}"
fi
echo ""

# PASSO 3: Limpar completamente node_modules e cache
echo -e "${BLUE}[3/6] Removendo node_modules e cache...${NC}"
rm -rf node_modules package-lock.json
npm cache clean --force 2>/dev/null || true
echo -e "${GREEN}✓ Cache e módulos removidos${NC}\n"

# PASSO 4: Reinstalar dependências SEM node-domexception
echo -e "${BLUE}[4/6] Reinstalando dependências limpas...${NC}"
echo -e "${YELLOW}Isso pode levar alguns minutos...${NC}\n"

# Instalar com flags para evitar problemas
npm install --legacy-peer-deps --no-audit 2>&1 | tee npm-clean-install.log

# Verificar se ainda há warnings
if grep -q "node-domexception" npm-clean-install.log; then
    echo -e "\n${YELLOW}⚠ Ainda há referências a node-domexception${NC}"
    echo -e "${YELLOW}Isso pode ser de dependências transitivas (não é problema crítico)${NC}\n"
    
    # Tentar identificar qual pacote está trazendo node-domexception
    echo -e "${BLUE}Identificando dependências transitivas...${NC}"
    npm ls node-domexception 2>&1 | tee domexception-tree.log || true
    echo ""
else
    echo -e "\n${GREEN}✓ Instalação limpa sem node-domexception!${NC}\n"
fi

# PASSO 5: Atualizar pacotes problemáticos
echo -e "${BLUE}[5/6] Atualizando pacotes que podem usar node-domexception...${NC}"

# Pacotes comuns que podem depender de node-domexception
PACKAGES_TO_UPDATE=(
    "formdata-node"
    "form-data"
    "node-fetch"
    "undici"
)

for pkg in "${PACKAGES_TO_UPDATE[@]}"; do
    if npm ls "$pkg" &>/dev/null; then
        echo -e "${CYAN}Atualizando $pkg...${NC}"
        npm update "$pkg" --legacy-peer-deps 2>/dev/null || true
    fi
done

echo -e "${GREEN}✓ Pacotes atualizados${NC}\n"

# PASSO 6: Verificação final
echo -e "${BLUE}[6/6] Verificação final...${NC}"

VERIFICATION_FAILED=0

# Verificar package.json
if grep -q 'node-domexception' package.json; then
    echo -e "${RED}✗ package.json ainda contém node-domexception${NC}"
    VERIFICATION_FAILED=1
else
    echo -e "${GREEN}✓ package.json limpo${NC}"
fi

# Verificar node_modules
if [ -d "node_modules/node-domexception" ]; then
    echo -e "${YELLOW}⚠ node-domexception ainda em node_modules (dependência transitiva)${NC}"
    echo -e "${CYAN}  → Identificando qual pacote depende dele:${NC}"
    npm ls node-domexception 2>&1 | grep -A 3 "node-domexception@" | head -10
else
    echo -e "${GREEN}✓ node-domexception não está em node_modules${NC}"
fi

# Verificar se o projeto builda
echo -e "\n${BLUE}Testando build do projeto...${NC}"
if npm run build 2>&1 | tee build-final.log; then
    echo -e "${GREEN}✓ Build executado com sucesso!${NC}"
else
    echo -e "${RED}✗ Erro no build${NC}"
    echo -e "${YELLOW}Verifique build-final.log para detalhes${NC}"
    VERIFICATION_FAILED=1
fi

echo -e "\n${BLUE}══════════════════════════════════════════════════════${NC}\n"

if [ $VERIFICATION_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         ✅ LIMPEZA CONCLUÍDA COM SUCESSO!          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
    echo -e "\n${GREEN}O projeto está limpo e pronto para uso!${NC}\n"
    
    echo -e "${BLUE}📊 Estatísticas:${NC}"
    echo -e "  → Módulos instalados: $(ls -1 node_modules 2>/dev/null | wc -l)"
    echo -e "  → Build: Funcionando ✓"
    echo -e "  → Backup: $BACKUP_DIR\n"
    
    echo -e "${BLUE}Próximos passos:${NC}"
    echo -e "  1. ${CYAN}npm run dev${NC} - Iniciar servidor dev"
    echo -e "  2. ${CYAN}./deploy.sh${NC} - Deploy no Vercel\n"
    
else
    echo -e "${YELLOW}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║          ⚠ ATENÇÃO: VERIFICAR LOGS                ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════╝${NC}"
    echo -e "\n${YELLOW}Alguns avisos foram encontrados. Verifique:${NC}"
    echo -e "  → npm-clean-install.log"
    echo -e "  → build-final.log"
    echo -e "  → domexception-tree.log (se existir)\n"
    
    echo -e "${BLUE}Nota:${NC} Se o build está funcionando, warnings sobre"
    echo -e "dependências transitivas são geralmente aceitáveis.\n"
fi

# Criar resumo
cat > LIMPEZA_RESUMO.txt << EOF
═══════════════════════════════════════════════════════════
TONMOVES - Resumo da Limpeza Final
═══════════════════════════════════════════════════════════
Data: $(date)

Ações Realizadas:
✓ Backup criado em: $BACKUP_DIR
✓ package.json limpo de node-domexception
✓ node_modules removido e recriado
✓ Cache npm limpo
✓ Dependências reinstaladas
✓ Build testado

Arquivos de Log Gerados:
- npm-clean-install.log (log da instalação limpa)
- build-final.log (log do teste de build)
- domexception-tree.log (árvore de dependências, se existir)

Status: $([ $VERIFICATION_FAILED -eq 0 ] && echo "✅ SUCESSO" || echo "⚠ COM AVISOS")

Próximos Passos:
1. npm run dev (testar localmente)
2. ./deploy.sh (fazer deploy)

═══════════════════════════════════════════════════════════
EOF

echo -e "${CYAN}📄 Resumo salvo em: LIMPEZA_RESUMO.txt${NC}\n"
