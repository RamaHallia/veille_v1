# 📚 Guide : Historique des veilles avec résumés IA

## ✅ Ce qui a été créé

### 1. **Nouveau composant VeilleHistory.tsx**
- Affiche l'historique complet des rapports de veille
- Design moderne avec cards (comme votre image de référence)
- Chaque rapport affiche :
  - Titre ("Veille du jour", "Veille d'hier", "Veille il y a X jours")
  - Date exacte
  - Nombre d'articles
  - Mots-clés (tags)
  - **Résumé généré par IA** (court et percutant)
  - Boutons de téléchargement PDF et Audio

### 2. **Edge Function generate-summary**
- Utilise OpenAI GPT-4.1 (gpt-4-turbo-preview)
- Génère automatiquement des résumés courts (2-3 phrases max)
- Se connecte à Supabase Storage pour lire les PDFs
- Sauvegarde les résumés dans la table rapports

### 3. **Migration SQL**
- Ajoute la colonne `resume` dans la table `rapports`
- Index pour recherche rapide

### 4. **Intégration dans le Dashboard**
- Layout 2/3 + 1/3 (Historique + Stats)
- Stats rapides affichées à droite
- Design responsive

---

## 🚀 Déploiement

### **Étape 1 : Exécuter la migration SQL**

Dans **Supabase SQL Editor**, exécutez :

```sql
-- Ajouter la colonne resume
ALTER TABLE rapports
ADD COLUMN IF NOT EXISTS resume text NULL;

-- Index pour recherche
CREATE INDEX IF NOT EXISTS idx_rapports_resume
ON rapports USING gin(to_tsvector('french', resume));

-- Commentaire
COMMENT ON COLUMN rapports.resume IS 'Résumé généré automatiquement par IA (GPT-4) du contenu du rapport';
```

---

### **Étape 2 : Configurer l'API Key OpenAI**

1. Allez sur **Supabase Dashboard** → **Project Settings** → **Edge Functions**
2. Ajoutez un **Secret** :
   - Name: `OPENAI_API_KEY`
   - Value: `sk-...` (votre clé API OpenAI)

