# 🔧 Guide : Réparer l'Assistant RAG

## 🎯 Problème
L'Assistant IA affiche : *"Désolé, une erreur s'est produite. Assurez-vous que vos rapports ont été indexés et que les Edge Functions sont déployées."*

---

## 📋 Checklist de Diagnostic

Exécutez ce script pour identifier le problème :

```bash
# Installer les dépendances si nécessaire
npm install

# Lancer le diagnostic
npx tsx scripts/check-rag-status.ts
```

Le script va vérifier :
- ✅ Table `rapport_chunks` existe
- ✅ Fonction `search_rapport_chunks` existe
- ✅ Rapports disponibles
- ✅ Chunks indexés
- ✅ Edge Functions déployées

---

## 🛠️ Solutions par Problème

### Problème 1 : Table `rapport_chunks` n'existe PAS

**Symptôme :**
```
❌ La table rapport_chunks n'existe PAS !
```

**Solution :**

1. Allez sur **Supabase Dashboard** → **SQL Editor**
2. Ouvrez le fichier `supabase_rag_setup.sql` de votre projet
3. Copiez-collez tout le contenu dans l'éditeur SQL
4. Cliquez sur **Run**
5. Vérifiez que vous voyez :
   ```
   ✅ Setup RAG terminé avec succès !
   ```

**Alternative (si erreur) :**

Exécutez les commandes une par une :

```sql
-- 1. Activer pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Créer la table
CREATE TABLE IF NOT EXISTS rapport_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rapport_id UUID REFERENCES rapports(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Créer les index
CREATE INDEX IF NOT EXISTS rapport_chunks_embedding_idx
ON rapport_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS rapport_chunks_client_id_idx
ON rapport_chunks (client_id);

-- 4. Créer la fonction de recherche
CREATE OR REPLACE FUNCTION search_rapport_chunks(
  query_embedding VECTOR(1536),
  user_client_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  rapport_id UUID,
  chunk_text TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rapport_chunks.id,
    rapport_chunks.rapport_id,
    rapport_chunks.chunk_text,
    rapport_chunks.metadata,
    1 - (rapport_chunks.embedding <=> query_embedding) AS similarity
  FROM rapport_chunks
  WHERE rapport_chunks.client_id = user_client_id
    AND 1 - (rapport_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY rapport_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

### Problème 2 : Edge Functions non déployées

**Symptôme :**
```
❌ rag-query non accessible
❌ index-rapport non accessible
```

**Solution :**

#### Option A : Déployer avec Supabase CLI (Recommandé)

```bash
# 1. Installer Supabase CLI (si pas déjà fait)
npm install -g supabase

# 2. Login
supabase login

# 3. Lier le projet
supabase link --project-ref xottryrwoxafervpovex

# 4. Déployer les Edge Functions
supabase functions deploy rag-query
supabase functions deploy index-rapport

# 5. Configurer les secrets (IMPORTANT!)
supabase secrets set OPENAI_API_KEY=sk-...votre-clé-openai...
```

#### Option B : Déployer manuellement depuis Supabase Dashboard

1. **Créer la fonction `rag-query`**
   - Allez sur **Edge Functions** dans Supabase Dashboard
   - Cliquez **New Function**
   - Nom : `rag-query`
   - Copiez le code de `supabase/functions/rag-query/index.ts`
   - Deploy

2. **Créer la fonction `index-rapport`**
   - Même procédure
   - Nom : `index-rapport`
   - Copiez le code de `supabase/functions/index-rapport/index.ts`
   - Deploy

3. **Configurer les secrets**
   - Allez dans **Project Settings** → **Edge Functions**
   - Ajoutez `OPENAI_API_KEY` avec votre clé OpenAI

---

### Problème 3 : Clé OpenAI manquante

**Symptôme :**
```
Error: OpenAI API error
```

**Solution :**

1. Obtenez une clé API OpenAI :
   - Allez sur https://platform.openai.com/api-keys
   - Créez une nouvelle clé API
   - Copiez-la (elle commence par `sk-...`)

2. Configurez dans Supabase :
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...votre-clé...
   ```

   Ou via Dashboard :
   - **Project Settings** → **Edge Functions** → **Secrets**
   - Ajoutez `OPENAI_API_KEY`

