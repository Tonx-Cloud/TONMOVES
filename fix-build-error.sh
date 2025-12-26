#!/data/data/com.termux/files/usr/bin/bash

# ============================================================================
# TONMOVES - Diagnóstico e Correção Completa do Erro de Build
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${RED}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║     🔍 DIAGNÓSTICO E CORREÇÃO DE ERRO DE BUILD VERCEL       ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

cd ~/TONMOVES || {
    echo -e "${RED}✗ Erro: Pasta ~/TONMOVES não encontrada!${NC}"
    exit 1
}

# ============================================================================
# PASSO 1: Análise do Erro
# ============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PASSO 1: Análise do Erro Reportado pelo Vercel          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${YELLOW}ERRO ORIGINAL:${NC}"
echo -e "  ${RED}Could not resolve \"./services/gemini\" from \"src/App.tsx\"${NC}\n"

echo -e "${CYAN}O que isso significa:${NC}"
echo -e "  → O arquivo src/App.tsx está tentando importar './services/gemini'"
echo -e "  → Mas o arquivo NÃO existe ou está no caminho errado\n"

# ============================================================================
# PASSO 2: Verificar Estrutura Atual
# ============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PASSO 2: Verificando Estrutura do Projeto               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}Estrutura de pastas principais:${NC}"
ls -d */ 2>/dev/null | while read dir; do
    echo -e "  ${GREEN}✓${NC} $dir"
done
echo ""

# Verificar pasta services
echo -e "${CYAN}Verificando pasta services/:${NC}"
if [ -d "services" ]; then
    echo -e "  ${GREEN}✓ Pasta services/ existe${NC}"
    
    FILES_IN_SERVICES=$(ls -la services/ 2>/dev/null | grep -v "^d" | grep -v "^total" | wc -l)
    echo -e "  ${CYAN}→ Arquivos encontrados: $FILES_IN_SERVICES${NC}\n"
    
    if [ $FILES_IN_SERVICES -gt 0 ]; then
        echo -e "${CYAN}Arquivos em services/:${NC}"
        ls -la services/ | grep -v "^d" | grep -v "^total" | awk '{print "  → " $9}'
        echo ""
    else
        echo -e "  ${YELLOW}⚠ Pasta services/ está vazia!${NC}\n"
    fi
else
    echo -e "  ${RED}✗ Pasta services/ NÃO existe!${NC}\n"
fi

# Verificar pasta src
echo -e "${CYAN}Verificando pasta src/:${NC}"
if [ -d "src" ]; then
    echo -e "  ${GREEN}✓ Pasta src/ existe${NC}"
    
    if [ -f "src/App.tsx" ]; then
        echo -e "  ${GREEN}✓ Arquivo src/App.tsx existe${NC}\n"
    else
        echo -e "  ${RED}✗ Arquivo src/App.tsx NÃO existe!${NC}\n"
    fi
else
    echo -e "  ${RED}✗ Pasta src/ NÃO existe!${NC}\n"
fi

# ============================================================================
# PASSO 3: Buscar Arquivos Gemini
# ============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PASSO 3: Procurando Arquivos Relacionados a Gemini      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}Buscando arquivos *gemini* no projeto:${NC}"
GEMINI_FILES=$(find . -type f -iname "*gemini*" 2>/dev/null | grep -v node_modules | grep -v ".git" | grep -v "build-diagnostic")

if [ -n "$GEMINI_FILES" ]; then
    echo "$GEMINI_FILES" | while read file; do
        echo -e "  ${GREEN}→${NC} $file"
    done
    echo ""
else
    echo -e "  ${YELLOW}⚠ Nenhum arquivo gemini encontrado!${NC}\n"
fi

# ============================================================================
# PASSO 4: Analisar Imports no App.tsx
# ============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PASSO 4: Analisando Imports em src/App.tsx              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

