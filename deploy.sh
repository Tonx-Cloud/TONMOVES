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
