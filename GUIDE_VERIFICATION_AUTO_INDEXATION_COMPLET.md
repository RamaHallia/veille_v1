# 🔍 Guide : Vérification Automatique à la Connexion

## 🎯 Objectif

À **chaque connexion**, vérifier si tous les rapports du client sont indexés et indexer automatiquement ceux qui manquent.

**Idéal pour** :
- ✅ Gérer les anciens rapports non indexés
- ✅ Rattraper l'indexation après une panne
- ✅ S'assurer que tout est toujours à jour
- ✅ Afficher une barre de progression visuelle

---

## ✅ Bonne Nouvelle !

Votre application a **déjà** un composant `AutoIndexer.tsx` qui fait exactement ça ! 🎉

**Ce qu'il fait** :
- Vérifie au démarrage si tous les rapports sont indexés
- Indexe automatiquement ceux qui manquent
- Fonctionne en arrière-plan (invisible)

**Ce qui a été ajouté** :
- ✅ Hook `useAutoIndexation` (logique améliorée)
- ✅ Composant `IndexationStatus` (indicateur visuel)
- ✅ Fonctions SQL optimisées (plus rapide)

---

## 🚀 Installation (5 minutes)

### Étape 1 : Installer les Fonctions SQL (Optionnel - 3 min)

Les fonctions SQL permettent de vérifier plus efficacement les rapports non indexés.

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
```

---

### Étape 2 : Composant Visuel (Déjà fait ! ✅)

J'ai **déjà ajouté** le composant `IndexationStatus` dans votre `MainApp.tsx` !

**Ce qui a été ajouté** (ligne 8 et 30) :
```typescript
import { IndexationStatus } from './IndexationStatus';

return (
  <>
    <AutoIndexer />
    <IndexationStatus />  // ← Nouveau !
    {renderView()}
  </>
);
```

---

## 📊 Résultat Visuel

### Pendant la Vérification

```
┌───────────────────────────────────────┐
│ 🔄 Vérification de l'indexation...   │
│ Analyse de vos rapports en cours     │
└───────────────────────────────────────┘
```

### Rapports Non Indexés Détectés

```
┌───────────────────────────────────────┐
│ ⚠️ Rapports non indexés détectés      │
│ 34 rapports en attente d'indexation  │
│                                       │
│ Total rapports: 84                    │
│ Indexés: 50                           │
│ Progression: 59.5%                    │
│                                       │
│ [Indexer maintenant]                  │
└───────────────────────────────────────┘
```

### Pendant l'Indexation

```
┌───────────────────────────────────────┐
│ 🚀 Indexation en cours...             │
│ 34 rapports en cours d'indexation    │
│                                       │
│ Progression                           │
│ ████████░░░░░░░░░░░░░░ 65%           │
│                                       │
│ Cette opération peut prendre          │
│ quelques minutes                      │
└───────────────────────────────────────┘
```

### Indexation Terminée

```
┌───────────────────────────────────────┐
│ ✅ Indexation à jour                  │
│ 84 rapports indexés • 1500 chunks    │
└───────────────────────────────────────┘
```

---

## 🔍 Comment ça Marche ?

### 1. Au Chargement de l'Application

```
User se connecte
  ↓
MainApp.tsx charge
  ↓
<AutoIndexer /> se lance (invisible)
  ↓
Vérifie les rapports non indexés
  ↓
Si rapports manquants → Indexe automatiquement
  ↓
<IndexationStatus /> affiche la progression
```

### 2. Logique d'Indexation

```typescript
// 1. Récupérer le client
const client = await getClientByUserId(user.id);

// 2. Récupérer les rapports non indexés
const nonIndexed = await getRapportsNonIndexes(client.id);

// 3. Indexer chaque rapport
for (const rapport of nonIndexed) {
  await supabase.functions.invoke('index-rapport', {
    body: { rapport_id: rapport.id }
  });
}

// 4. Mise à jour du statut en temps réel
// L'indicateur visuel se met à jour automatiquement
```

---

## 🆘 Troubleshooting

### "Aucun rapport trouvé"

**Cause** : Tous les rapports sont déjà indexés

**Action** : Normal ! C'est le comportement attendu.

---

### "Erreur lors de l'indexation"

**Causes possibles** :
1. Edge Function pas déployée
2. Clé OpenAI manquante
3. Rapports sans contenu

**Solutions** :

```bash
# 1. Vérifier les Edge Functions
supabase functions list

# 2. Vérifier les secrets
supabase secrets list

