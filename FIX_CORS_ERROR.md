# 🔧 Correction de l'erreur CORS

## ❌ Erreur rencontrée

```
Access to fetch at 'https://xxx.supabase.co/functions/v1/index-rapport'
from origin 'http://localhost:5173' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
It does not have HTTP ok status.
```

---

## 🔍 Cause du problème

Le handler CORS dans les Edge Functions ne retournait pas explicitement un **status 200** pour les requêtes OPTIONS (preflight).

### **Avant (❌ Bug)**
```typescript
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders });
  // ❌ Pas de status explicite → status par défaut peut varier
}
```

### **Après (✅ Corrigé)**
```typescript
if (req.method === 'OPTIONS') {
  return new Response('ok', {
    status: 200,  // ✅ Status 200 explicite
    headers: corsHeaders
  });
}
```

---

## ✅ Corrections appliquées

### **Fichiers modifiés**

1. ✅ `supabase/functions/index-rapport/index.ts`
   - Ajout de `status: 200` dans la réponse OPTIONS

2. ✅ `supabase/functions/rag-query/index.ts`
   - Ajout de `status: 200` dans la réponse OPTIONS

3. ✅ `deploy.bat`
   - Déploie maintenant les 2 Edge Functions ensemble

---

## 🚀 Déployer les corrections

### **Option 1 : Script automatique (recommandé)**

Double-cliquez sur :
```
deploy.bat
```

Ou en ligne de commande :
```bash
cd c:\Users\tech\OneDrive\Desktop\projet-veille\veille-ia
deploy.bat
```

### **Option 2 : Commandes manuelles**

```bash
cd c:\Users\tech\OneDrive\Desktop\projet-veille\veille-ia

# Déployer index-rapport
npx supabase functions deploy index-rapport

# Déployer rag-query
npx supabase functions deploy rag-query
```

---

## 🧪 Vérifier que le problème est résolu

### **1. Déployer les Edge Functions**

Exécutez `deploy.bat` et attendez :
```
[1/2] Deploiement de index-rapport...
✅ Deployed Function index-rapport

[2/2] Deploiement de rag-query...
✅ Deployed Function rag-query

DEPLOIEMENT TERMINE !
```

### **2. Rafraîchir l'application**

Rechargez votre application React :
```
F5 (ou Ctrl+R)
```

### **3. Vérifier la console**

Vous ne devriez **PLUS** voir l'erreur CORS.

Au lieu de ça, vous devriez voir :
```
🔍 Vérification des rapports non indexés...
📊 X rapports trouvés
🚀 Y rapports à indexer automatiquement
  📄 Indexation: [Titre]
  ✅ Indexé
```

### **4. Vérifier les logs de l'Edge Function**

Dans **Supabase Dashboard** → **Edge Functions** → `index-rapport` → **Logs** :

✅ Vous devriez voir :
```
📋 Indexing rapport: xxx
📥 Downloading PDF from: https://...
📄 PDF downloaded, size: 123456 bytes
📖 PDF loaded, 5 pages
✅ Extracted 12345 characters from PDF
✂️ Created 25 chunks
✅ Successfully indexed 25 chunks
```

❌ Vous ne devriez PAS voir :
```
Error: CORS preflight failed
Error: 405 Method Not Allowed
```

---

## 🎯 Résultat attendu

Après le déploiement, l'AutoIndexer devrait fonctionner sans erreur CORS :

1. ✅ Les rapports avec PDF sont détectés
2. ✅ L'Edge Function `index-rapport` est appelée avec succès
3. ✅ Le PDF est téléchargé et parsé
4. ✅ Les chunks sont créés dans `rapport_chunks`
5. ✅ Les rapports sont marqués `indexe_rag = true`

---

## 📊 Vérifier dans la base de données

```sql
-- Nombre de chunks créés (devrait être > 0)
SELECT COUNT(*) FROM rapport_chunks;

-- Nombre de rapports indexés (devrait être > 0)
SELECT COUNT(*) FROM rapports WHERE indexe_rag = true;

-- Détails par rapport
SELECT
  r.titre,
  COUNT(rc.id) as nb_chunks,
  r.indexe_rag,
  r.date_indexation
FROM rapports r
LEFT JOIN rapport_chunks rc ON rc.rapport_id = r.id
WHERE r.pdf_url IS NOT NULL
GROUP BY r.id, r.titre, r.indexe_rag, r.date_indexation
ORDER BY r.date_generation DESC;
```

**Résultat attendu** :
- Chaque rapport doit avoir plusieurs chunks (5-50 selon la taille du PDF)
- `indexe_rag = true` pour tous les rapports indexés
- `date_indexation` renseigné avec un timestamp récent

---

## ❓ Si l'erreur persiste

### **Vérifier que le déploiement a réussi**

Dans **Supabase Dashboard** → **Edge Functions** :
- ✅ `index-rapport` doit être marqué comme "actif"
- ✅ `rag-query` doit être marqué comme "actif"
- ✅ La date de dernière mise à jour doit être récente (aujourd'hui)

### **Vider le cache du navigateur**

```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

### **Vérifier les headers CORS**

Dans la console du navigateur, onglet **Network** :
1. Filtrer par "index-rapport"
2. Cliquer sur la requête OPTIONS
3. Vérifier les headers de réponse :
   - `Access-Control-Allow-Origin: *` ✅
   - `Access-Control-Allow-Headers: ...` ✅
   - Status: `200 OK` ✅

---

## 🎉 Résumé

- ✅ Erreur CORS corrigée dans les 2 Edge Functions
- ✅ Script `deploy.bat` mis à jour
- ✅ Prêt à déployer et tester

**Exécutez maintenant `deploy.bat` pour déployer les corrections !**
