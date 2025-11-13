# 📄 Guide : Indexation du Contenu des Rapports PDF

## 🎯 Objectif

Indexer le **contenu complet** des rapports PDF (pas juste le résumé) pour que l'Assistant IA puisse répondre avec toutes les informations.

---

## 📊 Colonnes Disponibles dans `rapports`

Voici les colonnes qui contiennent du contenu :

| Colonne | Type | Contenu | Usage |
|---------|------|---------|-------|
| **contenu_html** | TEXT | Contenu complet en HTML | ✅ **PRIORITÉ 1** |
| **resume** | TEXT | Résumé du rapport | ⚠️ Priorité 2 (partiel) |
| **pdf_url** | TEXT | URL publique du PDF | 🔧 Priorité 3 (complexe) |

---

## 🚀 Stratégie d'Indexation Recommandée

J'ai créé **3 versions** de l'Edge Function `index-rapport` :

### Version 1 : **Simplifiée** (✅ RECOMMANDÉE)

**Fichier :** `index-simplified.ts`

**Stratégie :**
1. ✅ **Priorité 1** : Utilise `contenu_html` (contenu complet déjà extrait)
2. ⚠️ **Priorité 2** : Utilise `resume` si pas de HTML (contenu partiel)
3. ❌ **Pas d'extraction PDF** (pour simplifier)

**Avantages :**
- ✅ Simple et fiable
- ✅ Rapide (pas de téléchargement)
- ✅ Utilise le contenu déjà extrait par votre système

**Quand l'utiliser :**
- Si vos rapports ont déjà `contenu_html` rempli
- Si vous voulez une solution simple et rapide
- **C'est le cas pour la plupart des systèmes de génération de rapports**

---

### Version 2 : **Extraction PDF** (🔧 Avancée)

**Fichier :** `index-v2-pdf.ts`

**Stratégie :**
1. ✅ **Priorité 1** : Utilise `contenu_html` (si existe)
2. 📄 **Priorité 2** : Télécharge le PDF depuis `pdf_url` et extrait le texte
3. ⚠️ **Priorité 3** : Utilise `resume` en fallback

**Avantages :**
- ✅ Contenu complet même sans `contenu_html`
- ✅ Indexation directe depuis le PDF

**Inconvénients :**
- ❌ Plus complexe
- ❌ Nécessite téléchargement du PDF
- ❌ Extraction PDF limitée en Deno
- ❌ Peut nécessiter une API externe (PDFCo, etc.)

**Quand l'utiliser :**
- Si `contenu_html` est vide
- Si vous devez absolument extraire du PDF
- Si vous avez une API d'extraction PDF

---

### Version 3 : **Actuelle** (⚠️ À remplacer)

**Fichier :** `index.ts` (actuel)

**Problème :**
- Utilise uniquement `resume` (contenu partiel)
- Ne profite pas de `contenu_html` (contenu complet)

---

## 🔧 Installation de la Version Recommandée

### Étape 1 : Vérifier vos données

Vérifiez si vos rapports ont `contenu_html` :

```sql
-- Dans Supabase SQL Editor
SELECT
  id,
  titre,
  LENGTH(contenu_html) as html_length,
  LENGTH(resume) as resume_length,
  pdf_url IS NOT NULL as has_pdf
FROM rapports
ORDER BY date_generation DESC
LIMIT 10;
```

**Résultat attendu :**

| id | titre | html_length | resume_length | has_pdf |
|----|-------|-------------|---------------|---------|
| ... | Rapport... | 15234 | 856 | true |

**Si `html_length` > 0 pour la plupart** → Utilisez la **Version Simplifiée** ✅

**Si `html_length` = 0** → Utilisez la **Version PDF** 🔧

---

### Étape 2 : Remplacer l'Edge Function

#### Option A : Version Simplifiée (Recommandée)

```bash
# Remplacer le fichier
cd supabase/functions/index-rapport
cp index-simplified.ts index.ts

# Déployer
supabase functions deploy index-rapport
```

#### Option B : Version PDF (Si nécessaire)

```bash
# Remplacer le fichier
cd supabase/functions/index-rapport
cp index-v2-pdf.ts index.ts

# Si vous utilisez une API d'extraction PDF, configurez la clé
supabase secrets set PDF_EXTRACTION_API_KEY=...

# Déployer
supabase functions deploy index-rapport
```

---

### Étape 3 : Réindexer tous les rapports

```bash
# Lancer le script d'indexation
npx tsx scripts/index-all-rapports.ts
```

**Résultat attendu :**

```
🚀 Indexation automatique des rapports

📋 84 rapports à indexer

🔄 Indexation en cours...

📦 Batch 1/17 (5 rapports)
  [1/84] Rapport de veille - IA... ✅ (12 chunks) [contenu_html]
  [2/84] Rapport de veille - IA... ✅ (15 chunks) [contenu_html]
  ...

📊 RÉSUMÉ
✅ Rapports indexés : 84/84
📚 Chunks créés     : 987
Source principale   : contenu_html (98%), resume (2%)
```

---

