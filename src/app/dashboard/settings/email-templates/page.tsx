'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, Eye, Mail, Check } from 'lucide-react';

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  body: string;
  step: number;
  isActive: boolean;
  hasValue: boolean;
}

const STEP_NAMES: Record<number, string> = {
  1: 'Step 1: Partnership',
  2: 'Step 2: Shipping',
  3: 'Step 3: Preparing',
  4: 'Step 4: Contract',
  5: 'Step 5: Shipped',
};

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/email-templates');
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (template: EmailTemplate) => {
    setSaving(template.id);
    try {
      const res = await fetch(`/api/email-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: template.subject,
          body: template.body,
          isActive: template.isActive,
        }),
      });
      if (res.ok) {
        // Show success feedback
        setTimeout(() => setSaving(null), 1000);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setSaving(null);
    }
  };

  const handlePreview = async (template: EmailTemplate) => {
    try {
      const res = await fetch('/api/email-templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: template.subject,
          body: template.body,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data.data);
        setPreviewTemplate(template);
      }
    } catch (error) {
      console.error('Error previewing template:', error);
    }
  };

  const updateTemplateField = (id: string, field: keyof EmailTemplate, value: any) => {
    setTemplates(prev =>
      prev.map(t => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Group templates by step
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.step]) acc[template.step] = [];
    acc[template.step].push(template);
    return acc;
  }, {} as Record<number, EmailTemplate[]>);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Templates de Email</h1>
        <p className="text-gray-500 mt-1">
          Edite os templates de email enviados automaticamente em cada step do workflow.
        </p>
      </div>

      {/* Preview Modal */}
      {preview && previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Preview: {previewTemplate.name}</h3>
              <button
                onClick={() => setPreview(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <span className="text-xs font-medium text-gray-500 uppercase">Assunto</span>
                <p className="text-gray-900 font-medium mt-1">{preview.subject}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Corpo</span>
                <pre className="mt-2 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {preview.body}
                </pre>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500">
                Variáveis disponíveis: {'{{nome}}'}, {'{{valor}}'}, {'{{email}}'}, {'{{instagram}}'}, 
                {'{{whatsapp}}'}, {'{{morada}}'}, {'{{sugestao1}}'}, {'{{sugestao2}}'}, {'{{sugestao3}}'}, 
                {'{{url_produto}}'}, {'{{url_contrato}}'}, {'{{tracking_url}}'}, {'{{cupom}}'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Templates by Step */}
      <div className="space-y-8">
        {[1, 2, 3, 4, 5].map(step => {
          const stepTemplates = groupedTemplates[step] || [];
          if (stepTemplates.length === 0) return null;

          return (
            <div key={step} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {STEP_NAMES[step]}
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {stepTemplates.map(template => (
                  <div key={template.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            template.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {template.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                          {template.hasValue && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              Com Valor
                            </span>
                          )}
                          {!template.hasValue && template.step === 1 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              Sem Valor
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreview(template)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </button>
                        <button
                          onClick={() => handleSave(template)}
                          disabled={saving === template.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 disabled:opacity-50"
                        >
                          {saving === template.id ? (
                            saving === 'saved' ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            )
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          {saving === template.id ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          Assunto
                        </label>
                        <input
                          type="text"
                          value={template.subject}
                          onChange={(e) => updateTemplateField(template.id, 'subject', e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-black focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">
                          Corpo do Email
                        </label>
                        <textarea
                          value={template.body}
                          onChange={(e) => updateTemplateField(template.id, 'body', e.target.value)}
                          rows={8}
                          className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm focus:border-black focus:outline-none resize-none font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`active-${template.id}`}
                          checked={template.isActive}
                          onChange={(e) => updateTemplateField(template.id, 'isActive', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <label htmlFor={`active-${template.id}`} className="text-sm text-gray-700">
                          Template ativo (enviar automaticamente)
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
        <h3 className="font-semibold text-blue-900 mb-2">Como usar variáveis</h3>
        <p className="text-sm text-blue-700 mb-4">
          Use {'{{variavel}}'} nos templates para inserir dados dinâmicos:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-blue-600">
          <code>{'{{nome}}'} - Nome do influencer</code>
          <code>{'{{valor}}'} - Valor acordado</code>
          <code>{'{{email}}'} - Email</code>
          <code>{'{{instagram}}'} - Instagram</code>
          <code>{'{{whatsapp}}'} - Whatsapp</code>
          <code>{'{{morada}}'} - Morada</code>
          <code>{'{{sugestao1}}'} - Sugestão 1</code>
          <code>{'{{sugestao2}}'} - Sugestão 2</code>
          <code>{'{{sugestao3}}'} - Sugestão 3</code>
          <code>{'{{url_produto}}'} - URL produto</code>
          <code>{'{{url_contrato}}'} - URL contrato</code>
          <code>{'{{tracking_url}}'} - Tracking</code>
          <code>{'{{cupom}}'} - Cupom</code>
        </div>
      </div>
    </div>
  );
}
