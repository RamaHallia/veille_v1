# 📊 Stratégie de Collecte de Données pour les Graphiques

## Question : Comment obtenir les données pour les graphiques du Dashboard ?

Excellente question ! Voici la stratégie complète pour alimenter votre dashboard avec de vraies données.

---

## 🎯 Les 3 Approches Possibles

### Approche 1 : Données Calculées en Temps Réel ⚡
**Avantages :** Toujours à jour, pas de stockage supplémentaire
**Inconvénients :** Plus lent si beaucoup de données

### Approche 2 : Agrégation avec Vues Matérialisées 🗂️
**Avantages :** Rapide, optimisé pour les lectures
**Inconvénients :** Nécessite des mises à jour périodiques

### Approche 3 : Tables d'Analytics Dédiées 📈 (RECOMMANDÉ)
**Avantages :** Ultra-rapide, historique complet, évolutif
**Inconvénients :** Structure plus complexe

---

## 🚀 SOLUTION RECOMMANDÉE : Approche 3

Je vais vous montrer comment créer des tables analytics dédiées qui agrègent automatiquement vos données.

---

## 📊 1. TABLES À CRÉER

### Table `analytics_daily` - Métriques quotidiennes

```sql
CREATE TABLE analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Métriques générales
  total_reports INTEGER DEFAULT 0,
  total_sources INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,

  -- Métriques par source
  sources_by_category JSONB DEFAULT '{}',
  -- Ex: {"presse": 45, "social_media": 32, "blogs": 18}

  -- Métriques de sentiment (si vous ajoutez l'analyse)
  sentiment_positive INTEGER DEFAULT 0,
  sentiment_neutral INTEGER DEFAULT 0,
  sentiment_negative INTEGER DEFAULT 0,

  -- Mentions par concurrent (si vous trackez ça)
  competitor_mentions JSONB DEFAULT '{}',
  -- Ex: {"Concurrent A": 23, "Concurrent B": 18}

  -- Mots-clés top
  top_keywords JSONB DEFAULT '[]',
  -- Ex: [{"keyword": "IA", "count": 45}, {"keyword": "ChatGPT", "count": 32}]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour requêtes rapides
CREATE INDEX idx_analytics_daily_client_date ON analytics_daily(client_id, date DESC);
CREATE INDEX idx_analytics_daily_date ON analytics_daily(date DESC);
```

### Table `analytics_competitors` - Tracking des concurrents

```sql
CREATE TABLE analytics_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  date DATE NOT NULL,

  -- Métriques
  mentions_count INTEGER DEFAULT 0,
  sentiment_score FLOAT DEFAULT 0, -- -1 à 1
  innovation_score FLOAT DEFAULT 0, -- 0 à 100
  engagement_score FLOAT DEFAULT 0, -- 0 à 100
  visibility_score FLOAT DEFAULT 0, -- 0 à 100

  -- Événements importants du jour
  events JSONB DEFAULT '[]',
  -- Ex: [{"type": "product_launch", "title": "Nouveau produit X"}]

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_competitors_client ON analytics_competitors(client_id, date DESC);
```

### Table `analytics_trends` - Tendances émergentes

```sql
CREATE TABLE analytics_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category TEXT, -- 'technology', 'product', 'market', etc.

  -- Métriques de tendance
  mentions_count INTEGER DEFAULT 0,
  growth_rate FLOAT DEFAULT 0, -- Pourcentage de croissance
  trending_score FLOAT DEFAULT 0, -- Score de tendance (0-100)

  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Historique (7 derniers jours)
  historical_data JSONB DEFAULT '[]',
  -- Ex: [{"date": "2025-11-01", "count": 12}, ...]

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_trends_client ON analytics_trends(client_id, trending_score DESC);
```

---

## ⚙️ 2. FONCTIONS D'AGRÉGATION AUTOMATIQUE

### Fonction : Calculer les analytics quotidiennes

