# 🚀 Indexation rapide des rapports

## ✅ Le script utilise maintenant ton fichier .env

Plus besoin de modifier le script ! Il lit automatiquement :
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 📋 Étapes

### 1. Installer les dépendances (si pas déjà fait)

```bash
npm install dotenv
```

### 2. Vérifier ton fichier .env

Assure-toi que ton fichier `.env` à la racine contient :

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Exécuter le script

```bash
npx tsx scripts/index-existing-reports.ts
```

---

## 📊 Résultat attendu

```
═══════════════════════════════════════════════
  Indexation des rapports pour le RAG
═══════════════════════════════════════════════

🚀 Démarrage de l'indexation des rapports existants...

📊 10 rapports trouvés

[1/10] Indexation : Veille IA - 7 novembre 2025
    Date : 07/11/2025
    ✅ 12 chunks créés

[2/10] Indexation : Veille IA - 6 novembre 2025
    Date : 06/11/2025
    ✅ 15 chunks créés

...

═══════════════════════════════════════════════
🎉 Indexation terminée !
✅ Succès : 10
❌ Erreurs : 0
═══════════════════════════════════════════════

📦 Total de chunks dans la base : 127
```

---

## 🐛 Si erreur

### Erreur : "Les variables VITE_SUPABASE_URL... doivent être définies"

**Solution** : Vérifier que ton `.env` contient bien les variables avec le préfixe `VITE_`

### Erreur : "Cannot find module 'dotenv'"

**Solution** :
```bash
npm install dotenv
```

### Erreur : "Edge Function not found"

**Solution** : Déployer d'abord les Edge Functions :
```bash
supabase functions deploy index-rapport
supabase functions deploy rag-query
```

---

## ✅ Vérification dans Supabase

Après l'indexation, vérifier dans Supabase SQL Editor :

```sql
-- Voir le nombre total de chunks
SELECT COUNT(*) as total_chunks FROM rapport_chunks;

-- Voir les chunks par rapport
SELECT
  metadata->>'titre' as titre,
  COUNT(*) as nb_chunks
FROM rapport_chunks
GROUP BY metadata->>'titre'
ORDER BY nb_chunks DESC;
```

---

## 🎉 C'est fait !

Une fois l'indexation terminée, tes rapports sont prêts à être interrogés via l'Assistant IA ! 🤖
