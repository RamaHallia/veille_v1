# 🚀 Déploiement simplifié du RAG

## ✅ Structure des fichiers créés

```
supabase/
└── functions/
    ├── index-rapport/
    │   └── index.ts        ← Fonction autonome (tout inclus)
    └── rag-query/
        └── index.ts        ← Fonction autonome (tout inclus)
```

✅ **Pas besoin de dossier `shared/`** - tout le code est inclus directement dans chaque fonction.

---

## 📋 Étapes de déploiement

### 1. Prérequis

```bash
# Installer Supabase CLI (si pas déjà fait)
npm install -g supabase

# Se connecter
supabase login

# Lier votre projet
supabase link --project-ref YOUR_PROJECT_REF
```

**Trouver votre PROJECT_REF** : Dans l'URL de votre projet Supabase
```
https://YOUR_PROJECT_REF.supabase.co
```

### 2. Configurer la clé OpenAI

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-VOTRE_CLE_OPENAI

# Vérifier que c'est bien configuré
supabase secrets list
```

### 3. Déployer les Edge Functions

```bash
# Depuis la racine de votre projet (où se trouve le dossier supabase/)

# Déployer index-rapport
supabase functions deploy index-rapport

# Déployer rag-query
supabase functions deploy rag-query

# Vérifier le déploiement
supabase functions list
```

### 4. Setup de la base de données

Dans **Supabase Dashboard → SQL Editor**, exécuter le fichier `supabase_rag_setup.sql` :

```sql
-- Active pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Crée la table rapport_chunks
CREATE TABLE IF NOT EXISTS rapport_chunks ( ... );

-- Crée la fonction de recherche
CREATE OR REPLACE FUNCTION search_rapport_chunks( ... );
```

---

## 🧪 Test rapide

### Test 1 : Indexer un rapport

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"rapport_id": "UUID_DU_RAPPORT"}'
```

**Résultat attendu** :
```json
{
  "success": true,
  "chunks_created": 12,
  "rapport_id": "..."
}
```

### Test 2 : Poser une question

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/rag-query \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Quelles sont les dernières tendances ?",
    "user_id": "UUID_USER"
  }'
```

**Résultat attendu** :
```json
{
  "answer": "D'après les rapports récents...",
  "sources": [
    {
      "titre": "Veille IA - 7 novembre 2025",
      "date": "2025-11-07",
      "excerpt": "..."
    }
  ]
}
```

---

## 📊 Voir les logs

```bash
# Logs en temps réel de index-rapport
supabase functions logs index-rapport --follow

# Logs en temps réel de rag-query
supabase functions logs rag-query --follow
```

---

## 🔄 Indexer les rapports existants

### Option 1 : Script TypeScript

Créer `scripts/index-existing-reports.ts` :

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://YOUR_PROJECT_REF.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function indexAllReports() {
  console.log('🚀 Starting indexation...');

  const { data: rapports, error } = await supabase
    .from('rapports')
    .select('id, titre');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`📊 Found ${rapports.length} reports`);

  for (let i = 0; i < rapports.length; i++) {
    const rapport = rapports[i];
    console.log(`\n[${i + 1}/${rapports.length}] ${rapport.titre}`);

    try {
      const { data, error } = await supabase.functions.invoke('index-rapport', {
        body: { rapport_id: rapport.id }
      });

      if (error) {
        console.error(`  ❌ Error:`, error);
      } else {
        console.log(`  ✅ ${data.chunks_created} chunks`);
      }

      // Pause 1 seconde entre chaque rapport
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`  ❌ Error:`, err);
    }
  }

  console.log('\n🎉 Done!');
}

indexAllReports();
```

Exécuter :
```bash
npx tsx scripts/index-existing-reports.ts
```

### Option 2 : Manuellement via l'interface

Dans ton application React, tu peux ajouter un bouton admin :

```typescript
const indexAllReports = async () => {
  const { data: rapports } = await supabase
    .from('rapports')
    .select('id, titre');

  for (const rapport of rapports) {
    console.log(`Indexing: ${rapport.titre}`);

    const { error } = await supabase.functions.invoke('index-rapport', {
      body: { rapport_id: rapport.id }
    });

    if (error) {
      console.error('Error:', error);
    }
  }
};
```

---

## 🔗 Auto-indexation des nouveaux rapports

### Via n8n (recommandé)

Dans ton workflow n8n, **après** la création du rapport :

1. **Ajouter un nœud HTTP Request**
2. **Configuration** :
   - Method: `POST`
   - URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport`
   - Authentication: `None`
   - Headers:
     ```json
     {
       "Content-Type": "application/json",
       "Authorization": "Bearer YOUR_SUPABASE_SERVICE_KEY"
     }
     ```
   - Body (JSON):
     ```json
     {
       "rapport_id": "{{ $json.rapport_id }}"
     }
     ```

3. **Options** :
   - Ignore SSL issues: `false`
   - Timeout: `30000` (30 secondes)

Maintenant, chaque fois qu'un rapport est créé, il sera automatiquement indexé !

---

## ✅ Vérification finale

### Dans Supabase SQL Editor

```sql
-- Vérifier que l'extension vector est activée
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Vérifier la table rapport_chunks
SELECT COUNT(*) as total_chunks FROM rapport_chunks;

-- Voir les chunks d'un client spécifique
SELECT
  rc.chunk_text,
  rc.metadata->>'titre' as titre,
  rc.metadata->>'date_rapport' as date
FROM rapport_chunks rc
WHERE rc.client_id = 'YOUR_CLIENT_ID'
LIMIT 5;

-- Vérifier la fonction de recherche
SELECT * FROM pg_proc WHERE proname = 'search_rapport_chunks';
```

### Dans l'application

1. Aller sur le Dashboard
2. Cliquer sur **"Assistant IA"**
3. Poser une question : "Quelles sont les dernières tendances ?"
4. Vérifier que la réponse utilise tes rapports comme sources

---

## 🐛 Dépannage

### Erreur : "Module not found"
✅ **Résolu** - Les fonctions sont maintenant autonomes, pas besoin de `shared/`

### Erreur : "vector extension not found"
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Erreur : "search_rapport_chunks does not exist"
Exécuter le fichier `supabase_rag_setup.sql` complet

### Erreur : "OpenAI API error"
```bash
# Vérifier la clé
supabase secrets list

# La redéfinir si nécessaire
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

### Erreur : "Client not found"
Vérifier que le `user_id` existe dans la table `clients`

### Pas de réponses pertinentes
1. Vérifier que les rapports sont indexés :
   ```sql
   SELECT COUNT(*) FROM rapport_chunks;
   ```
2. Si 0, indexer les rapports avec le script

---

## 🎉 C'est fait !

Une fois ces étapes terminées :

✅ Base de données avec pgvector configurée
✅ Edge Functions déployées
✅ Clé OpenAI configurée
✅ Rapports indexés
✅ Interface frontend opérationnelle

Tu peux maintenant utiliser le **RAG chatbot** pour interroger tes veilles ! 🚀

---

## 📞 Support

Voir les logs en cas de problème :
```bash
supabase functions logs rag-query --follow
```

Vérifier la console du navigateur (F12) pour les erreurs frontend.
