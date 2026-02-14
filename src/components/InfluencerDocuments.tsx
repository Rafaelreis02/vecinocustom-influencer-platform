'use client';

import { useState } from 'react';
import { Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { useGlobalToast } from '@/contexts/ToastContext';

interface Document {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  url: string;
  type: string;
  uploadedAt: string;
}

interface InfluencerDocumentsProps {
  influencerId: string;
  documents: Document[];
  onDocumentsChange?: () => void;
}

export function InfluencerDocuments({
  influencerId,
  documents,
  onDocumentsChange,
}: InfluencerDocumentsProps) {
  const { addToast } = useGlobalToast();
  const [uploading, setUploading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('influencerId', influencerId);

        const res = await fetch(`/api/influencers/${influencerId}/documents`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Erro ao fazer upload');
        }

        addToast(`"${file.name}" carregado com sucesso`, 'success');
      }

      // Reset input
      e.currentTarget.value = '';
      onDocumentsChange?.();
    } catch (error) {
      console.error('Error uploading file:', error);
      addToast(
        error instanceof Error ? error.message : 'Erro ao fazer upload',
        'error'
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDocument(fileId: string) {
    if (!window.confirm('Tens a certeza que queres eliminar este documento?')) {
      return;
    }

    try {
      setDeletingIds((prev) => new Set(prev).add(fileId));

      const res = await fetch(
        `/api/influencers/${influencerId}/documents/${fileId}`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) throw new Error('Erro ao eliminar documento');

      addToast('Documento eliminado com sucesso', 'success');
      onDocumentsChange?.();
    } catch (error) {
      console.error('Error deleting document:', error);
      addToast('Erro ao eliminar documento', 'error');
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-PT');
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="relative">
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          id="file-upload"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip,.rar"
        />
        <label
          htmlFor="file-upload"
          className={`flex items-center justify-center gap-3 p-6 border-2 border-dashed rounded-lg transition cursor-pointer ${
            uploading
              ? 'border-gray-300 bg-gray-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="text-sm text-gray-600">A enviar...</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Clica ou arrasta ficheiros aqui
                </p>
                <p className="text-xs text-gray-500">
                  PDF, Word, Excel, Imagens, ZIP (máx. 10MB cada)
                </p>
              </div>
            </>
          )}
        </label>
      </div>

      {/* Documents List */}
      {documents.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Documentos ({documents.length})
          </h3>
          <div className="space-y-2">
            {documents.map((doc) => {
              const isDeleting = deletingIds.has(doc.id);
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.originalName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(doc.size)} • {formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                      title="Descarregar"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={isDeleting}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                      title="Eliminar"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nenhum documento carregado</p>
        </div>
      )}
    </div>
  );
}