---

### Problème 4 : Aucun rapport indexé

**Symptôme :**
```
⚠️ Nombre de chunks: 0
⚠️ Aucun chunk indexé !
```

**Solution :**

#### Option A : Indexation automatique (Attendre 2 minutes)

Le composant `AutoIndexer` s'exécute au démarrage et indexe automatiquement les rapports non indexés.

**Vérifiez qu'il fonctionne :**
1. Ouvrez la console du navigateur (F12)
2. Vous devriez voir : `🔄 Starting auto-indexation...`
3. Attendez 2-5 secondes par rapport

#### Option B : Indexation manuelle via n8n

1. Allez sur n8n : https://n8n.srv954650.hstgr.cloud
2. Ouvrez le workflow **"RAG - Indexation Auto"**
3. Cliquez **Execute Workflow** (bouton play)
4. Attendez que ça termine
5. Vérifiez dans Supabase → **Table rapport_chunks**

#### Option C : Indexation manuelle via API

```javascript
// Depuis la console du navigateur ou un script
const { data, error } = await supabase.functions.invoke('index-rapport', {
  body: { rapport_id: 'ID_DU_RAPPORT' }
});

console.log(data, error);
```

#### Option D : Indexation SQL directe (Debug uniquement)

Si vous voulez tester rapidement, créez un chunk factice :

```sql
-- Récupérer un rapport existant
SELECT id, client_id, titre FROM rapports LIMIT 1;

-- Insérer un chunk de test (embedding factice)
INSERT INTO rapport_chunks (
  rapport_id,
  client_id,
  chunk_text,
  chunk_index,
  embedding,
  metadata
) VALUES (
  'ID_DU_RAPPORT', -- Remplacez
  'ID_DU_CLIENT',  -- Remplacez
  'Ceci est un test de chunk pour vérifier le RAG',
  0,
  ARRAY[0.1, 0.2, ...], -- Vecteur de 1536 dimensions (factice)
  '{"titre": "Test", "date_rapport": "2025-11-13"}'::jsonb
);
```

---

### Problème 5 : Modèle OpenAI obsolète

**Symptôme :**
```
Error: Model not found: gpt-4-turbo-preview
```

**Solution :**

Modifiez `supabase/functions/rag-query/index.ts` ligne 119 :

```typescript
// Ancien (peut-être obsolète)
model: 'gpt-4-turbo-preview',

// Nouveau (stable)
model: 'gpt-4o',  // ou 'gpt-4o-mini' (moins cher)
```

Redéployez :
```bash
supabase functions deploy rag-query
```

---

### Problème 6 : Dimension des embeddings incorrecte

**Symptôme :**
```
Error: Dimensions mismatch
```

**Cause :** Vous utilisez `text-embedding-3-large` (3072 dimensions) mais la DB attend 1536.

**Solution :**

#### Option A : Utiliser text-embedding-3-small (Recommandé)

Dans `supabase/functions/rag-query/index.ts` et `index-rapport/index.ts` :

```typescript
// Ligne 20-21
model: 'text-embedding-3-small',  // 1536 dimensions
```

#### Option B : Changer la dimension de la DB

```sql
-- Supprimer l'ancienne table
DROP TABLE IF EXISTS rapport_chunks CASCADE;

-- Recréer avec 3072 dimensions
CREATE TABLE rapport_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rapport_id UUID REFERENCES rapports(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding VECTOR(3072),  -- 3072 au lieu de 1536
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recréer les index
CREATE INDEX rapport_chunks_embedding_idx
ON rapport_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Modifier la fonction
CREATE OR REPLACE FUNCTION search_rapport_chunks(
  query_embedding VECTOR(3072),  -- 3072 au lieu de 1536
  ...
```

