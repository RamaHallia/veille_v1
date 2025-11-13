# 🗑️ Guide : Bouton "Effacer les messages"

## ✅ Fonctionnalité ajoutée

### Bouton "Effacer les messages" dans le chat
- 🔴 Bouton rouge avec icône corbeille (Trash2)
- ⚠️ Confirmation avant suppression
- ♻️ Permet de recommencer la configuration depuis le début

---

## 🎯 À quoi ça sert ?

Ce bouton permet au client de **recommencer complètement sa configuration** avec le chatbot si :
- Il a fait des erreurs dans sa configuration
- Il veut changer radicalement ses paramètres
- Il veut tester le processus d'onboarding à nouveau

---

## 🎨 Interface

### Position du bouton
```
┌────────────────────────────────────────────────────────────┐
│  🔔 VEILLE IA    [Tableau de bord] [🗑️ Effacer les messages] [👤] [Déconnexion] │
└────────────────────────────────────────────────────────────┘
```

### Design
- **Couleur** : Rouge (`text-red-600`)
- **Hover** : Fond rouge clair (`hover:bg-red-50`)
- **Icône** : Corbeille (Trash2)
- **Tooltip** : "Effacer tous les messages et recommencer la configuration"

---

## ⚙️ Fonctionnement

### Étapes de suppression

1. **Clic sur le bouton** → Affiche une confirmation
2. **Confirmation** → L'utilisateur doit confirmer
3. **Suppression en cascade** :
   - Suppression de tous les messages (`conversation_history`)
   - Suppression de la conversation (`conversations`)
   - Réinitialisation du statut d'onboarding (`status_onboarding: 'en_cours'`)
4. **Rechargement** → Nouvelle conversation vide créée
5. **Résultat** → L'utilisateur peut recommencer depuis l'étape 1

---

## 🔐 Sécurité

### Confirmation obligatoire
```javascript
window.confirm(
  'Êtes-vous sûr de vouloir effacer tous les messages ?
   Cette action est irréversible et vous permettra de
   recommencer la configuration depuis le début.'
)
```

### Actions irréversibles
- ❌ Tous les messages sont supprimés définitivement
- ❌ L'historique de conversation est perdu
- ⚠️ Mais les paramètres déjà sauvegardés dans `clients` restent (sauf statut onboarding)

---

## 💾 Données affectées

### Tables modifiées

#### 1. `conversation_history`
```sql
DELETE FROM conversation_history
WHERE conversation_id = 'UUID_CONVERSATION';
```
→ Tous les messages de la conversation actuelle sont supprimés

#### 2. `conversations`
```sql
DELETE FROM conversations
WHERE id = 'UUID_CONVERSATION';
```
→ La conversation elle-même est supprimée

#### 3. `clients`
```sql
UPDATE clients
SET status_onboarding = 'en_cours'
WHERE user_id = 'UUID_USER';
```
→ Le statut d'onboarding est réinitialisé à "en_cours"

---

## 🧪 Test

### Test 1 : Suppression basique
1. Avoir une conversation avec plusieurs messages
2. Cliquer sur "Effacer les messages"
3. Confirmer
4. **Résultat attendu** :
   - Messages disparus ✅
   - Chat vide avec message de bienvenue ✅
   - L'assistant répond comme si c'était la première fois ✅

### Test 2 : Annulation
1. Cliquer sur "Effacer les messages"
2. Cliquer sur "Annuler" dans la confirmation
3. **Résultat attendu** : Rien ne se passe, messages conservés ✅

### Test 3 : Recommencer l'onboarding
1. Finir une configuration complète
2. Cliquer sur "Effacer les messages"
3. Confirmer
4. Envoyer un nouveau message
5. **Résultat attendu** :
   - L'assistant recommence depuis l'étape 1 ✅
   - Demande à nouveau le secteur, mots-clés, etc. ✅

---

## 📊 Logs de debug

### Console logs lors de l'effacement
```
🗑️ Suppression des messages...
✅ Messages effacés avec succès
🔄 Rechargement de la conversation...
```

