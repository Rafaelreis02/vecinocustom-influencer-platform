'use client';

import { useState, useCallback } from 'react';
import { Loader2, Image as ImageIcon, X, CheckCircle, Upload } from 'lucide-react';

interface StepDesignReferenceProps {
  token: string;
  onNext: () => void;
}

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function StepDesignReference({ token, onNext }: StepDesignReferenceProps) {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle file upload - Mobile optimized
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);
    setError(null);
    
    if (!file) {
      console.log('[UPLOAD] No file selected');
      return;
    }

    console.log('[UPLOAD] File selected:', { name: file.name, type: file.type, size: file.size });

    if (file.size > MAX_FILE_SIZE) {
      setUploadError('A imagem deve ter menos de 5MB');
      return;
    }

    // More permissive image check for mobile devices
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'];
    const isImage = validTypes.includes(file.type) || file.type.startsWith('image/');
    
    if (!isImage) {
      setUploadError('O ficheiro deve ser uma imagem (JPG, PNG, GIF, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      console.log('[UPLOAD] File converted to base64, length:', base64.length);
      setUploadedImage(base64);
    };
    reader.onerror = () => {
      console.error('[UPLOAD] FileReader error');
      setUploadError('Erro ao ler o ficheiro. Tenta novamente.');
    };
    reader.readAsDataURL(file);
  }, []);

  const clearImage = () => {
    setUploadedImage(null);
    setUploadError(null);
  };

  const handleSubmit = async () => {
    if (!uploadedImage) {
      setError('Por favor, envia uma imagem de referência');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // First upload the image to get a URL
      let finalImageUrl = uploadedImage;
      if (uploadedImage.startsWith('data:')) {
        const uploadRes = await fetch('/api/upload/design-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: uploadedImage }),
        });

        if (!uploadRes.ok) {
          setError('Erro ao fazer upload da imagem');
          setIsSubmitting(false);
          return;
        }

        const uploadData = await uploadRes.json();
        finalImageUrl = uploadData.url;
      }

      // Submit the design reference
      const res = await fetch(`/api/portal/${token}/submit-design-reference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: finalImageUrl }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onNext();
        }, 1500);
      } else {
        setError(data.error || 'Erro ao enviar referência');
      }
    } catch (err) {
      console.error('Error submitting design reference:', err);
      setError('Erro de rede ao enviar referência');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-green-800 mb-2">Referência enviada!</h3>
        <p className="text-sm text-green-700">
          Vamos analisar a tua referência e enviar as provas em breve.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-[#0E1E37] mb-2 uppercase">Design Reference</h2>
      <p className="text-sm text-gray-600 mb-6">
        Envia uma imagem de referência do que gostarias de gravar na tua peça. 
        Pode ser uma foto, um desenho, ou qualquer inspiração!
      </p>

      {/* Upload Area */}
      <div className="space-y-4">
        {!uploadedImage ? (
          <label className="block cursor-pointer touch-manipulation">
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/jpg,image/heic,image/heif"
              onChange={handleFileChange}
              className="sr-only"
              style={{ display: 'none' }}
              id="design-reference-upload"
            />
            <div 
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#0E1E37] hover:bg-gray-50 transition-colors active:bg-gray-100"
              onClick={() => document.getElementById('design-reference-upload')?.click()}
            >
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Toca para enviar uma imagem
              </p>
              <p className="text-xs text-gray-500">
                JPG, PNG, GIF • Máx. 5MB
              </p>
            </div>
          </label>
        ) : (
          <div className="relative">
            <img
              src={uploadedImage}
              alt="Design Reference"
              className="w-full h-64 object-contain rounded-xl border border-gray-200 bg-gray-50"
            />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error Messages */}
        {uploadError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{uploadError}</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        {uploadedImage && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 bg-[#0E1E37] text-white font-semibold rounded-lg hover:bg-[#1a2f4f] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                A enviar...
              </>
            ) : (
              <>
                <ImageIcon className="h-5 w-5" />
                Enviar Referência
              </>
            )}
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>💡 Dica:</strong> Quanto mais clara for a tua referência, melhor conseguimos 
          criar o design que procuras. Podes enviar uma foto, um desenho, ou um texto de exemplo.
        </p>
      </div>
    </div>
  );
}
