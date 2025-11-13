# 🔧 Dépannage RAG : "Aucune information trouvée"

## 🎯 Problème

Message reçu :
> "Je n'ai pas trouvé d'informations pertinentes dans votre historique de veilles pour répondre à cette question. Assurez-vous que vos rapports ont été indexés."

**✅ Bonne nouvelle** : L'Edge Function fonctionne !
**❌ Problème** : Aucun chunk indexé dans la base

---

## 🔍 Diagnostic en 3 étapes

### Étape 1 : Vérifier si des rapports existent

Dans **Supabase SQL Editor** :

```sql
-- Vérifier les rapports
SELECT
  id,
  titre,
  date_rapport,
  client_id,
  LENGTH(contenu) as taille_contenu
FROM rapports
ORDER BY date_rapport DESC
LIMIT 10;
```

**Si 0 résultats** → Aucun rapport créé, crée d'abord des rapports avec n8n

**Si des résultats** → Passe à l'étape 2

---

### Étape 2 : Vérifier si les chunks existent

```sql
-- Vérifier les chunks indexés
SELECT COUNT(*) as total_chunks FROM rapport_chunks;

-- Voir les détails
SELECT
  metadata->>'titre' as titre,
  COUNT(*) as nb_chunks,
  MAX(created_at) as derniere_indexation
FROM rapport_chunks
GROUP BY metadata->>'titre'
ORDER BY derniere_indexation DESC;
```

**Si 0 chunks** → Les rapports ne sont pas indexés, passe à l'étape 3

**Si des chunks existent** → Problème de recherche, voir section "Problèmes de recherche" ci-dessous

---

### Étape 3 : Indexer les rapports

#### Option A : Via le script (recommandé)

```bash
# Installer dotenv si pas fait
npm install dotenv

# Exécuter le script (utilise automatiquement .env)
npx tsx scripts/index-existing-reports.ts
```

**Résultat attendu** :
```
🚀 Démarrage de l'indexation...
📊 10 rapports trouvés

[1/10] Indexation : Veille IA - 7 novembre
    ✅ 12 chunks créés
...
🎉 Indexation terminée !
✅ Succès : 10
📦 Total de chunks dans la base : 127
```

#### Option B : Indexer 1 rapport manuellement (test)

Dans **Supabase SQL Editor** :

```sql
-- 1. Récupérer un ID de rapport
SELECT id, titre FROM rapports LIMIT 1;
-- Copier l'ID

-- 2. Tester l'indexation via curl ou Postman
```

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"rapport_id": "COLLER_ID_ICI"}'
```

**Résultat attendu** :
```json
{"success": true, "chunks_created": 12}
```

---

## ❌ Problèmes courants

### 1. "Rapport has no content to index"

**Cause** : Le rapport existe mais le champ `contenu` est vide ou NULL

**Solution** : Vérifier dans Supabase :
```sql
SELECT id, titre, contenu IS NULL as est_vide, LENGTH(contenu) as taille
FROM rapports
LIMIT 5;
```

Si `contenu` est vide, il faut régénérer les rapports avec n8n.

---

### 2. "Client not found"

**Cause** : Le `user_id` n'existe pas dans la table `clients`

**Solution** : Vérifier :
```sql
SELECT * FROM clients WHERE user_id = 'TON_USER_ID';
```

Si pas de résultat, l'utilisateur n'a pas de client associé.

---

### 3. Chunks créés mais recherche ne trouve rien

**Cause possible 1** : Mauvais `client_id`

**Solution** : Vérifier que les chunks sont bien liés au bon client :
```sql
-- Ton user_id
SELECT id FROM clients WHERE user_id = 'TON_USER_ID';

-- Les chunks de ce client
SELECT COUNT(*) FROM rapport_chunks
WHERE client_id = (SELECT id FROM clients WHERE user_id = 'TON_USER_ID');
```

**Cause possible 2** : Fonction de recherche mal configurée

**Solution** : Retester la fonction :
```sql
-- Vérifier que la fonction existe
SELECT * FROM pg_proc WHERE proname = 'search_rapport_chunks';
```

Si elle n'existe pas, réexécuter `supabase_rag_setup.sql`.

---

### 4. "OpenAI API error"

**Cause** : Clé OpenAI manquante ou invalide

**Solution** :
```bash
# Vérifier
supabase secrets list

# Redéfinir
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

Puis redéployer :
```bash
supabase functions deploy index-rapport
supabase functions deploy rag-query
```

---

### 5. "Module not found"

**Cause** : Anciennes versions des Edge Functions avec import `shared/`

**Solution** : Utiliser les nouvelles versions autonomes (déjà corrigé dans les fichiers).

Redéployer :
```bash
supabase functions deploy index-rapport
supabase functions deploy rag-query
```

---

## 🧪 Test complet après indexation

### 1. Vérifier les chunks

```sql
SELECT
  COUNT(*) as total_chunks,
  COUNT(DISTINCT rapport_id) as nb_rapports_indexes,
  COUNT(DISTINCT client_id) as nb_clients
FROM rapport_chunks;
```

**Résultat attendu** : `total_chunks > 0`

### 2. Tester la recherche vectorielle

```sql
-- Prendre un embedding existant pour tester
SELECT search_rapport_chunks(
  (SELECT embedding FROM rapport_chunks LIMIT 1),
  (SELECT id FROM clients WHERE user_id = 'TON_USER_ID'),
  0.5,
  5
);
```

**Résultat attendu** : Liste de chunks

### 3. Tester via l'interface

1. Aller sur **Assistant IA**
2. Poser une question simple : "Résume"
3. Vérifier la réponse

---

## 📊 Monitoring

### Voir les logs de l'Edge Function

```bash
# Logs de rag-query
supabase functions logs rag-query --follow

# Logs de index-rapport
supabase functions logs index-rapport --follow
```

### Console du navigateur

Ouvrir la console (F12) et chercher :
- Erreurs réseau
- Réponses de l'API
- Messages de debug

---

## ✅ Checklist de résolution

- [ ] Des rapports existent dans la table `rapports`
- [ ] Les rapports ont du contenu (champ `contenu` non vide)
- [ ] L'Edge Function `index-rapport` est déployée
- [ ] L'Edge Function `rag-query` est déployée
- [ ] `OPENAI_API_KEY` est configurée
- [ ] Les chunks sont dans la table `rapport_chunks`
- [ ] La fonction `search_rapport_chunks` existe
- [ ] Les chunks sont liés au bon `client_id`
- [ ] Le test de recherche fonctionne

---

## 🎯 Solution rapide (TL;DR)

```bash
# 1. Vérifier qu'il y a des rapports
# → Dans Supabase SQL : SELECT COUNT(*) FROM rapports;

# 2. Vérifier qu'il y a des chunks
# → Dans Supabase SQL : SELECT COUNT(*) FROM rapport_chunks;

# 3. Si pas de chunks, indexer
npm install dotenv
npx tsx scripts/index-existing-reports.ts

# 4. Retester l'Assistant IA
```

---

## 📞 Encore un problème ?

1. Coller les logs de l'Edge Function :
   ```bash
   supabase functions logs rag-query
   ```

2. Vérifier les résultats SQL des étapes 1 et 2

3. Vérifier la console du navigateur (F12)

---

**🎉 Une fois les rapports indexés, le RAG fonctionnera parfaitement !**
