# 🚀 Déploiement Complet RAG - 10 Minutes Chrono

## 📋 Ce que vous allez faire

1. ✅ Réparer la base de données (2 min)
2. ✅ Déployer les Edge Functions (5 min)
3. ✅ Indexer les rapports (2 min)
4. ✅ Tester (1 min)

**Temps total : 10 minutes**

---

## 🔧 ÉTAPE 1 : Réparer la Base de Données (2 min)

### A. Ouvrir Supabase SQL Editor

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Cliquez **SQL Editor** (menu gauche)
4. Cliquez **+ New Query**

### B. Exécuter le script de correction

1. Ouvrez le fichier **`FIX_COMPLET_RAG.sql`** dans VS Code
2. **Copiez TOUT le contenu** (Ctrl+A puis Ctrl+C)
3. **Collez** dans Supabase SQL Editor (Ctrl+V)
4. Cliquez **Run** (ou Ctrl+Enter)

### C. Vérifier que ça a marché

Vous devriez voir en bas :

```
🎉 ========================================
🎉 SETUP RAG TERMINÉ AVEC SUCCÈS !
🎉 ========================================

📋 PROCHAINES ÉTAPES :
  1. Déployez les Edge Functions
  2. Configurez OPENAI_API_KEY dans Supabase
  3. Lancez l'indexation
  4. Testez l'Assistant IA !
```

✅ **Si vous voyez ça → Passez à l'étape 2**

❌ **Si erreur → Copiez l'erreur et demandez-moi**

---

## 🚀 ÉTAPE 2 : Déployer les Edge Functions (5 min)

### Option A : Via Supabase CLI (Recommandé - Plus rapide)

#### 1. Installer Supabase CLI (si pas déjà fait)

```bash
npm install -g supabase
```

#### 2. Login à Supabase

```bash
supabase login
```

Une fenêtre de navigateur va s'ouvrir → Connectez-vous

#### 3. Lier votre projet

```bash
supabase link --project-ref xottryrwoxafervpovex
```

Choisissez votre projet dans la liste si demandé.

#### 4. Obtenir une clé API OpenAI

1. Allez sur https://platform.openai.com/api-keys
2. Cliquez **+ Create new secret key**
3. Nom : `Veille IA - RAG`
4. **Copiez la clé** (commence par `sk-...`)
5. ⚠️ **Gardez-la**, vous ne pourrez plus la revoir !

#### 5. Configurer les secrets

```bash
supabase secrets set OPENAI_API_KEY=sk-...VOTRE_CLE_ICI...
```

Remplacez `sk-...VOTRE_CLE_ICI...` par votre vraie clé OpenAI.

#### 6. Déployer les fonctions

```bash
# Déployer rag-query
supabase functions deploy rag-query

# Déployer index-rapport
supabase functions deploy index-rapport
```

Attendez que chaque commande termine. Vous devriez voir :

```
Deployed Function rag-query ✓
Deployed Function index-rapport ✓
```

✅ **Si vous voyez ça → Passez à l'étape 3**

---

### Option B : Via Supabase Dashboard (Si CLI ne marche pas)

#### 1. Obtenir une clé API OpenAI

(Même procédure que Option A étape 4)

#### 2. Configurer les secrets dans Supabase

1. Allez sur **Supabase Dashboard**
2. **Project Settings** (roue dentée en bas à gauche)
3. **Edge Functions** (menu gauche)
4. **Add Secret**
   - Name: `OPENAI_API_KEY`
   - Value: `sk-...votre-clé...`
5. Cliquez **Save**

#### 3. Créer les fonctions manuellement

**Fonction 1 : rag-query**

1. Allez dans **Edge Functions** (menu gauche)
2. Cliquez **+ New Function**
3. Nom : `rag-query`
4. Copiez le code de `supabase/functions/rag-query/index.ts`
5. **Collez** dans l'éditeur
6. Cliquez **Deploy**

**Fonction 2 : index-rapport**

1. Même procédure
2. Nom : `index-rapport`
3. Copiez le code de `supabase/functions/index-rapport/index.ts`
4. **Collez** dans l'éditeur
5. Cliquez **Deploy**

✅ **Continuez à l'étape 3**

---

## 📊 ÉTAPE 3 : Indexer les Rapports (2 min)