### En cas d'erreur
```
❌ Erreur lors de l'effacement des messages: [error details]
```

---

## 🔍 Vérification dans Supabase

### Avant suppression
```sql
-- Voir les messages de l'utilisateur
SELECT * FROM conversation_history ch
JOIN conversations c ON c.id = ch.conversation_id
WHERE c.user_id = 'UUID_USER';
```

### Après suppression
```sql
-- Vérifier qu'il n'y a plus de messages
SELECT * FROM conversation_history ch
JOIN conversations c ON c.id = ch.conversation_id
WHERE c.user_id = 'UUID_USER';
-- Devrait retourner 0 lignes
```

### Vérifier le statut onboarding
```sql
SELECT status_onboarding FROM clients
WHERE user_id = 'UUID_USER';
-- Devrait être 'en_cours'
```

---

## ⚠️ Avertissements

### Ce qui est conservé
- ✅ Compte utilisateur (auth.users)
- ✅ Configuration client existante (clients) sauf status_onboarding
- ✅ Rapports déjà générés (rapports)

### Ce qui est supprimé
- ❌ Tous les messages de la conversation
- ❌ La conversation elle-même
- ❌ L'historique des échanges avec le chatbot

---

## 🚀 Améliorations futures possibles

1. **Archivage au lieu de suppression**
   - Marquer la conversation comme "archivée" au lieu de la supprimer
   - Permet de consulter l'historique plus tard

2. **Suppression sélective**
   - Permettre de supprimer uniquement certains messages
   - Pas toute la conversation

3. **Undo/Annulation**
   - Garder une sauvegarde temporaire (30 secondes)
   - Permettre de restaurer si erreur

4. **Export avant suppression**
   - Proposer d'exporter les messages avant de supprimer
   - Format JSON ou TXT

5. **Animation de suppression**
   - Effet visuel lors de la suppression
   - Messages qui disparaissent progressivement

---

## 📝 Code technique

### Fonction clearMessages
```typescript
const clearMessages = async () => {
  const confirmClear = window.confirm(
    'Êtes-vous sûr de vouloir effacer tous les messages ?
     Cette action est irréversible et vous permettra de
     recommencer la configuration depuis le début.'
  );

  if (!confirmClear) return;

  try {
    // 1. Récupérer la conversation actuelle
    const { data: conversationData } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (conversationData?.id) {
      // 2. Supprimer tous les messages
      await supabase
        .from('conversation_history')
        .delete()
        .eq('conversation_id', conversationData.id);

      // 3. Supprimer la conversation
      await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationData.id);
    }

    // 4. Réinitialiser le statut d'onboarding
    await supabase
      .from('clients')
      .update({ status_onboarding: 'en_cours' })
      .eq('user_id', user?.id);

    // 5. Nettoyer l'état local
    setMessages([]);
    setSuggestions([]);
    setTypingMessage('');
    setIsTyping(false);

    // 6. Recharger (créera une nouvelle conversation)
    await loadMessages();

    console.log('✅ Messages effacés avec succès');
  } catch (error) {
    console.error('❌ Erreur:', error);
    alert('Erreur lors de l\'effacement des messages');
  }
};
```

---

## ✅ Checklist de vérification

- [x] Bouton visible dans le header du chat
- [x] Icône corbeille (Trash2) affichée
- [x] Couleur rouge pour indiquer la suppression
- [x] Confirmation avant suppression
- [x] Suppression des messages dans `conversation_history`
- [x] Suppression de la conversation dans `conversations`
- [x] Réinitialisation du statut d'onboarding
- [x] Rechargement automatique après suppression
- [x] Messages d'erreur si échec
- [x] Logs de debug dans la console

---

## 🎉 Résultat final

Le client peut maintenant :
1. ✅ Effacer tous ses messages en un clic
2. ✅ Recommencer sa configuration depuis le début
3. ✅ Être sûr de sa décision grâce à la confirmation
4. ✅ Voir immédiatement le chat vide et prêt à recommencer

**Le bouton "Effacer les messages" est maintenant opérationnel !** 🗑️
