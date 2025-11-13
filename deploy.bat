@echo off
echo ============================================
echo DEPLOIEMENT DES EDGE FUNCTIONS RAG
echo ============================================
echo.

cd /d "%~dp0"

echo [1/2] Deploiement de index-rapport (VERSION RESUME)...
echo      - Indexe resume + mots-cles + titre + secteur
echo      - Pas de parsing PDF (pour eviter erreurs)
npx supabase functions deploy index-rapport

echo.
echo [2/2] Deploiement de rag-query...
npx supabase functions deploy rag-query

echo.
echo ============================================
echo DEPLOIEMENT TERMINE !
echo ============================================
echo.
echo Testez maintenant :
echo 1. Rechargez votre application React (F5 ou Ctrl+Shift+R)
echo 2. Verifiez la console
echo 3. Attendez que les rapports soient indexes
echo 4. Verifiez la table rapport_chunks dans Supabase
echo 5. Testez l'Assistant RAG dans l'onglet dedié
echo.
pause