**Comment obtenir une clé OpenAI :**
1. Allez sur https://platform.openai.com/api-keys
2. Créez une nouvelle clé API
3. Copiez-la (elle ne sera affichée qu'une fois !)

---

### **Étape 3 : Déployer l'Edge Function**

Dans votre terminal :

```bash
# Se connecter à Supabase
npx supabase login

# Lier le projet (si pas déjà fait)
npx supabase link --project-ref VOTRE_PROJECT_REF

# Déployer la fonction
npx supabase functions deploy generate-summary
```

**Vérifier le déploiement :**
```bash
# Tester la fonction
curl -i --location --request POST 'https://VOTRE_PROJECT_REF.supabase.co/functions/v1/generate-summary' \
  --header 'Authorization: Bearer VOTRE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"rapport_id":"UUID_DUN_RAPPORT"}'
```

---

### **Étape 4 : Créer le bucket Storage (si pas déjà fait)**

Si vous n'avez pas encore de bucket `rapports` :

```sql
-- Créer le bucket pour stocker les PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('rapports', 'rapports', true);

-- Politique pour permettre la lecture publique
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'rapports');

-- Politique pour permettre l'upload aux utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rapports');
```

---

## 🧪 Test complet

### Test 1 : Vérifier l'affichage

1. Lancez l'application : `npm run dev`
2. Allez sur le **Dashboard**
3. Vous devriez voir :
   - Votre configuration (secteur, mots-clés, etc.) en haut
   - **Historique des veilles** à gauche (2/3 de largeur)
   - **Statistiques** à droite (1/3 de largeur)

---

### Test 2 : Créer un rapport de test (manuel)

Si vous n'avez pas encore de rapports, créez-en un pour tester :

```sql
-- Récupérer votre client_id
SELECT id FROM clients WHERE user_id = 'VOTRE_USER_ID';

-- Insérer un rapport de test
INSERT INTO rapports (
  client_id,
  titre,
  type_rapport,
  nb_sources,
  mots_cles,
  secteur,
  statut
) VALUES (
  'VOTRE_CLIENT_ID',
  'Rapport de veille IA - Test',
  'quotidien',
  5,
  ARRAY['IA', 'OpenAI', 'GPT-4'],
  'Intelligence Artificielle',
  'genere'
);
```

---

### Test 3 : Générer un résumé avec IA

1. Dans le **Dashboard**, trouvez un rapport sans résumé
2. Cliquez sur **"Générer avec IA"**
3. Attendez quelques secondes (animation de chargement)
4. Le résumé s'affiche automatiquement

**Exemple de résumé généré :**
> "Ce rapport analyse les dernières avancées en IA avec un focus sur GPT-4 et ses applications. 5 sources ont été analysées pour identifier les tendances clés du secteur."

---

## 📊 Fonctionnalités

### Génération automatique de résumés
- ✅ Bouton "Générer avec IA" pour chaque rapport sans résumé
- ✅ Résumés courts et percutants (2-3 phrases max)
- ✅ Génération en 2-5 secondes
- ✅ Sauvegarde automatique dans la base

### Affichage intelligent des dates
- **Aujourd'hui** → "Veille du jour"
- **Hier** → "Veille d'hier"
- **< 7 jours** → "Veille il y a X jours"
- **> 7 jours** → Date complète

### Téléchargements
- ✅ Télécharger PDF (si disponible)
- ✅ Écouter Audio (si disponible)

### Design responsive
- ✅ Layout adaptatif (desktop / mobile)
- ✅ Cards avec hover effects
- ✅ Tags colorés par type de rapport

---

## 🔧 Personnalisation

### Modifier le prompt de génération

Éditez `supabase/functions/generate-summary/index.ts` ligne 57 :

```typescript
const prompt = `Tu es un assistant qui génère des résumés concis...

PERSONNALISATION :
- Nombre de phrases : 2-3 (modifiable)
- Limite de caractères : 150 (modifiable)
- Ton : Professionnel, informatif
- Style : Court et percutant
`
```

---

### Changer le modèle OpenAI

Ligne 76 de `generate-summary/index.ts` :

```typescript
model: 'gpt-4-turbo-preview', // GPT-4.1
// Alternatives :
// 'gpt-4' - GPT-4 classique (plus lent)
// 'gpt-3.5-turbo' - Plus rapide mais moins précis
```

---

### Modifier le nombre de rapports affichés

Dans `VeilleHistory.tsx` ligne 44, changez `.limit()` :

```typescript
.order('date_generation', { ascending: false })
.limit(20); // Afficher les 20 derniers au lieu de tous
```

---

## 🐛 Troubleshooting

### Problème 1 : "Erreur lors de la génération du résumé"

**Causes possibles :**
1. Clé API OpenAI non configurée
2. Clé API invalide ou expirée
3. Quota OpenAI dépassé

**Solution :**
```bash
# Vérifier les secrets
npx supabase secrets list

# Définir/Mettre à jour la clé
npx supabase secrets set OPENAI_API_KEY=sk-...
```

---

### Problème 2 : Résumés ne s'affichent pas

**Vérification SQL :**
```sql
-- Vérifier que la colonne existe
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'rapports' AND column_name = 'resume';

-- Vérifier les résumés existants
SELECT id, titre, resume
FROM rapports
WHERE resume IS NOT NULL;
```

---

### Problème 3 : Edge Function ne se déploie pas

**Erreur commune :**
```
Error: Failed to deploy function
```

**Solutions :**
1. Vérifier que Deno est installé : `deno --version`
2. Vérifier la connexion Supabase : `npx supabase projects list`
3. Vérifier le lien projet : `npx supabase status`

---

## 📈 Améliorations futures possibles

1. **Génération automatique** : Trigger qui génère le résumé dès qu'un rapport est créé
2. **Résumés multilingues** : Adapter selon la langue de l'utilisateur
3. **Résumés vocaux** : Générer aussi un résumé audio court
4. **Filtres** : Filtrer par date, type, mots-clés
5. **Recherche** : Rechercher dans les résumés avec full-text search
6. **Pagination** : Afficher par pages si beaucoup de rapports
7. **Export** : Exporter l'historique en CSV/Excel

---

## ✅ Checklist de déploiement

- [ ] Migration SQL exécutée (colonne `resume` ajoutée)
- [ ] Clé API OpenAI configurée dans Supabase Secrets
- [ ] Edge Function déployée (`generate-summary`)
- [ ] Bucket Storage `rapports` créé (si nécessaire)
- [ ] Test d'affichage de l'historique
- [ ] Test de génération de résumé avec IA
- [ ] Vérification des téléchargements PDF/Audio

---

**Tout est prêt !** 🎉

Le nouveau Dashboard affiche maintenant l'historique complet des veilles avec génération automatique de résumés par IA.