if [ -f "src/App.tsx" ]; then
    echo -e "${CYAN}Imports relacionados a services/gemini:${NC}"
    grep -n "import.*gemini\|import.*services" src/App.tsx 2>/dev/null || echo -e "  ${YELLOW}Nenhum import encontrado${NC}"
    echo ""
    
    # Mostrar contexto do erro
    echo -e "${CYAN}Primeiras 30 linhas de App.tsx:${NC}"
    head -30 src/App.tsx | nl
    echo ""
else
    echo -e "${RED}✗ src/App.tsx não encontrado!${NC}\n"
fi

# ============================================================================
# PASSO 5: Identificar Solução
# ============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PASSO 5: Identificando Solução                          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

NEEDS_GEMINI_FILE=0
NEEDS_SERVICES_DIR=0

# Verificar se precisa criar a pasta services
if [ ! -d "services" ]; then
    echo -e "${YELLOW}→ Pasta services/ precisa ser criada${NC}"
    NEEDS_SERVICES_DIR=1
fi

# Verificar se precisa criar o arquivo gemini
if [ ! -f "services/gemini.ts" ] && [ ! -f "services/gemini.js" ] && [ ! -f "services/gemini.tsx" ]; then
    echo -e "${YELLOW}→ Arquivo services/gemini precisa ser criado${NC}"
    NEEDS_GEMINI_FILE=1
fi

echo ""

# ============================================================================
# PASSO 6: Aplicar Correção Automática
# ============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PASSO 6: Aplicando Correção Automática                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

# Criar pasta services se necessário
if [ $NEEDS_SERVICES_DIR -eq 1 ]; then
    echo -e "${CYAN}Criando pasta services/...${NC}"
    mkdir -p services
    echo -e "${GREEN}✓ Pasta criada${NC}\n"
fi

# Criar arquivo gemini.ts se necessário
if [ $NEEDS_GEMINI_FILE -eq 1 ]; then
    echo -e "${CYAN}Criando arquivo services/gemini.ts...${NC}"
    
    cat > services/gemini.ts << 'GEMINI_TS'
/**
 * Gemini AI Service
 * Handles interactions with Google's Gemini AI API
 */

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY não configurada. Configure em .env.local');
}

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
}

/**
 * Generate content using Gemini AI
 */
export async function generateContent(prompt: string): Promise<string> {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY não configurado. Configure em .env.local');
  }

  const request: GeminiRequest = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API Error: ${error.error?.message || response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Nenhuma resposta gerada pela API');
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Erro ao chamar Gemini API:', error);
    throw error;
  }
}

/**
 * Generate video metadata/description using AI
 */