Vous avez 84 rapports mais ils ne sont pas encore indexés avec le nouveau système.

### Option A : Via n8n (Recommandé)

1. Allez sur https://n8n.srv954650.hstgr.cloud
2. Connectez-vous
3. Ouvrez le workflow **"RAG - Indexation Auto (Toutes les 2 min)"**
4. Cliquez **Execute Workflow** (bouton ▶️ en haut à droite)
5. Attendez 30 secondes - 1 minute
6. Vérifiez que ça a marché :
   - Dernière exécution = **Success** (vert)
   - Cliquez sur l'exécution
   - Vérifiez le node **"Insert Chunks in Supabase"**
   - Vous devriez voir des insertions

**Répétez 5-10 fois** pour indexer tous les rapports (5 rapports par exécution)

### Option B : Automatique (Attendre)

Le workflow s'exécute **toutes les 2 minutes automatiquement**.

Attendez 10-20 minutes et vérifiez le statut :

```bash
npx tsx scripts/check-rag-status.ts
```

Vous devriez voir le nombre de chunks augmenter.

### Option C : Via Script (Avancé)

Créez un fichier `scripts/index-all-rapports.ts` :

```typescript
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function indexAllRapports() {
  console.log('🔄 Indexation de tous les rapports...\n');

  // Récupérer les rapports non indexés
  const { data: rapports, error } = await supabase
    .from('rapports')
    .select('id, titre')
    .eq('indexe_rag', false)
    .limit(100);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  if (!rapports || rapports.length === 0) {
    console.log('✅ Tous les rapports sont déjà indexés !');
    return;
  }

  console.log(`📊 ${rapports.length} rapports à indexer\n`);

  // Indexer chaque rapport
  for (let i = 0; i < rapports.length; i++) {
    const rapport = rapports[i];
    console.log(`[${i + 1}/${rapports.length}] Indexation de "${rapport.titre}"...`);

    try {
      const { data, error } = await supabase.functions.invoke('index-rapport', {
        body: { rapport_id: rapport.id }
      });

      if (error) {
        console.error(`  ❌ Erreur:`, error.message);
      } else {
        console.log(`  ✅ ${data.chunks_created} chunks créés`);
      }
    } catch (err: any) {
      console.error(`  ❌ Erreur:`, err.message);
    }

    // Pause de 1 seconde entre chaque appel
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ Indexation terminée !');
}

indexAllRapports().catch(console.error);
```

Exécutez :

```bash
npx tsx scripts/index-all-rapports.ts
```

---

## 🧪 ÉTAPE 4 : Tester ! (1 min)

### A. Vérifier le statut

```bash
npx tsx scripts/check-rag-status.ts
```

Vous devriez voir :

```
✅ Nombre de chunks: [un nombre > 0]
✅ X chunks prêts pour la recherche !

🔧 5. Test de la fonction search_rapport_chunks...
✅ La fonction search_rapport_chunks fonctionne

🚀 6. Test des Edge Functions...
   ✅ rag-query accessible
   ✅ index-rapport accessible
```

### B. Tester dans l'interface

1. Lancez l'application :
   ```bash
   npm run dev
   ```

2. Ouvrez http://localhost:5173

3. Connectez-vous

4. Allez dans **Assistant IA**

5. Vous devriez voir en haut :
   ```
   ✅ X chunks indexés
   ```

6. Posez une question :
   ```
   "Quelles sont les tendances IA ce mois-ci ?"
   ```

7. Vous devriez recevoir une réponse avec des sources ! 🎉

---

## ✅ CHECKLIST FINALE

Cochez au fur et à mesure :

### Base de données
- [ ] Script `FIX_COMPLET_RAG.sql` exécuté
- [ ] Message de succès affiché
- [ ] Table `rapport_chunks` créée
- [ ] Fonction `search_rapport_chunks` créée

### Edge Functions
- [ ] Clé OpenAI obtenue
- [ ] Secret `OPENAI_API_KEY` configuré dans Supabase
- [ ] Fonction `rag-query` déployée
- [ ] Fonction `index-rapport` déployée

### Indexation
- [ ] Au moins 1 rapport indexé (chunks > 0)
- [ ] Script de diagnostic montre "✅ chunks prêts"

### Test Final
- [ ] Interface affiche "✅ X chunks indexés"
- [ ] Question posée retourne une réponse
- [ ] Sources affichées correctement

