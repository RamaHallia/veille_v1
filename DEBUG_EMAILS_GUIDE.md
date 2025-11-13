# 🐛 Guide de débogage - Emails destinataires et CC

## Étapes de test

### 1️⃣ Vérifier que les colonnes existent dans Supabase

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **SQL Editor**
4. Exécutez cette requête :

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'clients'
AND column_name IN ('email_destinataires', 'email_cc');
```

**Résultat attendu :**
```
column_name           | data_type
----------------------|------------
email_destinataires   | ARRAY
email_cc              | ARRAY
```

✅ Si vous voyez ces 2 lignes, les colonnes existent → Passez à l'étape 2
❌ Si rien n'apparaît, les colonnes n'existent pas → Exécutez la migration ci-dessous

**Migration à exécuter si les colonnes n'existent pas :**
```sql
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS email_destinataires text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS email_cc text[] DEFAULT '{}';
```

---

### 2️⃣ Tester l'application avec la console ouverte

1. **Ouvrez votre application** : http://localhost:5173
2. **Ouvrez la console** :
   - Windows/Linux : `F12` ou `Ctrl+Shift+I`
   - Mac : `Cmd+Option+I`
3. **Allez dans l'onglet "Console"**

#### A) Test de chargement

1. Allez dans **Settings** (Paramètres)
2. **Regardez la console**, vous devriez voir :

```
=== CHARGEMENT CONFIG ===
Données complètes: {id: "...", prenom: "...", email_destinataires: [...], ...}
Email destinataires chargés: []  (ou avec des valeurs si déjà rempli)
Email CC chargés: []
États React mis à jour
emailDestinataires state: []
emailCc state: []
```

**Questions à vérifier :**
- ✅ Les logs apparaissent ?
- ✅ `email_destinataires` et `email_cc` sont présents dans "Données complètes" ?
- ❌ Si ces champs n'apparaissent pas → Les colonnes n'existent pas dans la DB

---

#### B) Test d'ajout d'emails

1. Dans Settings, ajoutez un email dans **Destinataires principaux** :
   - Tapez : `test@example.com`
   - Cliquez sur **"Ajouter"**

2. **Vérifiez visuellement** :
   - ✅ L'email apparaît dans la liste ?
   - ✅ Le badge vert avec l'email est visible ?

3. Ajoutez aussi un email en **Copie (CC)** :
   - Tapez : `cc@example.com`
   - Cliquez sur **"Ajouter"**

4. **Vérifiez visuellement** :
   - ✅ L'email apparaît dans la liste CC ?
   - ✅ Le badge bleu avec l'email est visible ?

---

#### C) Test de sauvegarde

1. Cliquez sur **"Enregistrer les modifications"**

2. **Regardez la console**, vous devriez voir :

```
=== DONNÉES À SAUVEGARDER ===
User ID: "..."
Email destinataires: ["test@example.com"]
Email CC: ["cc@example.com"]
Objet complet à envoyer: {
  prenom: "...",
  email: "...",
  email_destinataires: ["test@example.com"],
  email_cc: ["cc@example.com"],
  ...
}
✅ DONNÉES SAUVEGARDÉES: [{...}]
Email destinataires dans DB: ["test@example.com"]
Email CC dans DB: ["cc@example.com"]
```

**Questions à vérifier :**
- ✅ Les logs "DONNÉES À SAUVEGARDER" apparaissent ?
- ✅ `Email destinataires` contient bien vos emails ?
- ✅ Le log "✅ DONNÉES SAUVEGARDÉES" apparaît ?
- ✅ Les emails sont confirmés dans la DB ?
- ❌ Un message d'erreur apparaît ? → Notez l'erreur exacte

---

### 3️⃣ Vérifier dans Supabase

1. Allez dans **Supabase Dashboard** → **Table Editor**
2. Ouvrez la table **`clients`**
3. Trouvez votre ligne (avec votre `user_id`)
4. Regardez les colonnes `email_destinataires` et `email_cc`

**Ce que vous devriez voir :**
```
email_destinataires: ["test@example.com"]
email_cc: ["cc@example.com"]
```

---

## 🔍 Diagnostics possibles

### Problème 1 : Les colonnes n'existent pas
**Symptôme :** Dans la console, `email_destinataires` et `email_cc` n'apparaissent pas dans "Données complètes"

**Solution :**
```sql
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS email_destinataires text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS email_cc text[] DEFAULT '{}';
```

---

### Problème 2 : Erreur de permission
**Symptôme :** Dans la console, vous voyez :
```
❌ ERREUR Supabase: {...}
Message: "new row violates row-level security policy"
```

**Solution :** Vérifier les RLS (Row Level Security) dans Supabase
1. Allez dans **Authentication** → **Policies**
2. Vérifiez que la table `clients` a une policy UPDATE pour l'utilisateur authentifié

**Politique à créer si nécessaire :**
```sql
CREATE POLICY "Users can update their own client config"
ON clients FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);
```

---

### Problème 3 : Les emails ne s'affichent pas après sauvegarde
**Symptôme :** Sauvegarde réussie, mais après rechargement de la page, les emails disparaissent

**Solution :** Vérifier le SELECT dans `loadConfig()`
1. Ouvrez la console
2. Regardez le log "=== CHARGEMENT CONFIG ==="
3. Vérifiez que `email_destinataires` et `email_cc` contiennent bien vos données

Si vide → Problème de sauvegarde
Si rempli → Problème d'affichage dans l'UI

---

### Problème 4 : Validation email ne fonctionne pas
**Symptôme :** Impossible d'ajouter un email, message "Veuillez entrer une adresse email valide"

**Solution :** Vérifier que l'email respecte le format :
- ✅ `test@example.com`
- ✅ `john.doe@company.co.uk`
- ❌ `test@`
- ❌ `test`
- ❌ `@example.com`

---

## 📸 Captures d'écran attendues

### Console lors du chargement
```
=== CHARGEMENT CONFIG ===
Données complètes: Object {
  id: "550e8400-e29b-41d4-a716-446655440000"
  prenom: "John"
  email: "john@example.com"
  email_destinataires: []
  email_cc: []
  ...
}
```

### Console lors de la sauvegarde
```
=== DONNÉES À SAUVEGARDER ===
User ID: abc123
Email destinataires: ["test@example.com"]
Email CC: []
Objet complet à envoyer: {...}
✅ DONNÉES SAUVEGARDÉES: [...]
Email destinataires dans DB: ["test@example.com"]
Email CC dans DB: []
```

---

## 🎯 Checklist de vérification

- [ ] Les colonnes existent dans Supabase (étape 1)
- [ ] La console affiche les logs au chargement (étape 2A)
- [ ] Je peux ajouter des emails visuellement (étape 2B)
- [ ] La console affiche les logs de sauvegarde (étape 2C)
- [ ] Le message "✅ DONNÉES SAUVEGARDÉES" apparaît
- [ ] Les données sont visibles dans Supabase (étape 3)
- [ ] Après rechargement, les emails sont toujours là

---

## 💡 Astuce finale

Si tout échoue, testez directement dans Supabase avec SQL :

```sql
-- Vérifier votre user_id
SELECT user_id FROM clients WHERE email = 'votre@email.com';

-- Mettre à jour manuellement (remplacez YOUR_USER_ID)
UPDATE clients
SET
  email_destinataires = ARRAY['test1@example.com', 'test2@example.com'],
  email_cc = ARRAY['cc@example.com']
WHERE user_id = 'YOUR_USER_ID';

-- Vérifier que ça a fonctionné
SELECT email_destinataires, email_cc
FROM clients
WHERE user_id = 'YOUR_USER_ID';
```

Si la mise à jour SQL fonctionne → Le problème vient du code frontend
Si la mise à jour SQL échoue → Le problème vient de la base de données
