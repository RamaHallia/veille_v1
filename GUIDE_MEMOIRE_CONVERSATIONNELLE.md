# 💬 Guide : Mémoire Conversationnelle

## 🎯 Objectif

Permettre à l'Assistant IA de **se souvenir** des échanges précédents pour répondre aux clarifications et questions de suivi.

**Exemples d'usage** :
```
User: "Quelles sont les dernières tendances dans mon secteur ?"
IA: "Voici les tendances : IA générative, blockchain, IoT..."

User: "Peux-tu détailler la partie sur l'IA générative ?"
IA: "Bien sûr ! L'IA générative dont je parlais inclut..." ✅ Se souvient !
```

---

## ✅ Ce qui a été ajouté

### 1. Base de Données

**Nouvelles tables** :
- `conversations` → Sessions de chat
- `messages` → Historique des messages (user + assistant)

**Fonctions SQL** :
- `create_conversation()` → Créer une nouvelle conversation
- `add_message()` → Ajouter un message
- `get_conversation_history()` → Récupérer l'historique
- `list_user_conversations()` → Lister les conversations

### 2. Edge Function Améliorée

**Fichier** : `supabase/functions/rag-query/index.ts`

**Nouvelles fonctionnalités** :
- ✅ Accepte `conversation_id` (optionnel)
- ✅ Récupère l'historique automatiquement
- ✅ Inclut l'historique dans le prompt GPT
- ✅ Sauvegarde question + réponse
- ✅ Retourne `conversation_id` pour continuer

---

## 🚀 Installation (5 minutes)

### Étape 1 : Installer les Tables SQL (2 min)

```bash
# Dans Supabase Dashboard → SQL Editor
# Copiez-collez : add_conversation_memory.sql
# Cliquez "Run"
```

**Résultat attendu** :
```
✅ CREATE TABLE conversations
✅ CREATE TABLE messages
✅ CREATE INDEX (x5)
✅ ALTER TABLE (RLS enabled)
✅ CREATE POLICY (x6)
✅ CREATE FUNCTION (x4)
```

---

### Étape 2 : Déployer l'Edge Function (2 min)

```bash
# Dans votre terminal
cd C:\Users\tech\OneDrive\Desktop\projet-veille\veille-ia
supabase functions deploy rag-query
```

**Résultat attendu** :
```
Deploying rag-query (project ref: xxx)
✅ Deployed function rag-query
```

---

### Étape 3 : Tester (1 min)

```bash
# Lancer l'app
npm run dev

# Tester dans l'Assistant IA :
# 1. "Quelles sont les dernières tendances ?"
# 2. "Peux-tu détailler la première tendance ?"
# 3. "Donne-moi plus d'exemples"
```

---

## 📊 Architecture

### Flux de Conversation

```
┌─────────────────────────────────────────┐
│         User envoie message             │
│  Question: "Quelles sont les tendances?"│
│  conversation_id: null (première fois)  │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│         Edge Function rag-query         │
│                                         │
│  1. conversation_id existe ?            │
│     Non → Créer nouvelle conversation   │
│     Oui → Récupérer historique          │
│                                         │
│  2. Chercher chunks pertinents          │
│     (comme avant)                       │
│                                         │
│  3. Construire prompt GPT:              │
│     - System prompt                     │
│     - Historique (si existe)            │
│     - Contexte (chunks)                 │
│     - Question actuelle                 │
│                                         │
│  4. Générer réponse GPT-4o-mini         │
│                                         │
│  5. Sauvegarder dans DB:                │
│     - Question (role: user)             │
│     - Réponse (role: assistant)         │
│                                         │
│  6. Retourner:                          │
│     - answer                            │
│     - conversation_id                   │
│     - sources                           │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│          Frontend stocke                │
│     conversation_id dans state          │
└─────────────────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│      User envoie message suivant        │
│  Question: "Détaille la première"       │
│  conversation_id: "uuid-123"  ✅        │
└──────────────┬──────────────────────────┘
               │
               ↓ (Recommence avec l'historique)
```

---

## 🔍 Exemple Concret

### Question 1 (Nouvelle conversation)

**Request** :
```json
{
  "question": "Quelles sont les dernières tendances IA ?",
  "user_id": "user-123",
  "conversation_id": null
}
```

**Edge Function** :
1. Crée nouvelle conversation → `conversation-uuid-abc`
2. Cherche chunks pertinents → 8 chunks trouvés
3. Prompt GPT :
   ```
   System: Tu es un assistant...
   User: [Contexte: chunks] Question: Quelles sont les dernières tendances IA ?
   ```
4. Sauvegarde messages :
   - Message 1 (user): "Quelles sont les dernières tendances IA ?"
   - Message 2 (assistant): "Voici les tendances : 1. IA générative..."

**Response** :
```json
{
  "answer": "Voici les tendances : 1. IA générative...",
  "conversation_id": "conversation-uuid-abc",
  "sources": [...],
  "has_history": false
}
```

---

### Question 2 (Clarification)

**Request** :
```json
{
  "question": "Peux-tu détailler la partie sur l'IA générative ?",
  "user_id": "user-123",
  "conversation_id": "conversation-uuid-abc"  ← Même conversation
}
```

**Edge Function** :
1. Récupère historique :
   - Message 1 (user): "Quelles sont les dernières tendances IA ?"
   - Message 2 (assistant): "Voici les tendances : 1. IA générative..."
2. Cherche nouveaux chunks pertinents
3. Prompt GPT :
   ```
   System: Tu es un assistant...
   User: Quelles sont les dernières tendances IA ?
   Assistant: Voici les tendances : 1. IA générative...
   User: [Contexte: chunks] Question: Peux-tu détailler la partie sur l'IA générative ?
   ```
