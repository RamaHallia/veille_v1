# 🎯 Guide : Trigger Auto-Indexation PostgreSQL

## ✅ Avantages

- ✅ **Indexation immédiate** (dès la création du rapport)
- ✅ **Pas besoin de n8n**
- ✅ **Automatique** (aucune intervention manuelle)
- ✅ **Isolé par client** (sécurité native)

---

## 🚀 Installation (5 minutes)

### Étape 1 : Obtenir vos identifiants Supabase (2 min)

#### A. URL Supabase

1. **Supabase Dashboard** → **Settings** → **API**
2. Copiez **Project URL**
   - Format : `https://xxxxx.supabase.co`

#### B. Service Role Key

1. **Supabase Dashboard** → **Settings** → **API**
2. Copiez **service_role key** (section "Project API keys")
   - ⚠️ **ATTENTION** : Cette clé donne un accès complet, ne la partagez JAMAIS

---

### Étape 2 : Modifier le fichier SQL (1 min)

Ouvrez : `supabase/migrations/trigger_auto_indexation.sql`

**Remplacez ces 2 lignes** :

```sql
-- AVANT :
supabase_url := 'https://VOTRE_PROJECT_ID.supabase.co';
service_role_key := 'VOTRE_SERVICE_ROLE_KEY';

-- APRÈS :
supabase_url := 'https://xottryrwoxafervpovex.supabase.co';  -- Votre vraie URL
service_role_key := 'eyJhbGc...votre-vraie-clé...';  -- Votre vraie clé
```

---

### Étape 3 : Exécuter le script (1 min)

```bash
# Dans Supabase Dashboard → SQL Editor
# Copiez-collez le contenu de : trigger_auto_indexation.sql
# Cliquez "Run"
```

**Résultat attendu :**
```
✅ CREATE EXTENSION
✅ CREATE FUNCTION
✅ CREATE TRIGGER (x2)
```

---

### Étape 4 : Tester (1 min)

```sql
-- Dans Supabase SQL Editor
-- Test simple : créer un rapport de test
INSERT INTO rapports (
  client_id,
  titre,
  contenu_html,
  resume
)
VALUES (
  (SELECT id FROM clients LIMIT 1),  -- Prend le premier client
  'Test Trigger Auto-Indexation',
  '<p>Ceci est un test de contenu HTML pour vérifier l''indexation automatique.</p>',
  'Résumé du test'
);
```

**Que se passe-t-il ?**

1. Le rapport est inséré dans la table `rapports`
2. Le trigger `trigger_auto_index_new_rapport` se déclenche **immédiatement**
3. Le trigger appelle l'Edge Function `index-rapport` via HTTP
4. L'Edge Function indexe le rapport (crée les chunks, embeddings, etc.)
5. Le rapport est marqué comme `indexe_rag = true`

**Vérification** :

```sql
-- Vérifier que le rapport a été indexé
SELECT
  r.titre,
  r.indexe_rag,
  COUNT(rc.id) as nb_chunks
FROM rapports r
LEFT JOIN rapport_chunks rc ON rc.rapport_id = r.id
WHERE r.titre = 'Test Trigger Auto-Indexation'
GROUP BY r.id, r.titre, r.indexe_rag;
```

**Résultat attendu :**
```
titre                           | indexe_rag | nb_chunks
Test Trigger Auto-Indexation    | true       | 5
```

✅ **Si vous voyez des chunks → C'EST BON !**

---

## 🔍 Vérification des Logs

### Voir les logs PostgreSQL

```sql
-- Dans Supabase Dashboard → SQL Editor
SELECT * FROM pg_stat_activity
WHERE query LIKE '%auto_index%'
ORDER BY query_start DESC
LIMIT 10;
```

### Voir les logs Edge Function

```bash
# Dans votre terminal
supabase functions logs index-rapport --tail 50
```

Vous devriez voir :
```
📋 Indexing rapport: [rapport-id]
📄 Rapport: Test Trigger Auto-Indexation
✅ HTML nettoyé: 87 caractères
✂️ Créé 5 chunks
✅ Embeddings créés
🎉 Indexation terminée !
```

---

## 🆘 Troubleshooting

### Problème 1 : "extension pg_net does not exist"

**Cause** : L'extension `pg_net` n'est pas disponible sur tous les plans Supabase.

**Solution** : Utilisez le workflow n8n à la place (voir `INDEXATION_AUTOMATIQUE_SIMPLE.md`)

**Alternative** : Utilisez une Cloud Function externe (non recommandé)

---

### Problème 2 : "permission denied for extension pg_net"

**Cause** : Votre plan Supabase ne permet pas d'utiliser `pg_net`.

