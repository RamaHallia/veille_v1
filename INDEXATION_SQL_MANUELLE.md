# 🔧 Indexation SQL manuelle (Solution simple)

## 🎯 Objectif

Indexer tous les rapports existants directement depuis Supabase SQL Editor, sans script externe.

---

## ⚠️ Prérequis

1. ✅ Extension `pg_net` activée dans Supabase
2. ✅ Edge Function `index-rapport` déployée
3. ✅ Clé `OPENAI_API_KEY` configurée

---

## 📋 Méthode 1 : Indexer tous les rapports (Automatique)

### Activer pg_net

Dans **Supabase SQL Editor**, exécuter :

```sql
-- Activer l'extension pg_net (si pas déjà fait)
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Créer la fonction d'indexation automatique

```sql
CREATE OR REPLACE FUNCTION index_all_reports()
RETURNS TABLE (
  rapport_id UUID,
  status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  rapport RECORD;
  request_id BIGINT;
BEGIN
  FOR rapport IN
    SELECT id, titre
    FROM rapports
    ORDER BY date_rapport DESC
  LOOP
    BEGIN
      -- Appeler l'Edge Function pour chaque rapport
      SELECT net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY'
        ),
        body := jsonb_build_object('rapport_id', rapport.id)
      ) INTO request_id;

      rapport_id := rapport.id;
      status := 'Indexation lancée (request_id: ' || request_id || ')';
      RETURN NEXT;

      -- Pause de 500ms entre chaque rapport
      PERFORM pg_sleep(0.5);
    EXCEPTION WHEN OTHERS THEN
      rapport_id := rapport.id;
      status := 'Erreur: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;
```

**⚠️ À remplacer** :
- `YOUR_PROJECT_REF` → Ton ref Supabase
- `YOUR_SUPABASE_SERVICE_ROLE_KEY` → Ta clé service_role (Settings → API)

### Exécuter l'indexation

```sql
-- Indexer tous les rapports
SELECT * FROM index_all_reports();
```

**Résultat** :
```
rapport_id                            | status
--------------------------------------+----------------------------------------
uuid-1                                | Indexation lancée (request_id: 12345)
uuid-2                                | Indexation lancée (request_id: 12346)
...
```

### Vérifier le résultat

```sql
-- Voir les chunks créés
SELECT
  metadata->>'titre' as titre,
  COUNT(*) as nb_chunks,
  MAX(created_at) as derniere_indexation
FROM rapport_chunks
GROUP BY metadata->>'titre'
ORDER BY MAX(created_at) DESC;
```

---

## 📋 Méthode 2 : Indexer un rapport à la fois (Manuel)

Si tu veux indexer les rapports un par un :

### Étape 1 : Lister les rapports

```sql
SELECT
  id,
  titre,
  date_rapport,
  LENGTH(contenu) as taille_contenu
FROM rapports
ORDER BY date_rapport DESC;
```

### Étape 2 : Indexer un rapport spécifique

```sql
-- Remplacer UUID_DU_RAPPORT par l'ID copié
SELECT net.http_post(
  url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/index-rapport',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY'
  ),
  body := jsonb_build_object('rapport_id', 'UUID_DU_RAPPORT')
);
```

---

## 📋 Méthode 3 : Sans pg_net (Alternative)

Si `pg_net` n'est pas disponible, utiliser le **bouton dans l'interface** :

1. Aller sur **Paramètres** (Settings)
2. Scroller en bas jusqu'à **"Indexation RAG"**
3. Cliquer sur **"Indexer tous les rapports"**
4. Attendre que ça se termine (voir la progression en temps réel)

---

## 🔍 Vérifications

### Vérifier les rapports

```sql
-- Combien de rapports existent ?
SELECT COUNT(*) as nb_rapports FROM rapports;

-- Rapports avec contenu
SELECT COUNT(*) as nb_avec_contenu
FROM rapports
WHERE contenu IS NOT NULL AND LENGTH(contenu) > 0;
```

### Vérifier les chunks

```sql
-- Combien de chunks indexés ?
SELECT COUNT(*) as nb_chunks FROM rapport_chunks;

-- Par rapport
SELECT
  metadata->>'titre' as titre,
  COUNT(*) as nb_chunks
FROM rapport_chunks
GROUP BY metadata->>'titre'
ORDER BY COUNT(*) DESC;
```

### Vérifier qu'un rapport spécifique est indexé

```sql
-- Remplacer UUID_DU_RAPPORT
SELECT
  chunk_text,
  metadata
FROM rapport_chunks
WHERE rapport_id = 'UUID_DU_RAPPORT'
LIMIT 5;
```

---

## 🐛 Dépannage

### Erreur : "extension pg_net does not exist"

**Solution 1** : Activer pg_net
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

**Solution 2** : Utiliser le bouton dans l'interface (Paramètres → Indexation RAG)

### Erreur : "function net.http_post does not exist"

pg_net n'est pas activé. Utiliser le bouton dans l'interface.

### Erreur : "Edge Function not found"

L'Edge Function n'est pas déployée :
```bash
supabase functions deploy index-rapport
```

### Aucun chunk créé

**Vérifier le contenu des rapports** :
```sql
SELECT
  id,
  titre,
  contenu IS NULL as est_vide,
  LENGTH(contenu) as taille
FROM rapports
LIMIT 5;
```

Si `contenu` est NULL ou vide, les rapports n'ont pas de contenu à indexer.

---

## 📊 Statistiques

### Dashboard SQL complet

```sql
-- Statistiques complètes
SELECT
  (SELECT COUNT(*) FROM rapports) as nb_rapports_total,
  (SELECT COUNT(*) FROM rapports WHERE contenu IS NOT NULL) as nb_avec_contenu,
  (SELECT COUNT(*) FROM rapport_chunks) as nb_chunks_total,
  (SELECT COUNT(DISTINCT rapport_id) FROM rapport_chunks) as nb_rapports_indexes,
  (SELECT COUNT(DISTINCT client_id) FROM rapport_chunks) as nb_clients;
```

**Résultat attendu** :
```
nb_rapports_total | nb_avec_contenu | nb_chunks_total | nb_rapports_indexes | nb_clients
------------------+-----------------+-----------------+---------------------+-----------
         10       |       10        |       127       |          10         |     1
```

---

## ✅ Résumé des méthodes

| Méthode | Où | Prérequis | Avantages |
|---------|-----|-----------|-----------|
| **1. Fonction SQL** | Supabase SQL Editor | pg_net | Automatique, rapide |
| **2. Un par un** | Supabase SQL Editor | pg_net | Contrôle total |
| **3. Interface** | Paramètres de l'app | Aucun | Simple, visuel, logs |

**Recommandation** : Utiliser la **Méthode 3** (bouton dans l'interface) - c'est le plus simple ! 🎯

---

## 🎉 Après l'indexation

Une fois tous les rapports indexés :

1. ✅ Aller sur **Assistant IA**
2. ✅ Poser une question : "Résume les dernières tendances"
3. ✅ Tu devrais voir une vraie réponse avec sources !

---

**💡 Conseil** : Configure ensuite l'auto-indexation via n8n (voir `AUTO_INDEXATION_N8N.md`) pour ne plus avoir à faire ça manuellement !