4. GPT comprend le contexte grâce à l'historique ✅

**Response** :
```json
{
  "answer": "Bien sûr ! L'IA générative dont je parlais inclut...",
  "conversation_id": "conversation-uuid-abc",
  "sources": [...],
  "has_history": true  ← Indique qu'il y avait de l'historique
}
```

---

## 📝 Structure de la Base de Données

### Table `conversations`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | ID unique de la conversation |
| `user_id` | UUID | ID de l'utilisateur (auth.users) |
| `client_id` | UUID | ID du client |
| `titre` | TEXT | Titre généré automatiquement |
| `dernier_message_at` | TIMESTAMPTZ | Date du dernier message |
| `created_at` | TIMESTAMPTZ | Date de création |
| `updated_at` | TIMESTAMPTZ | Date de mise à jour |

### Table `messages`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | ID unique du message |
| `conversation_id` | UUID | Référence à conversations |
| `role` | TEXT | 'user' ou 'assistant' |
| `content` | TEXT | Contenu du message |
| `metadata` | JSONB | Métadonnées (sources, timestamp, etc.) |
| `created_at` | TIMESTAMPTZ | Date de création |

---

## 🎨 Frontend (À Implémenter)

### Modifications Nécessaires

Votre composant `RAGChatPage` doit stocker `conversation_id` :

```typescript
const [conversationId, setConversationId] = useState<string | null>(null);

const handleSendMessage = async (question: string) => {
  const response = await supabase.functions.invoke('rag-query', {
    body: {
      question,
      user_id: user.id,
      conversation_id: conversationId  // ← Ajouter ici
    }
  });

  // Stocker le conversation_id pour les prochains messages
  if (response.data?.conversation_id) {
    setConversationId(response.data.conversation_id);
  }
};
```

### Bouton "Nouvelle Conversation"

```typescript
const handleNewConversation = () => {
  setConversationId(null);  // Reset → créera nouvelle conversation
  setMessages([]);
};
```

### Lister les Conversations Précédentes

```typescript
const loadConversations = async () => {
  const { data } = await supabase
    .rpc('list_user_conversations', {
      p_user_id: user.id,
      p_limit: 20
    });

  return data;  // Liste des conversations avec titres
};
```

---

## 🆘 Troubleshooting

### "Conversation not found"

**Cause** : conversation_id invalide ou n'appartient pas à l'utilisateur

**Solution** : Vérifier que le conversation_id existe :
```sql
SELECT * FROM conversations WHERE id = 'conversation-uuid';
```

---

### "L'IA ne se souvient pas"

**Causes possibles** :
1. conversation_id pas envoyé
2. Historique pas récupéré

**Solution** : Vérifier les logs :
```bash
supabase functions logs rag-query

# Doit afficher :
# 📜 Fetching conversation history...
# 📚 Found 2 previous messages
# 📖 Including conversation history in prompt
```

---

### "Trop de messages dans l'historique"

**Cause** : La limite est de 10 messages (configurable)

**Solution** : Ajuster dans `get_conversation_history` :
```typescript
const { data: history } = await supabase
  .rpc('get_conversation_history', {
    p_conversation_id: conversation_id,
    p_limit: 20  // ← Augmenter si nécessaire
  });
```

---

## 💰 Coûts

### Avec Mémoire Conversationnelle

| Élément | Avant | Après | Différence |
|---------|-------|-------|------------|
| **Tokens utilisés** | 500-800 | 800-1500 | +50-100% |
| **Coût par question** | ~0.002€ | ~0.003€ | +50% |
| **Coût pour 1000 questions** | ~2€ | ~3€ | +1€ |

**Impact** : Minime ! L'amélioration de l'expérience vaut largement le coût supplémentaire.

---

## 📊 Comparaison

| Fonctionnalité | Sans Mémoire | Avec Mémoire |
|----------------|--------------|--------------|
| **Questions de suivi** | ❌ Ne comprend pas | ✅ Comprend le contexte |
| **Clarifications** | ❌ Répète | ✅ Approfondit |
| **Expérience** | ⚠️ Basique | ✅ Naturelle |
| **Coût** | Faible | +50% (minime) |
| **Complexité** | Simple | Modérée |

---

## ✅ Checklist

- [ ] Migration SQL exécutée (`add_conversation_memory.sql`)
- [ ] Tables `conversations` et `messages` créées
- [ ] Fonctions SQL testées
- [ ] Edge Function `rag-query` déployée (version avec mémoire)
- [ ] Frontend mis à jour pour envoyer `conversation_id`
- [ ] Test : Question + Clarification fonctionnent
- [ ] Logs vérifient que l'historique est chargé

---

## 🚀 Prochaines Étapes

1. **Installer** : Exécuter la migration SQL (2 min)
2. **Déployer** : `supabase functions deploy rag-query` (1 min)
3. **Mettre à jour** : Frontend pour gérer conversation_id (10 min)
4. **Tester** : Poser 2-3 questions de suite (1 min)

---

## 📚 Fichiers Créés

| Fichier | Description |
|---------|-------------|
| **`add_conversation_memory.sql`** | Migration SQL (tables + fonctions) |
| **`rag-query/index.ts`** | Edge Function avec mémoire |
| **`GUIDE_MEMOIRE_CONVERSATIONNELLE.md`** | Ce guide |

---

**Créé le 13 novembre 2025**
*Guide complet de la mémoire conversationnelle*

💬 **L'IA se souvient maintenant !**
🎯 **Clarifications et questions de suivi supportées**
✅ **Expérience conversationnelle naturelle**
