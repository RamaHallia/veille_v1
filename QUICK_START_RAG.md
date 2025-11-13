# 🚀 Quick Start : RAG Chatbot

## ✅ Ce qui est déjà fait

1. ✅ **Composant RAGChatPage.tsx créé**
2. ✅ **Bouton "Assistant IA" ajouté dans le Dashboard**
3. ✅ **Navigation configurée dans MainApp.tsx**
4. ✅ **Statut onboarding corrigé** (`'completed'` au lieu de `'termine'`)

---

## 📋 Ce qu'il te reste à faire

### Étape 1 : Setup de la base de données (5 min)

1. **Aller dans Supabase Dashboard** → SQL Editor
2. **Exécuter le fichier** `supabase_rag_setup.sql`
   - Cela va créer :
     - Extension `vector`
     - Table `rapport_chunks`
     - Index pour les recherches vectorielles
     - Fonction `search_rapport_chunks`

```sql
-- Copier-coller tout le contenu de supabase_rag_setup.sql
-- dans le SQL Editor de Supabase et exécuter
```

### Étape 2 : Créer les Edge Functions (15 min)

#### 2.1 Installation de Supabase CLI

Si pas déjà installé :
```bash
npm install -g supabase
```

#### 2.2 Se connecter à Supabase

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Pour trouver ton `PROJECT_REF` : Dans l'URL de ton projet Supabase
```
https://YOUR_PROJECT_REF.supabase.co
```

#### 2.3 Créer les dossiers

```bash
mkdir -p supabase/functions/index-rapport
mkdir -p supabase/functions/rag-query
mkdir -p supabase/functions/shared
```

#### 2.4 Copier les fichiers

Créer les 3 fichiers TypeScript des Edge Functions (voir `EDGE_FUNCTIONS_SETUP.md`) :
1. `supabase/functions/shared/openai.ts`
2. `supabase/functions/index-rapport/index.ts`
3. `supabase/functions/rag-query/index.ts`

#### 2.5 Configurer la clé OpenAI

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-VOTRE_CLE_OPENAI
```

#### 2.6 Déployer les fonctions

```bash
supabase functions deploy index-rapport
supabase functions deploy rag-query
```

### Étape 3 : Indexer les rapports existants (10 min)

**Option A : Via script TypeScript** (recommandé)

Créer `scripts/index-existing-reports.ts` (voir le code dans `EDGE_FUNCTIONS_SETUP.md`)

Puis exécuter :
```bash
npx tsx scripts/index-existing-reports.ts
```

**Option B : Manuellement depuis Supabase**

Dans le SQL Editor :
```sql
-- Pour chaque rapport, appeler l'Edge Function
-- Remplacer YOUR_PROJECT_REF et YOUR_SERVICE_KEY
SELECT net.http_post(
  url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SERVICE_KEY'
  ),
  body := jsonb_build_object('rapport_id', id)
)
FROM rapports;
```

### Étape 4 : Auto-indexation des nouveaux rapports

**Option A : Via n8n** (recommandé)

Dans ton workflow n8n, après la création du rapport :
1. Ajouter un nœud **HTTP Request**
2. Method: `POST`
3. URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport`
4. Headers:
   ```json
   {
     "Content-Type": "application/json",
     "Authorization": "Bearer YOUR_SUPABASE_SERVICE_KEY"
   }
   ```
5. Body:
   ```json
   {
     "rapport_id": "{{ $json.rapport_id }}"
   }
   ```

**Option B : Via Trigger PostgreSQL**

Si tu préfères utiliser un trigger SQL (voir code commenté dans `supabase_rag_setup.sql`).

### Étape 5 : Tester ! (2 min)

1. **Lancer ton app React**
   ```bash
   npm run dev
   ```

2. **Aller dans le Dashboard**
3. **Cliquer sur "Assistant IA"**
4. **Poser une question** :
   - "Quelles sont les dernières tendances en IA ?"
   - "Résume les activités de mes concurrents"
   - "Quelles technologies émergentes sont mentionnées ?"

---

## 🎯 Architecture finale

