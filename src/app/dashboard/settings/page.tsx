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
  Save,
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
      <UsersManagement />
    </div>
  );
}

function ShopifyIntegration() {
  const { addToast } = useGlobalToast();
  const [config, setConfig] = useState({
    storeUrl: '',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const res = await fetch('/api/settings/shopify');
      if (res.ok) {
        const data = await res.json();
        setConfig({
          storeUrl: data.storeUrl || '',
          apiKey: data.apiKey || '',
          apiSecret: '', // Não retornamos o secret por segurança
          accessToken: '', // Não retornamos o token por segurança
        });
        setIsConfigured(data.isConfigured);
      }
    } catch (error) {
      console.error('Error loading Shopify config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/settings/shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error('Erro ao guardar');

      addToast('Configuração Shopify guardada', 'success');
      setIsConfigured(true);
    } catch (error) {
      addToast('Erro ao guardar configuração', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    try {
      const res = await fetch('/api/settings/shopify/test', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        addToast('Conexão com Shopify OK!', 'success');
      } else {
        addToast(data.error || 'Erro na conexão', 'error');
      }
    } catch (error) {
      addToast('Erro ao testar conexão', 'error');
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <ShoppingBag className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Shopify</h2>
            <p className="text-sm text-gray-500">
              {isConfigured ? 'Configurado' : 'Não configurado'}
            </p>
          </div>
        </div>
        {isConfigured && (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Ativo
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Store URL
          </label>
          <input
            type="text"
            value={config.storeUrl}
            onChange={(e) => setConfig({ ...config, storeUrl: e.target.value })}
            placeholder="minha-loja.myshopify.com"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-slate-900 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            URL da tua loja Shopify (sem https://)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <input
            type="text"
            value={config.apiKey}
            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
            placeholder="chave da API"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Secret
          </label>
          <input
            type="password"
            value={config.apiSecret}
            onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
            placeholder="••••••••"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-slate-900 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Deixa em branco para manter o valor atual
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Access Token
          </label>
          <input
            type="password"
            value={config.accessToken}
            onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
            placeholder="••••••••"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:border-slate-900 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            Token de acesso privado da app Shopify
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Link className="h-4 w-4" />
            Testar
          </button>
        </div>
      </form>

      <div className="px-4 pb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
          <p className="font-medium mb-1">Como configurar:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Acede à tua loja Shopify Admin</li>
            <li>Vai a Apps → Desenvolver apps → Criar app privada</li>
            <li>Ativa permissões: read_orders, read_customers, read_discounts</li>
            <li>Copia as credenciais para aqui</li>
          </ol>
        </div>
      </div>
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
