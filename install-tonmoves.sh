#!/data/data/com.termux/files/usr/bin/bash

# ============================================================================
# TONMOVES - Verificação Pós-Instalação
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         TONMOVES - Verificação Pós-Instalação           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

cd ~/TONMOVES || { echo -e "${RED}Erro: Pasta TONMOVES não encontrada${NC}"; exit 1; }

# Contador de problemas
ISSUES=0

echo -e "${BLUE}[1/8] Verificando vercel.json...${NC}"
if [ -f "vercel.json" ]; then
    if grep -q '"memory"' vercel.json; then
        echo -e "${RED}  ✗ PROBLEMA: Configuração 'memory' ainda presente no vercel.json${NC}"
        ISSUES=$((ISSUES + 1))
    else
        echo -e "${GREEN}  ✓ vercel.json está correto (sem 'memory')${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ vercel.json não encontrado${NC}"
fi

echo -e "\n${BLUE}[2/8] Verificando package.json...${NC}"
if [ -f "package.json" ]; then
    if grep -q 'node-domexception' package.json; then
        echo -e "${RED}  ✗ PROBLEMA: node-domexception ainda presente no package.json${NC}"
        ISSUES=$((ISSUES + 1))
    else
        echo -e "${GREEN}  ✓ package.json está limpo (sem node-domexception)${NC}"
    fi
else
    echo -e "${RED}  ✗ package.json não encontrado${NC}"
    ISSUES=$((ISSUES + 1))
fi

echo -e "\n${BLUE}[3/8] Verificando package-lock.json...${NC}"
if [ -f "package-lock.json" ]; then
    if grep -q 'node-domexception' package-lock.json; then
        echo -e "${YELLOW}  ⚠ node-domexception ainda presente no package-lock.json${NC}"
        echo -e "${YELLOW}  → Precisa reinstalar dependências${NC}"
        ISSUES=$((ISSUES + 1))
    else
        echo -e "${GREEN}  ✓ package-lock.json está limpo${NC}"
    fi
else
    echo -e "${YELLOW}  ⚠ package-lock.json não existe (será criado no npm install)${NC}"
fi

echo -e "\n${BLUE}[4/8] Verificando node_modules...${NC}"
if [ -d "node_modules" ]; then
    if [ -d "node_modules/node-domexception" ]; then
        echo -e "${RED}  ✗ PROBLEMA: node-domexception ainda instalado em node_modules${NC}"
        ISSUES=$((ISSUES + 1))
    else
        echo -e "${GREEN}  ✓ node_modules está limpo${NC}"
    fi
    
    # Verificar se há node_modules
    MODULE_COUNT=$(ls -1 node_modules 2>/dev/null | wc -l)
    echo -e "${CYAN}  → Módulos instalados: $MODULE_COUNT${NC}"
else
    echo -e "${YELLOW}  ⚠ node_modules não existe${NC}"
    ISSUES=$((ISSUES + 1))
fi

echo -e "\n${BLUE}[5/8] Verificando scripts de deploy...${NC}"
if [ -f "deploy.sh" ]; then
    echo -e "${GREEN}  ✓ deploy.sh encontrado${NC}"
    
    # Contar scripts antigos
    OLD_SCRIPTS=$(ls -1 deploy-*.sh 2>/dev/null | wc -l)
    if [ $OLD_SCRIPTS -gt 0 ]; then
        echo -e "${YELLOW}  ⚠ $OLD_SCRIPTS scripts antigos ainda presentes:${NC}"
        ls -1 deploy-*.sh 2>/dev/null | sed 's/^/    /'
    else
        echo -e "${GREEN}  ✓ Scripts antigos consolidados${NC}"
    fi
else
    echo -e "${RED}  ✗ deploy.sh não encontrado${NC}"
    ISSUES=$((ISSUES + 1))
fi

