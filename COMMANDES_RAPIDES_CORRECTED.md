# ⚡ Commandes Rapides - RAG CORRIGÉ (text-embedding-3-small)

**✅ Version corrigée qui fonctionne avec Supabase !**

---

## 🚀 MODE ULTRA-RAPIDE (5 minutes)

### 1️⃣ SQL Corrigé (1 min)

**Supabase Dashboard → SQL Editor**

Copiez **`FIX_COMPLET_RAG_CORRECTED.sql`** → Paste → Run

Attendez : `🎉 SETUP RAG TERMINÉ AVEC SUCCÈS !`

---

### 2️⃣ Déployer Edge Functions (3 min)

```bash
# Obtenir clé OpenAI
# → https://platform.openai.com/api-keys

# Installer CLI
npm install -g supabase

# Login
supabase login

# Lier projet
supabase link --project-ref xottryrwoxafervpovex

# Configurer OpenAI
supabase secrets set OPENAI_API_KEY=sk-...VOTRE_CLE...

# Déployer (versions corrigées déjà dans les fichiers)
supabase functions deploy rag-query
supabase functions deploy index-rapport
```

---

### 3️⃣ Indexer + Tester (1 min)

```bash
# Indexer tous les rapports
npx tsx scripts/index-all-rapports.ts

# Lancer l'app
npm run dev
```

**Test :** http://localhost:5173 → Assistant IA → Posez une question

**Résultat : ✅ Réponse avec sources !** 🎉

---

## 🔍 Vérification Rapide

```bash
npx tsx scripts/check-rag-status.ts
```

**Ce que vous devez voir :**

```
✅ La table rapport_chunks existe
✅ Nombre de rapports: 84
✅ Nombre de chunks: 500+
✅ La fonction search_rapport_chunks fonctionne
✅ rag-query accessible
✅ index-rapport accessible
```

---

## 📊 Changement Principal

### ❌ Avant (ne marchait PAS)
- Modèle : text-embedding-3-large
- Dimensions : 3072
- Erreur : "column cannot have more than 2000 dimensions"

### ✅ Après (fonctionne !)
- Modèle : **text-embedding-3-small**
- Dimensions : **1536**
- Compatible : ✅ Supabase pgvector
- Bonus : **83% moins cher !**

---

## ✅ Checklist

- [ ] SQL `FIX_COMPLET_RAG_CORRECTED.sql` exécuté → Message de succès
- [ ] Clé OpenAI configurée
- [ ] Edge Functions déployées (rag-query + index-rapport)
- [ ] Rapports indexés
- [ ] Test OK dans l'interface → Réponse reçue

**TOUT COCHÉ ? VOUS AVEZ UN ASSISTANT IA QUI MARCHE ! 🚀**

---

## 🆘 Problème ?

### Erreur toujours "2000 dimensions"

Vous avez utilisé l'ancien fichier. Utilisez **`FIX_COMPLET_RAG_CORRECTED.sql`** !

### Edge Functions ne marchent pas

```bash
# Redéployer
supabase functions deploy rag-query
supabase functions deploy index-rapport
```

---

**Créé le 13 novembre 2025**
*Version corrigée compatible Supabase*