```
┌─────────────────────────────────────────────────┐
│              Frontend (React)                    │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐   │
│  │ Dashboard │  │ Historique│  │ Assistant│   │
│  │           │  │           │  │    IA    │   │
│  └─────┬─────┘  └───────────┘  └────┬─────┘   │
│        │                              │         │
└────────┼──────────────────────────────┼─────────┘
         │                              │
         │                              ▼
         │              ┌──────────────────────────┐
         │              │   rag-query              │
         │              │   (Edge Function)        │
         │              └──────────┬───────────────┘
         │                         │
         ▼                         ▼
┌──────────────────┐      ┌────────────────────┐
│  n8n Workflow    │      │  OpenAI Embeddings │
│  - Créer rapport │      │  + GPT-4           │
│  - Indexer       │      └────────┬───────────┘
└────────┬─────────┘               │
         │                         │
         ▼                         ▼
┌────────────────────────────────────────────────┐
│              Supabase Database                  │
│  ┌──────────┐  ┌─────────────────┐            │
│  │ rapports │  │ rapport_chunks  │            │
│  │          │  │ (avec embeddings)│            │
│  └──────────┘  └─────────────────┘            │
│                    (pgvector)                  │
└────────────────────────────────────────────────┘
```

---

## 💡 Utilisation

### Questions que tu peux poser

- **Tendances** : "Quelles sont les dernières tendances dans mon secteur ?"
- **Concurrents** : "Que font mes concurrents ce mois-ci ?"
- **Technologies** : "Quelles nouvelles technologies sont mentionnées ?"
- **Comparaison** : "Compare les stratégies de Google et Microsoft"
- **Synthèse** : "Résume les principales actualités de cette semaine"

### Fonctionnalités

- ✅ Recherche sémantique dans tous tes rapports
- ✅ Citations des sources (titre + date)
- ✅ Réponses contextuelles basées sur tes données
- ✅ Interface conversationnelle intuitive
- ✅ Suggestions de questions

---

## 📊 Coûts estimés

### OpenAI API (tarifs 2024)

- **Embeddings** (text-embedding-3-small) : $0.02 / 1M tokens
  - ~10 rapports/jour × 2000 tokens = **$0.40/mois**

- **Génération** (GPT-4 Turbo) : $10 / 1M tokens input + $30 / 1M tokens output
  - ~10 questions/jour × 3000 tokens = **$9/mois**

**Total estimé** : **~$10/mois** pour un usage normal (1 utilisateur, 10 questions/jour)

### Supabase

- **Gratuit** jusqu'à 500 MB de base de données
- **Pro ($25/mois)** : 8 GB + pgvector inclus

---

## 🐛 Dépannage

### Le bouton "Assistant IA" n'apparaît pas
- Vérifier que le Dashboard a bien la prop `onNavigateToRAGAssistant`
- Vérifier dans la console : erreurs TypeScript ?

### Erreur : "vector extension not found"
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Erreur : "search_rapport_chunks does not exist"
- Exécuter le fichier `supabase_rag_setup.sql` complet

### Erreur : "OpenAI API error"
```bash
# Vérifier que la clé est bien configurée
supabase secrets list

# Si manquante, la définir
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

### Aucune réponse / "Pas d'informations trouvées"
- Les rapports ont-ils été indexés ?
- Vérifier dans la table `rapport_chunks` :
  ```sql
  SELECT COUNT(*) FROM rapport_chunks;
  ```
- Si 0, indexer les rapports avec le script

---

## 📚 Guides complets

1. **GUIDE_RAG_CHATBOT.md** : Architecture détaillée et explications
2. **EDGE_FUNCTIONS_SETUP.md** : Déploiement des Edge Functions
3. **supabase_rag_setup.sql** : Setup de la base de données

---

## 🎉 C'est parti !

Une fois les étapes 1-5 terminées, tu auras un chatbot RAG entièrement fonctionnel qui permet d'interroger intelligemment l'historique de tes veilles !

**Temps total estimé** : 30-40 minutes

---

## 📞 Support

Si tu rencontres des problèmes :

1. Vérifier les logs des Edge Functions :
   ```bash
   supabase functions logs rag-query --follow
   ```

2. Vérifier la console du navigateur (F12)

3. Vérifier que :
   - ✅ Extension pgvector activée
   - ✅ Table rapport_chunks existe
   - ✅ Edge Functions déployées
   - ✅ Clé OpenAI configurée
   - ✅ Rapports indexés

Bon développement ! 🚀