# 3. Voir les logs
supabase functions logs index-rapport
```

---

### Barre de progression bloquée

**Cause** : L'indexation prend du temps

**Action** :
1. Attendez 2-3 minutes
2. Regardez les logs de la console (F12)
3. Rafraîchissez la page si besoin

---

## 📊 Statistiques

### Avant (Sans Vérification Auto)

- ❌ Rapports anciens jamais indexés
- ❌ Aucune visibilité sur l'indexation
- ❌ Utilisateur ne sait pas si ça marche
- ❌ Assistant IA incomplet

### Après (Avec Vérification Auto)

- ✅ **Tous les rapports indexés automatiquement**
- ✅ **Progression visible en temps réel**
- ✅ **Utilisateur informé**
- ✅ **Assistant IA complet**

---

## 🎯 Commandes Utiles

### Vérifier Manuellement

```sql
-- Dans Supabase SQL Editor
-- Voir les rapports non indexés
SELECT COUNT(*)
FROM rapports
WHERE (indexe_rag IS NULL OR indexe_rag = false)
  AND (contenu_html IS NOT NULL OR resume IS NOT NULL);
```

### Forcer Réindexation

```sql
-- Réinitialiser tous les rapports
UPDATE rapports SET indexe_rag = false;

-- Puis rafraîchir l'app
-- L'AutoIndexer va tout réindexer
```

### Voir les Logs Frontend

```javascript
// Dans la console du navigateur (F12)
// Filtrer par "Indexation" ou "🚀"
```

---

## ✅ Checklist

- [ ] Composant `AutoIndexer.tsx` existe (déjà fait ✅)
- [ ] Composant `IndexationStatus` ajouté dans `MainApp.tsx` (déjà fait ✅)
- [ ] Hook `useAutoIndexation.ts` créé (fichier disponible)
- [ ] Fonctions SQL installées (optionnel mais recommandé)
- [ ] Test : Se connecter → Voir l'indicateur
- [ ] Test : Créer un nouveau rapport → Voir l'indexation auto
- [ ] Logs dans la console affichent la progression

---

## 🎉 Résultat Final

**Expérience Utilisateur** :

1. **User se connecte**
   ```
   🔄 Vérification de l'indexation...
   ```

2. **Si rapports manquants** (première connexion)
   ```
   ⚠️ 84 rapports non indexés détectés
   [Indexation automatique démarre]

   🚀 Indexation en cours...
   ████████░░░░░░░░░░░░░░ 65%
   ```

3. **Après 2-3 minutes**
   ```
   ✅ Indexation à jour
   84 rapports indexés • 1500 chunks
   [Message disparaît après 5 secondes]
   ```

4. **Connexions suivantes**
   ```
   🔄 Vérification... ✅ Tout est OK
   [Rien ne s'affiche, tout est à jour]
   ```

---

## 💡 Améliorations Futures (Optionnel)

### 1. Notification Email

Envoyer un email quand l'indexation est terminée :

```typescript
// Dans AutoIndexer.tsx après succès
await sendEmail({
  to: user.email,
  subject: 'Indexation terminée',
  body: `${successCount} rapports indexés avec succès`
});
```

### 2. Statistiques dans le Dashboard

Afficher les statistiques d'indexation :

```tsx
<div className="card">
  <h3>Indexation RAG</h3>
  <p>{rapportsIndexes} / {totalRapports} rapports</p>
  <p>{totalChunks} chunks</p>
  <ProgressBar value={pourcentage} />
</div>
```

### 3. Bouton Manuel

Ajouter un bouton pour forcer la réindexation :

```tsx
<button onClick={manualReindex}>
  🔄 Réindexer tous les rapports
</button>
```

---

## 📚 Fichiers Créés

| Fichier | Description |
|---------|-------------|
| **src/hooks/useAutoIndexation.ts** | Hook pour la logique d'indexation |
| **src/components/IndexationStatus.tsx** | Indicateur visuel de progression |
| **supabase/migrations/fonction_verifier_indexation_client.sql** | Fonctions SQL optimisées |
| **GUIDE_VERIFICATION_AUTO_INDEXATION_COMPLET.md** | Ce guide |

---

## 🚀 Prochaines Étapes

1. **Tester** : Connectez-vous et voyez l'indicateur
2. **Vérifier** : Ouvrez la console (F12) pour voir les logs
3. **Utiliser** : Allez dans l'Assistant IA et posez des questions

---

**Créé le 13 novembre 2025**
*Guide complet de vérification automatique à la connexion*

✅ **Déjà intégré dans votre app**
🚀 **Fonctionne automatiquement**
📊 **Progression visible en temps réel**
