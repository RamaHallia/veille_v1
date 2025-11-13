# Guide de Migration Airtable → Supabase

## Vue d'ensemble

Ce guide vous accompagne dans la migration de votre workflow n8n d'Airtable vers Supabase.

## Étapes de migration

### 1. Exécuter la migration SQL dans Supabase

#### Option A : Première installation (propre)

1. Connectez-vous à votre dashboard Supabase : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** (icône de terminal dans la sidebar)
4. Cliquez sur **New query**
5. Ouvrez le fichier `supabase/migrations/20251105000000_create_clients_onboarding.sql`
6. Copiez tout le contenu et collez-le dans l'éditeur
7. Cliquez sur **Run** (ou Ctrl+Enter)
8. Vérifiez que vous voyez "Success. No rows returned"

#### Option B : Si vous avez eu l'erreur "column statut does not exist"

1. Allez dans **SQL Editor**
2. Ouvrez le fichier `supabase/migrations/20251105000001_cleanup_and_recreate.sql`
3. Copiez tout le contenu et collez-le dans l'éditeur
4. Cliquez sur **Run**
5. Vous devriez voir : "Migration terminée avec succès !"

#### Vérification

Allez dans **Table Editor** et vérifiez que les tables sont créées :
- `clients`
- `rapports`
- Vue `client_stats`

### 2. Vérifier les tables créées

Dans l'onglet **Table Editor**, vous devriez voir :

**Table `clients`** avec les colonnes :
- `id` (uuid)
- `user_id` (text, unique)
- `email` (text)
- `prenom` (text)
- `secteur` (text)
- `mots_cles` (text[] array)
- `concurrents` (text[] array)
- `profiles_linkedin` (text[] array)
- `sources_veille` (text[] array)
- `frequence` (text)
- `heure_envoi` (text)
- `canaux_diffusion` (text[] array)
- `alertes_temps_reel` (boolean)
- `status_onboarding` (text)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Table `rapports`** avec les colonnes :
- `id` (uuid)
- `client_id` (uuid, FK → clients)
- `titre` (text)
- `contenu` (text)
- `type` (text)
- `statut` (text)
- `created_at` (timestamptz)
- `sent_at` (timestamptz)

### 3. Configurer les credentials Supabase dans n8n

1. Dans votre instance n8n, allez dans **Credentials**
2. Ajoutez un nouveau credential **Supabase**
3. Remplissez :
   - **Host** : `https://xottryrwoxafervpovex.supabase.co`
   - **Service Role Secret** : Récupérez votre clé `service_role` depuis Supabase Dashboard → Settings → API → Service Role key

   ⚠️ **IMPORTANT** : Utilisez la clé `service_role` (pas `anon`) pour permettre à n8n d'écrire dans la base de données.

4. Testez la connexion

### 4. Importer le nouveau workflow n8n

1. Dans n8n, créez un nouveau workflow
2. Cliquez sur les 3 points → **Import from File**
3. Sélectionnez `n8n-workflow-supabase.json`
4. Mettez à jour tous les nodes Supabase avec vos credentials :
   - Search Client in Supabase
   - Create Client in Supabase
   - Update Client Basic Info
   - Update Client Full Onboarding

### 5. Différences clés Airtable vs Supabase

#### Format des données

**Airtable (ancien)** :
```javascript
// Texte multi-lignes
{
  "Concurrents": "Vinci\nBouygues\nEiffage",
  "MOTS CLES": "0:Construction\n1:BTP\n2:Génie civil"
}
```

**Supabase (nouveau)** :
```javascript
// Arrays PostgreSQL
{
  "concurrents": ["Vinci", "Bouygues", "Eiffage"],
  "mots_cles": ["Construction", "BTP", "Génie civil"]
}
```

#### Requêtes

**Airtable** :
```javascript
filterByFormula: "={ID} = \"user_123\""
```

**Supabase** :
```sql
SELECT * FROM clients WHERE user_id = 'user_123' LIMIT 1
```

### 6. Tester le workflow

1. Activez le workflow dans n8n
2. Testez avec un appel webhook :

```bash
curl -X POST https://n8n.srv954650.hstgr.cloud/webhook-test/AgentIA \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Bonjour",
    "user_id": "test_user_001"
  }'
```

3. Vérifiez dans Supabase Table Editor que :
   - Un nouveau client a été créé
   - Les mises à jour fonctionnent correctement

### 7. Migrer les données existantes (optionnel)