**Solution** : Passez au plan Pro (8$/mois) ou utilisez n8n.

---

### Problème 3 : "HTTP request failed"

**Causes possibles** :
1. URL Supabase incorrecte
2. Service Role Key incorrecte
3. Edge Function pas déployée

**Vérifications** :

```bash
# 1. Vérifier l'URL
echo $VITE_SUPABASE_URL

# 2. Vérifier que l'Edge Function est déployée
supabase functions list

# 3. Tester l'Edge Function manuellement
curl -X POST https://VOTRE_URL.supabase.co/functions/v1/index-rapport \
  -H "Authorization: Bearer VOTRE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"rapport_id": "rapport-uuid-test"}'
```

---

### Problème 4 : "Trigger se déclenche mais rien ne se passe"

**Cause** : L'appel HTTP est fait en arrière-plan et n'attend pas la réponse.

**Vérification** :

```sql
-- Vérifier les requêtes HTTP en attente/terminées
SELECT * FROM net.http_get_result();
```

**Solution** : Attendez 10-30 secondes, puis vérifiez :

```sql
SELECT COUNT(*) FROM rapport_chunks WHERE rapport_id = 'votre-rapport-id';
```

---

## 📊 Comparaison Trigger vs n8n

| Critère | Trigger PostgreSQL | Workflow n8n |
|---------|-------------------|--------------|
| **Vitesse** | ⚡ Immédiat (<1s) | ⏱️ 2-5 minutes |
| **Visibilité** | ⚠️ Logs PostgreSQL (moins clair) | ✅ Logs n8n (très clair) |
| **Débogage** | ⚠️ Plus difficile | ✅ Facile |
| **Fiabilité** | ✅ Très fiable | ✅ Très fiable |
| **Dépendances** | ⚠️ Nécessite pg_net | ✅ Aucune |
| **Plan Supabase** | ⚠️ Pro requis | ✅ Gratuit OK |

---

## 🎯 Ma Recommandation

### Utilisez le Trigger si :
- ✅ Vous avez le plan Supabase Pro
- ✅ Vous voulez une indexation **immédiate**
- ✅ Vous êtes à l'aise avec PostgreSQL

### Utilisez n8n si :
- ✅ Vous êtes sur le plan Supabase Gratuit
- ✅ Vous voulez des logs **clairs et visuels**
- ✅ Vous préférez la **simplicité**
- ✅ 5 minutes de délai sont acceptables

**Mon conseil** : Commencez par **n8n** (plus simple), passez au **trigger** plus tard si besoin.

---

## ✅ Checklist

- [ ] Extension `pg_net` activée
- [ ] URL Supabase remplacée dans le SQL
- [ ] Service Role Key remplacée dans le SQL
- [ ] Script SQL exécuté (CREATE TRIGGER vu)
- [ ] Test INSERT réussi
- [ ] Chunks créés (vérification SQL)
- [ ] Logs Edge Function montrent l'indexation

---

## 🚀 Résultat Final

**Avant** :
```
Nouveau rapport créé
  ↓
Rien ne se passe
  ↓
User doit cliquer sur un bouton
```

**Après (avec Trigger)** :
```
Nouveau rapport créé
  ↓
Trigger se déclenche IMMÉDIATEMENT
  ↓
Edge Function indexe (30s)
  ↓
Assistant IA a accès au contenu
```

**Délai total** : **30 secondes** (vs 5 minutes avec n8n)

---

## 📚 Fichiers Liés

- `supabase/migrations/trigger_auto_indexation.sql` → Trigger à installer
- `INDEXATION_AUTOMATIQUE_SIMPLE.md` → Alternative n8n
- `DEPLOIEMENT_FINAL_RAG.md` → Guide complet RAG

---

## 🔧 Commandes Utiles

```sql
-- Voir tous les triggers sur la table rapports
SELECT * FROM information_schema.triggers
WHERE event_object_table = 'rapports';

-- Désactiver le trigger temporairement
ALTER TABLE rapports DISABLE TRIGGER trigger_auto_index_new_rapport;

-- Réactiver le trigger
ALTER TABLE rapports ENABLE TRIGGER trigger_auto_index_new_rapport;

-- Supprimer le trigger
DROP TRIGGER IF EXISTS trigger_auto_index_new_rapport ON rapports;

-- Voir les logs d'erreur PostgreSQL
SELECT * FROM pg_stat_statements
WHERE query LIKE '%auto_index%'
ORDER BY last_exec_time DESC
LIMIT 10;
```

---

**Créé le 13 novembre 2025**
*Guide complet du trigger auto-indexation PostgreSQL*

⚡ **Indexation immédiate (30s)**
🎯 **Aucune intervention manuelle**
✅ **Isolation par client**
