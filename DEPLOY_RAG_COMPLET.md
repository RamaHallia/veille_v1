# 🚀 Déploiement RAG Complet - Extraction PDF

**Dernière mise à jour : 13 novembre 2025**

---

## ✅ RÉSUMÉ DES CORRECTIONS

1. ✅ Script SQL corrigé → `FIX_COMPLET_RAG_FINAL.sql`
2. ✅ Dimensions embeddings → text-embedding-3-small (1536)
3. ✅ Cast de type UUID → TEXT corrigé
4. ✅ Extraction PDF → Edge Function avec PDF.co
5. ✅ Script indexation → Corrigé (pas de colonne `contenu`)

---

## 🎯 ÉTAPES DE DÉPLOIEMENT (10 MINUTES)

### 1️⃣ Base de Données (2 min)

```bash
# Dans Supabase Dashboard → SQL Editor
# Copiez-collez FIX_COMPLET_RAG_FINAL.sql
# Cliquez Run

# Attendez le message :
# 🎉 SETUP RAG TERMINÉ AVEC SUCCÈS !
```

✅ **Fait ? Passez à l'étape 2**

---

### 2️⃣ Clés API (3 min)

#### A. OpenAI (Obligatoire)

1. https://platform.openai.com/api-keys
2. **Create new secret key**
3. Copiez (commence par `sk-...`)

#### B. PDF.co (Recommandé)

1. https://pdf.co/ → **Sign Up** (gratuit)
2. **API** → **API Keys**
3. Copiez votre clé

#### C. Configurer dans Supabase

```bash
# OpenAI (obligatoire)
supabase secrets set OPENAI_API_KEY=sk-...votre-clé-openai...

# PDF.co (recommandé pour extraction PDF)
supabase secrets set PDF_CO_API_KEY=...votre-clé-pdf.co...
```

✅ **Fait ? Passez à l'étape 3**

---

### 3️⃣ Edge Functions (3 min)

```bash
# Déployer les 2 fonctions
supabase functions deploy rag-query
supabase functions deploy index-rapport

# Vérifier
supabase functions list

# Résultat attendu :
# rag-query      deployed
# index-rapport  deployed
```

✅ **Fait ? Passez à l'étape 4**

---

### 4️⃣ Indexation (2 min)

```bash
# Indexer tous les rapports
npx tsx scripts/index-all-rapports.ts

# Résultat attendu :
# 📄 84 rapports avec PDF
# ✅ 84 rapports prêts à indexer
#
# Batch 1/17 (5 rapports)
#   [1/84] Rapport... ✅ (18 chunks) [pdf]  ← Source !
#   [2/84] Rapport... ✅ (15 chunks) [pdf]
#   ...
#
# 📊 RÉSUMÉ
# ✅ Rapports indexés : 84/84
# 📚 Chunks créés     : 1500+
```

✅ **Vous voyez `[pdf]` ? Parfait ! Le texte vient du PDF !**

---

### 5️⃣ Test (1 min)

```bash
# Lancer l'app
npm run dev

# Ouvrez http://localhost:5173
# Allez dans Assistant IA
# Vous devriez voir : ✅ 1500+ chunks indexés
```

Posez une question détaillée :
```
"Donne-moi tous les chiffres et statistiques du rapport du 13 novembre"
```

✅ **Vous recevez une réponse détaillée avec chiffres ? C'EST BON !** 🎉

---

## 📋 CHECKLIST COMPLÈTE

### Base de données
- [ ] Script `FIX_COMPLET_RAG_FINAL.sql` exécuté
- [ ] Message "SETUP RAG TERMINÉ AVEC SUCCÈS !" vu
- [ ] Table `rapport_chunks` créée (1536 dimensions)
- [ ] Fonction `search_rapport_chunks` existe

### Clés API
- [ ] Clé OpenAI obtenue et configurée
- [ ] Clé PDF.co obtenue et configurée (optionnel mais recommandé)
- [ ] Secrets vérifiés : `supabase secrets list`

### Edge Functions
- [ ] `rag-query` déployée
- [ ] `index-rapport` déployée (version extraction PDF)
- [ ] Fonctions listées : `supabase functions list`

### Indexation
- [ ] Script `index-all-rapports.ts` lancé
- [ ] Au moins 80% des rapports indexés
- [ ] Source = "pdf" (ou "contenu_html" si pas de PDF)
- [ ] 1000+ chunks créés

### Test Final
- [ ] Interface affiche "✅ X chunks indexés"
- [ ] Question posée retourne une réponse détaillée
- [ ] Sources affichées correctement
- [ ] Pas d'erreur dans la console

---

## 🔍 Diagnostic

```bash
# Vérifier que tout fonctionne
npx tsx scripts/check-rag-status.ts

# Résultat attendu :
# ✅ La table rapport_chunks existe
# ✅ Nombre de rapports: 84
# ✅ Nombre de chunks: 1500+  ← Important !
# ✅ La fonction search_rapport_chunks fonctionne
# ✅ rag-query accessible
# ✅ index-rapport accessible
```

---

## 📊 ARCHITECTURE FINALE