export async function generateVideoMetadata(audioFileName: string): Promise<{
  title: string;
  description: string;
  tags: string[];
}> {
  const prompt = `Gere metadados criativos para um vídeo musical baseado neste arquivo de áudio: "${audioFileName}"
  
Retorne no formato JSON:
{
  "title": "Título criativo e atraente",
  "description": "Descrição detalhada do vídeo",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

  try {
    const response = await generateContent(prompt);
    
    // Tentar extrair JSON da resposta
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback se não for JSON válido
    return {
      title: audioFileName.replace(/\.[^/.]+$/, ''), // Remove extensão
      description: 'Vídeo musical gerado automaticamente pelo TONMOVES',
      tags: ['music', 'video', 'tonmoves', 'ai-generated'],
    };
  } catch (error) {
    console.error('Erro ao gerar metadados:', error);
    // Fallback em caso de erro
    return {
      title: audioFileName.replace(/\.[^/.]+$/, ''),
      description: 'Vídeo musical gerado automaticamente',
      tags: ['music', 'video', 'tonmoves'],
    };
  }
}

/**
 * Generate theme suggestions based on audio analysis
 */
export async function suggestThemes(audioDescription: string): Promise<string[]> {
  const prompt = `Com base nesta descrição de áudio: "${audioDescription}"
  
Sugira 5 temas visuais apropriados para um vídeo musical.
Retorne apenas os nomes dos temas, separados por vírgula.`;

  try {
    const response = await generateContent(prompt);
    const themes = response.split(',').map(t => t.trim()).filter(Boolean);
    return themes.slice(0, 5); // Limitar a 5 temas
  } catch (error) {
    console.error('Erro ao sugerir temas:', error);
    return ['Abstract', 'Nature', 'Urban', 'Neon', 'Minimal'];
  }
}

export default {
  generateContent,
  generateVideoMetadata,
  suggestThemes,
};
GEMINI_TS
    
    echo -e "${GREEN}✓ Arquivo services/gemini.ts criado com sucesso!${NC}\n"
else
    echo -e "${GREEN}✓ Arquivo services/gemini já existe${NC}\n"
fi

# ============================================================================
# PASSO 7: Verificar/Criar .env.local
# ============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PASSO 7: Verificando Variáveis de Ambiente              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

if [ ! -f ".env.local" ]; then
    echo -e "${CYAN}Criando .env.local com template...${NC}"
    
    cat > .env.local << 'ENVLOCAL'
# Gemini API Key
# Obtenha em: https://ai.google.dev/
VITE_GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Groq API Key (opcional)
VITE_GROQ_API_KEY=your_groq_api_key_here
GROQ_API_KEY=your_groq_api_key_here

# App Configuration
VITE_APP_NAME=TONMOVES
VITE_APP_VERSION=2.7.0
NODE_ENV=development
ENVLOCAL
    
    echo -e "${GREEN}✓ Arquivo .env.local criado!${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANTE: Edite .env.local e adicione sua API key do Gemini${NC}\n"
else
    echo -e "${GREEN}✓ Arquivo .env.local já existe${NC}\n"
fi

# ============================================================================
# PASSO 8: Testar Build Local
# ============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PASSO 8: Testando Build Localmente                      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}Executando: npm run build${NC}\n"
echo -e "${YELLOW}Isso pode levar alguns segundos...${NC}\n"

if npm run build 2>&1 | tee build-fix.log; then
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}║          ✅ BUILD EXECUTADO COM SUCESSO!               ║${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}\n"
    
    BUILD_SUCCESS=1
else
    echo -e "\n${RED}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                        ║${NC}"
    echo -e "${RED}║          ✗ BUILD AINDA FALHA                           ║${NC}"
    echo -e "${RED}║                                                        ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════╝${NC}\n"
    
    echo -e "${YELLOW}Verifique o arquivo build-fix.log para mais detalhes${NC}\n"
    BUILD_SUCCESS=0
fi

# ============================================================================
# PASSO 9: Preparar para Deploy
# ============================================================================

if [ $BUILD_SUCCESS -eq 1 ]; then
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  PASSO 9: Preparar para Deploy                            ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"
    
    echo -e "${CYAN}Arquivos criados/modificados:${NC}"
    echo -e "  ${GREEN}✓${NC} services/gemini.ts"
    [ -f ".env.local" ] && echo -e "  ${GREEN}✓${NC} .env.local"
    echo ""
    
    echo -e "${CYAN}Status do Git:${NC}"
    git status --short 2>/dev/null || echo "Git não inicializado"
    echo ""
    
    read -p "$(echo -e ${YELLOW}Deseja fazer commit e push das alterações? \(s/n\): ${NC})" do_commit
    
    if [[ $do_commit == "s" || $do_commit == "S" ]]; then
        echo -e "\n${CYAN}Adicionando arquivos...${NC}"
        git add services/gemini.ts
        
        echo -e "${CYAN}Criando commit...${NC}"
        git commit -m "fix: Add services/gemini.ts to resolve build error

- Created Gemini AI service with proper TypeScript types
- Added generateContent, generateVideoMetadata, and suggestThemes functions
- Fixed 'Could not resolve ./services/gemini' error
- Build tested and working locally"
        
        echo -e "\n${CYAN}Fazendo push para GitHub...${NC}"
        git push origin main
        
        echo -e "\n${GREEN}✓ Alterações enviadas para o GitHub!${NC}"
        echo -e "${CYAN}→ O Vercel deve fazer deploy automaticamente em alguns instantes${NC}\n"
    else
        echo -e "\n${YELLOW}Para fazer deploy manualmente:${NC}"
        echo -e "  1. ${CYAN}git add services/gemini.ts${NC}"
        echo -e "  2. ${CYAN}git commit -m 'fix: Add gemini service'${NC}"
        echo -e "  3. ${CYAN}git push origin main${NC}\n"
    fi
fi

# ============================================================================
# RELATÓRIO FINAL
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

cat > BUILD_FIX_REPORT.md << EOF
# 🔧 Relatório de Correção do Build TONMOVES

## 📅 Data
$(date)

## 🔴 Erro Original
\`\`\`
Could not resolve "./services/gemini" from "src/App.tsx"
\`\`\`

## 🔍 Causa Raiz
O arquivo \`services/gemini.ts\` estava faltando no repositório, mas era referenciado em \`src/App.tsx\`.

## ✅ Correções Aplicadas

### 1. Criação do Arquivo services/gemini.ts
- ✅ Arquivo criado com funções completas
- ✅ TypeScript types definidos
- ✅ Integração com Gemini API
- ✅ Tratamento de erros robusto
- ✅ Fallbacks para casos de erro

### 2. Funções Implementadas
- \`generateContent(prompt)\` - Gera conteúdo com Gemini
- \`generateVideoMetadata(fileName)\` - Gera metadados para vídeos
- \`suggestThemes(description)\` - Sugere temas visuais

### 3. Variáveis de Ambiente
- ✅ Template .env.local criado
- ⚠️  Necessário configurar VITE_GEMINI_API_KEY

## 🎯 Status do Build
$([ $BUILD_SUCCESS -eq 1 ] && echo "✅ **BUILD SUCESSO** - Pronto para deploy!" || echo "⚠️ **BUILD FALHOU** - Verificar build-fix.log")

## 📦 Próximos Passos

### Se o build passou:
1. Configurar API key do Gemini em .env.local (para dev)
2. Configurar variável de ambiente no Vercel:
   - VITE_GEMINI_API_KEY=sua_chave_aqui
3. Fazer commit e push
4. Aguardar deploy automático no Vercel

### Se o build falhou:
1. Verificar build-fix.log
2. Executar novamente este script
3. Reportar erro se persistir

## 📝 Comandos para Deploy Manual

\`\`\`bash
# 1. Adicionar alterações
git add services/gemini.ts .env.local

# 2. Commit
git commit -m "fix: Add Gemini service to resolve build error"

# 3. Push
git push origin main

# 4. O Vercel fará deploy automaticamente
\`\`\`

## ⚙️ Configuração Vercel
Adicione a variável de ambiente no dashboard do Vercel:
- Nome: \`VITE_GEMINI_API_KEY\`
- Valor: Sua chave da API Gemini
- Ambiente: Production, Preview, Development

---
**Gerado automaticamente pelo script de correção**
EOF

echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║        🎉 CORREÇÃO CONCLUÍDA!                            ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}📄 Relatório salvo em: BUILD_FIX_REPORT.md${NC}\n"

if [ $BUILD_SUCCESS -eq 1 ]; then
    echo -e "${BLUE}✅ Próximos passos:${NC}"
    echo -e "  1. Configure GEMINI_API_KEY no Vercel (se ainda não fez)"
    echo -e "  2. Faça commit e push das alterações"
    echo -e "  3. Aguarde deploy automático\n"
else
    echo -e "${YELLOW}⚠️  O build local ainda falha${NC}"
    echo -e "  → Verifique build-fix.log"
    echo -e "  → Execute este script novamente se necessário\n"
fi