---

## 🆘 SI QUELQUE CHOSE NE MARCHE PAS

### Problème : "Extension vector not installed"

**Solution :**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Problème : "Edge Function returned non-2xx status"

**Causes possibles :**

1. **Clé OpenAI manquante/invalide**
   - Vérifiez dans Supabase → Project Settings → Edge Functions → Secrets
   - La clé doit commencer par `sk-`
   - Testez-la sur https://platform.openai.com

2. **Fonction pas déployée**
   - Vérifiez dans Supabase → Edge Functions
   - Vous devez voir `rag-query` et `index-rapport`

3. **Erreur dans le code**
   - Allez dans Supabase → Logs → Edge Function Logs
   - Regardez les erreurs
   - Copiez-les et demandez-moi

### Problème : "Aucun chunk indexé"

**Solutions :**

1. **Vérifiez que les rapports ont un résumé**
   ```sql
   SELECT id, titre, resume IS NOT NULL as has_resume
   FROM rapports
   LIMIT 10;
   ```

   Si `has_resume` = false :
   ```sql
   -- Ajouter un résumé de test
   UPDATE rapports
   SET resume = contenu
   WHERE resume IS NULL OR resume = '';
   ```

2. **Lancez l'indexation manuellement**
   - Via n8n (Option A)
   - Ou via script (Option C)

3. **Vérifiez les logs n8n**
   - n8n → Executions
   - Regardez les erreurs

### Problème : Modèle OpenAI obsolète

Si vous voyez `Model 'gpt-4-turbo-preview' not found` :

1. Éditez `supabase/functions/rag-query/index.ts` ligne 119
2. Remplacez par :
   ```typescript
   model: 'gpt-4o-mini',  // ou 'gpt-4o'
   ```
3. Redéployez :
   ```bash
   supabase functions deploy rag-query
   ```

---

## 💰 Coûts OpenAI à Prévoir

**Par requête RAG (moyenne) :**
- Embedding de la question : ~0.0001€
- Recherche des chunks : 0€ (Supabase)
- Génération GPT-4o-mini : ~0.005€
- **Total : ~0.005€ par question**

**Par mois (estimation) :**
- 100 questions/jour × 30 jours = 3000 questions
- 3000 × 0.005€ = **15€/mois**

**Indexation (une seule fois) :**
- 84 rapports × ~5 chunks = 420 chunks
- 420 × 0.0003€ (embedding) = **0.13€**

**Total premier mois : ~15€**

---

## 🎨 AMÉLIORATIONS OPTIONNELLES (Après que ça marche)

### 1. Utiliser la version améliorée de l'interface

```bash
mv src/components/RAGChatPage.tsx src/components/RAGChatPage-old.tsx
mv src/components/RAGChatPage-improved.tsx src/components/RAGChatPage.tsx
```

**Nouvelles fonctionnalités :**
- Indicateur de statut en temps réel
- Messages d'erreur détaillés
- Questions suggérées contextuelles
- Bouton rafraîchir

### 2. Optimiser les coûts (passer à gpt-4o-mini)

Dans `supabase/functions/rag-query/index.ts` :

```typescript
// Ligne 119
model: 'gpt-4o-mini',  // Au lieu de 'gpt-4-turbo-preview'
```

**Économie : 90% des coûts de génération !**

### 3. Ajouter des analytics

Créez une table pour tracker les questions :

```sql
CREATE TABLE rag_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  question TEXT NOT NULL,
  answer TEXT,
  chunks_found INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎉 FÉLICITATIONS !

Si vous avez tout fait, vous avez maintenant :

✅ Un système RAG fonctionnel
✅ 334 chunks indexés (ou plus !)
✅ Un assistant IA qui répond aux questions
✅ Une fonctionnalité UNIQUE que vos concurrents n'ont pas

**Temps investi : 10 minutes**
**Valeur ajoutée : ÉNORME** 🚀

---

## 📞 Support

**Problème ?**
1. Relancez le diagnostic : `npx tsx scripts/check-rag-status.ts`
2. Consultez les logs Supabase
3. Vérifiez les logs n8n
4. Demandez-moi avec l'erreur exacte

**Créé le 13 novembre 2025**
*Guide de déploiement complet en 10 minutes*
