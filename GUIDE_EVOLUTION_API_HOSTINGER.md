# 🚀 Guide d'installation Evolution API sur Hostinger

## 📋 Prérequis

- ✅ Serveur Linux VPS chez Hostinger
- ✅ Accès SSH au serveur
- ✅ Docker installé (ou on va l'installer)
- ✅ Minimum 2GB RAM recommandé
- ✅ Port 8080 disponible (ou autre au choix)

---

## 🔧 Étape 1 : Connexion SSH à votre serveur Hostinger

### Via Terminal (Windows PowerShell, Mac/Linux Terminal)

```bash
ssh root@VOTRE_IP_SERVEUR
# Ou
ssh votre_utilisateur@VOTRE_IP_SERVEUR
```

**Exemple :**
```bash
ssh root@178.128.45.67
```

Entrez votre mot de passe quand demandé.

---

## 🐳 Étape 2 : Installer Docker (si pas déjà installé)

### 2.1 Vérifier si Docker est installé

```bash
docker --version
```

Si Docker n'est pas installé, continuez ci-dessous.

### 2.2 Installation Docker sur Ubuntu/Debian

```bash
# 1. Mettre à jour les packages
sudo apt update
sudo apt upgrade -y

# 2. Installer les dépendances
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# 3. Ajouter la clé GPG Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 4. Ajouter le repository Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Installer Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# 6. Démarrer Docker
sudo systemctl start docker
sudo systemctl enable docker

# 7. Vérifier l'installation
docker --version
```

### 2.3 Installer Docker Compose

```bash
# 1. Télécharger Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 2. Rendre exécutable
sudo chmod +x /usr/local/bin/docker-compose

# 3. Vérifier
docker-compose --version
```

---

## 📦 Étape 3 : Installer Evolution API

### 3.1 Créer le dossier pour Evolution API

```bash
# Créer le dossier
mkdir -p /opt/evolution-api
cd /opt/evolution-api
```

### 3.2 Créer le fichier docker-compose.yml

```bash
nano docker-compose.yml
```

**Copiez ce contenu dans le fichier :**

```yaml
version: '3.3'

services:
  evolution-api:
    container_name: evolution_api
    image: atendai/evolution-api:latest
    restart: always
    ports:
      - "8080:8080"
    environment:
      # ==================== CONFIGURATION API ====================
      - SERVER_URL=https://VOTRE_DOMAINE.COM  # Remplacer par votre domaine ou IP
      - SERVER_PORT=8080

      # ==================== AUTHENTICATION ====================
      - AUTHENTICATION_API_KEY=VOTRE_CLE_API_SECRETE_ICI_123456789

      # ==================== DATABASE (Optionnel - pour persistance) ====================
      # Si vous voulez PostgreSQL, décommentez ci-dessous
      # - DATABASE_ENABLED=true
      # - DATABASE_CONNECTION_URI=postgresql://postgres:password@postgres:5432/evolution

      # ==================== RABBITMQ (Optionnel) ====================
      # - RABBITMQ_ENABLED=false

      # ==================== LOGS ====================
      - LOG_LEVEL=info
      - LOG_COLOR=true

      # ==================== INSTANCES ====================
      - DEL_INSTANCE=false  # Ne pas supprimer les instances au redémarrage

      # ==================== WEBHOOK ====================
      - WEBHOOK_GLOBAL_ENABLED=true
      - WEBHOOK_GLOBAL_URL=  # URL de webhook globale (optionnel)

      # ==================== STORAGE ====================
      - STORE_MESSAGES=true
      - STORE_MESSAGE_UP=true
      - STORE_CONTACTS=true
      - STORE_CHATS=true

    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store
    networks:
      - evolution_network

  # ==================== NGINX REVERSE PROXY (Optionnel) ====================
  # Décommentez si vous voulez HTTPS avec Let's Encrypt
  # nginx:
  #   image: nginx:alpine
  #   container_name: evolution_nginx
  #   restart: always
  #   ports:
  #     - "80:80"
  #     - "443:443"
  #   volumes:
  #     - ./nginx.conf:/etc/nginx/nginx.conf
  #     - ./ssl:/etc/nginx/ssl
  #   depends_on:
  #     - evolution-api
  #   networks:
  #     - evolution_network

volumes:
  evolution_instances:
  evolution_store:

networks:
  evolution_network:
    driver: bridge
```

**⚠️ IMPORTANT : Remplacer :**
- `VOTRE_DOMAINE.COM` → Votre domaine ou IP publique du serveur
- `VOTRE_CLE_API_SECRETE_ICI_123456789` → Une clé secrète forte (ex: `my-super-secret-key-2024-xyz`)

**Sauvegarder le fichier :**
- Appuyez sur `Ctrl + X`
- Appuyez sur `Y`
- Appuyez sur `Enter`

### 3.3 Lancer Evolution API

```bash
# Démarrer les containers
docker-compose up -d

# Vérifier que c'est lancé
docker-compose ps

# Voir les logs
docker-compose logs -f evolution-api
```

**Vous devriez voir :**
```
evolution_api | Evolution API is running on port 8080
evolution_api | QR Code Server: http://VOTRE_IP:8080
```

### 3.4 Tester l'API

```bash
# Depuis votre serveur
curl http://localhost:8080

# Depuis votre ordinateur (remplacer VOTRE_IP)
curl http://VOTRE_IP:8080
```

**Réponse attendue :**
```json
{
  "status": 200,
  "message": "Welcome to the Evolution API"
}
```

---

## 📱 Étape 4 : Créer une instance WhatsApp

### 4.1 Créer l'instance via API

**Depuis votre ordinateur (ou Postman) :**

```bash
curl -X POST http://VOTRE_IP:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: VOTRE_CLE_API_SECRETE_ICI_123456789" \
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
    "apikey": "VOTRE_CLE_API_SECRETE_ICI_123456789"
  },
  "qrcode": {
    "code": "base64_du_qr_code...",
    "base64": "data:image/png;base64,..."
  }
}
```

### 4.2 Scanner le QR Code

**Option A : Via navigateur**
1. Allez sur `http://VOTRE_IP:8080/instance/connect/veille-ia-prod`
2. Scannez le QR code avec WhatsApp :
   - Ouvrir WhatsApp sur votre téléphone
   - Menu (3 points) → **Appareils connectés**
   - **Connecter un appareil**
   - Scanner le QR code

**Option B : Récupérer le QR en base64**
```bash
curl http://VOTRE_IP:8080/instance/qrcode/veille-ia-prod \
  -H "apikey: VOTRE_CLE_API_SECRETE_ICI_123456789"
```

Copiez le `base64` et ouvrez-le dans un navigateur :
```
data:image/png;base64,iVBORw0KGgoAAAANS...
```

### 4.3 Vérifier la connexion

```bash
curl http://VOTRE_IP:8080/instance/connectionState/veille-ia-prod \
  -H "apikey: VOTRE_CLE_API_SECRETE_ICI_123456789"
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

---

## 🔄 Étape 5 : Tester l'envoi de messages

### 5.1 Envoyer un message texte

```bash
curl -X POST http://VOTRE_IP:8080/message/sendText/veille-ia-prod \
  -H "Content-Type: application/json" \
  -H "apikey: VOTRE_CLE_API_SECRETE_ICI_123456789" \
  -d '{
    "number": "33612345678",
    "text": "Test depuis Evolution API !"
  }'
