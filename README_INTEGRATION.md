# Guide d'intégration complet - VEILLE IA

## 🎯 Vue d'ensemble

Ce guide explique comment l'interface graphique (React) communique avec le workflow n8n et Supabase pour créer un système de veille concurrentielle automatisé.

## 📦 Ce qui a été fait

### 1. Migration Airtable → Supabase ✅
- Création du schéma SQL pour les tables `clients` et `rapports`
- Conversion du workflow n8n pour utiliser Supabase
- Migration des données (optionnel)

### 2. Interface graphique ✅
- **ChatInterface** : Chat conversationnel avec l'IA
- **VeilleDashboard** : Affichage de la configuration
- **MainApp** : Navigation entre Chat et Dashboard
- Correction du payload webhook (`user_id`)

### 3. Documentation ✅
- Guide de migration Supabase
- Guide de configuration interface
- Guide de résolution d'erreurs

## 🚀 Installation rapide (5 minutes)

### Étape 1 : Base de données Supabase

```bash
# 1. Connectez-vous à Supabase Dashboard
https://supabase.com/dashboard

# 2. Allez dans SQL Editor

# 3. Exécutez le script de migration
# Fichier : supabase/migrations/20251105000001_cleanup_and_recreate.sql
```

### Étape 2 : Workflow n8n

```bash
# 1. Connectez-vous à n8n
https://n8n.srv954650.hstgr.cloud

# 2. Créez les credentials Supabase
# - Host : https://xottryrwoxafervpovex.supabase.co
# - Service Role Key : (depuis Supabase → Settings → API)

# 3. Importez le workflow
# Fichier : n8n-workflow-supabase.json

# 4. Mettez à jour les credentials sur tous les nodes Supabase

# 5. Activez le workflow
```

### Étape 3 : Frontend React

```bash
# 1. Vérifiez les variables d'environnement
cat .env
# VITE_SUPABASE_URL=https://xottryrwoxafervpovex.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJ...

# 2. Installez les dépendances (si nécessaire)
npm install

# 3. Lancez le serveur de développement
npm run dev

# 4. Ouvrez http://localhost:5173
```

## 🔄 Flux de communication complet

### Scénario : Nouvel utilisateur configure sa veille

```
1. CONNEXION
   User → Frontend → Supabase Auth
   ✅ Utilisateur créé dans auth.users

2. PREMIÈRE VISITE
   Frontend → Supabase
   ├─> SELECT * FROM clients WHERE user_id = ?
   └─> Résultat : Aucun client trouvé
   ✅ Affiche Dashboard vide avec CTA "Démarrer la configuration"

3. CLIC SUR "DÉMARRER LA CONFIGURATION"
   Frontend → MainApp
   └─> Navigation vers ChatInterface

4. PREMIER MESSAGE
   User → ChatInterface → Supabase
   ├─> INSERT conversation (new)
   ├─> INSERT message (user)
   └─> POST webhook n8n
       {
         "message": "Bonjour",
         "user_id": "abc123..."
       }

5. N8N WORKFLOW
   Webhook → Search Client in Supabase
   ├─> SELECT * FROM clients WHERE user_id = 'abc123...'
   └─> Résultat : Aucun client
       └─> IF (pas de client)
           └─> Create Client in Supabase
               └─> INSERT INTO clients (user_id) VALUES ('abc123...')

   → Update Client Basic Info
   → Code in JavaScript (normalisation)
   → AI Agent (Grok)
   ├─> Analyse le message
   ├─> Génère réponse conversationnelle
   └─> Retourne JSON :
       {
         "message_utilisateur": "Salut ! 😊 Pour commencer...",
         "config": {
           "route": "onboarding",
           "etape_actuelle": 1,
           ...
         }
       }

   → Code (parsing)
   → Router (check route)
   └─> Respond to Webhook
       └─> Retourne la réponse au frontend

6. RÉCEPTION RÉPONSE
   ChatInterface ← n8n
   ├─> response.json()
   ├─> Extrait : data.output || data.message
   └─> INSERT message (assistant) dans Supabase

7. CONVERSATION CONTINUE
   (Étapes 2-10 de l'onboarding)
   Chaque message :
   ├─> Sauvegarde user message
   ├─> Appel n8n
   ├─> AI analyse et génère config
   ├─> Update clients table avec nouvelles données
   └─> Sauvegarde assistant message

8. FIN ONBOARDING (ÉTAPE 10 VALIDÉE)
   n8n → Code in JavaScript
   └─> config.route = "completed"
   └─> config.status = "done"

   n8n → Router (route = completed)
   └─> Update Client Full Onboarding
       └─> UPDATE clients SET
           email = ?,
           prenom = ?,
           secteur = ?,
           mots_cles = ARRAY[...],
           concurrents = ARRAY[...],
           profiles_linkedin = ARRAY[...],
           sources_veille = ARRAY[...],
           frequence = ?,
           heure_envoi = ?,
           canaux_diffusion = ARRAY[...],
           alertes_temps_reel = ?,
           status_onboarding = 'done'
           WHERE user_id = ?

9. RETOUR AU DASHBOARD
   User → Clic "Tableau de bord"
   Frontend → Supabase
   ├─> SELECT * FROM clients WHERE user_id = ?
   └─> Résultat : Configuration complète !
   ✅ Affiche toutes les infos avec badge "Configuration complète"

10. STATISTIQUES
    Frontend → Supabase
    └─> SELECT COUNT(*) FROM rapports WHERE client_id = ?
    ✅ Affiche : 0 rapports générés (normal, c'est le premier jour)
```

