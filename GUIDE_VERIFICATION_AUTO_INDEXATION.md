# 🔍 Guide : Vérification Automatique de l'Indexation

## 🎯 Objectif

À **chaque connexion**, vérifier si tous les rapports du client sont indexés et indexer automatiquement ceux qui manquent.

**Idéal pour** :
- ✅ Gérer les anciens rapports non indexés
- ✅ Rattraper l'indexation après une panne
- ✅ S'assurer que tout est toujours à jour

---

## 🚀 Installation (10 minutes)

### Étape 1 : Installer les Fonctions SQL (3 min)

1. **Ouvrez** : `supabase/migrations/fonction_verifier_indexation_client.sql`

2. **Ligne 43**, remplacez :
   ```sql
   v_service_role_key := 'VOTRE_SERVICE_ROLE_KEY_ICI';
   ```

   Par votre vraie clé Service Role (Dashboard → Settings → API)

3. **Supabase SQL Editor** → Copiez-collez tout le fichier → **Run**

**Résultat attendu :**
```
✅ CREATE FUNCTION get_rapports_non_indexes
✅ CREATE FUNCTION indexer_rapports_manquants
✅ CREATE FUNCTION check_indexation_status
✅ COMMENT ON FUNCTION (x3)
```

---

### Étape 2 : Ajouter le Composant dans l'App (5 min)

#### A. Trouver le fichier principal de l'app

Cherchez un de ces fichiers :
- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/pages/Dashboard.tsx`

<function_calls>
<invoke name="Glob">
<parameter name="pattern">src/App.tsx