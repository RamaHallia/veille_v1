import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  AlertTriangle,
  Activity,
  Target,
  Zap,
} from 'lucide-react';

interface DashboardStats {
  totalReports: number;
  totalSources: number;
  avgSentiment: number;
  trendsDetected: number;
  weeklyGrowth: number;
}

interface TrendData {
  date: string;
  mentions: number;
  sentiment: number;
}

interface CompetitorData {
  name: string;
  mentions: number;
  sentiment: number;
  innovation: number;
  engagement: number;
  visibility: number;
}

const COLORS = ['#FF6B52', '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    totalSources: 0,
    avgSentiment: 0,
    trendsDetected: 0,
    weeklyGrowth: 0,
  });
  const [loading, setLoading] = useState(true);

  // Données simulées pour la démo (à remplacer par vraies données)
  const trendData: TrendData[] = [
    { date: '01/11', mentions: 45, sentiment: 65 },
    { date: '02/11', mentions: 52, sentiment: 68 },
    { date: '03/11', mentions: 48, sentiment: 62 },
    { date: '04/11', mentions: 61, sentiment: 72 },
    { date: '05/11', mentions: 55, sentiment: 70 },
    { date: '06/11', mentions: 68, sentiment: 75 },
    { date: '07/11', mentions: 72, sentiment: 78 },
    { date: '08/11', mentions: 79, sentiment: 82 },
    { date: '09/11', mentions: 85, sentiment: 85 },
  ];

  const competitorData: CompetitorData[] = [
    {
      name: 'Concurrent A',
      mentions: 85,
      sentiment: 72,
      innovation: 68,
      engagement: 75,
      visibility: 80,
    },
    {
      name: 'Concurrent B',
      mentions: 72,
      sentiment: 65,
      innovation: 82,
      engagement: 68,
      visibility: 70,
    },
    {
      name: 'Concurrent C',
      mentions: 65,
      sentiment: 78,
      innovation: 60,
      engagement: 72,
      visibility: 68,
    },
    {
      name: 'Vous',
      mentions: 58,
      sentiment: 80,
      innovation: 75,
      engagement: 65,
      visibility: 62,
    },
  ];

  const categoryData = [
    { name: 'Articles de presse', value: 142 },
    { name: 'Réseaux sociaux', value: 89 },
    { name: 'Blogs tech', value: 67 },
    { name: 'Forums', value: 45 },
    { name: 'Podcasts', value: 23 },
  ];

  const sentimentData = [
    { name: 'Positif', value: 65, color: '#10B981' },
    { name: 'Neutre', value: 25, color: '#F59E0B' },
    { name: 'Négatif', value: 10, color: '#EF4444' },
  ];

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    try {
      if (!user?.id) return;

      // Récupérer le client_id
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!clientData) return;

      // Compter les rapports
      const { count: reportCount } = await supabase
        .from('rapports')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientData.id);

      // Compter les chunks (sources)
      const { count: chunkCount } = await supabase
        .from('rapport_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientData.id);

      setStats({
        totalReports: reportCount || 0,
        totalSources: chunkCount || 0,
        avgSentiment: 75, // À calculer avec une vraie analyse de sentiment
        trendsDetected: 12, // À calculer avec détection de tendances
        weeklyGrowth: 18.5, // À calculer
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    icon: Icon,
    title,
    value,
    change,
    color,
  }: {
    icon: any;
    title: string;
    value: string | number;
    change?: number;
    color: string;
  }) => (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-semibold ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Analytics</h1>
          <p className="text-gray-600 mt-1">Vue d'ensemble de votre veille concurrentielle</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
            <option>7 derniers jours</option>
            <option>30 derniers jours</option>
            <option>3 derniers mois</option>
            <option>12 derniers mois</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={FileText}
          title="Rapports générés"
          value={stats.totalReports}
          change={stats.weeklyGrowth}
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          icon={Activity}
          title="Sources analysées"
          value={stats.totalSources}
          change={12.3}
          color="from-purple-500 to-purple-600"
        />
        <StatCard
          icon={Target}
          title="Sentiment moyen"
          value={`${stats.avgSentiment}%`}
          change={5.2}
          color="from-green-500 to-green-600"
        />
        <StatCard
          icon={Zap}
          title="Tendances détectées"
          value={stats.trendsDetected}
          change={-3.1}
          color="from-orange-500 to-orange-600"
        />
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution des mentions */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Évolution des mentions
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="mentions"
                stroke="#FF6B52"
                strokeWidth={2}
                name="Mentions"
              />
              <Line
                type="monotone"
                dataKey="sentiment"
                stroke="#10B981"
                strokeWidth={2}
                name="Sentiment"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Comparaison concurrents */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Radar concurrentiel
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={competitorData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Mentions"
                dataKey="mentions"
                stroke="#FF6B52"
                fill="#FF6B52"
                fillOpacity={0.3}
              />
              <Radar
                name="Innovation"
                dataKey="innovation"
                stroke="#6366F1"
                fill="#6366F1"
                fillOpacity={0.3}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Sources par catégorie */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Sources par catégorie
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" name="Sources">
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Analyse de sentiment */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Analyse de sentiment
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alertes récentes */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Alertes importantes</h3>
          <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">
            Voir tout →
          </button>
        </div>
        <div className="space-y-3">
          {[
            {
              type: 'warning',
              title: 'Concurrent A a lancé un nouveau produit',
              time: 'Il y a 2 heures',
              severity: 'high',
            },
            {
              type: 'info',
              title: 'Tendance émergente détectée : "IA générative"',
              time: 'Il y a 5 heures',
              severity: 'medium',
            },
            {
              type: 'success',
              title: 'Sentiment positif en hausse de 15%',
              time: 'Il y a 1 jour',
              severity: 'low',
            },
          ].map((alert, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div
                className={`p-2 rounded-lg ${
                  alert.severity === 'high'
                    ? 'bg-red-100'
                    : alert.severity === 'medium'
                    ? 'bg-orange-100'
                    : 'bg-green-100'
                }`}
              >
                <AlertTriangle
                  className={`w-5 h-5 ${
                    alert.severity === 'high'
                      ? 'text-red-600'
                      : alert.severity === 'medium'
                      ? 'text-orange-600'
                      : 'text-green-600'
                  }`}
                />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{alert.title}</p>
                <p className="text-sm text-gray-500 mt-1">{alert.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Keywords */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Mots-clés tendances
        </h3>
        <div className="flex flex-wrap gap-3">
          {[
            { keyword: 'Intelligence Artificielle', count: 234, trend: 'up' },
            { keyword: 'ChatGPT', count: 189, trend: 'up' },
            { keyword: 'Cloud Computing', count: 156, trend: 'stable' },
            { keyword: 'Cybersécurité', count: 142, trend: 'up' },
            { keyword: 'Blockchain', count: 98, trend: 'down' },
            { keyword: 'IoT', count: 87, trend: 'stable' },
            { keyword: 'Machine Learning', count: 201, trend: 'up' },
            { keyword: 'DevOps', count: 123, trend: 'up' },
          ]
            .sort((a, b) => b.count - a.count)
            .map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200 hover:shadow-md transition-all cursor-pointer group"
              >
                <span className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                  {item.keyword}
                </span>
                <span className="text-sm text-gray-600 bg-white px-2 py-0.5 rounded-full">
                  {item.count}
                </span>
                {item.trend === 'up' && (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                )}
                {item.trend === 'down' && (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
