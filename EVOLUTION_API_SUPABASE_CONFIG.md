# 🗄️ Configuration Evolution API avec Supabase PostgreSQL

## Étape 1 : Récupérer les credentials Supabase

### 1.1 Aller dans votre projet Supabase

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Settings** (icône d'engrenage) → **Database**

### 1.2 Récupérer la Connection String

Dans la section **Connection String**, vous verrez plusieurs formats.

**Choisissez : "URI" (Connection Pooling)**

Format :
```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

**OU si vous préférez Direct Connection :**
```
postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

**Remplacez `[YOUR-PASSWORD]` par votre mot de passe de base de données Supabase.**

### 1.3 Trouver votre mot de passe

Si vous ne connaissez pas votre mot de passe :
1. Dans **Settings** → **Database**
2. Section **Database password**
3. Cliquez sur **Reset Database Password** si nécessaire
4. **⚠️ ATTENTION : Cela va réinitialiser le mot de passe et pourrait casser d'autres connexions !**

### 1.4 Format final

Exemple de connection string complète :
```
postgresql://postgres.abcdefghijklmnop:MonMotDePasse123!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

## Étape 2 : Créer les tables Evolution API dans Supabase

### 2.1 Créer un schéma dédié (optionnel mais recommandé)

Allez dans **SQL Editor** de Supabase et exécutez :

```sql
-- Créer un schéma pour Evolution API
CREATE SCHEMA IF NOT EXISTS evolution;

-- Donner les permissions
GRANT ALL ON SCHEMA evolution TO postgres;
GRANT ALL ON SCHEMA evolution TO authenticated;
GRANT ALL ON SCHEMA evolution TO service_role;
```

### 2.2 Les tables seront créées automatiquement

Evolution API créera automatiquement ses tables au premier démarrage. Elles incluront :
- `evolution.instances` - Les instances WhatsApp
- `evolution.messages` - L'historique des messages
- `evolution.contacts` - Les contacts
- `evolution.chats` - Les conversations

---

## Étape 3 : Configuration docker-compose.yml

### 3.1 Arrêter le container actuel

```bash
cd /opt/evolution-api
docker-compose down
```

### 3.2 Créer le nouveau docker-compose.yml

```bash
nano docker-compose.yml
```

**Copiez ce contenu :**

```yaml
services:
  evolution-api:
    container_name: evolution_api
    image: atendai/evolution-api:latest
    restart: always
    ports:
      - "8080:8080"
    environment:
      # ==================== CONFIGURATION API ====================
      - SERVER_URL=http://VOTRE_IP:8080
      - SERVER_PORT=8080

      # ==================== AUTHENTICATION ====================
      - AUTHENTICATION_API_KEY=my-super-secret-key-2024-xyz

      # ==================== DATABASE SUPABASE ====================
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://postgres.xxxxx:VOTRE_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=evolution
      - DATABASE_CONNECTION_CLIENT_NAME=evolution_api

      # Sauvegarder les données dans Supabase
      - DATABASE_SAVE_DATA_INSTANCE=true
      - DATABASE_SAVE_DATA_NEW_MESSAGE=true
      - DATABASE_SAVE_MESSAGE_UPDATE=true
      - DATABASE_SAVE_DATA_CONTACTS=true
      - DATABASE_SAVE_DATA_CHATS=true
      - DATABASE_SAVE_DATA_LABELS=true
      - DATABASE_SAVE_DATA_HISTORIC=true

      # ==================== RABBITMQ - DÉSACTIVÉ ====================
      - RABBITMQ_ENABLED=false

      # ==================== LOGS ====================
      - LOG_LEVEL=ERROR
      - LOG_COLOR=true
      - LOG_BAILEYS=error

      # ==================== INSTANCES ====================
      - DEL_INSTANCE=false
      - DEL_TEMP_INSTANCES=false

      # ==================== WEBHOOK ====================
      - WEBHOOK_GLOBAL_ENABLED=false
      - WEBHOOK_GLOBAL_URL=

      # ==================== STORE ====================
      - STORE_MESSAGES=true
      - STORE_MESSAGE_UP=true
      - STORE_CONTACTS=true
      - STORE_CHATS=true

      # ==================== CACHE - DÉSACTIVÉ ====================
      - CACHE_REDIS_ENABLED=false

      # ==================== CHATWOOT - DÉSACTIVÉ ====================
      - CHATWOOT_ENABLED=false

      # ==================== TYPEBOT - DÉSACTIVÉ ====================
      - TYPEBOT_ENABLED=false

    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store
    networks:
      - evolution_network

volumes:
  evolution_instances:
  evolution_store:

networks:
  evolution_network:
    driver: bridge
```

**⚠️ IMPORTANT - Remplacer :**

1. **VOTRE_IP** → L'IP publique de votre serveur Hostinger
2. **my-super-secret-key-2024-xyz** → Une clé API secrète forte
3. **DATABASE_CONNECTION_URI** → Votre connection string Supabase complète

**Exemple de connection string :**
```
postgresql://postgres.abcdefghijklmnop:MonMotDePasse123!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=evolution
```

**Note importante :** Ajoutez `&schema=evolution` à la fin de votre connection string pour utiliser le schéma dédié.

**Sauvegarder :** `Ctrl + X` → `Y` → `Enter`

---

## Étape 4 : Lancer Evolution API

```bash
# Démarrer
docker-compose up -d

# Voir les logs
docker-compose logs -f evolution-api
```

### 4.1 Logs attendus (succès)

```
evolution_api | Database connection established
evolution_api | Database synchronized
evolution_api | Evolution API is running on port 8080
evolution_api | Instance manager initialized
```

### 4.2 Logs d'erreur possibles

**Erreur : "Connection refused" ou "Timeout"**
```
evolution_api | Error: connect ETIMEDOUT
```
→ Vérifiez que votre serveur Hostinger peut accéder à Supabase (pas de pare-feu bloquant)

**Erreur : "Invalid password"**
```
evolution_api | Error: password authentication failed
```
→ Vérifiez le mot de passe dans la connection string

**Erreur : "Database does not exist"**
```
evolution_api | Error: database "postgres" does not exist
```
→ Utilisez bien `postgres` comme nom de base dans l'URI

---

## Étape 5 : Vérifier la connexion

### 5.1 Tester l'API

```bash
curl http://localhost:8080
```

**Réponse attendue :**
```json
{
  "status": 200,
  "message": "Welcome to the Evolution API"
}
```

### 5.2 Vérifier les tables dans Supabase

1. Allez dans **Table Editor** de Supabase
2. Sélectionnez le schéma **evolution** (en haut à gauche)
3. Vous devriez voir les tables créées automatiquement :
   - `Instance`
   - `Message`
   - `Contact`
   - `Chat`
   - `Label`
   - etc.

---

## Étape 6 : Créer une instance WhatsApp

```bash
curl -X POST http://VOTRE_IP:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: my-super-secret-key-2024-xyz" \
  -d '{
    "instanceName": "veille-ia-prod",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

**Réponse :**
```json
{
  "instance": {
    "instanceName": "veille-ia-prod",
    "status": "created"
  },
  "hash": {
    "apikey": "my-super-secret-key-2024-xyz"
  },
  "qrcode": {
    "code": "...",
    "base64": "data:image/png;base64,..."
  }
}
```

### 6.1 Vérifier l'instance dans Supabase

1. Allez dans **Table Editor** → Schéma **evolution** → Table **Instance**
2. Vous devriez voir votre instance `veille-ia-prod`

---

## Étape 7 : Scanner le QR Code

### Option A : Via navigateur
```
http://VOTRE_IP:8080/instance/connect/veille-ia-prod
```

### Option B : Récupérer le QR code
```bash
curl http://VOTRE_IP:8080/instance/qrcode/veille-ia-prod \
  -H "apikey: my-super-secret-key-2024-xyz"
```

**Scanner avec WhatsApp :**
1. Ouvrir WhatsApp
2. Menu (3 points) → **Appareils connectés**
3. **Connecter un appareil**
4. Scanner le QR code

---

## Étape 8 : Vérifier la connexion

```bash
curl http://VOTRE_IP:8080/instance/connectionState/veille-ia-prod \
  -H "apikey: my-super-secret-key-2024-xyz"
```

**Réponse si connecté :**
```json
{
  "instance": {
    "instanceName": "veille-ia-prod",
    "state": "open"
  }
}
```

### 8.1 Vérifier dans Supabase

Dans la table **evolution.Instance**, la colonne `connectionStatus` devrait être `open`.

---

## Étape 9 : Tester l'envoi de messages

### 9.1 Message texte

```bash
curl -X POST http://VOTRE_IP:8080/message/sendText/veille-ia-prod \
  -H "Content-Type: application/json" \
  -H "apikey: my-super-secret-key-2024-xyz" \
  -d '{
    "number": "33612345678",
    "text": "Test depuis Evolution API avec Supabase !"
  }'
```

### 9.2 Vérifier dans Supabase

1. Table **evolution.Message** → Vous devriez voir le message envoyé
2. Colonnes importantes :
   - `key_remoteJid` : Le numéro du destinataire
   - `message_conversation` : Le texte du message
   - `messageTimestamp` : L'heure d'envoi

---

## Étape 10 : Configuration avancée

### 10.1 Activer le webhook global (optionnel)

Si vous voulez recevoir des notifications dans n8n quand vous recevez des messages :

```yaml
# Dans docker-compose.yml
- WEBHOOK_GLOBAL_ENABLED=true
- WEBHOOK_GLOBAL_URL=https://votre-n8n.com/webhook/evolution-whatsapp
- WEBHOOK_EVENTS_APPLICATION_STARTUP=true
- WEBHOOK_EVENTS_QRCODE_UPDATED=true
- WEBHOOK_EVENTS_MESSAGES_SET=true
- WEBHOOK_EVENTS_MESSAGES_UPSERT=true
- WEBHOOK_EVENTS_SEND_MESSAGE=true
```

### 10.2 Sauvegarder les médias dans Supabase Storage (optionnel)

```yaml
# Dans docker-compose.yml
- S3_ENABLED=true
- S3_ACCESS_KEY=votre_supabase_access_key
- S3_SECRET_KEY=votre_supabase_secret_key
- S3_BUCKET=evolution-media
- S3_PORT=443
- S3_ENDPOINT=https://VOTRE_PROJECT.supabase.co/storage/v1
- S3_USE_SSL=true
```

---

## 🔍 Monitoring et Debug

### Voir tous les logs

```bash
docker-compose logs -f evolution-api
```

### Voir les instances actives

```bash
curl http://VOTRE_IP:8080/instance/fetchInstances \
  -H "apikey: my-super-secret-key-2024-xyz"
```

### Redémarrer une instance

```bash
curl -X PUT http://VOTRE_IP:8080/instance/restart/veille-ia-prod \
  -H "apikey: my-super-secret-key-2024-xyz"
```

### Vérifier les messages dans Supabase

```sql
-- Dans SQL Editor de Supabase
SELECT
  key_id,
  key_remoteJid,
  message_conversation,
  messageTimestamp,
  status
FROM evolution."Message"
ORDER BY messageTimestamp DESC
LIMIT 10;
```

---

## 📊 Requêtes SQL utiles

### Voir toutes les instances

```sql
SELECT
  name,
  connectionStatus,
  ownerJid,
  profileName,
  createdAt
FROM evolution."Instance"
ORDER BY createdAt DESC;
```

### Statistiques des messages

```sql
SELECT
  DATE(to_timestamp(CAST(messageTimestamp AS BIGINT) / 1000)) as date,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE key_fromMe = true) as sent,
  COUNT(*) FILTER (WHERE key_fromMe = false) as received
FROM evolution."Message"
GROUP BY date
ORDER BY date DESC
LIMIT 30;
```

### Contacts les plus actifs

```sql
SELECT
  key_remoteJid as phone,
  COUNT(*) as message_count
FROM evolution."Message"
WHERE key_remoteJid LIKE '%@s.whatsapp.net'
GROUP BY key_remoteJid
ORDER BY message_count DESC
LIMIT 10;
```

---

## ✅ Checklist finale

### Configuration
- [ ] Connection string Supabase récupérée
- [ ] Schéma `evolution` créé dans Supabase
- [ ] docker-compose.yml configuré avec DATABASE_ENABLED=true
- [ ] API Key secrète définie
- [ ] Container Evolution API lancé

### Test
- [ ] API répond sur http://VOTRE_IP:8080
- [ ] Tables créées automatiquement dans Supabase
- [ ] Instance WhatsApp créée
- [ ] QR Code scanné
- [ ] Connexion établie (state: open)
- [ ] Message test envoyé avec succès
- [ ] Message visible dans Supabase table evolution.Message

### Sécurité
- [ ] Mot de passe Supabase fort
- [ ] API Key Evolution secrète et unique
- [ ] Pare-feu configuré (port 8080)
- [ ] Connection pooling activé (pgbouncer=true)

---

## 🎯 Avantages d'utiliser Supabase

✅ **Persistance des données** : Les messages et contacts survivent aux redémarrages
✅ **Backup automatique** : Supabase fait des backups quotidiens
✅ **Scalabilité** : Peut gérer des millions de messages
✅ **Monitoring** : Visualisez les données directement dans Supabase
✅ **Intégration** : Facile de faire des requêtes depuis n8n ou votre app
✅ **Gratuit** : Jusqu'à 500MB de base de données

---

## 🚀 Commandes rapides

```bash
# Démarrer
cd /opt/evolution-api && docker-compose up -d

# Voir les logs
docker-compose logs -f evolution-api

# Redémarrer
docker-compose restart

# Arrêter
docker-compose down

# Mettre à jour
docker-compose pull && docker-compose up -d
```

---

**Prêt à configurer ? Commencez par récupérer votre connection string Supabase ! 🎉**
