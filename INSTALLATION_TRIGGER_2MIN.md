# ⚡ Installation Trigger - 2 Minutes

## 🎯 Ce que ça fait

Dès qu'un nouveau rapport est créé → **Indexation automatique immédiate** (30 secondes)

---

## 🚀 Installation (2 étapes)

### Étape 1 : Récupérer votre Service Role Key (1 min)

1. **Supabase Dashboard** → **Settings** → **API**
2. Section **Project API keys**
3. Copiez la clé **service_role** (commence par `eyJhbGc...`)

⚠️ **Cette clé est secrète, ne la partagez JAMAIS**

---

### Étape 2 : Installer le Trigger (1 min)

1. **Ouvrez** : `supabase/migrations/trigger_auto_indexation_READY.sql`

2. **Ligne 28**, remplacez :
   ```sql
   service_role_key := 'VOTRE_SERVICE_ROLE_KEY_ICI';
   ```

   Par :
   ```sql
   service_role_key := 'eyJhbGc...votre-vraie-clé...';
   ```

3. **Supabase Dashboard** → **SQL Editor**
4. **Copiez-collez** tout le fichier
5. **Cliquez** "Run"

**Résultat attendu :**
```
✅ CREATE EXTENSION
✅ CREATE FUNCTION
✅ CREATE TRIGGER (x2)
✅ COMMENT ON FUNCTION
```

---

## ✅ Test (30 secondes)

```sql
-- Dans Supabase SQL Editor
INSERT INTO rapports (
  client_id,
  titre,
  contenu_html
)
VALUES (
  (SELECT id FROM clients LIMIT 1),
  'Test Trigger',
  '<p>Contenu de test</p>'
);

-- Attendre 30 secondes, puis vérifier :
SELECT
  r.titre,
  r.indexe_rag,
  COUNT(rc.id) as nb_chunks
FROM rapports r
LEFT JOIN rapport_chunks rc ON rc.rapport_id = r.id
WHERE r.titre = 'Test Trigger'
GROUP BY r.id, r.titre, r.indexe_rag;
```

**Résultat attendu :**
```
titre        | indexe_rag | nb_chunks
Test Trigger | true       | 5
```

✅ **Vous voyez des chunks ? C'EST BON !**

---

## 🆘 Problème ?

### "extension pg_net does not exist"

**Cause** : Votre plan Supabase (Gratuit) ne supporte pas `pg_net`

**Solution** : Utilisez n8n à la place (voir `INDEXATION_AUTOMATIQUE_SIMPLE.md`)

---

### "permission denied"

**Cause** : Besoin du plan Pro pour `pg_net`

**Solution** :
- Option 1 : Passez au plan Pro (8$/mois)
- Option 2 : Utilisez n8n (gratuit)

---

### Rien ne se passe

**Vérifications** :

```bash
# 1. Edge Function déployée ?
supabase functions list
# Doit afficher : index-rapport deployed

# 2. Voir les logs
supabase functions logs index-rapport
```

---

## 🎉 Résultat

**Avant** : Indexation manuelle (bouton)

**Après** : Indexation automatique **en 30 secondes** dès la création du rapport

---

## 📚 Plus d'infos

Voir `GUIDE_TRIGGER_AUTO_INDEXATION.md` pour le guide complet.

---

**Créé le 13 novembre 2025**

⚡ **2 minutes d'installation**
🚀 **Indexation immédiate (30s)**
✅ **Aucun bouton à cliquer**
