# ⚡ Installation Mémoire Conversationnelle - 3 Minutes

## 🎯 Objectif

L'IA pourra se souvenir de la conversation et répondre aux clarifications.

---

## 🚀 3 Étapes

### Étape 1 : SQL (1 min)

```bash
# Supabase Dashboard → SQL Editor
# Copiez-collez le contenu de : supabase/migrations/add_conversation_memory.sql
# Cliquez sur "Run"
```

**Résultat attendu :**
```
✅ CREATE TABLE conversations
✅ CREATE TABLE messages
✅ DO (conditional foreign key)
✅ CREATE INDEX (x5)
✅ ALTER TABLE (x2 - RLS enabled)
✅ CREATE POLICY (x6)
✅ CREATE FUNCTION (x4)
✅ CREATE TRIGGER (x1)
```

---

### Étape 2 : Edge Function (1 min)

```bash
# Terminal
supabase functions deploy rag-query
```

**Résultat attendu :**
```
✅ Deployed function rag-query
```

---

### Étape 3 : Test (1 min)

```bash
npm run dev

# Dans l'Assistant IA :
# 1. "Quelles sont les dernières tendances ?"
# 2. "Peux-tu détailler la première ?"  ← Doit comprendre !
```

---

## ✅ C'est Tout !

L'IA se souvient maintenant de la conversation ! 🎉

---

## 📝 Note Frontend

**TODO** : Mettre à jour `RAGChatPage.tsx` pour envoyer `conversation_id` :

```typescript
const [conversationId, setConversationId] = useState<string | null>(null);

const response = await supabase.functions.invoke('rag-query', {
  body: {
    question,
    user_id: user.id,
    conversation_id: conversationId  // ← Ajouter
  }
});

// Stocker pour les prochains messages
setConversationId(response.data.conversation_id);
```

---

**Créé le 13 novembre 2025**

💬 **3 minutes pour la mémoire complète**
✅ **L'IA se souvient maintenant !**