```sql
CREATE OR REPLACE FUNCTION update_daily_analytics(target_client_id UUID, target_date DATE)
RETURNS VOID AS $$
DECLARE
  report_count INTEGER;
  chunk_count INTEGER;
  sources_data JSONB;
  keywords_data JSONB;
BEGIN
  -- Compter les rapports du jour
  SELECT COUNT(*) INTO report_count
  FROM rapports
  WHERE client_id = target_client_id
    AND DATE(date_generation) = target_date;

  -- Compter les chunks du jour
  SELECT COUNT(*) INTO chunk_count
  FROM rapport_chunks rc
  JOIN rapports r ON rc.rapport_id = r.id
  WHERE rc.client_id = target_client_id
    AND DATE(r.date_generation) = target_date;

  -- Agréger les sources par catégorie
  -- (Vous devez ajouter une colonne "category" dans rapport_chunks ou extraire depuis metadata)
  SELECT jsonb_object_agg(category, count)
  INTO sources_data
  FROM (
    SELECT
      COALESCE(metadata->>'category', 'unknown') as category,
      COUNT(*) as count
    FROM rapport_chunks rc
    JOIN rapports r ON rc.rapport_id = r.id
    WHERE rc.client_id = target_client_id
      AND DATE(r.date_generation) = target_date
    GROUP BY category
  ) categories;

  -- Extraire les top keywords
  SELECT jsonb_agg(jsonb_build_object('keyword', keyword, 'count', count))
  INTO keywords_data
  FROM (
    SELECT
      unnest(mots_cles) as keyword,
      COUNT(*) as count
    FROM rapports
    WHERE client_id = target_client_id
      AND DATE(date_generation) = target_date
    GROUP BY keyword
    ORDER BY count DESC
    LIMIT 10
  ) keywords;

  -- Insérer ou mettre à jour
  INSERT INTO analytics_daily (
    client_id, date, total_reports, total_chunks,
    sources_by_category, top_keywords
  )
  VALUES (
    target_client_id, target_date, report_count, chunk_count,
    COALESCE(sources_data, '{}'::jsonb), COALESCE(keywords_data, '[]'::jsonb)
  )
  ON CONFLICT (client_id, date) DO UPDATE SET
    total_reports = EXCLUDED.total_reports,
    total_chunks = EXCLUDED.total_chunks,
    sources_by_category = EXCLUDED.sources_by_category,
    top_keywords = EXCLUDED.top_keywords,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

### Trigger : Mise à jour automatique après génération de rapport

```sql
CREATE OR REPLACE FUNCTION trigger_update_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Appeler la fonction d'agrégation pour ce client et cette date
  PERFORM update_daily_analytics(NEW.client_id, DATE(NEW.date_generation));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_rapport_insert_or_update
AFTER INSERT OR UPDATE ON rapports
FOR EACH ROW
EXECUTE FUNCTION trigger_update_analytics();
```

---

## 📈 3. REQUÊTES POUR ALIMENTER LES GRAPHIQUES

### Graphique : Évolution des mentions (7 derniers jours)

```typescript
// Dans votre composant AnalyticsDashboard.tsx

const fetchTrendData = async (clientId: string) => {
  const { data, error } = await supabase
    .from('analytics_daily')
    .select('date, total_sources')
    .eq('client_id', clientId)
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching trend data:', error);
    return [];
  }

  // Transformer pour le graphique
  return data.map(row => ({
    date: new Date(row.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    mentions: row.total_sources,
  }));
};
```

### Graphique : Sources par catégorie

```typescript
const fetchCategoryData = async (clientId: string) => {
  // Récupérer les données du jour le plus récent
  const { data, error } = await supabase
    .from('analytics_daily')
    .select('sources_by_category')
    .eq('client_id', clientId)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return [];
  }

  // Transformer pour le graphique
  const categories = data.sources_by_category as Record<string, number>;
  return Object.entries(categories).map(([name, value]) => ({
    name,
    value,
  }));
};
```

### Graphique : Comparaison concurrents (Radar)

```typescript
const fetchCompetitorData = async (clientId: string) => {
  const { data, error } = await supabase
    .from('analytics_competitors')
    .select('*')
    .eq('client_id', clientId)
    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    return [];
  }

  // Agréger par concurrent (moyenne sur 7 jours)
  const competitorMap = new Map();

  data.forEach(row => {
    if (!competitorMap.has(row.competitor_name)) {
      competitorMap.set(row.competitor_name, {
        name: row.competitor_name,
        mentions: 0,
        sentiment: 0,
        innovation: 0,
        engagement: 0,
        visibility: 0,
        count: 0,
      });
    }

    const comp = competitorMap.get(row.competitor_name);
    comp.mentions += row.mentions_count;
    comp.sentiment += row.sentiment_score * 100; // Normaliser à 0-100
    comp.innovation += row.innovation_score;
    comp.engagement += row.engagement_score;
    comp.visibility += row.visibility_score;
    comp.count += 1;
  });

  // Calculer les moyennes
  return Array.from(competitorMap.values()).map(comp => ({
    name: comp.name,
    mentions: Math.round(comp.mentions / comp.count),
    sentiment: Math.round(comp.sentiment / comp.count),
    innovation: Math.round(comp.innovation / comp.count),
    engagement: Math.round(comp.engagement / comp.count),
    visibility: Math.round(comp.visibility / comp.count),
  }));
};
```

### Graphique : Mots-clés tendances

```typescript
const fetchTopKeywords = async (clientId: string) => {
  const { data, error } = await supabase
    .from('analytics_trends')
    .select('keyword, mentions_count, growth_rate')
    .eq('client_id', clientId)
    .order('trending_score', { ascending: false })
    .limit(10);

  if (error) {
    return [];
  }

  return data.map(row => ({
    keyword: row.keyword,
    count: row.mentions_count,
    trend: row.growth_rate > 0 ? 'up' : row.growth_rate < 0 ? 'down' : 'stable',
  }));
};
```

---

## 🔄 4. SOLUTION IMMÉDIATE (Sans créer de nouvelles tables)

Si vous voulez commencer MAINTENANT sans créer de nouvelles tables, voici comment extraire les données directement:

### Données depuis rapports + rapport_chunks

```typescript
// Dans votre AnalyticsDashboard.tsx

