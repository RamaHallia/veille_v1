# ⚡ Commandes Rapides - Déploiement RAG

Pour ceux qui veulent aller VITE ! 🚀

---

## 🔥 MODE RAPIDE (10 minutes)

### 1️⃣ Diagnostic (30 secondes)

```bash
npx tsx scripts/check-rag-status.ts
```

---

### 2️⃣ Réparer BDD (1 minute)

**Supabase Dashboard → SQL Editor**

Copiez-collez le fichier **`FIX_COMPLET_RAG.sql`** → Run

Attendez le message : `🎉 SETUP RAG TERMINÉ AVEC SUCCÈS !`

---

### 3️⃣ Déployer Edge Functions (5 minutes)

#### A. Obtenir clé OpenAI

https://platform.openai.com/api-keys → Create new → Copiez (commence par `sk-`)

#### B. Commandes

```bash
# Installer CLI
npm install -g supabase

# Login
supabase login

# Lier projet
supabase link --project-ref xottryrwoxafervpovex

# Configurer OpenAI
supabase secrets set OPENAI_API_KEY=sk-...VOTRE_CLE_ICI...

# Déployer
supabase functions deploy rag-query
supabase functions deploy index-rapport
```

---

### 4️⃣ Indexer rapports (3 minutes)

```bash
npx tsx scripts/index-all-rapports.ts
```

Attendez : `🎉 TOUS LES RAPPORTS ONT ÉTÉ INDEXÉS !`

---

### 5️⃣ Tester (1 minute)

```bash
npm run dev
```

Ouvrez http://localhost:5173 → Assistant IA → Posez une question

**Vous devriez voir `✅ X chunks indexés` et recevoir une réponse !** 🎉

---

## 🔍 Vérifications Rapides

**Après chaque étape :**

```bash
npx tsx scripts/check-rag-status.ts
```

**Ce que vous devez voir à la fin :**

```
✅ La table rapport_chunks existe
✅ Nombre de rapports: 84
✅ Nombre de chunks: 500+
✅ La fonction search_rapport_chunks fonctionne
✅ rag-query accessible
✅ index-rapport accessible
```

---

## 🆘 Problèmes Courants

### Erreur : "Edge Function returned non-2xx"

```bash
# Vérifier la clé OpenAI
supabase secrets list

# Si vide ou mauvaise, refaire :
supabase secrets set OPENAI_API_KEY=sk-...votre-clé...
```

### Erreur : "Column does not exist"

Relancez le script SQL : `FIX_COMPLET_RAG.sql`

### Erreur : "No chunks found"

```bash
npx tsx scripts/index-all-rapports.ts
```

---

## 📚 Détails Complets

Pour des instructions détaillées, consultez :

- **DEPLOIEMENT_COMPLET_10MIN.md** - Guide pas-à-pas illustré
- **FIX_RAG_ASSISTANT.md** - Dépannage détaillé
- **TOUT_POUR_DEPLOYER_RAG.md** - Vue d'ensemble complète

---

## ✅ Checklist Minimale

- [ ] Diagnostic lancé
- [ ] SQL exécuté → Message de succès vu
- [ ] Clé OpenAI configurée
- [ ] 2 Edge Functions déployées
- [ ] Rapports indexés
- [ ] Test OK dans l'interface

**FAIT ? VOUS AVEZ UN ASSISTANT IA FONCTIONNEL ! 🎉**

---

**Créé le 13 novembre 2025**
*Les commandes essentielles pour déployer le RAG en 10 minutes*