## 🗂️ Structure des tables Supabase

### Table `clients`
```sql
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,           -- ID Supabase Auth
  email text,
  prenom text,
  secteur text,
  mots_cles text[] DEFAULT '{}',          -- Array PostgreSQL
  concurrents text[] DEFAULT '{}',
  profiles_linkedin text[] DEFAULT '{}',
  sources_veille text[] DEFAULT '{}',
  frequence text,                         -- quotidienne/hebdomadaire/mensuelle
  heure_envoi text,                       -- 8h00, 12h00, 18h00
  canaux_diffusion text[] DEFAULT '{}',   -- Mail, Slack, WhatsApp
  alertes_temps_reel boolean DEFAULT false,
  status_onboarding text DEFAULT 'next_step',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Table `rapports`
```sql
CREATE TABLE rapports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  titre text NOT NULL,
  contenu text,
  type text,                              -- quotidien/hebdomadaire/mensuel
  statut text DEFAULT 'genere',          -- genere/envoye
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);
```

## 📡 API Endpoints

### 1. n8n Webhook
```
URL: https://n8n.srv954650.hstgr.cloud/webhook-test/AgentIA
Method: POST
Content-Type: application/json

Request Body:
{
  "message": "string",
  "user_id": "uuid"
}

Response:
{
  "output": "string",  // Message de l'assistant
  "message": "string"  // Fallback
}
```

### 2. Supabase REST API
```
Base URL: https://xottryrwoxafervpovex.supabase.co/rest/v1
Authorization: Bearer {SUPABASE_ANON_KEY}
```

**Requêtes frontend** :
```javascript
// Récupérer config client
GET /clients?user_id=eq.{uuid}&select=*

// Compter rapports
GET /rapports?client_id=eq.{uuid}&select=count

// Insérer message
POST /messages
{
  "conversation_id": "uuid",
  "role": "user",
  "content": "message"
}
```

## 🎨 Composants React

### MainApp.tsx
```typescript
// Gère la navigation principale
type View = 'chat' | 'dashboard';
const [currentView, setCurrentView] = useState<View>('dashboard');
```

### ChatInterface.tsx
```typescript
// Props
interface ChatInterfaceProps {
  onNavigateToDashboard?: () => void;
}

// Fonctions clés
- loadMessages() : Charge historique
- sendMessage() : Envoie message → n8n → Sauvegarde réponse
- webhook call : POST avec { message, user_id }
```

### VeilleDashboard.tsx
```typescript
// Props
interface VeilleDashboardProps {
  onNavigateToChat: () => void;
}

// Fonctions clés
- loadConfig() : Charge clients depuis Supabase
- loadStats() : Compte rapports
- getStatusBadge() : Badge configuration en cours/complète
```

## 🧪 Tests manuels

### Test 1 : Webhook n8n
```bash
curl -X POST https://n8n.srv954650.hstgr.cloud/webhook-test/AgentIA \
  -H "Content-Type: application/json" \
  -d '{
    "message": "test",
    "user_id": "test_user_001"
  }'
