# 📄 Indexation RAG avec parsing de PDF

## ✅ Fonctionnalité implémentée

L'indexation RAG utilise maintenant le **contenu complet du PDF** au lieu du résumé court.

---

## 🔄 Changements apportés

### **Avant** (❌ Problème)
- ❌ Utilisait la colonne `resume` (trop court, 1 phrase)
- ❌ Pas assez de contenu pour un RAG efficace

### **Après** (✅ Solution)
- ✅ Télécharge le PDF depuis `pdf_url`
- ✅ Parse le PDF avec `pdfjs-dist`
- ✅ Extrait le texte complet de toutes les pages
- ✅ Indexe le contenu complet
- ✅ Marque le rapport comme indexé (`indexe_rag = true`)

---

## 🛠️ Technologies utilisées

### **Edge Function : index-rapport**
- **Bibliothèque PDF** : `pdfjs-dist@3.11.174` (via npm)
- **Embeddings** : OpenAI `text-embedding-3-small` (1536 dimensions)
- **Chunking** : ~500 tokens par chunk
- **Base de données** : Supabase PostgreSQL + pgvector

---

## 📋 Flux d'indexation

```
1. AutoIndexer (React)
   ↓
   Trouve les rapports non indexés (indexe_rag = false)
   ↓
   Pour chaque rapport :
   ↓
2. Edge Function index-rapport
   ↓
   Télécharge le PDF depuis pdf_url
   ↓
   Parse le PDF (pdfjs-dist)
   ↓
   Extrait le texte de toutes les pages
   ↓
   Découpe en chunks (~500 tokens)
   ↓
   Crée les embeddings (OpenAI)
   ↓
   Stocke dans rapport_chunks (pgvector)
   ↓
   Marque indexe_rag = true
   ↓
3. Résultat
   ✅ Rapport indexé et interrogeable via RAG
```

---

## 🔧 Structure de l'Edge Function

### **Fonction principale : parsePDF()**

```typescript
async function parsePDF(pdfUrl: string): Promise<string> {
  // 1. Télécharger le PDF
  const response = await fetch(pdfUrl);
  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // 2. Parser avec pdfjs-dist
  const loadingTask = getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;

  // 3. Extraire le texte de chaque page
  let fullText = '';
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
}
```

### **Logs de progression**

```
📋 Indexing rapport: xxx
📄 PDF URL: https://...
📥 Downloading PDF from: https://...
📄 PDF downloaded, size: 123456 bytes
📖 PDF loaded, 5 pages
✅ Extracted 12345 characters from PDF
📄 Extracted text length: 12345 characters
✂️ Created 25 chunks
🔄 Creating embeddings...
  Creating embedding 1/25
  Creating embedding 2/25
  ...
✅ All embeddings created
✅ Successfully indexed 25 chunks for rapport xxx
```

---

## 🎯 Avantages

### **Pour la recherche RAG**
- ✅ **Contexte complet** : Tout le contenu du rapport est indexé
- ✅ **Précision** : Réponses basées sur le vrai contenu, pas un résumé
- ✅ **Richesse** : Plus de chunks = meilleure couverture sémantique
- ✅ **Citations** : Peut citer des passages exacts du PDF

### **Pour l'utilisateur**
- ✅ **Automatique** : Pas d'action manuelle requise
- ✅ **Transparent** : Fonctionne en arrière-plan
- ✅ **Fiable** : Flag `indexe_rag` évite les doublons
- ✅ **Performant** : Chunking optimisé pour la recherche

---

## 📊 Base de données

### **Table : rapports**

Colonnes utilisées :
- `id` → UUID du rapport
- `pdf_url` → URL du PDF à parser
- `indexe_rag` → `true` si déjà indexé (évite doublons)
- `date_indexation` → Timestamp de l'indexation
- `titre`, `date_generation`, `client_id` → Métadonnées

### **Table : rapport_chunks**

