import Link from 'next/link';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target,
  Instagram,
  TrendingUpIcon,
  Ticket
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              VecinoCustom <span className="text-blue-600">Influencer Platform</span>
            </h1>
            <div className="flex gap-4">
              <Link 
                href="/login"
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition"
              >
                Login
              </Link>
              <Link 
                href="/dashboard"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Gestão de Influencers <br />
            <span className="text-blue-600">Simplificada</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Plataforma completa para gerir influencers, campanhas, cupões e analytics em um só lugar.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <StatCard 
            icon={<Users className="w-8 h-8" />}
            title="Influencers"
            value="0"
            subtitle="Total registados"
            color="blue"
          />
          <StatCard 
            icon={<Target className="w-8 h-8" />}
            title="Campanhas"
            value="0"
            subtitle="Ativas agora"
            color="purple"
          />
          <StatCard 
            icon={<Ticket className="w-8 h-8" />}
            title="Cupões"
            value="0"
            subtitle="Gerados"
            color="green"
          />
          <StatCard 
            icon={<DollarSign className="w-8 h-8" />}
            title="Revenue"
            value="€0"
            subtitle="Este mês"
            color="orange"
          />
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <FeatureCard 
            icon={<Users className="w-6 h-6" />}
            title="Gestão de Influencers"
            description="Base de dados completa com perfis, contactos, métricas e histórico de colaborações."
          />
          <FeatureCard 
            icon={<Target className="w-6 h-6" />}
            title="Campanhas Organizadas"
            description="Cria e gere campanhas, associa influencers e acompanha resultados em tempo real."
          />
          <FeatureCard 
            icon={<Ticket className="w-6 h-6" />}
            title="Cupões Inteligentes"
            description="Gera e trackeia cupões de desconto. Integração Shopify automática (em breve)."
          />
          <FeatureCard 
            icon={<TrendingUp className="w-6 h-6" />}
            title="Analytics Detalhados"
            description="Métricas de performance, comparações e insights para otimizar campanhas."
          />
          <FeatureCard 
            icon={<Instagram className="w-6 h-6" />}
            title="Social Media Sync"
            description="Importa métricas do TikTok e Instagram automaticamente (em desenvolvimento)."
          />
          <FeatureCard 
            icon={<DollarSign className="w-6 h-6" />}
            title="Gestão de Pagamentos"
            description="Trackeia comissões, pagamentos pendentes e histórico financeiro."
          />
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <h3 className="text-3xl font-bold mb-4">
            Pronto para começar?
          </h3>
          <p className="text-lg mb-8 opacity-90">
            Acede ao dashboard e começa a gerir os teus influencers agora.
          </p>
          <Link 
            href="/dashboard"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
          >
            Ir para Dashboard
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-20 py-8 border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>© 2026 VecinoCustom. Desenvolvido por OpenClaw AI.</p>
        </div>
      </footer>
    </div>
  );
}

// Components
function StatCard({ icon, title, value, subtitle, color }: any) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${colors[color as keyof typeof colors]} text-white mb-4`}>
        {icon}
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
      <div className="inline-flex p-2 rounded-lg bg-blue-100 text-blue-600 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
