#!/data/data/com.termux/files/usr/bin/bash
set -e
G='\033[0;32m';Y='\033[1;33m';B='\033[0;34m';R='\033[0;31m';C='\033[0;36m';NC='\033[0m'
REPORT="./fix-deploy-report.txt"
echo "=== TONMOVES FIX & DEPLOY ===" > "$REPORT"
echo "Data: $(date)" >> "$REPORT"
clear
echo -e "${C}╔═══════════════════════════════════════╗${NC}"
echo -e "${C}║   🔧 FIX & DEPLOY AUTOMÁTICO 🔧      ║${NC}"
echo -e "${C}╚═══════════════════════════════════════╝${NC}"
echo ""
cd ~/TONMOVES 2>/dev/null || { echo "Erro: pasta não encontrada"; exit 1; }
echo -e "${B}[1/4] Corrigindo estrutura...${NC}" | tee -a "$REPORT"
[ -f "App.tsx" ] && mv App.tsx src/ && echo "✓ App.tsx → src/" | tee -a "$REPORT"
cat > src/index.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
EOF
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>TONMOVES</title></head>
<body><div id="root"></div><script type="module" src="/src/index.tsx"></script></body>
</html>
EOF
echo -e "${G}✅ Estrutura OK${NC}" | tee -a "$REPORT"
echo -e "${B}[2/4] Git commit...${NC}" | tee -a "$REPORT"
git add . >> "$REPORT" 2>&1 && git commit -m "fix: structure" >> "$REPORT" 2>&1 || true
echo -e "${B}[3/4] Git push...${NC}" | tee -a "$REPORT"
git push origin main 2>&1 | tee -a "$REPORT"
echo -e "${B}[4/4] Vercel deploy...${NC}" | tee -a "$REPORT"
vercel --prod --force 2>&1 | tee -a "$REPORT"
echo ""
echo -e "${G}✅ CONCLUÍDO!${NC}"
echo -e "${Y}URL: https://tonmoves.vercel.app${NC}"
echo -e "${B}Relatório: $REPORT${NC}"
cat "$REPORT"