Structure :
```sql
{
  id: UUID,
  rapport_id: UUID (foreign key),
  client_id: UUID (foreign key),
  chunk_text: TEXT,           -- Texte extrait du PDF
  chunk_index: INTEGER,        -- Position dans le document
  embedding: VECTOR(1536),     -- Embedding OpenAI
  metadata: JSONB {            -- Métadonnées
    titre: string,
    date_generation: timestamp,
    secteur: string
  },
  created_at: TIMESTAMP
}
```

---

## 🚀 Déploiement

### **1. Déployer l'Edge Function**

```bash
cd c:\Users\tech\OneDrive\Desktop\projet-veille\veille-ia
npx supabase functions deploy index-rapport
```

Ou utilisez le script :
```bash
deploy.bat
```

### **2. Vérifier le déploiement**

Dans **Supabase Dashboard** → **Edge Functions** → `index-rapport` :
- ✅ Statut : Actif
- ✅ Dernière mise à jour : Aujourd'hui

### **3. Tester manuellement**

Dans l'onglet **Invoke** :
```json
{
  "rapport_id": "UUID_D_UN_RAPPORT_AVEC_PDF"
}
```

Vérifier les logs :
```
📋 Indexing rapport: xxx
📥 Downloading PDF from: https://...
📖 PDF loaded, X pages
✅ Extracted Y characters from PDF
✂️ Created Z chunks
✅ All embeddings created
✅ Successfully indexed Z chunks
```

---

## 🧪 Test complet

### **1. Rafraîchir l'application React**

```
F5 (ou Ctrl+R)
```

### **2. Vérifier la console**

```
🔍 Vérification des rapports non indexés...
📊 18 rapports trouvés
🚀 18 rapports à indexer automatiquement
  📄 Indexation: Rapport de veille - xxx
  ✅ Indexé
  ...
═══════════════════════════════════════
✅ Auto-indexation terminée
   Succès: 18
   Erreurs: 0
═══════════════════════════════════════
```

### **3. Vérifier dans Supabase**

```sql
-- Nombre de chunks créés
SELECT COUNT(*) FROM rapport_chunks;

-- Nombre de rapports indexés
SELECT COUNT(*) FROM rapports WHERE indexe_rag = true;

-- Détails par rapport
SELECT
  r.titre,
  r.date_generation,
  COUNT(rc.id) as nb_chunks,
  r.indexe_rag,
  r.date_indexation
FROM rapports r
LEFT JOIN rapport_chunks rc ON rc.rapport_id = r.id
GROUP BY r.id, r.titre, r.date_generation, r.indexe_rag, r.date_indexation
ORDER BY r.date_generation DESC;
```

**Résultat attendu** :
- Chaque rapport avec PDF doit avoir plusieurs chunks (5-50 selon la longueur)
- `indexe_rag = true` pour tous les rapports indexés
- `date_indexation` renseigné

---

## ⚠️ Gestion des erreurs

### **PDF non accessible**
```
Error: Failed to download PDF: 403 Forbidden
```
→ Vérifier que `pdf_url` est publiquement accessible

### **PDF corrompu**
```
Error: Failed to parse PDF: Invalid PDF structure
```
→ Le PDF est invalide ou corrompu

### **Pas de texte dans le PDF**
```
PDF has no text content
```
→ Le PDF est une image scannée sans OCR

### **OpenAI API error**
```
OpenAI API error: Unauthorized
```
→ Vérifier la clé API : `supabase secrets list`

---

## 🎉 Résultat final

Une fois déployé et testé, vous aurez :

✅ **18 rapports indexés** avec leur contenu PDF complet
✅ **Centaines de chunks** stockés dans `rapport_chunks`
✅ **Recherche sémantique** via embeddings OpenAI
✅ **Assistant RAG** prêt à répondre aux questions sur vos rapports
✅ **Indexation automatique** pour les nouveaux rapports (via trigger PostgreSQL)

🎯 **Votre système RAG est maintenant opérationnel !**