```
┌─────────────────────────────────────────┐
│          Frontend (React)               │
│  - Assistant IA                         │
│  - Affiche chunks indexés               │
│  - Questions/Réponses                   │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│     Edge Function: rag-query            │
│  1. Reçoit question                     │
│  2. Crée embedding (OpenAI)             │
│  3. Recherche chunks similaires (pgvector)
│  4. Génère réponse (GPT-4o-mini)        │
└─────────────┬───────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│     Supabase (PostgreSQL + pgvector)    │
│  - Table: rapport_chunks                │
│    • chunk_text (TEXT)                  │
│    • embedding (VECTOR 1536)            │
│    • metadata (JSONB)                   │
│  - Fonction: search_rapport_chunks      │
└─────────────┬───────────────────────────┘
              ↑
              │ Indexation
              │
┌─────────────────────────────────────────┐
│   Edge Function: index-rapport          │
│  1. Récupère rapport (pdf_url)          │
│  2. Extrait texte PDF (PDF.co) ✅       │
│  3. Découpe en chunks                   │
│  4. Crée embeddings (OpenAI)            │
│  5. Stocke dans rapport_chunks          │
└─────────────────────────────────────────┘
              ↑
              │
┌─────────────────────────────────────────┐
│     Table: rapports                     │
│  - id, titre, pdf_url                   │
│  - contenu_html, resume                 │
│  - indexe_rag, date_indexation          │
└─────────────────────────────────────────┘
```

---

## 💰 COÛTS

| Service | Plan | Coût |
|---------|------|------|
| **Supabase** | Gratuit | 0€/mois (500MB DB) |
| **PDF.co** | Gratuit | 0€/mois (300 req/mois) |
| **OpenAI Embeddings** | Pay-as-you-go | ~0.05€ (84 rapports) |
| **OpenAI GPT-4o-mini** | Pay-as-you-go | ~15€/mois (10k questions) |
| **TOTAL** | | **~15€/mois** |

**Comparaison avec concurrents :**
- Mention : 99€/mois (pas de RAG !)
- Digimind : 500€+/mois (pas de RAG !)
- **Vous : 15€/mois avec RAG unique** 🚀

---

## 🆘 PROBLÈMES COURANTS

### "column rapport_chunks does not exist"

**Solution :** Relancez le script SQL : `FIX_COMPLET_RAG_FINAL.sql`

---

### "operator does not exist: text = uuid"

**Solution :** Utilisez `FIX_COMPLET_RAG_FINAL.sql` (pas les anciens fichiers)

---

### "more than 2000 dimensions"

**Solution :** Utilisez `FIX_COMPLET_RAG_FINAL.sql` (1536 dimensions, pas 3072)

---

### "column rapports.contenu does not exist"

**Solution :** Script corrigé, relancez : `npx tsx scripts/index-all-rapports.ts`

---

### "PDF.co API error"

**Cause :** Clé PDF.co manquante ou invalide

**Solution :**
```bash
supabase secrets set PDF_CO_API_KEY=...votre-clé...
supabase functions deploy index-rapport
```

---

### Source = "resume" au lieu de "pdf"

**Cause :** Extraction PDF a échoué

**Solutions :**
1. Vérifiez que `pdf_url` est rempli
2. Vérifiez que le PDF est accessible publiquement
3. Vérifiez les logs : `supabase functions logs index-rapport`

---

## 📚 DOCUMENTATION

| Fichier | Usage |
|---------|-------|
| **FIX_COMPLET_RAG_FINAL.sql** | Script SQL à exécuter (corrigé final) |
| **GUIDE_EXTRACTION_PDF.md** | Guide d'extraction PDF avec PDF.co |
| **SOLUTION_DIMENSION_EMBEDDINGS.md** | Pourquoi 1536 dimensions |
| **SOLUTION_ERREUR_TYPE_UUID.md** | Correction TEXT vs UUID |
| **DEPLOIEMENT_COMPLET_10MIN.md** | Guide détaillé pas-à-pas |
| **DEPLOY_RAG_COMPLET.md** | Ce fichier (récapitulatif) |

---

## 🎯 COMMANDES ESSENTIELLES

```bash
# Vérifier le statut
npx tsx scripts/check-rag-status.ts

# Réindexer tous les rapports
npx tsx scripts/index-all-rapports.ts

# Voir les logs Edge Functions
supabase functions logs rag-query
supabase functions logs index-rapport

# Lister les secrets
supabase secrets list

# Lancer l'app
npm run dev
```

---

## ✅ VALIDATION FINALE

### Vérification 1 : Base de données

```sql
-- Nombre de chunks par rapport
SELECT
  r.titre,
  COUNT(rc.id) as chunks,
  rc.metadata->>'content_source' as source
FROM rapports r
JOIN rapport_chunks rc ON rc.rapport_id = r.id
GROUP BY r.id, r.titre, source
ORDER BY r.date_generation DESC
LIMIT 5;

-- Résultat attendu :
-- titre               | chunks | source
-- Rapport IA 13/11    | 18     | pdf      ← Parfait !
-- Rapport IA 12/11    | 15     | pdf
```

### Vérification 2 : Edge Functions

```bash
# Tester rag-query
curl -X POST https://...supabase.co/functions/v1/rag-query \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"question":"test","user_id":"test"}'

# Doit retourner une réponse (ou erreur intelligible)
```

### Vérification 3 : Interface

1. Ouvrir l'Assistant IA
2. Vérifier : `✅ 1500+ chunks indexés`
3. Poser une question détaillée
4. Recevoir une réponse complète avec sources

---

## 🎉 FÉLICITATIONS !

Si toutes les vérifications passent, vous avez :

✅ Un système RAG fonctionnel
✅ Extraction automatique du texte des PDF
✅ 1500+ chunks indexés (vs 300 avant)
✅ Un Assistant IA 5x plus puissant
✅ Une fonctionnalité UNIQUE vs vos concurrents
✅ Le tout pour 15€/mois

**Temps investi : 10 minutes**
**Valeur créée : ÉNORME** 🚀

---

**Créé le 13 novembre 2025**
*Guide complet de déploiement RAG avec extraction PDF*

🎯 **Suivez les 5 étapes dans l'ordre**
📊 **Vérifiez à chaque étape**
🚀 **Assistant IA prêt en 10 minutes !**
