# 📄 Guide : Extraction du Texte depuis PDF

## 🎯 Solution Créée

J'ai créé une Edge Function qui **extrait vraiment le texte du PDF** avec 3 stratégies :

1. **Priorité 1** : Extraction via PDF.co API (gratuit jusqu'à 300 requêtes/mois) ✅
2. **Priorité 2** : Fallback sur `contenu_html` si PDF échoue
3. **Priorité 3** : Fallback sur `resume` en dernier recours

---

## 🚀 Configuration (5 minutes)

### Étape 1 : Obtenir une clé API PDF.co (GRATUIT)

1. Allez sur https://pdf.co/
2. Cliquez **Sign Up** (inscription gratuite)
3. Confirmez votre email
4. Allez dans **API** → **API Keys**
5. Copiez votre clé API (commence par `badrt...`)

**Plan gratuit :**
- ✅ 300 requêtes/mois gratuites
- ✅ Pas de carte bancaire requise
- ✅ Largement suffisant pour 84 rapports !

---

### Étape 2 : Configurer la clé dans Supabase

```bash
# Configurer le secret
supabase secrets set PDF_CO_API_KEY=...votre-clé-pdf.co...
```

Ou via Dashboard :
1. **Supabase Dashboard** → **Project Settings** → **Edge Functions**
2. Cliquez **Add Secret**
3. Name: `PDF_CO_API_KEY`
4. Value: Votre clé PDF.co
5. Save

---

### Étape 3 : Déployer l'Edge Function

```bash
# La fonction a déjà été mise à jour
supabase functions deploy index-rapport
```

---

### Étape 4 : Tester l'Extraction

```bash
# Lancer le script d'indexation (corrigé)
npx tsx scripts/index-all-rapports.ts
```

**Résultat attendu :**

```
🚀 Indexation automatique des rapports

📊 Récupération des rapports...
📋 84 rapports à indexer

📄 84 rapports avec PDF       ← Vos PDFs !
📝 0 rapports avec contenu HTML
📋 84 rapports avec résumé
✅ 84 rapports prêts à indexer

🔄 Indexation en cours...

📦 Batch 1/17 (5 rapports)
  [1/84] Rapport de veille - IA... ✅ (18 chunks) [pdf]  ← Extrait du PDF !
  [2/84] Rapport de veille - IA... ✅ (15 chunks) [pdf]
  ...

📊 RÉSUMÉ
✅ Rapports indexés : 84/84
📚 Chunks créés     : 1500+  ← Beaucoup plus qu'avant !
Source : PDF (100%)
```

✅ **Si vous voyez `[pdf]` → C'EST BON ! Le texte est extrait du PDF réel !**

---

## 🔍 Comment ça marche ?

### Flux d'extraction

```
1. Rapport a un pdf_url ?
   ↓ OUI
2. Appel à PDF.co API avec l'URL du PDF
   ↓
3. PDF.co télécharge, extrait le texte, retourne le texte
   ↓
4. On découpe le texte en chunks
   ↓
5. On crée les embeddings OpenAI
   ↓
6. On stocke dans rapport_chunks
```

### Exemple de code (déjà dans la fonction)

```typescript
// Appel à PDF.co
const response = await fetch('https://api.pdf.co/v1/pdf/convert/to/text', {
  method: 'POST',
  headers: {
    'x-api-key': pdfCoApiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: pdfUrl,        // URL publique du PDF
    inline: true,       // Retourner le texte directement
    pages: ''           // Toutes les pages
  })
});

const result = await response.json();
const extractedText = result.body;  // Le texte extrait !
```

---

## 💰 Coûts

| Service | Coût |
|---------|------|
| **PDF.co** | Gratuit (300 req/mois) |
| **OpenAI Embeddings** | ~0.05$ pour 84 rapports |
| **Total** | ~0.05$ |

**Comparaison :**
- Avant (resume seulement) : 300 chunks, 15$/mois (requêtes IA)
- Après (PDF complet) : 1500+ chunks, 15$/mois (requêtes IA)
- **Même coût, 5x plus de contenu !** 🚀

---

## 🧪 Vérification

### Test 1 : Vérifier la source dans les logs

```bash
# Voir les logs de la dernière indexation
supabase functions logs index-rapport --tail 50
```

Vous devriez voir :
```
📄 Priorité 1: Extraction du PDF...
✅ Texte extrait: 12345 caractères
✅ PDF extrait: 12345 caractères
```

### Test 2 : Vérifier dans la base

```sql
-- Dans Supabase SQL Editor
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
| Rapport... | 18 | 1850 | **pdf** ← Parfait ! |
| Rapport... | 15 | 1920 | **pdf** |

**Si source = pdf** → ✅ **PARFAIT ! Le texte vient du PDF réel !**

### Test 3 : Tester dans l'Assistant IA

Posez une question **très spécifique** qui nécessite le contenu complet :

```
"Donne-moi tous les chiffres et statistiques
mentionnés dans le rapport du 13 novembre"
```

**Avant (avec resume) :**
```
Le rapport mentionne quelques chiffres. [vague]
```

**Après (avec PDF complet) :**
```
Le rapport du 13 novembre contient les statistiques suivantes :

1. OpenAI : +150M d'utilisateurs actifs (+25% vs Q3)
2. Investissements IA : $50.3B en 2024 (+35% YoY)
3. GPU : Prix -18% grâce à la concurrence AMD/NVIDIA
4. Adoption entreprise : 67% des entreprises utilisent l'IA (+12 points)
...

[Détaillé avec toutes les stats du PDF]
```

---

## 🆘 Troubleshooting

### Problème : "PDF_CO_API_KEY non configurée"

**Solution :**

```bash
# Vérifier
supabase secrets list

# Si vide, configurer
supabase secrets set PDF_CO_API_KEY=...votre-clé...

# Redéployer
supabase functions deploy index-rapport
```

---

### Problème : "PDF.co API error: 403"

**Cause :** Clé API invalide ou quota dépassé

**Solution :**
1. Vérifiez votre clé sur https://pdf.co/account/api
2. Vérifiez le quota : https://pdf.co/account/usage
3. Si quota dépassé (> 300/mois) : Attendez le mois prochain ou passez au plan payant

---

### Problème : "Unable to extract text from PDF"

**Cause :** L'extraction basique (fallback) a échoué

**Solution :**
1. Vérifiez que le PDF est accessible publiquement
2. Testez le lien dans un navigateur
3. Si le PDF nécessite une authentification, il faut le rendre public
4. Vérifiez que le PDF n'est pas corrompu

---

### Problème : Source = contenu_html ou resume au lieu de pdf

**Cause :** Le PDF n'a pas pu être extrait, fallback utilisé

**Solutions :**
1. Vérifiez que `pdf_url` est rempli :
   ```sql
   SELECT id, titre, pdf_url FROM rapports WHERE pdf_url IS NULL;
   ```

2. Vérifiez que le PDF est accessible :
   ```bash
   # Testez une URL
   curl -I https://...votre-pdf-url...
   # Doit retourner 200 OK
   ```

3. Regardez les logs pour voir l'erreur exacte :
   ```bash
   supabase functions logs index-rapport
   ```

---

## 📊 Stratégie Intelligente

L'Edge Function essaie dans cet ordre :

1. **PDF** (si `pdf_url` existe)
   - ✅ Contenu complet
   - ✅ Qualité maximale
   - ⚠️ Nécessite PDF.co

2. **HTML** (si PDF échoue)
   - ✅ Contenu complet
   - ✅ Rapide
   - ⚠️ Si `contenu_html` est rempli

3. **Résumé** (en dernier recours)
   - ⚠️ Contenu partiel (10-20%)
   - ✅ Toujours disponible

**Résultat :** Vous indexez toujours le maximum de contenu disponible !

---

## 🎯 Commandes Rapides

```bash
# 1. Configurer PDF.co
supabase secrets set PDF_CO_API_KEY=...

# 2. Déployer
supabase functions deploy index-rapport

# 3. Indexer tous les rapports
npx tsx scripts/index-all-rapports.ts

# 4. Vérifier
npx tsx scripts/check-rag-status.ts
```

---

## ✅ Checklist

- [ ] Compte PDF.co créé (gratuit)
- [ ] Clé API PDF.co obtenue
- [ ] Secret configuré dans Supabase
- [ ] Edge Function déployée
- [ ] Script d'indexation lancé
- [ ] Vérification : source = "pdf" dans les logs
- [ ] Test dans l'Assistant IA → Réponses détaillées

---

## 📈 Résultat Attendu

**Avant (sans extraction PDF) :**
- 84 rapports
- ~300 chunks (resume seulement)
- Réponses vagues et partielles

**Après (avec extraction PDF) :**
- 84 rapports
- **~1500+ chunks** (PDF complet !) 🚀
- Réponses **détaillées et précises**
- **5x plus de contenu indexé !**

---

**Créé le 13 novembre 2025**
*Guide d'extraction du texte des PDF avec PDF.co*

✅ **PDF.co = Gratuit et fiable**
📄 **Extraction complète du PDF**
🎯 **5x plus de contenu pour l'IA**
