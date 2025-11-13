# 📱 Guide d'intégration WhatsApp - Envoi PDF et Audio

## 🎯 Objectif
Envoyer automatiquement le PDF et le fichier audio du rapport de veille via WhatsApp.

---

## 📋 Table des matières
1. [Choix de la solution WhatsApp](#1-choix-de-la-solution-whatsapp)
2. [Configuration Twilio (Recommandé)](#2-configuration-twilio-recommandé)
3. [Modifications Base de données](#3-modifications-base-de-données)
4. [Modifications Frontend](#4-modifications-frontend)
5. [Intégration dans n8n](#5-intégration-dans-n8n)
6. [Workflow complet](#6-workflow-complet)
7. [Tests et Debug](#7-tests-et-debug)

---

## 1. Choix de la solution WhatsApp

### Option A : **Twilio API for WhatsApp** ⭐ RECOMMANDÉ

**Avantages :**
- ✅ Simple à configurer
- ✅ Fiable et stable
- ✅ Support des fichiers (PDF, audio, images)
- ✅ Bien documenté
- ✅ Intégration native avec n8n

**Inconvénients :**
- ❌ Payant (mais tarifs raisonnables)
- ❌ Nécessite validation du numéro

**Tarifs approximatifs :**
- Envoi de message : ~0.005€ par message
- Envoi de média (PDF/audio) : ~0.005€ par fichier

### Option B : Evolution API (Open Source)

**Avantages :**
- ✅ Gratuit et open source
- ✅ Auto-hébergé
- ✅ Support des fichiers

**Inconvénients :**
- ❌ Plus complexe à configurer
- ❌ Nécessite un serveur dédié
- ❌ Peut être instable

### Option C : WhatsApp Business API (Officielle)

**Inconvénients :**
- ❌ Très cher
- ❌ Complexe à configurer
- ❌ Nécessite une entreprise vérifiée

---

## 2. Configuration Twilio (Recommandé)

### Étape 1 : Créer un compte Twilio

1. Allez sur https://www.twilio.com/
2. Créez un compte gratuit (vous recevrez des crédits de test)
3. Vérifiez votre email

### Étape 2 : Activer WhatsApp Sandbox

1. Dans le dashboard Twilio, allez dans **Messaging** > **Try it out** > **Send a WhatsApp message**
2. Suivez les instructions pour activer le Sandbox :
   - Envoyez un message WhatsApp au numéro Twilio fourni
   - Format : `join <code>` (ex: `join happy-tiger`)
3. Une fois activé, vous verrez "Sandbox Participants"

### Étape 3 : Récupérer les credentials

Dans votre dashboard Twilio :
- **Account SID** : trouvé sur la page d'accueil
- **Auth Token** : cliquez sur "Show" pour le révéler
- **WhatsApp Number** : votre numéro Twilio (format: `whatsapp:+14155238886`)

**IMPORTANT pour la production :**
Pour envoyer à des clients réels, vous devrez :
1. Demander l'approbation du numéro WhatsApp Business
2. Créer des templates de messages approuvés
3. Passer en mode production

---

## 3. Modifications Base de données

### Ajouter le champ WhatsApp dans Supabase

```sql
-- 1. Ajouter le champ whatsapp dans la table clients
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);

-- 2. Mettre à jour les clients existants (exemple)
UPDATE public.clients
SET whatsapp = '+33612345678'  -- Format international obligatoire
WHERE email = 'client@example.com';

-- 3. Vérifier que canaux_diffusion contient "whatsapp"
UPDATE public.clients
SET canaux_diffusion = array_append(canaux_diffusion, 'whatsapp')
WHERE whatsapp IS NOT NULL
  AND NOT ('whatsapp' = ANY(canaux_diffusion));
```

### Vérifier la structure

```sql
-- Afficher les clients avec WhatsApp configuré
SELECT
  id,
  prenom,
  email,
  whatsapp,
  canaux_diffusion
FROM public.clients
WHERE 'whatsapp' = ANY(canaux_diffusion)
  AND whatsapp IS NOT NULL;
```

---

## 4. Modifications Frontend

### 4.1 Ajouter le champ WhatsApp dans l'onboarding

Modifier `ChatInterface.tsx` - L'agent IA doit demander le numéro WhatsApp à l'étape 9 (canaux).

**Exemple de réponse de l'agent :**
```json
{
  "message_utilisateur": "Super ! Par quel(s) canal(aux) veux-tu recevoir tes rapports ?\n\n📧 Email\n📱 WhatsApp\n\nSi tu choisis WhatsApp, donne-moi ton numéro (format international : +33...)",
  "suggestions": [
    {"label": "Email uniquement", "value": "email", "description": "Recevoir par email"},
    {"label": "WhatsApp uniquement", "value": "whatsapp", "description": "Recevoir sur WhatsApp"},
    {"label": "Email + WhatsApp", "value": "email,whatsapp", "description": "Les deux canaux"}
  ],
  "config": {
    "etape_actuelle": 9,
    ...
  }
}
```

### 4.2 Modifier le workflow onboarding n8n

Dans le prompt de l'agent (ligne 169 du workflow_onboarding.json), ajouter :

```
ÉTAPE 9 : Canaux de diffusion
- Demander : Email, WhatsApp ou les deux
- Si WhatsApp choisi : demander le numéro au format international (+33...)
- Valider le format : doit commencer par + suivi de chiffres
- Stocker dans config.whatsapp et config.canaux_diffusion
```

### 4.3 Ajouter dans SettingsPage.tsx

```typescript
// Ajouter un input pour WhatsApp dans SettingsPage.tsx
const [whatsapp, setWhatsapp] = useState('');

// Dans le useEffect de chargement
setWhatsapp(config.whatsapp || '');

// Dans le formulaire, ajouter :
<div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100">
  <div className="flex items-center gap-3 mb-4">
    <div className="bg-green-100 p-2 rounded-lg">
      <MessageCircle className="w-5 h-5 text-green-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900">
      Numéro WhatsApp
    </h3>
  </div>
  <input
    type="tel"
    value={whatsapp}
    onChange={(e) => setWhatsapp(e.target.value)}
    placeholder="+33612345678"
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
  />
  <p className="text-xs text-gray-500 mt-2">
    Format international obligatoire (ex: +33612345678)
  </p>
</div>
```

---

## 5. Intégration dans n8n

### Étape 1 : Ajouter Twilio credentials dans n8n

1. Dans n8n, allez dans **Settings** > **Credentials**
2. Cliquez sur **+ New Credential**
3. Cherchez **Twilio**
4. Remplissez :
   - **Account SID** : votre Account SID
   - **Auth Token** : votre Auth Token
5. Cliquez sur **Save**

### Étape 2 : Ajouter nodes WhatsApp dans le workflow

Voici le workflow complet à ajouter **APRÈS** la génération du PDF et de l'audio :

```javascript
// Node 1 : Vérifier si WhatsApp est activé
{
  "parameters": {
    "conditions": {
      "conditions": [
        {
          "leftValue": "={{ $json.canaux_diffusion }}",
          "rightValue": "whatsapp",
          "operator": {
            "type": "array",
            "operation": "contains"
          }
        }
      ]
    }
  },
  "type": "n8n-nodes-base.if",
  "name": "WhatsApp activé ?"
}

// Node 2 : Envoyer message texte de présentation
{
  "parameters": {
    "resource": "message",
    "operation": "send",
    "from": "whatsapp:+14155238886", // Votre numéro Twilio
    "to": "={{ 'whatsapp:' + $json.whatsapp }}",
    "message": "=🎯 *Nouveau rapport de veille - {{ $json.date }}*\n\nBonjour {{ $json.prenom }},\n\nVotre rapport de veille est prêt ! Vous allez recevoir :\n📄 Le rapport PDF\n🎧 La version audio\n\nBonne lecture ! 🚀"
  },
  "type": "n8n-nodes-base.twilio",
  "name": "Envoyer message intro"
}

// Node 3 : Envoyer le PDF
{
  "parameters": {
    "resource": "message",
    "operation": "send",
    "from": "whatsapp:+14155238886",
    "to": "={{ 'whatsapp:' + $json.whatsapp }}",
    "mediaUrl": "={{ $json.pdf_url }}" // URL du PDF depuis Supabase
  },
  "type": "n8n-nodes-base.twilio",
  "name": "Envoyer PDF"
}

// Node 4 : Envoyer l'audio
{
  "parameters": {
    "resource": "message",
    "operation": "send",
    "from": "whatsapp:+14155238886",
    "to": "={{ 'whatsapp:' + $json.whatsapp }}",
    "mediaUrl": "={{ $json.audio_url }}" // URL de l'audio depuis Supabase
  },
  "type": "n8n-nodes-base.twilio",
  "name": "Envoyer Audio"
}

// Node 5 : Logger l'envoi
{
  "parameters": {
    "operation": "executeQuery",
    "query": "=UPDATE public.rapports \nSET envoye_par_whatsapp = true, \n    date_envoi_whatsapp = NOW() \nWHERE id = '{{ $json.rapport_id }}'",
  },
  "type": "n8n-nodes-base.postgres",
  "name": "Logger envoi WhatsApp"
}
```

---

## 6. Workflow complet

Voici l'ordre du workflow de génération de rapport :

```
1. Get Clients Supabase
   ↓
2. Filtrer Fréquence
   ↓
3. Générer Requêtes
   ↓
4. Serper Search
   ↓
5. Agréger Résultats
   ↓
6. Générer Rapport (AI)
   ↓
7. Générer PDF
   ↓
8. Upload PDF vers Supabase Storage
   ↓
9. Générer Audio (TTS)
   ↓
10. Upload Audio vers Supabase Storage
   ↓
11. Sauvegarder rapport dans DB
   ↓
12. IF : Email activé ?
   ├─ OUI → Envoyer Email
   └─ NON → Skip
   ↓
13. IF : WhatsApp activé ? ← NOUVEAU
   ├─ OUI → Envoyer via WhatsApp
   │   ↓
   │   14. Envoyer message intro
   │   ↓
   │   15. Envoyer PDF
   │   ↓
   │   16. Envoyer Audio
   │   ↓
   │   17. Logger envoi WhatsApp
   └─ NON → Skip
```

---

## 7. Tests et Debug

### Test 1 : Sandbox Twilio

```bash
# 1. Rejoindre le sandbox avec votre propre numéro
# Envoyez sur WhatsApp au numéro Twilio :
join <votre-code>

# 2. Dans n8n, exécuter manuellement le workflow
# Vérifier que vous recevez :
# - Le message de présentation
# - Le PDF
# - L'audio
```

### Test 2 : Vérifier les URLs

```javascript
// Dans n8n, ajouter un node Code avant l'envoi WhatsApp
const pdfUrl = $json.pdf_url;
const audioUrl = $json.audio_url;

console.log('PDF URL:', pdfUrl);
console.log('Audio URL:', audioUrl);

// Vérifier que les URLs sont :
// 1. Publiques (pas de token requis)
// 2. Accessibles (status 200)
// 3. Format correct (PDF et MP3)

return [$input.all()[0]];
```

### Test 3 : Format du numéro

```javascript
// Valider le format WhatsApp
const whatsapp = $json.whatsapp;

if (!whatsapp.startsWith('+')) {
  throw new Error('Le numéro WhatsApp doit commencer par +');
}

if (!/^\+\d{10,15}$/.test(whatsapp)) {
  throw new Error('Format de numéro invalide');
}

return [$input.all()[0]];
```

### Checklist de debug

- [ ] Credentials Twilio ajoutées dans n8n
- [ ] Sandbox WhatsApp activé
- [ ] Numéro de test ajouté au sandbox
- [ ] Champ `whatsapp` ajouté dans table `clients`
- [ ] PDF et Audio uploadés dans Supabase Storage
- [ ] URLs publiques et accessibles
- [ ] Format numéro correct (+33...)
- [ ] Canal "whatsapp" dans `canaux_diffusion`

---

## 8. Modifications de la base de données

```sql
-- Ajouter les colonnes de tracking WhatsApp
ALTER TABLE public.rapports
ADD COLUMN IF NOT EXISTS envoye_par_whatsapp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS date_envoi_whatsapp TIMESTAMP;

-- Créer une vue pour le monitoring
CREATE OR REPLACE VIEW public.rapports_whatsapp AS
SELECT
  r.id,
  r.titre,
  r.date_generation,
  r.envoye_par_whatsapp,
  r.date_envoi_whatsapp,
  c.prenom,
  c.email,
  c.whatsapp
FROM public.rapports r
JOIN public.clients c ON r.client_id = c.id
WHERE 'whatsapp' = ANY(c.canaux_diffusion)
ORDER BY r.date_generation DESC;

-- Vérifier les rapports envoyés
SELECT * FROM public.rapports_whatsapp;
```

---

## 9. Coûts estimés

### Twilio Sandbox (Gratuit)
- ✅ Messages illimités en test
- ✅ Fichiers illimités en test
- ❌ Limité aux numéros ajoutés au sandbox

### Twilio Production
**Tarifs approximatifs (2024) :**
- Message texte : ~0.005€
- Fichier média (PDF/audio) : ~0.005€
- **Total par rapport** : ~0.015€ (message + PDF + audio)

**Exemple :**
- 100 clients/jour = 1.50€/jour = 45€/mois
- 1000 clients/jour = 15€/jour = 450€/mois

---

## 10. Passage en Production

### Étapes pour sortir du Sandbox

1. **Demander un numéro WhatsApp Business**
   - Dans Twilio : Buy a Phone Number
   - Activer WhatsApp sur ce numéro
   - ~1-3 jours d'approbation

2. **Créer des templates de messages**
   - WhatsApp exige des templates pré-approuvés
   - Format : https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates

3. **Vérifier votre entreprise**
   - Facebook Business Manager
   - Vérification Meta

4. **Modifier le workflow n8n**
   - Remplacer le numéro sandbox par votre numéro
   - Utiliser les templates approuvés

---

## 11. Alternative : Evolution API (Open Source)

Si vous préférez une solution gratuite auto-hébergée :

### Installation Evolution API

```bash
# 1. Cloner le repo
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# 2. Configurer
cp .env.example .env
nano .env

# 3. Lancer avec Docker
docker-compose up -d

# 4. Scanner le QR code pour connecter WhatsApp Web
```

### Configuration dans n8n

```javascript
// Node HTTP Request pour Evolution API
{
  "parameters": {
    "method": "POST",
    "url": "http://localhost:8080/message/sendMedia",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "number",
          "value": "={{ $json.whatsapp }}"
        },
        {
          "name": "mediaUrl",
          "value": "={{ $json.pdf_url }}"
        },
        {
          "name": "caption",
          "value": "Votre rapport de veille"
        }
      ]
    }
  },
  "type": "n8n-nodes-base.httpRequest",
  "name": "Envoyer PDF via Evolution"
}
```

---

## 12. Résumé des étapes

### ✅ Checklist complète

**1. Configuration Twilio**
- [ ] Créer compte Twilio
- [ ] Activer WhatsApp Sandbox
- [ ] Récupérer Account SID et Auth Token
- [ ] Ajouter votre numéro de test au sandbox

**2. Base de données**
- [ ] Ajouter colonne `whatsapp` dans `clients`
- [ ] Ajouter colonnes tracking dans `rapports`
- [ ] Mettre à jour les clients avec leurs numéros

**3. Frontend**
- [ ] Modifier l'onboarding pour demander WhatsApp
- [ ] Ajouter champ WhatsApp dans SettingsPage
- [ ] Importer icône `MessageCircle` de lucide-react

**4. n8n**
- [ ] Ajouter credentials Twilio
- [ ] Créer nodes WhatsApp dans workflow
- [ ] Tester avec votre numéro

**5. Tests**
- [ ] Tester envoi PDF
- [ ] Tester envoi audio
- [ ] Vérifier les URLs publiques
- [ ] Logger les envois dans la DB

---

## 📞 Support

Si vous avez des questions :
- Documentation Twilio WhatsApp : https://www.twilio.com/docs/whatsapp
- Evolution API : https://github.com/EvolutionAPI/evolution-api
- n8n WhatsApp : https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.twilio/

---

**Prêt à implémenter ? Commencez par l'étape 1 (Twilio Sandbox) ! 🚀**