echo -e "\n${BLUE}[6/8] Verificando documentação...${NC}"
if [ -f "README.md" ]; then
    README_SIZE=$(wc -l < README.md)
    if [ $README_SIZE -lt 20 ]; then
        echo -e "${YELLOW}  ⚠ README.md parece muito básico ($README_SIZE linhas)${NC}"
    else
        echo -e "${GREEN}  ✓ README.md atualizado ($README_SIZE linhas)${NC}"
    fi
else
    echo -e "${RED}  ✗ README.md não encontrado${NC}"
fi

echo -e "\n${BLUE}[7/8] Verificando .env.local.example...${NC}"
if [ -f ".env.local.example" ]; then
    echo -e "${GREEN}  ✓ .env.local.example existe${NC}"
else
    echo -e "${YELLOW}  ⚠ .env.local.example não encontrado${NC}"
fi

echo -e "\n${BLUE}[8/8] Testando comandos npm...${NC}"
if command -v npm &> /dev/null; then
    echo -e "${GREEN}  ✓ npm disponível: $(npm --version)${NC}"
    
    # Verificar se há script de build
    if grep -q '"build"' package.json; then
        echo -e "${GREEN}  ✓ Script 'build' configurado${NC}"
    else
        echo -e "${RED}  ✗ Script 'build' não encontrado no package.json${NC}"
        ISSUES=$((ISSUES + 1))
    fi
    
    if grep -q '"dev"' package.json; then
        echo -e "${GREEN}  ✓ Script 'dev' configurado${NC}"
    else
        echo -e "${RED}  ✗ Script 'dev' não encontrado no package.json${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}  ✗ npm não disponível${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Relatório final
echo -e "\n${CYAN}════════════════════════════════════════════════════════${NC}\n"

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ TUDO ESTÁ CORRETO!                    ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    echo -e "\n${GREEN}🎉 Todas as verificações passaram com sucesso!${NC}\n"
    echo -e "${BLUE}Próximos passos:${NC}"
    echo -e "  1. ${CYAN}npm run dev${NC} - Testar localmente"
    echo -e "  2. ${CYAN}npm run build${NC} - Build de produção"
    echo -e "  3. ${CYAN}./deploy.sh${NC} - Deploy no Vercel\n"
else
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║          ⚠ ENCONTRADOS $ISSUES PROBLEMA(S)                  ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════╝${NC}"
    echo -e "\n${YELLOW}Algumas correções ainda precisam ser aplicadas.${NC}\n"
    echo -e "${BLUE}Execute os comandos de correção abaixo:${NC}\n"
    
    if grep -q 'node-domexception' package.json 2>/dev/null || [ -d "node_modules/node-domexception" ]; then
        echo -e "${YELLOW}1. Remover node-domexception:${NC}"
        echo -e "   ${CYAN}rm -rf node_modules package-lock.json${NC}"
        echo -e "   ${CYAN}npm install --legacy-peer-deps${NC}\n"
    fi
    
    if grep -q '"memory"' vercel.json 2>/dev/null; then
        echo -e "${YELLOW}2. Corrigir vercel.json:${NC}"
        echo -e "   ${CYAN}Execute o script de correção manual abaixo${NC}\n"
    fi
    
    if [ ! -f "deploy.sh" ]; then
        echo -e "${YELLOW}3. Criar deploy.sh:${NC}"
        echo -e "   ${CYAN}Execute o script de criação do deploy.sh${NC}\n"
    fi
fi

# Verificação adicional de warnings npm
echo -e "\n${BLUE}Verificando últimos warnings do npm...${NC}"
if [ -f "npm-install.log" ]; then
    if grep -q "npm warn deprecated" npm-install.log; then
        echo -e "${YELLOW}⚠ Warnings encontrados no último npm install:${NC}"
        grep "npm warn deprecated" npm-install.log | head -5
        echo -e "\n${CYAN}Isso é normal, mas podemos tentar limpar...${NC}"
    fi
fi

echo ""

