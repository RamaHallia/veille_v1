# 🚀 Déploiement RAG - Guide Ultra-Rapide

## ⚡ Résumé en 3 étapes (30 min)

```bash
# 1️⃣ Base de données (5 min)
# → Aller dans Supabase SQL Editor
# → Exécuter supabase_rag_setup.sql

# 2️⃣ Edge Functions (15 min)
supabase login
supabase link --project-ref YOUR_REF
supabase secrets set OPENAI_API_KEY=sk-proj-...
supabase functions deploy index-rapport
supabase functions deploy rag-query

# 3️⃣ Indexer les rapports (10 min)
# → Modifier scripts/index-existing-reports.ts avec tes credentials
npx tsx scripts/index-existing-reports.ts
```

---

## 📋 Détail des étapes

### 1️⃣ Base de données Supabase (5 min)

**Action** : Aller dans [Supabase Dashboard](https://app.supabase.com) → **SQL Editor**

**Copier-coller** tout le contenu de `supabase_rag_setup.sql` et cliquer sur **Run**

✅ Cela va créer :
- Extension `vector` (pgvector)
- Table `rapport_chunks` (pour stocker les embeddings)
- Fonction `search_rapport_chunks` (recherche vectorielle)

**Vérification** :
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
-- Devrait retourner 1 ligne
```

---

### 2️⃣ Edge Functions (15 min)

#### A. Installation CLI Supabase

```bash
npm install -g supabase
```

#### B. Connexion et linkage

```bash
# Se connecter
supabase login

# Lier ton projet
supabase link --project-ref YOUR_PROJECT_REF
```

💡 **Trouver ton PROJECT_REF** : Dans l'URL de ton dashboard Supabase
```
https://app.supabase.com/project/YOUR_PROJECT_REF
```

#### C. Configurer OpenAI API Key

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-VOTRE_CLE
```

💡 Obtenir une clé : https://platform.openai.com/api-keys

**Vérification** :
```bash
supabase secrets list
# Devrait afficher : OPENAI_API_KEY
```

#### D. Déployer les fonctions

```bash
# Depuis la racine du projet (où se trouve le dossier supabase/)
cd c:\Users\tech\OneDrive\Desktop\projet-veille\veille-ia

# Déployer
supabase functions deploy index-rapport
supabase functions deploy rag-query

# Vérifier
supabase functions list
```

**Résultat attendu** :
```
┌─────────────────┬─────────┬────────────────────┐
│ Name            │ Status  │ Version            │
├─────────────────┼─────────┼────────────────────┤
│ index-rapport   │ ACTIVE  │ 1                  │
│ rag-query       │ ACTIVE  │ 1                  │
└─────────────────┴─────────┴────────────────────┘
```

---

### 3️⃣ Indexer les rapports existants (10 min)

#### A. Modifier le script

Ouvrir `scripts/index-existing-reports.ts` et remplacer :

```typescript
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

💡 **Trouver ton ANON_KEY** :
- Supabase Dashboard → **Settings** → **API**
- Copier la clé `anon` `public`

#### B. Installer tsx (si pas déjà fait)

```bash
npm install -g tsx
```

#### C. Exécuter le script

```bash
npx tsx scripts/index-existing-reports.ts
```

**Résultat attendu** :
```
🚀 Démarrage de l'indexation...
📊 10 rapports trouvés

[1/10] Indexation : Veille IA - 7 novembre
    Date : 07/11/2025
    ✅ 12 chunks créés

[2/10] Indexation : Veille IA - 6 novembre
    Date : 06/11/2025
    ✅ 15 chunks créés

...

🎉 Indexation terminée !
✅ Succès : 10
❌ Erreurs : 0
📦 Total de chunks dans la base : 127
```

---

### 4️⃣ Auto-indexation des nouveaux rapports

#### Via n8n (recommandé)

Dans ton workflow n8n, **après** la création du rapport :

**Ajouter un nœud HTTP Request** :
- **Method** : `POST`
- **URL** : `https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport`
- **Headers** :
  ```json
  {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_SUPABASE_SERVICE_KEY"
  }
  ```
- **Body** :
  ```json
  {
    "rapport_id": "{{ $json.rapport_id }}"
  }
  ```

💡 **SERVICE_KEY** : Supabase Dashboard → Settings → API → `service_role` `secret`

---

## ✅ Test final

### 1. Lancer ton app

```bash
npm run dev
```

### 2. Test dans l'interface

1. Aller sur le **Dashboard**
2. Cliquer sur **"Assistant IA"** (bouton avec icône Bot)
3. Poser une question :
   - "Quelles sont les dernières tendances en IA ?"
   - "Résume les activités de mes concurrents"
   - "Quelles technologies émergentes sont mentionnées ?"

**Résultat attendu** :
- Réponse générée par l'IA
- Sources citées (titres des rapports + dates)
- Extraits pertinents affichés

---

## 🎯 Checklist finale

- [ ] ✅ Extension `vector` activée dans Supabase
- [ ] ✅ Table `rapport_chunks` créée
- [ ] ✅ Fonction `search_rapport_chunks` créée
- [ ] ✅ Supabase CLI installé et lié
- [ ] ✅ OPENAI_API_KEY configuré
- [ ] ✅ Edge Function `index-rapport` déployée
- [ ] ✅ Edge Function `rag-query` déployée
- [ ] ✅ Rapports existants indexés (chunks dans la base)
- [ ] ✅ Bouton "Assistant IA" visible dans le Dashboard
- [ ] ✅ Questions/réponses fonctionnent

---

## 📊 Monitoring

### Voir les logs des Edge Functions

```bash
# Terminal 1 : Logs de rag-query
supabase functions logs rag-query --follow

# Terminal 2 : Logs de index-rapport
supabase functions logs index-rapport --follow
```

### Vérifier les chunks dans Supabase

```sql
-- Nombre total de chunks
SELECT COUNT(*) FROM rapport_chunks;

-- Chunks par rapport
SELECT
  metadata->>'titre' as titre,
  COUNT(*) as nb_chunks
FROM rapport_chunks
GROUP BY metadata->>'titre'
ORDER BY nb_chunks DESC;

-- Derniers chunks indexés
SELECT
  metadata->>'titre' as titre,
  metadata->>'date_rapport' as date,
  LENGTH(chunk_text) as taille,
  created_at
FROM rapport_chunks
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🐛 Problèmes courants

### "Module not found shared/openai.ts"
✅ **Résolu** - Les nouvelles Edge Functions sont autonomes

### "vector extension not found"
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### "OpenAI API error"
Vérifier la clé :
```bash
supabase secrets list
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

### Pas de chunks dans la base
Réexécuter le script d'indexation :
```bash
npx tsx scripts/index-existing-reports.ts
```

### Erreur "Client not found"
Vérifier que l'utilisateur existe dans `clients` :
```sql
SELECT * FROM clients WHERE user_id = 'UUID';
```

---

## 💰 Coûts

### OpenAI (estimations pour 1 utilisateur)

| Service | Modèle | Usage | Coût/mois |
|---------|--------|-------|-----------|
| Embeddings | text-embedding-3-small | 10 rapports/jour | $0.40 |
| Génération | GPT-4 Turbo | 10 questions/jour | $9.00 |
| **Total** | | | **~$10/mois** |

### Supabase

- **Free** : Jusqu'à 500 MB (largement suffisant pour débuter)
- **Pro** : $25/mois (8 GB + fonctionnalités avancées)

---

## 📚 Documentation complète

- **GUIDE_RAG_CHATBOT.md** : Architecture détaillée
- **EDGE_FUNCTIONS_SETUP.md** : Setup avancé
- **DEPLOIEMENT_SIMPLE_RAG.md** : Guide de déploiement

---

## 🎉 Félicitations !

Ton RAG chatbot est maintenant opérationnel ! 🚀

Les utilisateurs peuvent interroger intelligemment leur historique de veilles et obtenir des réponses contextuelles basées sur leurs propres rapports.

---

## 📞 Support

En cas de problème :
1. Vérifier les logs : `supabase functions logs rag-query --follow`
2. Vérifier la console du navigateur (F12)
3. Vérifier que tous les éléments de la checklist sont ✅
