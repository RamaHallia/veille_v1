# 🚀 Indexation Automatique des Rapports

## 🎯 Objectif

Indexer **automatiquement** chaque nouveau rapport dès sa création, **sans bouton**, pour que l'Assistant IA ait toujours accès au contenu complet.

---

## ✅ Solution Recommandée : n8n Workflow (5 min)

### Pourquoi n8n ?

- ✅ Vous l'utilisez déjà pour générer les rapports
- ✅ Simple à configurer (pas de code)
- ✅ Fiable et visible (logs clairs)
- ✅ Isolation par client (chaque client voit seulement ses rapports)

---

## 📋 Étape 1 : Importer le Workflow Corrigé (2 min)

1. **Ouvrez n8n**
2. **Importez** le fichier : `n8n-workflow-rag-indexation-CORRIGE.json`
3. **Configurez** vos credentials :
   - Credential PostgreSQL (Supabase)
   - Credential Supabase API

### Ce que fait ce workflow :

```
Toutes les 5 minutes
  ↓
Cherche les rapports non indexés
  ↓
Pour chaque rapport :
  ↓
Appelle l'Edge Function index-rapport
  (qui extrait HTML, crée chunks, embeddings, insère dans rapport_chunks)
  ↓
Marque le rapport comme indexé
```

---

## 📋 Étape 2 : Activer le Workflow (1 min)

Dans n8n :
1. **Activez** le workflow (bouton toggle en haut)
2. Le workflow vérifie automatiquement toutes les 5 minutes

✅ **C'est tout !** Chaque rapport sera indexé automatiquement.

---

## 📋 Étape 3 : Vérifier que ça fonctionne (2 min)

### Test Immédiat

```bash
# Vérifier les rapports indexés
npx tsx scripts/check-rag-status.ts
```

**Résultat attendu :**
```
✅ Nombre de rapports: 84
✅ Nombre de chunks: 1000+
```

### Vérifier dans n8n

1. **Ouvrez** le workflow dans n8n
2. **Exécution manuelle** → Cliquez "Test Workflow"
3. **Regardez les logs** :
   - Rapports trouvés → ✅
   - Edge Function appelée → ✅
   - Résumé → ✅ X rapports indexés, Y chunks créés

---

## 🔍 Différences avec l'Ancien Workflow

| Critère | Ancien | Nouveau |
|---------|--------|---------|
| **Fréquence** | Toutes les 2 min | Toutes les 5 min |
| **Colonne** | `contenu` (n'existe pas) | `contenu_html` + `resume` |
| **Embedding** | text-embedding-3-large (3072) | text-embedding-3-small (1536) |
| **Chunking** | Dans n8n (complexe) | Dans Edge Function (simple) |
| **Erreurs** | ❌ Dimension error | ✅ Fonctionne |

---

## 🆘 Troubleshooting

### "Aucun rapport à indexer"

**Cause** : Tous les rapports sont déjà indexés

**Action** : Normal ! Le workflow attendra le prochain rapport.

---

### "Edge Function error"

**Cause** : Edge Function pas déployée ou clé OpenAI manquante

**Solution** :
```bash
# Vérifier les secrets
supabase secrets list

# Déployer l'Edge Function
supabase functions deploy index-rapport
```

---

### "Column rapport_chunks does not exist"

**Cause** : Script SQL pas exécuté

**Solution** :
```bash
# Dans Supabase Dashboard → SQL Editor
# Exécuter : FIX_COMPLET_RAG_FINAL.sql
```

---

##  💡 Alternative : Trigger PostgreSQL (Avancé)

Si vous voulez une indexation **immédiate** (pas toutes les 5 min), vous pouvez utiliser un trigger PostgreSQL.

**Avantages** :
- ✅ Indexation immédiate dès la création du rapport
- ✅ Pas besoin de workflow n8n supplémentaire

**Inconvénients** :
- ⚠️ Plus complexe à débugger
- ⚠️ Nécessite pg_net extension (pas toujours disponible sur tous les plans Supabase)

### Installation du Trigger

```bash
# Dans Supabase Dashboard → SQL Editor
# Exécuter : supabase/migrations/add_auto_indexation_trigger.sql
```

⚠️ **Note** : Vous devez configurer les variables manuellement :
```sql
ALTER DATABASE postgres SET app.supabase_url = 'https://votre-projet.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_role_key = 'votre-service-role-key';
```

---

## 🎯 Ma Recommandation

**Utilisez le workflow n8n** (Solution 1) :

| Raison | Explication |
|--------|-------------|
| **Simple** | Vous connaissez déjà n8n |
| **Visible** | Logs clairs dans n8n |
| **Flexible** | Facile à modifier la fréquence |
| **Sûr** | Pas de risque avec les triggers PostgreSQL |

**5 minutes suffisent** (vs toutes les 2 min) car :
- Les rapports sont générés une fois par jour
- L'indexation prend <30s par rapport
- 5 min = bon équilibre entre réactivité et charge serveur

---

## ✅ Checklist Finale

- [ ] Workflow `n8n-workflow-rag-indexation-CORRIGE.json` importé dans n8n
- [ ] Credentials configurées (PostgreSQL + Supabase API)
- [ ] Workflow activé (toggle ON)
- [ ] Test manuel réussi dans n8n
- [ ] Script `check-rag-status.ts` montre des chunks indexés
- [ ] Assistant IA affiche "X chunks indexés"

---

## 📊 Résultat Attendu

**Avant** :
```
Nouveau rapport créé
  ↓
Aucune indexation automatique
  ↓
Assistant IA ne peut pas répondre
  ↓
User doit cliquer sur un bouton
```

**Après** :
```
Nouveau rapport créé
  ↓
Workflow n8n détecte le rapport (max 5 min)
  ↓
Edge Function indexe automatiquement
  ↓
Assistant IA a accès au contenu
  ↓
User peut poser des questions immédiatement
```

---

## 🎉 Félicitations !

Vous avez maintenant :

✅ Indexation automatique tous les 5 minutes
✅ Contenu HTML complet indexé (pas juste le résumé)
✅ Isolation par client (chaque client voit seulement ses rapports)
✅ Assistant IA qui répond avec le contenu complet
✅ Pas de bouton à cliquer
✅ 1000+ chunks indexés (vs 300 avant)

**Temps investi** : 5 minutes
**Valeur créée** : Énorme 🚀

---

**Créé le 13 novembre 2025**
*Guide d'indexation automatique avec n8n*

🎯 **Recommandation : Solution n8n (5 min)**
⚡ **Alternative : Trigger PostgreSQL (avancé)**
✅ **Résultat : Indexation automatique sans intervention**