## 📊 Comparaison des Versions

| Critère | Simplifiée | PDF | Actuelle |
|---------|-----------|-----|----------|
| **Source principale** | contenu_html | PDF extraction | resume |
| **Qualité indexation** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Très bon | ⭐⭐ Partiel |
| **Complexité** | ⭐ Facile | ⭐⭐⭐⭐ Complexe | ⭐ Facile |
| **Vitesse** | ⭐⭐⭐⭐⭐ Rapide | ⭐⭐ Lent (téléchargement) | ⭐⭐⭐⭐ Rapide |
| **Fiabilité** | ⭐⭐⭐⭐⭐ Très fiable | ⭐⭐⭐ Dépend de l'API | ⭐⭐⭐⭐ Fiable |
| **Contenu indexé** | 100% (si HTML existe) | 100% | 10-20% (résumé) |

---

## 🔍 Vérification

Une fois réindexé, vérifiez la qualité :

### Test SQL

```sql
-- Vérifier les chunks créés
SELECT
  r.titre,
  COUNT(rc.id) as nb_chunks,
  AVG(LENGTH(rc.chunk_text)) as avg_chunk_size,
  rc.metadata->>'content_source' as source
FROM rapports r
JOIN rapport_chunks rc ON rc.rapport_id = r.id
GROUP BY r.id, r.titre, rc.metadata->>'content_source'
ORDER BY r.date_generation DESC
LIMIT 10;
```

**Résultat attendu :**

| titre | nb_chunks | avg_chunk_size | source |
|-------|-----------|----------------|--------|
| Rapport... | 15 | 1850 | contenu_html |
| Rapport... | 12 | 1920 | contenu_html |

**Si `source = contenu_html` et `nb_chunks > 10`** → ✅ **Parfait !**

**Si `source = resume` et `nb_chunks < 5`** → ⚠️ Vérifiez si `contenu_html` est bien rempli

---

### Test dans l'Assistant IA

1. Allez dans **Assistant IA**
2. Posez une question détaillée :
   ```
   "Détaille-moi toutes les informations sur [sujet spécifique]
   mentionnées dans le rapport du [date]"
   ```
3. Vérifiez que la réponse est **détaillée** (pas juste le résumé)

**Avant (avec resume) :**
```
Le rapport mentionne des avancées en IA générative. [vague]
```

**Après (avec contenu_html) :**
```
Le rapport détaille plusieurs avancées majeures en IA générative :

1. OpenAI a annoncé GPT-4 Turbo avec 128k tokens de contexte...
2. Google a lancé Gemini Ultra qui surpasse GPT-4 sur 30 des 32 benchmarks...
3. Microsoft intègre Copilot dans...
[détaillé avec les sources exactes]
```

---

## 🎯 Ma Recommandation

### Utilisez la **Version Simplifiée** si :
- ✅ Vos rapports ont `contenu_html` rempli (vérifiez avec la requête SQL)
- ✅ Vous voulez une solution simple et fiable
- ✅ C'est le cas de 90% des systèmes de génération de rapports

### Utilisez la **Version PDF** si :
- ⚠️ `contenu_html` est vide pour la plupart des rapports
- ⚠️ Vous avez accès à une API d'extraction PDF
- ⚠️ Vous êtes prêt à gérer la complexité

---

## 📝 Actions à Faire Maintenant

### 1. Vérifier vos données (1 min)

```sql
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN LENGTH(contenu_html) > 100 THEN 1 END) as avec_html,
  COUNT(CASE WHEN LENGTH(resume) > 100 THEN 1 END) as avec_resume,
  COUNT(CASE WHEN pdf_url IS NOT NULL THEN 1 END) as avec_pdf
FROM rapports;
```

### 2. Choisir la version (1 min)

**Si `avec_html` > 80%** → Version Simplifiée ✅
**Si `avec_html` < 20%** → Version PDF 🔧

### 3. Installer (2 min)

```bash
# Version Simplifiée
cd supabase/functions/index-rapport
cp index-simplified.ts index.ts
supabase functions deploy index-rapport
```

### 4. Réindexer (5 min)

```bash
npx tsx scripts/index-all-rapports.ts
```

### 5. Tester (1 min)

Posez une question détaillée dans l'Assistant IA et vérifiez la qualité de la réponse.

---

## 🆘 Support

**Problème ?**

1. Vérifiez les logs :
   ```bash
   supabase functions logs index-rapport
   ```

2. Regardez la source utilisée :
   ```sql
   SELECT DISTINCT metadata->>'content_source' as source
   FROM rapport_chunks;
   ```

3. Si `source = resume` mais vous voulez `contenu_html` :
   - Vérifiez que `contenu_html` est bien rempli
   - Redéployez la version simplifiée
   - Réindexez

---

**Créé le 13 novembre 2025**
*Guide d'indexation du contenu complet des rapports*

✅ **Version Simplifiée = Recommandée pour 90% des cas**
📄 **Version PDF = Pour les cas spéciaux**
🎯 **Objectif = Indexer 100% du contenu, pas juste le résumé**
