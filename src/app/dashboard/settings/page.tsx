'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Shield,
  User,
  Bot,
  Key,
  X,
  Check,
  ShoppingBag,
  Link,
  Mail,
} from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

type UserRole = 'ADMIN' | 'ASSISTANT' | 'AI_AGENT';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Definições</h1>
        <p className="text-sm text-gray-600 mt-1">
          Gestão de utilizadores, permissões e integrações
        </p>
      </div>

      <ShopifyIntegration />
      <GmailIntegration />
      <UsersManagement />
    </div>
  );
}

function ShopifyIntegration() {
  const { addToast } = useGlobalToast();
  const [connection, setConnection] = useState<{
    connected: boolean;
    shop?: string;
    shopInfo?: {
      name: string;
      domain: string;
      email: string;
      plan: string;
    };
    scopes?: string[];
    updatedAt?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  // Verificar query params (retorno do OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shopifyStatus = params.get('shopify');
    const errorMsg = params.get('message');

    if (shopifyStatus === 'connected') {
      addToast('Shopify conectado com sucesso!', 'success');
      // Limpar URL
      window.history.replaceState({}, '', window.location.pathname);
      checkConnection();
    } else if (shopifyStatus === 'error' && errorMsg) {
      addToast(`Erro: ${decodeURIComponent(errorMsg)}`, 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function checkConnection() {
    try {
      const res = await fetch('/api/shopify/check');
      if (res.ok) {
        const data = await res.json();
        setConnection(data);
      }
    } catch (error) {
      console.error('Error checking Shopify connection:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    try {
      setConnecting(true);
      // Redirecionar para o endpoint de auth (OAuth flow)
      window.location.href = '/api/shopify/auth';
    } catch (error) {
      addToast('Erro ao iniciar conexão', 'error');
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Tens a certeza que queres desconectar a Shopify?')) return;

    try {
      setDisconnecting(true);
      const res = await fetch('/api/shopify/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        addToast('Shopify desconectado', 'success');
        checkConnection();
      } else {
        const data = await res.json();
        addToast(data.error || 'Erro ao desconectar', 'error');
      }
    } catch (error) {
      addToast('Erro ao desconectar', 'error');
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const isConnected = connection?.connected;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
            <ShoppingBag className={`h-5 w-5 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Shopify</h2>
            <p className="text-sm text-gray-500">
              {isConnected 
                ? `Conectado: ${connection.shopInfo?.name || connection.shop}` 
                : 'Não conectado'}
            </p>
          </div>
        </div>
        {isConnected && (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Ativo
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {isConnected ? (
          // Estado: Conectado
          <>
            {connection?.shopInfo && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Loja:</span>
                  <span className="text-sm text-gray-900">{connection.shopInfo.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Domínio:</span>
                  <span className="text-sm text-gray-900">{connection.shopInfo.domain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Email:</span>
                  <span className="text-sm text-gray-900">{connection.shopInfo.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Plano:</span>
                  <span className="text-sm text-gray-900">{connection.shopInfo.plan}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Última atualização:</span>
                  <span className="text-sm text-gray-900">
                    {connection.updatedAt 
                      ? new Date(connection.updatedAt).toLocaleString('pt-PT') 
                      : 'N/A'}
                  </span>
                </div>
              </div>
            )}

            {connection?.scopes && (
              <div>
                <span className="text-sm font-medium text-gray-600">Permissões:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {connection.scopes.map((scope) => (
                    <span 
                      key={scope} 
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              {disconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Desconectar
            </button>
          </>
        ) : (
          // Estado: Não conectado
          <>
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Conectar com Shopify</h3>
              <p className="text-sm text-gray-500 mb-4">
                Sincroniza cupões, encomendas e comissões automaticamente
              </p>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 font-medium"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link className="h-4 w-4" />
                )}
                Conectar com Shopify
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              <p className="font-medium mb-1">O que será sincronizado:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Criação automática de cupões de desconto</li>
                <li>Tracking de vendas por cupão</li>
                <li>Cálculo automático de comissões</li>
                <li>Atualização de stocks e produtos</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GmailIntegration() {
  const { addToast } = useGlobalToast();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [gmailInfo, setGmailInfo] = useState<{ email?: string; scopes?: string[] } | null>(null);
  const [senderName, setSenderName] = useState('Vecino Custom');
  const [savingSenderName, setSavingSenderName] = useState(false);

  useEffect(() => {
    checkGmailConnection();
    
    // Load sender name from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('emailSenderName');
      if (saved) setSenderName(saved);
    }
  }, []);

  // Verificar query params (retorno do OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailStatus = params.get('gmail');

    if (gmailStatus === 'authorized') {
      addToast('Gmail conectado com sucesso!', 'success');
      window.history.replaceState({}, '', window.location.pathname);
      checkGmailConnection();
    }
  }, []);

  async function checkGmailConnection() {
    try {
      const res = await fetch('/api/auth/gmail/check');
      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected);
        setGmailInfo(data);
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    try {
      setConnecting(true);
      window.location.href = '/api/auth/gmail/authorize';
    } catch (error) {
      addToast('Erro ao conectar Gmail', 'error');
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm('Tens a certeza que queres desconectar Gmail?')) return;
    try {
      setConnecting(true);
      const res = await fetch('/api/auth/gmail/disconnect', { method: 'POST' });
      if (res.ok) {
        setConnected(false);
        setGmailInfo(null);
        addToast('Gmail desconectado', 'success');
      }
    } catch (error) {
      addToast('Erro ao desconectar Gmail', 'error');
    } finally {
      setConnecting(false);
    }
  }

  async function handleSaveSenderName() {
    if (!senderName.trim()) {
      addToast('Nome do sender não pode estar vazio', 'error');
      return;
    }

    try {
      setSavingSenderName(true);
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('emailSenderName', senderName.trim());
      }
      
      // Also try to save to API (optional)
      try {
        await fetch('/api/settings/email-sender', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderName: senderName.trim() }),
        });
      } catch (e) {
        // Ignore API errors, localStorage is enough
      }
      
      addToast('Nome do sender guardado com sucesso!', 'success');
    } catch (error) {
      addToast('Erro ao guardar nome do sender', 'error');
    } finally {
      setSavingSenderName(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Gmail</h2>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${
            connected
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {connected ? 'Conectado' : 'Desconectado'}
        </span>
      </div>

      {connected && gmailInfo ? (
        <>
          <div className="space-y-4 mb-6">
            {gmailInfo.email && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                <p className="text-sm text-gray-900">{gmailInfo.email}</p>
              </div>
            )}
            
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Nome do Sender</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Vecino Custom"
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  title="Sem emojis (serão removidos automaticamente)"
                />
                <button
                  onClick={handleSaveSenderName}
                  disabled={savingSenderName}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {savingSenderName ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Como aparecerá nos emails enviados (emojis serão removidos)</p>
            </div>

            {gmailInfo.scopes && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Permissões</p>
                <div className="space-y-1">
                  {gmailInfo.scopes.map((scope, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="h-3 w-3 text-green-600" />
                      <span className="text-xs text-gray-600">{scope}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleDisconnect}
            disabled={connecting}
            className="w-full px-4 py-2 rounded-lg font-semibold text-sm text-red-600 bg-red-50 hover:bg-red-100 transition disabled:opacity-50"
          >
            {connecting ? 'A desconectar...' : 'Desconectar Gmail'}
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Conecta o teu email Gmail para enviar emails e sincronizar automaticamente.
          </p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full px-4 py-2 rounded-lg font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                A conectar...
              </>
            ) : (
              <>
                <Link className="h-4 w-4" />
                Conectar com Google
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function UsersManagement() {
  const { addToast } = useGlobalToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Erro ao carregar utilizadores');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      addToast('Erro ao carregar utilizadores', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId: string) {
    if (!window.confirm('Tens a certeza que queres eliminar este utilizador?')) return;

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao eliminar');
      addToast('Utilizador eliminado', 'success');
      await loadUsers();
    } catch (error) {
      addToast('Erro ao eliminar utilizador', 'error');
    }
  }

  function getRoleIcon(role: UserRole) {
    switch (role) {
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-purple-600" />;
      case 'ASSISTANT':
        return <User className="h-4 w-4 text-blue-600" />;
      case 'AI_AGENT':
        return <Bot className="h-4 w-4 text-green-600" />;
    }
  }

  function getRoleLabel(role: UserRole) {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'ASSISTANT':
        return 'Humano Ajudante';
      case 'AI_AGENT':
        return 'Inteligência Artificial';
    }
  }

  function getRoleColor(role: UserRole) {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'ASSISTANT':
        return 'bg-blue-100 text-blue-800';
      case 'AI_AGENT':
        return 'bg-green-100 text-green-800';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Users className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Utilizadores</h2>
            <p className="text-sm text-gray-500">{users.length} utilizadores registados</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
        >
          <Plus className="h-4 w-4" />
          Novo Utilizador
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {users.map((user) => (
          <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.name || user.email}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                {getRoleIcon(user.role)}
                {getRoleLabel(user.role)}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                  title="Alterar password"
                >
                  <Key className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setSelectedUser(user); setShowEditModal(true); }}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                  title="Editar"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            Nenhum utilizador encontrado
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">Permissões por perfil:</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-purple-600" />
            <strong>Admin:</strong> Acesso total
          </span>
          <span className="flex items-center gap-1">
            <User className="h-3 w-3 text-blue-600" />
            <strong>Ajudante:</strong> Operacional (sem pagar/eliminar)
          </span>
          <span className="flex items-center gap-1">
            <Bot className="h-3 w-3 text-green-600" />
            <strong>IA:</strong> Acesso via API apenas
          </span>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadUsers(); }}
        />
      )}

      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => { setShowEditModal(false); setSelectedUser(null); }}
          onSuccess={() => { setShowEditModal(false); setSelectedUser(null); loadUsers(); }}
        />
      )}

      {showPasswordModal && selectedUser && (
        <PasswordModal
          user={selectedUser}
          onClose={() => { setShowPasswordModal(false); setSelectedUser(null); }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { addToast } = useGlobalToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'ASSISTANT' as UserRole,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar utilizador');
      }

      addToast('Utilizador criado com sucesso', 'success');
      onSuccess();
    } catch (error: any) {
      addToast(error.message || 'Erro ao criar utilizador', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Novo Utilizador</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-slate-900 focus:outline-none"
            >
              <option value="ADMIN">Administrador (acesso total)</option>
              <option value="ASSISTANT">Humano Ajudante (operacional)</option>
              <option value="AI_AGENT">Inteligência Artificial (API)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSuccess }: { user: User; onClose: () => void; onSuccess: () => void }) {
  const { addToast } = useGlobalToast();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<UserRole>(user.role);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) throw new Error('Erro ao atualizar');

      addToast('Perfil atualizado', 'success');
      onSuccess();
    } catch (error) {
      addToast('Erro ao atualizar perfil', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Editar Utilizador</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full rounded-lg border border-gray-200 px-3 py-2 bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-slate-900 focus:outline-none"
            >
              <option value="ADMIN">Administrador (acesso total)</option>
              <option value="ASSISTANT">Humano Ajudante (operacional)</option>
              <option value="AI_AGENT">Inteligência Artificial (API)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { addToast } = useGlobalToast();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      addToast('As passwords não coincidem', 'error');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/users/${user.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) throw new Error('Erro ao alterar password');

      addToast('Password alterada com sucesso', 'success');
      onClose();
    } catch (error) {
      addToast('Erro ao alterar password', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Alterar Password</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          A alterar password para: <strong>{user.email}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Alterar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
