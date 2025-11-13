# 🔄 Auto-indexation via n8n (Solution permanente)

## 🎯 Objectif

Faire en sorte que **chaque nouveau rapport créé** soit **automatiquement indexé** pour le RAG, sans intervention manuelle.

---

## 📋 Configuration n8n (5 minutes)

### Étape 1 : Ouvrir ton workflow n8n

1. Aller sur https://n8n.srv954650.hstgr.cloud
2. Ouvrir ton workflow de génération de rapports

### Étape 2 : Trouver le nœud de création du rapport

Chercher le nœud qui **insère le rapport dans Supabase** (table `rapports`).

Il devrait ressembler à ça :
- Nœud **Supabase** ou **HTTP Request**
- Action : **Insert**
- Table : `rapports`

### Étape 3 : Ajouter un nœud HTTP Request

**Après** le nœud de création du rapport, ajouter un nouveau nœud :

1. **Cliquer sur le "+"** après le nœud de création
2. **Choisir** : **HTTP Request**
3. **Configurer** :

#### Configuration du nœud HTTP Request

**Nom** : `Indexer rapport pour RAG`

**Method** : `POST`

**URL** :
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport
```
💡 Remplacer `YOUR_PROJECT_REF` par ton ref Supabase (ex: `xottryrwoxafervpovex`)

**Authentication** : `None` (on utilise des headers)

**Send Headers** : `On`

**Headers** :
| Name | Value |
|------|-------|
| Content-Type | `application/json` |
| Authorization | `Bearer YOUR_SUPABASE_SERVICE_KEY` |

💡 **Trouver ton SERVICE_KEY** : Supabase Dashboard → Settings → API → `service_role` (⚠️ Secret, ne jamais partager)

**Send Body** : `On`

**Body Content Type** : `JSON`

**JSON** :
```json
{
  "rapport_id": "{{ $json.rapport_id }}"
}
```

💡 Si ton nœud précédent renvoie le rapport avec un champ `id` au lieu de `rapport_id`, utiliser :
```json
{
  "rapport_id": "{{ $json.id }}"
}
```

**Options** :
- ✅ Ignore SSL Issues : `false`
- ✅ Timeout : `30000` (30 secondes)

### Étape 4 : Tester

1. **Sauvegarder** le workflow
2. **Exécuter manuellement** le workflow
3. **Vérifier** :
   - Le rapport est créé ✅
   - Le nœud d'indexation s'exécute ✅
   - Pas d'erreur ✅

**Résultat attendu du nœud HTTP Request** :
```json
{
  "success": true,
  "chunks_created": 12,
  "rapport_id": "uuid-du-rapport"
}
```

### Étape 5 : Activer le workflow

1. **Toggle** en haut à droite : `Active` (bleu)
2. ✅ Désormais, chaque nouveau rapport sera automatiquement indexé !

---

## 🔍 Vérification

### Dans Supabase

```sql
-- Voir les derniers chunks indexés
SELECT
  metadata->>'titre' as titre,
  metadata->>'date_rapport' as date,
  COUNT(*) as nb_chunks,
  MAX(created_at) as derniere_indexation
FROM rapport_chunks
GROUP BY metadata->>'titre', metadata->>'date_rapport'
ORDER BY MAX(created_at) DESC
LIMIT 5;
```

### Dans n8n

1. Aller dans **Executions** (historique)
2. Cliquer sur la dernière exécution
3. Vérifier que le nœud "Indexer rapport pour RAG" est ✅ (vert)

---

## 🐛 Dépannage

### Erreur : "Edge Function not found"

**Solution** : Déployer l'Edge Function :
```bash
supabase functions deploy index-rapport
```

### Erreur : "Unauthorized" ou "Invalid API key"

**Solution** : Vérifier le header `Authorization` :
```
Bearer YOUR_SUPABASE_SERVICE_KEY
```

💡 Ne pas confondre avec `ANON_KEY` - il faut bien la **SERVICE_ROLE_KEY**

### Erreur : "rapport_id is required"

**Solution** : Vérifier le body JSON. Le champ doit correspondre :
- Si le rapport retourné a un champ `id` → utiliser `{{ $json.id }}`
- Si le rapport retourné a un champ `rapport_id` → utiliser `{{ $json.rapport_id }}`

Pour débugger, afficher le JSON du nœud précédent :
1. Cliquer sur le nœud de création du rapport
2. Aller dans **Output** → **JSON**
3. Copier le nom exact du champ ID

### Erreur : "OpenAI API error"

**Solution** : Vérifier que la clé OpenAI est configurée :
```bash
supabase secrets list
# Doit contenir : OPENAI_API_KEY

# Si manquant :
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

### Le nœud s'exécute mais pas de chunks créés

**Solution** : Vérifier les logs de l'Edge Function :
```bash
supabase functions logs index-rapport --follow
```

Causes possibles :
- Le rapport n'a pas de contenu (`contenu` est NULL ou vide)
- Le `rapport_id` n'existe pas dans la base

---

## 📊 Workflow complet

```
┌────────────────────┐
│  Trigger (Cron)    │  ← Tous les jours à l'heure définie
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Collecter données │  ← RSS, LinkedIn, etc.
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Générer rapport   │  ← OpenAI GPT-4
│  (avec OpenAI)     │
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Créer rapport     │  ← Insert dans Supabase
│  dans Supabase     │     table: rapports
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Indexer pour RAG  │  ← Nouveau nœud HTTP Request ✨
│  (Edge Function)   │     Appelle: index-rapport
└──────┬─────────────┘
       │
       ▼
┌────────────────────┐
│  Envoyer par email │  ← Gmail, SendGrid, etc.
└────────────────────┘
```

---

## ✅ Résultat final

Une fois configuré :

1. ✅ **Nouveaux rapports** → Indexés automatiquement
2. ✅ **Rapports existants** → Indexer avec le bouton dans Paramètres
3. ✅ **Assistant IA** → Fonctionne avec tous les rapports

**Plus besoin de lancer manuellement l'indexation !** 🎉

---

## 📝 Configuration complète (Template)

Copier-coller cette configuration dans le nœud HTTP Request :

```json
{
  "name": "Indexer rapport pour RAG",
  "method": "POST",
  "url": "https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport",
  "authentication": "none",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      },
      {
        "name": "Authorization",
        "value": "Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"
      }
    ]
  },
  "sendBody": true,
  "bodyContentType": "json",
  "jsonBody": "{\n  \"rapport_id\": \"{{ $json.rapport_id }}\"\n}",
  "options": {
    "timeout": 30000
  }
}
```

**À remplacer** :
- `YOUR_PROJECT_REF` → Ton ref Supabase
- `YOUR_SUPABASE_SERVICE_ROLE_KEY` → Ta clé service_role
- `$json.rapport_id` → Le bon champ selon ton workflow

---

## 🎓 Pourquoi c'est important

Sans auto-indexation :
- ❌ Tu dois indexer manuellement chaque rapport
- ❌ L'Assistant IA ne voit pas les nouveaux rapports
- ❌ Risque d'oublier d'indexer

Avec auto-indexation :
- ✅ Automatique et transparent
- ✅ Tous les rapports sont disponibles dans l'Assistant IA
- ✅ Pas d'intervention manuelle
- ✅ Scalable (fonctionne avec 1 ou 1000 rapports)

---

**🚀 Une fois configuré, c'est terminé ! Le système fonctionne tout seul !**
