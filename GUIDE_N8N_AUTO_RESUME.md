# 🤖 Guide : Génération automatique des résumés dans n8n

## Solution recommandée : Modifier le workflow n8n

Cette solution est **plus simple et plus fiable** que le trigger PostgreSQL car :
- ✅ Le workflow contrôle déjà la création des rapports
- ✅ Pas besoin de stocker des clés API dans PostgreSQL
- ✅ Plus facile à déboguer
- ✅ Meilleur contrôle du flux

---

## 📝 Étapes à suivre dans n8n

### 1. Ouvrir le workflow de génération de rapports

1. Allez sur https://n8n.srv954650.hstgr.cloud
2. Ouvrez le workflow **"Génération des rapports de veille"** (celui qui crée les rapports)
3. Trouvez le node qui insère le rapport dans Supabase (probablement un node **Supabase** ou **HTTP Request**)

---

### 2. Ajouter un node HTTP Request après la création du rapport

Après le node qui crée le rapport dans Supabase, ajoutez un nouveau node :

**Node : HTTP Request**

#### Configuration du node :

**Authentication :** None (on passe la clé dans le header)

**Request Method :** POST

**URL :**
```
https://xottryrwoxafervpovex.supabase.co/functions/v1/generate-summary
```

**Headers :**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer VOTRE_ANON_KEY"
}
```
(Remplacez `VOTRE_ANON_KEY` par votre clé Supabase anon)

**Body Content Type :** JSON

**Body (JSON) :**
```json
{
  "rapport_id": "{{ $json.id }}"
}
```

**Options :**
- Timeout: 30000 (30 secondes)
- Ignore Response Code: false

---

### 3. Structure du workflow complète

```
[Trigger Cron/Webhook]
    ↓
[Collecter les sources RSS]
    ↓
[Analyser avec IA]
    ↓
[Générer le PDF]
    ↓
[Upload PDF vers Supabase Storage]
    ↓
[Créer le rapport dans Supabase] ← Retourne l'ID du rapport
    ↓
[🆕 HTTP Request: Générer le résumé] ← NOUVEAU NODE
    ↓
[Envoyer par email/WhatsApp]
```

---

### 4. Exemple de configuration complète

#### Node "Créer le rapport dans Supabase"
```javascript
// Ce node insère le rapport et retourne l'ID
{
  "titre": "{{ $json.titre }}",
  "client_id": "{{ $json.client_id }}",
  "type_rapport": "quotidien",
  "pdf_url": "{{ $json.pdf_url }}",
  "audio_url": "{{ $json.audio_url }}",
  "nb_sources": {{ $json.nb_sources }},
  "mots_cles": {{ $json.mots_cles }},
  "secteur": "{{ $json.secteur }}",
  "statut": "genere"
}
```

#### Node "Générer le résumé automatiquement"
```javascript
// Ce node appelle l'Edge Function avec l'ID du rapport créé
{
  "rapport_id": "{{ $('Créer le rapport dans Supabase').item.json.id }}"
}
```

---

## 🎯 Résultat

Désormais, **chaque fois qu'un rapport est généré** :

1. ✅ Le rapport est créé dans Supabase
2. ✅ Le résumé est généré automatiquement par GPT-4
3. ✅ Le résumé est sauvegardé dans la colonne `resume`
4. ✅ L'utilisateur voit le résumé directement dans l'historique

---

## 🧪 Test

1. Déclenchez manuellement le workflow n8n
2. Attendez que le rapport soit créé
3. Dans Supabase SQL Editor, vérifiez :

```sql
SELECT id, titre, resume, date_generation
FROM rapports
ORDER BY date_generation DESC
LIMIT 1;
```

Le résumé devrait apparaître dans la colonne `resume`.

---

## 🐛 Dépannage

### Problème : Le résumé n'est pas généré

**Vérifiez :**
1. L'Edge Function est déployée : `npx supabase functions list`
2. La clé OpenAI est configurée : Supabase Dashboard → Edge Functions → Secrets
3. Les logs n8n : Y a-t-il une erreur dans le node HTTP Request ?
4. Les logs Supabase : Dashboard → Logs → Edge Functions

### Problème : Timeout

Si la génération prend trop de temps, augmentez le timeout du node HTTP Request :
- Timeout: 60000 (60 secondes)

---

## 💡 Alternative : Génération asynchrone

Si vous voulez que le workflow continue sans attendre le résumé :

1. Dans le node HTTP Request, activez **"Continue On Fail"**
2. Ajoutez un node **"Wait"** de 5 secondes avant le node de génération
3. Utilisez un workflow séparé qui vérifie périodiquement les rapports sans résumé

---

## ✅ Avantages de cette approche

- 🚀 **Automatique** : Aucune intervention manuelle
- 🎯 **Fiable** : Contrôle total du flux dans n8n
- 🔧 **Débogable** : Logs clairs dans n8n et Supabase
- 🔒 **Sécurisé** : Pas besoin de stocker des clés dans PostgreSQL
- ⚡ **Rapide** : Génération immédiate après création du rapport

---

**Prochaine étape** : Retirer le bouton "Générer avec IA" de l'interface React, car la génération est maintenant automatique.
