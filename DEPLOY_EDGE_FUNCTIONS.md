# 🚀 Déploiement des Edge Functions

## Problème actuel

Les Edge Functions existent en local mais **ne sont pas déployées** sur Supabase. C'est pourquoi l'indexation semble réussir (pas d'erreur) mais ne crée aucun chunk dans la base de données.

---

## ✅ Solution : Déployer avec Supabase CLI

### **Étape 1 : Installer Supabase CLI**

#### Option A : Avec npm (recommandé pour Windows)
```bash
npm install -g supabase
```

#### Option B : Avec Scoop
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

Vérifier l'installation :
```bash
supabase --version
```

---

### **Étape 2 : Se connecter à Supabase**

```bash
supabase login
```

Cela va ouvrir votre navigateur pour vous connecter avec votre compte Supabase.

---

### **Étape 3 : Lier votre projet local**

```bash
cd c:\Users\tech\OneDrive\Desktop\projet-veille\veille-ia
supabase link --project-ref xottryrwoxafervpovex
```

Il vous demandera votre **database password** (celui que vous avez défini lors de la création du projet).

---

### **Étape 4 : Configurer la clé OpenAI**

Avant de déployer, vous devez ajouter votre clé OpenAI comme **secret** :

```bash
supabase secrets set OPENAI_API_KEY=sk-votre-cle-openai-ici
```

⚠️ **Remplacez `sk-votre-cle-openai-ici` par votre vraie clé OpenAI !**

Vérifier que le secret est bien créé :
```bash
supabase secrets list
```

---

### **Étape 5 : Déployer les Edge Functions**

#### Déployer toutes les Edge Functions :
```bash
supabase functions deploy
```

#### Ou déployer uniquement `index-rapport` et `rag-query` :
```bash
supabase functions deploy index-rapport
supabase functions deploy rag-query
```

---

### **Étape 6 : Vérifier le déploiement**

1. **Aller dans Supabase Dashboard** → **Edge Functions**
2. Vous devriez voir :
   - ✅ `index-rapport` (actif)
   - ✅ `rag-query` (actif)

3. **Tester l'Edge Function** directement depuis le Dashboard :
   - Cliquez sur `index-rapport`
   - Onglet "Invoke"
   - Body :
     ```json
     {
       "rapport_id": "UN_UUID_VALIDE_DE_VOTRE_TABLE_RAPPORTS"
     }
     ```
   - Cliquez sur "Run"

4. **Vérifier les logs** :
   - Onglet "Logs" de l'Edge Function
   - Vous devriez voir :
     ```
     📋 Indexing rapport: xxx
     📄 Rapport content length: xxx characters
     ✂️ Created X chunks
     🔄 Creating embeddings...
     ✅ All embeddings created
     ✅ Successfully indexed X chunks
     ```

---

### **Étape 7 : Vérifier que les chunks sont créés**

Après avoir testé l'Edge Function, exécutez dans Supabase SQL Editor :

```sql
SELECT COUNT(*) as total_chunks FROM rapport_chunks;
```

Si le résultat est > 0, c'est que ça fonctionne ! 🎉

---

## 🔍 Alternative : Déploiement sans CLI (via Dashboard)

Si vous ne voulez pas installer la CLI, vous pouvez aussi :

1. Aller dans **Supabase Dashboard** → **Edge Functions**
2. Cliquer sur **"New Function"**
3. Nom : `index-rapport`
4. Copier-coller le contenu de `supabase/functions/index-rapport/index.ts`
5. Ajouter le secret `OPENAI_API_KEY` dans **Project Settings** → **Edge Function Secrets**
6. Répéter pour `rag-query`

⚠️ Mais la CLI est **fortement recommandée** car elle facilite les mises à jour.

---

## 🎯 Résumé des commandes

```bash
# 1. Installer CLI
npm install -g supabase

# 2. Se connecter
supabase login

# 3. Lier le projet
cd c:\Users\tech\OneDrive\Desktop\projet-veille\veille-ia
supabase link --project-ref xottryrwoxafervpovex

# 4. Ajouter la clé OpenAI
supabase secrets set OPENAI_API_KEY=sk-votre-cle-ici

# 5. Déployer
supabase functions deploy index-rapport
supabase functions deploy rag-query

# 6. Vérifier
supabase secrets list
```

---

## ❓ Problèmes courants

### "Command not found: supabase"
→ Redémarrez votre terminal après l'installation

### "Project not linked"
→ Vérifiez que vous êtes dans le bon dossier et que vous avez bien fait `supabase link`

### "Invalid database password"
→ Utilisez le mot de passe de votre base de données Supabase (pas celui de votre compte)

### "OpenAI API error: Unauthorized"
→ Vérifiez que votre clé OpenAI est valide et a des crédits

---

## ✅ Une fois déployé

Après le déploiement, rechargez votre application React. L'AutoIndexer devrait maintenant **vraiment** créer les chunks dans `rapport_chunks` !

Vérifiez dans Supabase :
```sql
SELECT
  COUNT(*) as total_chunks,
  COUNT(DISTINCT rapport_id) as rapports_indexes
FROM rapport_chunks;
```

🎉 **Vous devriez voir vos 18 rapports indexés avec des centaines de chunks !**