```

Résultat attendu :
```json
{
  "output": "Salut ! 😊 Je vais t'aider..."
}
```

### Test 2 : Supabase RLS
```sql
-- Se connecter avec un utilisateur authentifié
-- Vérifier qu'on ne voit QUE ses données
SELECT * FROM clients WHERE user_id = auth.uid();
```

### Test 3 : Frontend complet
1. Créer un compte
2. Discuter avec l'assistant (5 messages)
3. Aller sur Dashboard → Voir infos partielles
4. Retourner au Chat
5. Terminer l'onboarding (étapes 1-10)
6. Retourner au Dashboard → Badge "Configuration complète"

## 🐛 Debugging

### Logs n8n
```
n8n Dashboard → Executions
- Voir le détail de chaque node
- Vérifier les erreurs Supabase
- Checker le payload envoyé/reçu
```

### Logs Supabase
```
Supabase Dashboard → Logs → Postgres Logs
- Filtrer par table : clients, rapports
- Voir les INSERT/UPDATE/SELECT
```

### Logs Frontend
```javascript
// Dans ChatInterface.tsx
console.log('Sending to n8n:', { message, user_id });
console.log('Response from n8n:', data);
```

## 📋 Checklist de déploiement

### Supabase
- [ ] Migration SQL exécutée
- [ ] Tables créées (clients, rapports)
- [ ] RLS activé
- [ ] Service role key récupérée

### n8n
- [ ] Credentials Supabase configurés (service_role key)
- [ ] Workflow importé
- [ ] Tous les nodes Supabase mis à jour avec credentials
- [ ] Workflow activé
- [ ] Test webhook réussi

### Frontend
- [ ] Variables d'environnement configurées (.env)
- [ ] Dépendances installées (npm install)
- [ ] Application lance sans erreur (npm run dev)
- [ ] Connexion Supabase Auth fonctionne
- [ ] Chat envoie messages au webhook
- [ ] Dashboard affiche les données

### Tests
- [ ] Nouvel utilisateur peut s'inscrire
- [ ] Chat répond via n8n
- [ ] Configuration sauvegardée dans Supabase
- [ ] Dashboard affiche la configuration
- [ ] Navigation Chat ↔ Dashboard fonctionne

## 🎓 Ressources

### Documentation officielle
- [Supabase Docs](https://supabase.com/docs)
- [n8n Docs](https://docs.n8n.io/)
- [React Docs](https://react.dev/)

### Vos fichiers de référence
- `MIGRATION_GUIDE_SUPABASE.md` : Guide migration Airtable → Supabase
- `CONFIGURATION_INTERFACE.md` : Guide configuration frontend
- `FIX_ERREUR_STATUT.md` : Résolution erreur SQL

### Fichiers importants
```
veille-ia/
├── supabase/migrations/
│   ├── 20251105000000_create_clients_onboarding.sql
│   └── 20251105000001_cleanup_and_recreate.sql
├── src/
│   ├── components/
│   │   ├── ChatInterface.tsx        ✅ Modifié
│   │   ├── VeilleDashboard.tsx      ✅ Nouveau
│   │   └── MainApp.tsx              ✅ Nouveau
│   └── App.tsx                      ✅ Modifié
├── n8n-workflow-supabase.json       ✅ Nouveau
├── MIGRATION_GUIDE_SUPABASE.md
├── CONFIGURATION_INTERFACE.md
└── README_INTEGRATION.md            ← Vous êtes ici
```

## 🆘 Support

Si quelque chose ne fonctionne pas :

1. **Vérifiez les logs** (dans l'ordre)
   - Console navigateur (F12)
   - n8n Executions
   - Supabase Postgres Logs

2. **Vérifiez les credentials**
   - n8n : Service role key (pas anon key)
   - Frontend : Anon key dans .env

3. **Testez chaque composant séparément**
   - Webhook n8n (curl)
   - Supabase queries (SQL Editor)
   - Frontend (console.log)

4. **Références de dépannage**
   - `FIX_ERREUR_STATUT.md` : Erreurs SQL
   - `CONFIGURATION_INTERFACE.md` : Erreurs frontend
   - `MIGRATION_GUIDE_SUPABASE.md` : Problèmes de migration

---

**Fait avec ❤️ par Claude Code**

Prêt à lancer votre veille concurrentielle automatisée ! 🚀