const loadDashboardData = async () => {
  if (!user?.id) return;

  // 1. Récupérer le client_id
  const { data: clientData } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!clientData) return;

  // 2. Stats générales
  const { count: reportCount } = await supabase
    .from('rapports')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientData.id);

  const { count: chunkCount } = await supabase
    .from('rapport_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientData.id);

  // 3. Évolution sur 7 jours
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentReports } = await supabase
    .from('rapports')
    .select('date_generation, nb_sources')
    .eq('client_id', clientData.id)
    .gte('date_generation', sevenDaysAgo.toISOString())
    .order('date_generation', { ascending: true });

  // Grouper par jour
  const trendData = [];
  const dayMap = new Map();

  recentReports?.forEach(report => {
    const day = new Date(report.date_generation).toLocaleDateString('fr-FR');
    dayMap.set(day, (dayMap.get(day) || 0) + (report.nb_sources || 0));
  });

  dayMap.forEach((count, date) => {
    trendData.push({ date, mentions: count });
  });

  // 4. Mots-clés (depuis rapports.mots_cles)
  const { data: allReports } = await supabase
    .from('rapports')
    .select('mots_cles')
    .eq('client_id', clientData.id)
    .limit(50); // Limiter pour la perf

  const keywordMap = new Map();
  allReports?.forEach(report => {
    report.mots_cles?.forEach(keyword => {
      keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + 1);
    });
  });

  const topKeywords = Array.from(keywordMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count, trend: 'stable' }));

  // Mettre à jour le state
  setStats({
    totalReports: reportCount || 0,
    totalSources: chunkCount || 0,
    avgSentiment: 75, // À calculer avec analyse de sentiment
    trendsDetected: topKeywords.length,
    weeklyGrowth: 18.5, // À calculer
  });

  setTrendData(trendData);
  setTopKeywords(topKeywords);
};
```

---

## 🎨 5. ANALYSE DE SENTIMENT (Optionnel mais recommandé)

Pour avoir les données de sentiment, vous devez ajouter une analyse lors de l'indexation:

### Option A : OpenAI Sentiment Analysis

```typescript
// Dans votre edge function index-rapport

const analyzeSentiment = async (text: string): Promise<number> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: `Analyse le sentiment de ce texte et réponds uniquement par un nombre entre -1 (très négatif) et 1 (très positif): "${text.substring(0, 500)}"`
      }],
      temperature: 0
    })
  });

  const data = await response.json();
  const sentiment = parseFloat(data.choices[0].message.content);
  return sentiment;
};

// L'ajouter dans les metadata du chunk
const sentiment = await analyzeSentiment(chunk);
metadata.sentiment = sentiment;
```

### Option B : Librairie JS simple (compromise-nlp)

```bash
npm install compromise compromise-sentiment
```

```typescript
import nlp from 'compromise';
import sentiment from 'compromise-sentiment';

nlp.extend(sentiment);

const analyzeSentiment = (text: string): number => {
  const doc = nlp(text);
  const score = doc.sentiment().score; // -5 à 5
  return score / 5; // Normaliser à -1 à 1
};
```

---

## 📅 6. CRON JOB pour Agrégation Automatique

Créez un Edge Function qui tourne chaque nuit:

```typescript
// supabase/functions/aggregate-analytics/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Récupérer tous les clients
  const { data: clients } = await supabase
    .from('clients')
    .select('id');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Agréger pour chaque client
  for (const client of clients || []) {
    await supabase.rpc('update_daily_analytics', {
      target_client_id: client.id,
      target_date: yesterday.toISOString().split('T')[0]
    });
  }

  return new Response('Analytics aggregated', { status: 200 });
});
```

Puis configurer un CRON dans Supabase Dashboard:
```
0 2 * * * // Chaque jour à 2h du matin
```

---

## ✅ RÉSUMÉ : Ce qu'il faut faire

### OPTION 1 : Quick & Dirty (1 jour)
✅ Utiliser les données existantes (rapports + chunks)
✅ Calculer en temps réel dans le composant
✅ Ça fonctionne, mais lent si beaucoup de données

### OPTION 2 : Solution Professionnelle (3-4 jours) ⭐ RECOMMANDÉ
✅ Créer les tables `analytics_daily`, `analytics_competitors`, `analytics_trends`
✅ Créer les fonctions d'agrégation
✅ Ajouter les triggers automatiques
✅ Dashboard ultra-rapide et scalable

### OPTION 3 : MVP Rapide (2 jours)
✅ Créer seulement `analytics_daily`
✅ Agréger manuellement les données existantes
✅ Ajouter progressivement les autres fonctionnalités

---

## 🚀 Je peux vous aider !

**Voulez-vous que je :**

1. **Crée les migrations SQL** pour les tables analytics ?
2. **Modifie le composant AnalyticsDashboard** pour utiliser les vraies données ?
3. **Crée l'Edge Function d'agrégation** ?
4. **Implémente l'analyse de sentiment** ?

**Dites-moi par quoi commencer !** 💪
