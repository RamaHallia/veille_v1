# ⚡ Quick Start - RAG en 10 minutes

## 🎯 5 Étapes Rapides

### 1️⃣ Base de Données (2 min)
```bash
# Supabase Dashboard → SQL Editor
# Copiez-collez : FIX_COMPLET_RAG_FINAL.sql
# Run
```

### 2️⃣ OpenAI (1 min)
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

### 3️⃣ Edge Functions (2 min)
```bash
supabase functions deploy rag-query
supabase functions deploy index-rapport
```

### 4️⃣ n8n Workflow (3 min)
1. Ouvrir n8n
2. Importer `n8n-workflow-rag-indexation-CORRIGE.json`
3. Configurer credentials
4. Activer (toggle ON)

### 5️⃣ Test (2 min)
```bash
npm run dev
# Ouvrir Assistant IA
# Poser une question
```

---

## ✅ Résultat

- ✅ 1000+ chunks indexés
- ✅ Indexation automatique (toutes les 5 min)
- ✅ Contenu complet (HTML)
- ✅ Assistant IA 5x plus puissant
- ✅ Pas de bouton à cliquer

---

## 📖 Guide Complet

Voir `DEPLOIEMENT_FINAL_RAG.md` pour tous les détails.

---

**Créé le 13 novembre 2025**