Si vous avez des données dans Airtable à migrer :

#### Méthode 1 : Export/Import CSV

1. Exportez votre table Airtable en CSV
2. Créez un script de transformation :

```javascript
// transform-airtable-to-supabase.js
const fs = require('fs');
const csv = require('csv-parser');

const results = [];

fs.createReadStream('airtable_export.csv')
  .pipe(csv())
  .on('data', (row) => {
    results.push({
      user_id: row.ID,
      email: row.Email,
      prenom: row.Prenom,
      secteur: row.Secteur,
      mots_cles: row['MOTS CLES']?.split('\n').map(m => m.replace(/^\d+:/, '')) || [],
      concurrents: row.Concurrents?.split('\n') || [],
      profiles_linkedin: row['Profils LinkedIn']?.split('\n') || [],
      sources_veille: row['Flux RSS validés']?.split('\n') || [],
      frequence: row['Fréquence rapport'],
      heure_envoi: row['Heure envoi'],
      canaux_diffusion: row['Canaux diffusion']?.split(', ') || [],
      alertes_temps_reel: row['Alertes temps réel ?'] === 'true',
      status_onboarding: row['Status Onboarding']
    });
  })
  .on('end', () => {
    fs.writeFileSync('supabase_import.json', JSON.stringify(results, null, 2));
    console.log('✅ Transformation terminée');
  });
```

3. Importez dans Supabase via l'API :

```javascript
const { createClient } = require('@supabase/supabase-js');
const data = require('./supabase_import.json');

const supabase = createClient(
  'https://xottryrwoxafervpovex.supabase.co',
  'YOUR_SERVICE_ROLE_KEY'
);

async function migrate() {
  const { data: inserted, error } = await supabase
    .from('clients')
    .insert(data);

  if (error) console.error('Erreur:', error);
  else console.log(`✅ ${inserted.length} clients migrés`);
}

migrate();
```

#### Méthode 2 : Via n8n (recommandé pour petits volumes)

1. Créez un workflow temporaire :
   - Airtable: List Records
   - Code: Transform data
   - Supabase: Insert Records

### 8. Avantages de Supabase vs Airtable

✅ **Performance** :
- Requêtes SQL natives (plus rapides)
- Indexes optimisés
- Pas de limite de taux (rate limits)

✅ **Coût** :
- Plan gratuit : 500 MB de base de données
- Airtable gratuit : 1,200 records/base max

✅ **Flexibilité** :
- Types de données natifs (arrays, JSON, etc.)
- Triggers et fonctions PostgreSQL
- RLS (Row Level Security) intégré

✅ **Intégration** :
- Déjà utilisé pour votre frontend
- Une seule stack technique
- API REST et Realtime intégrées

### 9. Checklist de vérification

- [ ] Migration SQL exécutée avec succès
- [ ] Tables `clients` et `rapports` créées
- [ ] Credentials Supabase configurés dans n8n (service_role key)
- [ ] Workflow n8n importé et activé
- [ ] Test webhook réussi
- [ ] Données Airtable migrées (si applicable)
- [ ] Ancien workflow Airtable désactivé

### 10. Surveillance et maintenance

**Logs dans Supabase** :
- Allez dans **Logs Explorer**
- Filtrez par table `clients` pour voir les insertions/updates

**Logs dans n8n** :
- Vérifiez l'historique d'exécution du workflow
- Surveillez les erreurs éventuelles

**Requêtes utiles** :

```sql
-- Nombre de clients par statut
SELECT status_onboarding, COUNT(*)
FROM clients
GROUP BY status_onboarding;

-- Derniers clients créés
SELECT user_id, email, prenom, created_at
FROM clients
ORDER BY created_at DESC
LIMIT 10;

-- Statistiques via la vue
SELECT * FROM client_stats
WHERE nb_rapports_generes > 0;

-- Clients avec onboarding complété
SELECT * FROM clients
WHERE status_onboarding = 'done';
```

## Support

En cas de problème :
1. Vérifiez les logs n8n
2. Vérifiez les logs Supabase
3. Testez la requête SQL directement dans l'éditeur Supabase
4. Vérifiez que la clé `service_role` est bien utilisée

## Prochaines étapes

Après la migration, vous pouvez :
- Implémenter la génération automatique de rapports
- Ajouter des triggers Supabase pour les notifications
- Connecter le frontend React à la table `clients`
- Mettre en place les workflows de veille automatique