---

## 🧪 Test Final

Une fois tout configuré, testez :

1. **Vérifiez que tout est OK :**
   ```bash
   npx tsx scripts/check-rag-status.ts
   ```

2. **Test dans l'interface :**
   - Allez dans l'Assistant IA
   - Posez une question : *"Quelles sont les tendances ce mois-ci ?"*
   - Vous devriez recevoir une réponse basée sur vos rapports

3. **Si ça ne marche toujours pas :**
   - Ouvrez la console du navigateur (F12)
   - Regardez les erreurs dans l'onglet Console
   - Regardez les requêtes réseau dans l'onglet Network
   - Copiez l'erreur complète et cherchez dans la documentation

---

## 🎨 Améliorations UI/UX Suggérées

Une fois que ça fonctionne, vous pouvez améliorer :

### 1. Meilleur message d'erreur

Actuellement :
```
"Désolé, une erreur s'est produite..."
```

Mieux :
```typescript
// Dans RAGChatPage.tsx, ligne 78-84
catch (error) {
  console.error('Error:', error);

  let errorMessage = '';

  if (error.message.includes('not found')) {
    errorMessage = '🔍 Aucune information trouvée dans vos rapports. Essayez une question plus large ou attendez que plus de rapports soient générés.';
  } else if (error.message.includes('edge function')) {
    errorMessage = '⚠️ Service temporairement indisponible. Veuillez réessayer dans quelques instants.';
  } else {
    errorMessage = `❌ Erreur : ${error.message}`;
  }

  const errorMessage: Message = {
    id: 'error-' + Date.now(),
    role: 'assistant',
    content: errorMessage,
    created_at: new Date().toISOString(),
  };
  setMessages((prev) => [...prev, errorMessage]);
}
```

### 2. Indicateur de statut

Ajoutez un badge qui montre combien de rapports sont indexés :

```typescript
// Ajoutez au header
<div className="flex items-center gap-2 text-sm">
  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
  <span className="text-gray-600">
    {chunksCount} rapports indexés
  </span>
</div>
```

### 3. Exemples contextuels

Changez les questions suggérées en fonction du nombre de rapports :

```typescript
const suggestedQuestions = chunksCount > 0 ? [
  "Quelles sont les dernières tendances dans mon secteur ?",
  "Résume les activités de mes concurrents ce mois-ci",
  // ...
] : [
  "Comment fonctionne l'Assistant IA ?",
  "Que puis-je demander à l'Assistant ?",
];
```

---

## 📊 Résumé

| Étape | Action | Priorité |
|-------|--------|----------|
| 1️⃣ | Exécuter `supabase_rag_setup.sql` | **CRITIQUE** |
| 2️⃣ | Déployer Edge Functions | **CRITIQUE** |
| 3️⃣ | Configurer clé OpenAI | **CRITIQUE** |
| 4️⃣ | Indexer les rapports | **IMPORTANT** |
| 5️⃣ | Tester avec une vraie question | **IMPORTANT** |
| 6️⃣ | Améliorer les messages d'erreur | Optionnel |
| 7️⃣ | Ajouter indicateurs de statut | Optionnel |

---

## 🆘 Besoin d'aide ?

Si vous êtes bloqué :

1. **Exécutez le diagnostic :**
   ```bash
   npx tsx scripts/check-rag-status.ts
   ```

2. **Consultez les logs Supabase :**
   - Dashboard → Logs → Edge Functions
   - Cherchez les erreurs récentes

3. **Vérifiez n8n :**
   - Workflow → Executions
   - Voyez si l'indexation échoue

4. **Console navigateur :**
   - F12 → Console
   - Voyez l'erreur exacte

---

**Créé le 13 novembre 2025**
*Guide de dépannage pour l'Assistant IA RAG*