```

**⚠️ Format du numéro :** Sans le `+` (ex: `33612345678` au lieu de `+33612345678`)

### 5.2 Envoyer un fichier (PDF)

```bash
curl -X POST http://VOTRE_IP:8080/message/sendMedia/veille-ia-prod \
  -H "Content-Type: application/json" \
  -H "apikey: VOTRE_CLE_API_SECRETE_ICI_123456789" \
  -d '{
    "number": "33612345678",
    "mediatype": "document",
    "media": "https://votre-url.com/rapport.pdf",
    "fileName": "rapport-veille.pdf",
    "caption": "Votre rapport de veille du jour"
  }'
```

### 5.3 Envoyer un fichier audio

```bash
curl -X POST http://VOTRE_IP:8080/message/sendMedia/veille-ia-prod \
  -H "Content-Type: application/json" \
  -H "apikey: VOTRE_CLE_API_SECRETE_ICI_123456789" \
  -d '{
    "number": "33612345678",
    "mediatype": "audio",
    "media": "https://votre-url.com/rapport.mp3",
    "fileName": "rapport-audio.mp3"
  }'
```

---

## 🔗 Étape 6 : Intégration avec n8n

### 6.1 Créer les credentials dans n8n

Dans n8n, créez un **HTTP Header Auth** credential :
- **Name** : Evolution API
- **Header Name** : `apikey`
- **Header Value** : `VOTRE_CLE_API_SECRETE_ICI_123456789`

### 6.2 Node n8n : Vérifier si WhatsApp activé

```json
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
        },
        {
          "leftValue": "={{ $json.whatsapp }}",
          "rightValue": "",
          "operator": {
            "type": "string",
            "operation": "isNotEmpty"
          }
        }
      ],
      "combinator": "and"
    }
  },
  "type": "n8n-nodes-base.if",
  "name": "WhatsApp activé ?"
}
```

### 6.3 Node n8n : Envoyer message intro

```json
{
  "parameters": {
    "method": "POST",
    "url": "http://VOTRE_IP:8080/message/sendText/veille-ia-prod",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"number\": \"{{ $json.whatsapp.replace(/^\\+/, '').replace(/\\s/g, '') }}\",\n  \"text\": \"🎯 *Nouveau rapport de veille - {{ $json.date }}*\\n\\nBonjour {{ $json.prenom }},\\n\\nVotre rapport de veille est prêt !\\n\\nVous allez recevoir :\\n📄 Le rapport PDF\\n🎧 La version audio\\n\\nBonne lecture ! 🚀\"\n}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequest",
  "name": "Envoyer message intro WhatsApp"
}
```

### 6.4 Node n8n : Envoyer le PDF

```json
{
  "parameters": {
    "method": "POST",
    "url": "http://VOTRE_IP:8080/message/sendMedia/veille-ia-prod",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"number\": \"{{ $json.whatsapp.replace(/^\\+/, '').replace(/\\s/g, '') }}\",\n  \"mediatype\": \"document\",\n  \"media\": \"{{ $json.pdf_url }}\",\n  \"fileName\": \"rapport-veille-{{ $json.date }}.pdf\",\n  \"caption\": \"📄 Rapport PDF\"\n}",
    "options": {
      "timeout": 30000
    }
  },
  "type": "n8n-nodes-base.httpRequest",
  "name": "Envoyer PDF WhatsApp"
}
```

### 6.5 Node n8n : Envoyer l'audio

```json
{
  "parameters": {
    "method": "POST",
    "url": "http://VOTRE_IP:8080/message/sendMedia/veille-ia-prod",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"number\": \"{{ $json.whatsapp.replace(/^\\+/, '').replace(/\\s/g, '') }}\",\n  \"mediatype\": \"audio\",\n  \"media\": \"{{ $json.audio_url }}\",\n  \"fileName\": \"rapport-audio-{{ $json.date }}.mp3\"\n}",
    "options": {
      "timeout": 30000
    }
  },
  "type": "n8n-nodes-base.httpRequest",
  "name": "Envoyer Audio WhatsApp"
}
```

### 6.6 Node n8n : Logger l'envoi

```json
{
  "parameters": {
    "operation": "executeQuery",
    "query": "=UPDATE public.rapports \nSET envoye_par_whatsapp = true, \n    date_envoi_whatsapp = NOW() \nWHERE id = '{{ $json.rapport_id }}'",
    "options": {}
  },
  "type": "n8n-nodes-base.postgres",
  "name": "Logger envoi WhatsApp"
}
```

---

## 🔐 Étape 7 : Sécuriser l'installation

### 7.1 Configurer le pare-feu (UFW)

```bash
# Installer UFW si pas installé
sudo apt install ufw -y

# Autoriser SSH (IMPORTANT !)
sudo ufw allow 22/tcp

# Autoriser Evolution API (port 8080)
sudo ufw allow 8080/tcp

# Activer le pare-feu
sudo ufw enable

# Vérifier le statut
sudo ufw status
```

### 7.2 Utiliser HTTPS avec Let's Encrypt (Recommandé)

**Si vous avez un domaine (ex: api.veille-ia.com) :**

```bash
# 1. Installer Certbot
sudo apt install certbot python3-certbot-nginx -y

# 2. Obtenir le certificat SSL
sudo certbot --nginx -d api.veille-ia.com

# 3. Renouvellement automatique
sudo certbot renew --dry-run
```

**Modifier docker-compose.yml pour ajouter Nginx :**
Décommentez la section `nginx` et créez `nginx.conf` :

```nginx
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name api.veille-ia.com;

        # Redirection HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl;
        server_name api.veille-ia.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        location / {
            proxy_pass http://evolution-api:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

---

## 📊 Étape 8 : Monitoring et Logs

### 8.1 Voir les logs en temps réel

```bash
# Logs Evolution API
docker-compose logs -f evolution-api

# Logs des 100 dernières lignes
docker-compose logs --tail=100 evolution-api
```

### 8.2 Vérifier l'état de l'instance

```bash
curl http://VOTRE_IP:8080/instance/fetchInstances \
  -H "apikey: VOTRE_CLE_API_SECRETE_ICI_123456789"
```

### 8.3 Redémarrer l'instance si nécessaire

```bash
curl -X PUT http://VOTRE_IP:8080/instance/restart/veille-ia-prod \
  -H "apikey: VOTRE_CLE_API_SECRETE_ICI_123456789"
```

### 8.4 Supprimer une instance

```bash
curl -X DELETE http://VOTRE_IP:8080/instance/delete/veille-ia-prod \
  -H "apikey: VOTRE_CLE_API_SECRETE_ICI_123456789"
```

---

## 🛠️ Étape 9 : Automatisation du démarrage

### 9.1 Créer un script de démarrage

```bash
nano /opt/evolution-api/start.sh
```

**Contenu :**
```bash
#!/bin/bash
cd /opt/evolution-api
docker-compose down
docker-compose pull
docker-compose up -d
docker-compose logs -f
```

**Rendre exécutable :**
```bash
chmod +x /opt/evolution-api/start.sh
```

### 9.2 Créer un service systemd (optionnel)

```bash
sudo nano /etc/systemd/system/evolution-api.service
```

**Contenu :**
```ini
[Unit]
Description=Evolution API WhatsApp
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/evolution-api
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down

[Install]
WantedBy=multi-user.target
```

**Activer le service :**
```bash
sudo systemctl daemon-reload
sudo systemctl enable evolution-api
sudo systemctl start evolution-api
sudo systemctl status evolution-api
```

---

## 🐛 Dépannage

### Problème : L'instance se déconnecte

**Solution :**
```bash
# 1. Vérifier les logs
docker-compose logs -f evolution-api

# 2. Redémarrer l'instance
curl -X PUT http://VOTRE_IP:8080/instance/restart/veille-ia-prod \
  -H "apikey: VOTRE_CLE_API_SECRETE_ICI_123456789"

# 3. Scanner un nouveau QR code
curl http://VOTRE_IP:8080/instance/connect/veille-ia-prod
```

### Problème : Erreur "Cannot send message"

**Vérifications :**
1. L'instance est connectée ?
```bash
curl http://VOTRE_IP:8080/instance/connectionState/veille-ia-prod \
  -H "apikey: VOTRE_CLE_API_SECRETE_ICI_123456789"
```

2. Le numéro est valide ? (format sans +)
3. Le fichier PDF/audio est accessible publiquement ?

### Problème : Docker ne démarre pas

```bash
# Vérifier l'état Docker
sudo systemctl status docker

# Redémarrer Docker
sudo systemctl restart docker

# Relancer Evolution API
cd /opt/evolution-api
docker-compose up -d
```

---

## 📝 Checklist finale

### ✅ Installation
- [ ] Docker installé
- [ ] Docker Compose installé
- [ ] Evolution API lancé
- [ ] Port 8080 ouvert

### ✅ Configuration
- [ ] Instance WhatsApp créée
- [ ] QR Code scanné
- [ ] Connexion établie (state: open)
- [ ] API Key configurée

### ✅ Tests
- [ ] Message texte envoyé avec succès
- [ ] Fichier PDF envoyé avec succès
- [ ] Fichier audio envoyé avec succès

### ✅ Sécurité
- [ ] Pare-feu configuré (UFW)
- [ ] API Key forte et secrète
- [ ] HTTPS configuré (si domaine)

### ✅ Intégration n8n
- [ ] Credentials ajoutées dans n8n
- [ ] Nodes WhatsApp créés
- [ ] Test end-to-end réussi

---

## 🚀 Commandes utiles

```bash
# Démarrer Evolution API
cd /opt/evolution-api && docker-compose up -d

# Arrêter Evolution API
cd /opt/evolution-api && docker-compose down

# Redémarrer Evolution API
cd /opt/evolution-api && docker-compose restart

# Voir les logs
docker-compose logs -f evolution-api

# Mettre à jour Evolution API
cd /opt/evolution-api
docker-compose pull
docker-compose up -d

# Vérifier l'état
curl http://localhost:8080 -H "apikey: VOTRE_CLE"
```

---

## 📚 Documentation

- **Evolution API :** https://github.com/EvolutionAPI/evolution-api
- **Documentation API :** https://doc.evolution-api.com
- **Postman Collection :** https://www.postman.com/evolution-api

---

## 💡 Conseils

1. **Sauvegardez régulièrement** le dossier `/opt/evolution-api/`
2. **Utilisez un domaine** pour avoir HTTPS
3. **Surveillez les logs** régulièrement
4. **Testez d'abord** avec un petit groupe avant production
5. **Gardez l'API Key secrète** (ne la commitez jamais dans Git)

---

**Prêt à commencer ? Connectez-vous à votre serveur et lancez l'étape 1 ! 🚀**
