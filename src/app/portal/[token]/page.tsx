'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, XCircle, CheckCircle, FileText, AlertCircle, ArrowRight } from 'lucide-react';
import { ProductSearchInput } from './components/ProductSearchInput';
import { Step4DesignReview } from './Step4DesignReview';
import { StepDesignReference } from './StepDesignReference';
// ✅ Sincronização: Usamos apenas currentStep do workflow, não mapeamento de status
// import { getStepForStatus } from '@/lib/status-step-mapping';

// Constants
const VALIDATION_ERROR_DISPLAY_DURATION = 4000; // 4 seconds
const STEP_TRANSITION_DELAY = 1500; // 1.5 seconds

// Types
interface InfluencerData {
  id: string;
  name: string;
  email: string;
  instagramHandle: string;
  tiktokHandle: string;
  phone: string;
  ddiCode: string;
  agreedPrice: number | null;
  status: string;
  shippingAddress: string | null;
  productSuggestion1: string | null;
  productSuggestion2: string | null;
  productSuggestion3: string | null;
  chosenProduct: string | null;
  trackingUrl: string | null;
  couponCode: string | null;
  designReferenceUrl?: string | null;
  workflowStatus?: string;
  isEditable?: boolean;
}

interface StepProps {
  data: InfluencerData;
  token: string;
  onUpdate: (showLoading?: boolean) => Promise<void>;
  onNext: () => void;
  onBack?: () => void;
  isReviewMode?: boolean;
}

interface ProductSearchResult {
  title: string;
  url: string;
  image: string | null;
}

// DDI options
const DDI_OPTIONS = [
  { code: '+351', country: 'PT' },
  { code: '+34', country: 'ES' },
  { code: '+33', country: 'FR' },
  { code: '+1', country: 'US' },
  { code: '+55', country: 'BR' },
];

// ✅ Componente Input Field Minimalista - Estilo Apple
function InputField({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = '',
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-500 mb-2 ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-4 py-3.5 text-[15px] bg-gray-50 border-0 rounded-2xl 
                   text-gray-900 placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-[#0E1E37]/20 focus:bg-white
                   disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
                   transition-all duration-200"
      />
    </div>
  );
}

// Helper functions for address parsing/formatting
function parseAddress(fullAddress: string | null) {
  if (!fullAddress) return { street: '', postalCode: '', country: '' };
  
  // Try to split by common separators (|, ,)
  const parts = fullAddress.split('|').map(p => p.trim());
  
  if (parts.length >= 3) {
    return {
      street: parts[0],
      postalCode: parts[1],
      country: parts[2],
    };
  }
  
  // Fallback: return full address as street
  return {
    street: fullAddress,
    postalCode: '',
    country: '',
  };
}

function formatAddress(street: string, postalCode: string, country: string): string {
  return [street, postalCode, country].filter(p => p.trim()).join(' | ');
}

// Check if field has data
function hasFieldData(value: any): boolean {
  return value !== null && value !== undefined && value !== '';
}

// Determine if field is locked
function isFieldLocked(fieldName: string, data: InfluencerData, status: string): boolean {
  const statusOrder = ['UNKNOWN', 'COUNTER_PROPOSAL', 'ANALYZING', 'AGREED', 'PRODUCT_SELECTION', 'CONTRACT_PENDING', 'SHIPPED', 'COMPLETED'];
  const currentStatusIndex = statusOrder.indexOf(status);
  
  // If status is ANALYZING: everything is locked (waiting for our review)
  if (status === 'ANALYZING') {
    return true;
  }
  
  // agreedPrice is ALWAYS editable (for negotiation) until AGREED
  if (fieldName === 'agreedPrice') {
    // Locked only if status is AGREED or beyond (already accepted)
    return status === 'AGREED' || currentStatusIndex > statusOrder.indexOf('AGREED');
  }
  
  // Step 1 fields (except agreedPrice)
  const step1Fields = ['name', 'email', 'instagramHandle', 'tiktokHandle', 'phone'];
  if (step1Fields.includes(fieldName)) {
    // Locked if status has moved past AGREED
    if (currentStatusIndex > statusOrder.indexOf('AGREED')) {
      return true;
    }
    // During AGREED: editable even with data
    if (status === 'AGREED') {
      return false;
    }
    // During COUNTER_PROPOSAL: locked if field already has data
    if (status === 'COUNTER_PROPOSAL') {
      return hasFieldData(data[fieldName as keyof InfluencerData]);
    }
    return false;
  }
  
  // Step 2 fields
  const step2Fields = ['shippingAddress', 'productSuggestion1', 'productSuggestion2', 'productSuggestion3'];
  if (step2Fields.includes(fieldName)) {
    // Locked if status has moved past AGREED (already submitted)
    if (currentStatusIndex > statusOrder.indexOf('AGREED')) {
      return true;
    }
    // During AGREED: locked if required fields are already filled (submitted)
    if (status === 'AGREED') {
      // If shipping address and suggestion 1 are filled, consider it submitted
      const isSubmitted = hasFieldData(data.shippingAddress) && hasFieldData(data.productSuggestion1);
      return isSubmitted;
    }
    // Locked if field has data
    return hasFieldData(data[fieldName as keyof InfluencerData]);
  }
  
  return false;
}

export default function PortalPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [influencerData, setInfluencerData] = useState<InfluencerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchMode, setSearchMode] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);

  // ✅ AUTO-REFRESH: Atualiza dados a cada 5 segundos para manter sincronizado
  useEffect(() => {
    if (token) {
      fetchInfluencerData();
      
      // Polling a cada 5 segundos para atualização automática
      const interval = setInterval(() => {
        fetchInfluencerData(false); // false = não mostra loading spinner
      }, 5000);
      
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchInfluencerData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      // Use workflow API instead of direct influencer API
      const res = await fetch(`/api/portal/${token}/workflow`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 404) {
          setError(errorData.error || 'No active partnership found. Please contact VecinoCustom to start a partnership.');
        } else {
          setError('Failed to load data');
        }
        return;
      }

      const data = await res.json();

      // Map workflow data to InfluencerData format
      // chosenProduct in old format = selectedProductUrl in workflow
      const mappedData: InfluencerData = {
        ...data,
        chosenProduct: data.selectedProductUrl,
        phone: data.phone || '',
      };

      setInfluencerData(mappedData);

      // ✅ SINCRONIZAÇÃO: Usar sempre o currentStep do workflow como fonte de verdade
      // Tanto o dashboard admin como o portal do influencer usam o mesmo valor
      setCurrentStep(data.currentStep);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOTA: Sincronização automática - ambos os portais usam currentStep do workflow
  // Não há necessidade de mapeamento de status para step

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#0E1E37] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !influencerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7] p-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-500" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-3 tracking-tight">Link Inválido</h1>
          <p className="text-gray-500 mb-8 text-sm leading-relaxed">{error || 'Este link do portal é inválido ou expirou.'}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-[#0E1E37] text-white text-sm font-medium rounded-full hover:bg-[#1a2f4f] transition-all duration-200"
          >
            Voltar à página inicial
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Portal Content - Estilo Apple Minimalista */}
      <div className="max-w-[420px] mx-auto px-6 py-12">
        {/* Logo / Header - Minimalista */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#0E1E37] mb-4 shadow-sm">
            <span className="text-white text-lg font-bold tracking-wider">V</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight">VecinoCustom</h1>
          <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide uppercase">Portal do Influencer</p>
        </div>

        {/* Progress Bar - Minimalista */}
        {!searchMode && <ProgressBar currentStep={currentStep} />}

        {/* Toast de Erro - Minimalista */}
        <Toast message={error} onClose={() => setError(null)} />

        {/* Step Content - Card Minimalista */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100/50 p-6">
          {/* Check if workflow is completed but showing step 8 */}
          {influencerData?.workflowStatus === 'COMPLETED' && currentStep >= 8 ? (
            <Step8Delivered data={influencerData} token={token} onRestart={fetchInfluencerData} />
          ) : (
            <>
              {currentStep === 1 && (
                <Step1
                  data={influencerData}
                  token={token}
                  onUpdate={fetchInfluencerData}
                  onNext={() => {
                    setIsReviewMode(false);
                    setCurrentStep(2);
                  }}
                  isReviewMode={isReviewMode}
                />
              )}
              {currentStep === 2 && (
                <Step2
                  data={influencerData}
                  token={token}
                  onUpdate={fetchInfluencerData}
                  onBack={() => {
                    setIsReviewMode(true);
                    setCurrentStep(1);
                  }}
                  onNext={() => setCurrentStep(3)}
                />
              )}
              {currentStep === 3 && <Step3 />}
              {currentStep === 4 && (
                <StepDesignReference
                  token={token}
                  onApprove={() => setCurrentStep(5)}
                  designReferenceUrl={influencerData?.designReferenceUrl}
                />
              )}
              {currentStep === 5 && (
                <Step5
                  data={influencerData}
                  token={token}
                  onUpdate={fetchInfluencerData}
                  onNext={() => setCurrentStep(6)}
                />
              )}
              {currentStep === 6 && <Step6Preparing data={influencerData} />}
              {currentStep === 7 && <Step7Shipped data={influencerData} />}
              {currentStep === 8 && <Step8Delivered data={influencerData} token={token} onRestart={fetchInfluencerData} />}
            </>
          )}
        </div>

        {/* Exit Portal Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Exit portal
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ Componente Toast Minimalista para mensagens de erro
function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Limpa após animação
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);
  
  if (!message) return null;
  
  return (
    <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
    }`}>
      <div className="bg-[#1C1C1E] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px]">
        <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" strokeWidth={1.5} />
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}

// ✅ Progress Bar Minimalista - Estilo Apple
function ProgressBar({ currentStep }: { currentStep: number }) {
  const totalSteps = 8;
  const progress = Math.min((currentStep / totalSteps) * 100, 100);

  return (
    <div className="mb-10">
      {/* Linha de Progresso Suave */}
      <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-[#0E1E37] rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status Minimalista */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-xs text-gray-400 font-medium tracking-wide">
          Etapa {currentStep} de {totalSteps}
        </span>
        <span className="text-xs text-gray-500 font-semibold">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

// ✅ Step 1 - Dados da Parceria (Minimalista)
function Step1({ data, token, onUpdate, onNext, isReviewMode }: StepProps) {
  const [formData, setFormData] = useState({
    name: data.name || '',
    email: data.email || '',
    instagramHandle: data.instagramHandle || '',
    tiktokHandle: data.tiktokHandle || '',
    ddiCode: data.ddiCode || '+351',
    phone: data.phone || '',
    agreedPrice: data.agreedPrice || 0,
  });
  
  const [originalPrice, setOriginalPrice] = useState(data.agreedPrice || 0);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const isAnalyzing = data.status === 'ANALYZING';
  const hasPrice = data.agreedPrice && data.agreedPrice > 0;
  const priceChanged = formData.agreedPrice !== originalPrice;

  useEffect(() => {
    setFormData({
      name: data.name || '',
      email: data.email || '',
      instagramHandle: data.instagramHandle || '',
      tiktokHandle: data.tiktokHandle || '',
      ddiCode: data.ddiCode || '+351',
      phone: data.phone || '',
      agreedPrice: data.agreedPrice || 0,
    });
    setOriginalPrice(data.agreedPrice || 0);
  }, [data]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationError) setValidationError(null);
  };

  const getFieldDisabled = (fieldName: string): boolean => {
    if (isReviewMode) return true;
    return isFieldLocked(fieldName, data, data.status);
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Nome obrigatório';
    if (!formData.email.trim()) return 'Email obrigatório';
    if (!formData.instagramHandle.trim()) return 'Instagram obrigatório';
    if (!formData.tiktokHandle.trim()) return 'TikTok obrigatório';
    if (!formData.phone.trim()) return 'WhatsApp obrigatório';
    if (hasPrice && formData.agreedPrice <= 0) return 'Valor deve ser maior que 0';
    return null;
  };

  const handleAccept = async () => {
    setShowModal(true);
  };

  const confirmAccept = async () => {
    const error = validateForm();
    if (error) {
      setValidationError(error);
      setTimeout(() => setValidationError(null), VALIDATION_ERROR_DISPLAY_DURATION);
      setShowModal(false);
      return;
    }

    setShowModal(false);
    setLoading(true);

    try {
      // Send all data AND advance in a single atomic request
      const advanceData = {
        contactEmail: formData.email,
        contactInstagram: formData.instagramHandle,
        contactWhatsapp: formData.phone,
        name: formData.name,
        tiktokHandle: formData.tiktokHandle,
      };

      const advanceRes = await fetch(`/api/portal/${token}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(advanceData),
      });

      if (!advanceRes.ok) {
        const error = await advanceRes.json();
        throw new Error(error.error || 'Failed to advance step');
      }

      // Refresh data from API without showing loading spinner, then advance step
      await onUpdate(false);
      onNext();
      
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  const handleCounterproposal = async () => {
    const error = validateForm();
    if (error) {
      setValidationError(error);
      setTimeout(() => setValidationError(null), VALIDATION_ERROR_DISPLAY_DURATION);
      return;
    }
    
    setLoading(true);
    
    try {
      // Map form fields to workflow fields - include agreedPrice for counterproposal
      const workflowData: any = {
        contactEmail: formData.email,
        contactInstagram: formData.instagramHandle,
        contactWhatsapp: formData.phone,
        name: formData.name,
        tiktokHandle: formData.tiktokHandle,
      };

      // Include the new proposed value if it changed
      if (priceChanged && formData.agreedPrice > 0) {
        workflowData.agreedPrice = formData.agreedPrice;
      }
      
      const res = await fetch(`/api/portal/${token}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit counterproposal');
      }

      await onUpdate();
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndContinue = async () => {
    const error = validateForm();
    if (error) {
      setValidationError(error);
      setTimeout(() => setValidationError(null), VALIDATION_ERROR_DISPLAY_DURATION);
      return;
    }
    
    setLoading(true);
    
    try {
      // Send all data AND advance in a single atomic request
      const advanceData = {
        contactEmail: formData.email,
        contactInstagram: formData.instagramHandle,
        contactWhatsapp: formData.phone,
        name: formData.name,
        tiktokHandle: formData.tiktokHandle,
      };

      const advanceRes = await fetch(`/api/portal/${token}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(advanceData),
      });

      if (!advanceRes.ok) {
        const error = await advanceRes.json();
        throw new Error(error.error || 'Failed to advance step');
      }

      // Refresh data from API without showing loading spinner, then advance step
      await onUpdate(false);
      onNext();
      
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ✅ Header Minimalista */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-1">Dados da Parceria</h2>
        <p className="text-sm text-gray-400">Confirma os teus dados</p>
      </div>
      
      {/* Analyzing Banner - Minimalista */}
      {isAnalyzing && (
        <div className="mb-6 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
          <p className="text-sm text-amber-700 font-medium">
            Proposta em análise
          </p>
        </div>
      )}
      
      <div className="space-y-5">
        {/* ✅ Input Fields - Estilo Apple */}
        <InputField
          label="Nome"
          value={formData.name}
          onChange={(v) => handleChange('name', v)}
          disabled={getFieldDisabled('name')}
          placeholder="O teu nome completo"
        />
        
        <InputField
          label="Email"
          type="email"
          value={formData.email}
          onChange={(v) => handleChange('email', v)}
          disabled={getFieldDisabled('email')}
          placeholder="email@exemplo.com"
        />
        
        <InputField
          label="Instagram"
          value={formData.instagramHandle}
          onChange={(v) => handleChange('instagramHandle', v)}
          disabled={getFieldDisabled('instagramHandle')}
          placeholder="@utilizador"
        />
        
        <InputField
          label="TikTok"
          value={formData.tiktokHandle}
          onChange={(v) => handleChange('tiktokHandle', v)}
          disabled={getFieldDisabled('tiktokHandle')}
          placeholder="@utilizador"
        />
        
        {/* ✅ WhatsApp - Minimalista */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2 ml-1">WhatsApp</label>
          <div className="flex gap-3">
            <select
              value={formData.ddiCode}
              onChange={(e) => handleChange('ddiCode', e.target.value)}
              disabled={getFieldDisabled('phone')}
              className="px-4 py-3.5 text-sm bg-gray-50 border-0 rounded-2xl text-gray-900
                         focus:outline-none focus:ring-2 focus:ring-[#0E1E37]/20 focus:bg-white
                         disabled:bg-gray-100 disabled:text-gray-400
                         transition-all duration-200 appearance-none cursor-pointer"
            >
              {DDI_OPTIONS.map(opt => (
                <option key={opt.code} value={opt.code}>{opt.country} {opt.code}</option>
              ))}
            </select>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              disabled={getFieldDisabled('phone')}
              placeholder="912345678"
              className="flex-1 px-4 py-3.5 text-[15px] bg-gray-50 border-0 rounded-2xl 
                         text-gray-900 placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-[#0E1E37]/20 focus:bg-white
                         disabled:bg-gray-100 disabled:text-gray-400
                         transition-all duration-200"
            />
          </div>
        </div>
        
        {/* ✅ Valor - Minimalista */}
        {hasPrice && (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2 ml-1">Valor Proposto</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">€</span>
              <input
                type="number"
                value={formData.agreedPrice}
                onChange={(e) => handleChange('agreedPrice', parseFloat(e.target.value) || 0)}
                disabled={getFieldDisabled('agreedPrice')}
                className="w-full pl-12 pr-5 py-4 text-2xl font-semibold text-right bg-gray-50 border-0 rounded-2xl 
                           text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0E1E37]/20 focus:bg-white
                           disabled:bg-gray-100 disabled:text-gray-400
                           transition-all duration-200"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* ✅ Botões - Estilo Apple */}
      {isReviewMode ? (
        <div className="mt-10">
          <button
            onClick={onNext}
            className="w-full py-4 bg-[#0E1E37] text-white text-[15px] font-medium rounded-full hover:bg-[#1a2f4f] transition-all duration-200 flex items-center justify-center gap-2"
          >
            Continuar <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      ) : !isAnalyzing && (
        <div className="mt-10 space-y-3">
          {hasPrice ? (
            <>
              <button
                onClick={handleAccept}
                disabled={loading || priceChanged}
                className="w-full py-4 bg-[#0E1E37] text-white text-[15px] font-medium rounded-full hover:bg-[#1a2f4f] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'A processar...' : 'Aceitar Proposta'}
              </button>
              <button
                onClick={handleCounterproposal}
                disabled={loading || !priceChanged}
                className="w-full py-4 bg-white text-[#0E1E37] text-[15px] font-medium rounded-full border border-gray-200 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'A processar...' : 'Enviar Contraproposta'}
              </button>
            </>
          ) : (
            // Scenario B: No price - show Save and continue
            <button
              onClick={handleSaveAndContinue}
              disabled={loading}
              className="w-full py-4 bg-[#0E1E37] text-white text-[15px] font-medium rounded-full hover:bg-[#1a2f4f] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'A processar...' : 'Continuar'} <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>
      )}
      
      {/* ✅ Modal de Confirmação - Minimalista */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Aceitar Proposta?</h3>
            <p className="text-sm text-gray-500 mb-8 text-center leading-relaxed">
              Ao aceitar, concordas com os termos da parceria.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 text-[15px] font-medium rounded-full hover:bg-gray-200 transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmAccept}
                className="flex-1 py-3.5 bg-[#0E1E37] text-white text-[15px] font-medium rounded-full hover:bg-[#1a2f4f] transition-all duration-200"
              >
                Aceitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Step2({ data, token, onUpdate, onBack, onNext }: StepProps) {
  const parsedAddress = parseAddress(data.shippingAddress);
  
  const [formData, setFormData] = useState({
    shippingStreet: parsedAddress.street,
    shippingPostalCode: parsedAddress.postalCode,
    shippingCountry: parsedAddress.country,
    productSuggestion1: data.productSuggestion1 || '',
    productSuggestion2: data.productSuggestion2 || '',
    productSuggestion3: data.productSuggestion3 || '',
  });
  
  const [searchQuery1, setSearchQuery1] = useState('');
  const [searchQuery2, setSearchQuery2] = useState('');
  const [searchQuery3, setSearchQuery3] = useState('');
  const [searchResults1, setSearchResults1] = useState<ProductSearchResult[]>([]);
  const [searchResults2, setSearchResults2] = useState<ProductSearchResult[]>([]);
  const [searchResults3, setSearchResults3] = useState<ProductSearchResult[]>([]);
  const [isLoading1, setIsLoading1] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);
  const [isLoading3, setIsLoading3] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationError) setValidationError(null);
  };

  // Per-field lock logic
  const getFieldDisabled = (fieldName: string): boolean => {
    return isFieldLocked(fieldName, data, data.status);
  };

  // Search products with debounce
  const searchProducts = async (
    query: string,
    setResults: (results: ProductSearchResult[]) => void,
    setIsLoading: (loading: boolean) => void
  ) => {
    if (query.length < 3) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/portal/${token}/products?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const products = await res.json();
        setResults(products);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('Error searching products:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchQuery1, setSearchResults1, setIsLoading1);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery1]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchQuery2, setSearchResults2, setIsLoading2);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery2]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchQuery3, setSearchResults3, setIsLoading3);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery3]);

  const validateForm = () => {
    if (!formData.shippingStreet.trim()) return 'Street address is required';
    if (!formData.shippingPostalCode.trim()) return 'Postal code is required';
    if (!formData.shippingCountry.trim()) return 'Country is required';
    if (!formData.productSuggestion1.trim()) return 'At least one product suggestion is required';
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      setValidationError(error);
      setTimeout(() => setValidationError(null), VALIDATION_ERROR_DISPLAY_DURATION);
      return;
    }

    setLoading(true);

    try {
      // Format address back to single field
      const shippingAddress = formatAddress(
        formData.shippingStreet,
        formData.shippingPostalCode,
        formData.shippingCountry
      );

      // Send all data AND advance in a single atomic request
      const advanceData = {
        shippingAddress,
        productSuggestion1: formData.productSuggestion1,
        productSuggestion2: formData.productSuggestion2,
        productSuggestion3: formData.productSuggestion3,
      };

      const advanceRes = await fetch(`/api/portal/${token}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(advanceData),
      });
      
      if (!advanceRes.ok) {
        const error = await advanceRes.json();
        throw new Error(error.error || 'Failed to advance step');
      }

      const result = await advanceRes.json();

      // Refresh data from API without showing loading spinner, then advance step
      if (result.success) {
        await onUpdate(false);
        onNext();
      }

    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ✅ Header Minimalista */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-1">Morada & Sugestões</h2>
        <p className="text-sm text-gray-400">Onde enviamos a tua peça</p>
      </div>

      <div className="space-y-5">
        {/* ✅ Morada - Minimalista */}
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2 ml-1">Morada de Envio</label>
          
          <div className="space-y-3">
            <input
              type="text"
              value={formData.shippingStreet}
              onChange={(e) => handleChange('shippingStreet', e.target.value)}
              disabled={getFieldDisabled('shippingAddress')}
              placeholder="Rua e número"
              className="w-full px-4 py-3.5 text-[15px] bg-gray-50 border-0 rounded-2xl 
                         text-gray-900 placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-[#0E1E37]/20 focus:bg-white
                         disabled:bg-gray-100 disabled:text-gray-400
                         transition-all duration-200"
            />
            
            <div className="flex gap-3">
              <input
                type="text"
                value={formData.shippingPostalCode}
                onChange={(e) => handleChange('shippingPostalCode', e.target.value)}
                disabled={getFieldDisabled('shippingAddress')}
                placeholder="Código postal"
                className="w-1/2 px-4 py-3.5 text-[15px] bg-gray-50 border-0 rounded-2xl 
                           text-gray-900 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-[#0E1E37]/20 focus:bg-white
                           disabled:bg-gray-100 disabled:text-gray-400
                           transition-all duration-200"
              />
              <input
                type="text"
                value={formData.shippingCountry}
                onChange={(e) => handleChange('shippingCountry', e.target.value)}
                disabled={getFieldDisabled('shippingAddress')}
                placeholder="País"
                className="flex-1 px-4 py-3.5 text-[15px] bg-gray-50 border-0 rounded-2xl 
                           text-gray-900 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-[#0E1E37]/20 focus:bg-white
                           disabled:bg-gray-100 disabled:text-gray-400
                           transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* ✅ Sugestões de Produto - Minimalista */}
        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-500 mb-2 ml-1">Sugestões de Produto</label>
          
          <ProductSearchInput
            value={formData.productSuggestion1}
            searchQuery={searchQuery1}
            onSearchChange={setSearchQuery1}
            results={searchResults1}
            isLoading={isLoading1}
            onSelect={(product) => {
              handleChange('productSuggestion1', product.url);
              setSearchQuery1(product.title);
              setSearchResults1([]);
            }}
            disabled={getFieldDisabled('productSuggestion1')}
            label="Produto 1"
            required={true}
          />

          <ProductSearchInput
            value={formData.productSuggestion2}
            searchQuery={searchQuery2}
            onSearchChange={setSearchQuery2}
            results={searchResults2}
            isLoading={isLoading2}
            onSelect={(product) => {
              handleChange('productSuggestion2', product.url);
              setSearchQuery2(product.title);
              setSearchResults2([]);
            }}
            disabled={getFieldDisabled('productSuggestion2')}
            label="Produto 2 (opcional)"
            required={false}
          />

          <ProductSearchInput
            value={formData.productSuggestion3}
            searchQuery={searchQuery3}
            onSearchChange={setSearchQuery3}
            results={searchResults3}
            isLoading={isLoading3}
            onSelect={(product) => {
              handleChange('productSuggestion3', product.url);
              setSearchQuery3(product.title);
              setSearchResults3([]);
            }}
            disabled={getFieldDisabled('productSuggestion3')}
            label="Produto 3 (opcional)"
            required={false}
          />
        </div>
      </div>

      {/* ✅ Botões - Estilo Apple */}
      <div className="mt-10 space-y-3">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-[#0E1E37] text-white text-[15px] font-medium rounded-full hover:bg-[#1a2f4f] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? 'A processar...' : 'Enviar Detalhes'} <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          onClick={onBack}
          disabled={loading}
          className="w-full py-4 bg-white text-gray-600 text-[15px] font-medium rounded-full hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}

// ✅ Step 3 - A Preparar (Minimalista)
function Step3() {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#0E1E37]/5 flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#0E1E37] animate-spin" strokeWidth={1.5} />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2 tracking-tight">A Preparar</h2>
      <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
        A tua peça está a ser preparada. Entraremos em contacto pelo WhatsApp em breve.
      </p>
    </div>
  );
}

function Step4({ data, token, onNext }: StepProps) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!accepted) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get IP and user agent
      const ipResponse = await fetch('https://api.ipify.org?format=json').catch(() => ({ json: () => ({ ip: 'unknown' }) }));
      const { ip } = await ipResponse.json();
      
      const res = await fetch(`/api/portal/${token}/accept-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: ip,
          userAgent: navigator.userAgent,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to accept contract');
      }
      
      await onNext();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const agreedPrice = data.agreedPrice || 0;
  const handle = data.tiktokHandle || data.instagramHandle || 'influencer';

  return (
    <div>
      <h2 className="text-xl font-bold text-[#0E1E37] mb-6 uppercase">Contract</h2>
      
      {/* Contract Display */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-sm">
        <h3 className="text-center font-bold text-lg mb-4">COLLABORATION AGREEMENT</h3>
        <p className="text-center text-sm mb-4">BETWEEN THE BRAND VECINO CUSTOM AND CONTENT CREATOR</p>
        
        <div className="space-y-4 text-gray-700 leading-relaxed">
          <p className="whitespace-pre-wrap">Between the parties:</p>
          
          <p className="whitespace-pre-wrap"><strong>VECINO CUSTOM</strong>, a registered brand owned by the company BRILLOSCURO LDA, with its registered office at RUA COMENDADOR SÁ COUTO 112, 4520-192 SANTA MARIA DA FEIRA, tax identification number 517924773, hereinafter referred to as the "first contracting party", and</p>
          
          <p className="whitespace-pre-wrap"><strong>{data.name}</strong> (@{handle}), hereinafter referred to as the "second contracting party",</p>
          
          <p className="whitespace-pre-wrap">Enter into the present Collaboration Agreement, which shall be governed by the following clauses:</p>
          
          <div className="mt-6">
            <p className="font-bold text-base mb-2">1. Purpose of the Collaboration</p>
            <p className="whitespace-pre-wrap">The purpose of this partnership is the creation of original digital content by the second contracting party, with the aim of promoting the products of the VECINO CUSTOM brand, namely a personalized piece of jewelry.</p>
          </div>
          
          <div className="mt-6">
            <p className="font-bold text-base mb-2">2. Collaboration Terms</p>
            <p className="font-semibold mb-2">On the part of the first contracting party:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Free delivery of 1 personalized piece of jewelry, selected by the brand based on the personal style of the second contracting party.</li>
              <li>Assignment of an exclusive discount code, which provides: 10% discount for the community; 20% commission on each sale.</li>
              <li>Payment of a fixed remuneration in the amount of {agreedPrice}€.</li>
            </ul>
            
            <p className="font-semibold mb-2">On the part of the second contracting party:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Creation and publication of one creative video and one photograph on their social media platforms.</li>
              <li>The video shall be published on TikTok and Instagram Reels, and the picture shall be published on Instagram Stories.</li>
              <li>The content must be completed and published within 5 days after receiving the product.</li>
              <li>The created content must be submitted in advance to the first contracting party for approval.</li>
            </ul>
          </div>
          
          <div className="mt-6">
            <p className="font-bold text-base mb-2">3. Ownership and Usage Rights</p>
            <p className="whitespace-pre-wrap">The content shall remain the intellectual property of the second contracting party; however, the first contracting party shall have full usage rights and may share it on its digital platforms with proper credit given.</p>
          </div>
          
          <div className="mt-6">
            <p className="font-bold text-base mb-2">4. Remuneration and Commissions</p>
            <p className="whitespace-pre-wrap">This collaboration includes the provision of a product, a sales commission (20%), and a fixed remuneration ({agreedPrice}€). Commission payments will be made monthly, by the 10th day of each month.</p>
          </div>
          
          <div className="mt-6">
            <p className="font-bold text-base mb-2">5. Confidentiality and Dispute Resolution</p>
            <p className="whitespace-pre-wrap">Both parties agree to maintain the confidentiality of all information exchanged. Any dispute shall be governed by Portuguese law.</p>
          </div>
          
          <div className="mt-6">
            <p className="font-bold text-base mb-2">6. Duration and Termination</p>
            <p className="whitespace-pre-wrap">This agreement shall enter into force on the date of its acceptance and shall remain in effect for an indefinite period, subject to termination upon five (5) business days' prior notice.</p>
          </div>
          
          <div className="mt-6">
            <p className="font-bold text-base mb-2">7. Final Considerations</p>
            <p className="whitespace-pre-wrap">By accepting this agreement, both parties declare their full agreement with the points described above.</p>
          </div>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      {/* Acceptance Checkbox */}
      <div className="mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 text-[#0E1E37] border-gray-300 rounded focus:ring-[#0E1E37]"
          />
          <span className="text-sm text-gray-700">
            I have read and accept the terms of this collaboration agreement. I understand that this constitutes a legally binding contract.
          </span>
        </label>
      </div>
      
      {/* Accept Button */}
      <button
        onClick={handleAccept}
        disabled={!accepted || loading}
        className="w-full py-3 bg-[#0E1E37] text-white font-semibold rounded-lg hover:bg-[#1a2f4f] transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing...' : 'Accept and Sign'}
      </button>
    </div>
  );
}

// Step 5: Contract
function Step5({ data, token, onNext }: StepProps & { token: string }) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!accepted) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json').catch(() => ({ json: () => ({ ip: 'unknown' }) }));
      const { ip } = await ipResponse.json();
      
      const res = await fetch(`/api/portal/${token}/accept-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: ip,
          userAgent: navigator.userAgent,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to accept contract');
      }
      
      await onNext();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const agreedPrice = data.agreedPrice || 0;
  const isPaidPartnership = agreedPrice > 0;
  const handle = data.tiktokHandle || data.instagramHandle || 'influencer';

  return (
    <div>
      <h2 className="text-xl font-bold text-[#0E1E37] mb-6 uppercase">Contract</h2>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-center font-bold text-xl mb-2">COLLABORATION AGREEMENT</h3>
        <p className="text-center text-sm mb-6 text-gray-600">BETWEEN THE BRAND VECINO CUSTOM AND CONTENT CREATOR</p>
        
        <div className="text-gray-700 text-sm leading-relaxed">
          <p className="mb-4">Between the parties:</p>
          
          <p className="mb-4">
            <strong>VECINO CUSTOM</strong>, a registered brand owned by the company BRILLOSCURO LDA, 
            with its registered office at RUA COMENDADOR SÁ COUTO 112, 4520-192 SANTA MARIA DA FEIRA, 
            tax identification number 517924773, hereinafter referred to as the "first contracting party", and
          </p>
          
          <p className="mb-4">
            <strong>{data.name}</strong> (@{handle}), hereinafter referred to as the "second contracting party",
          </p>
          
          <p className="mb-6">
            Enter into the present Collaboration Agreement, which shall be governed by the following clauses:
          </p>
          
          <div className="mb-6">
            <p className="font-bold text-base mb-2">1. Purpose of the Collaboration</p>
            <p>
              The purpose of this partnership is the creation of original digital content by the second contracting party, 
              with the aim of promoting the products of the VECINO CUSTOM brand, namely a personalized piece of jewelry.
            </p>
          </div>
          
          <div className="mb-6">
            <p className="font-bold text-base mb-2">2. Collaboration Terms</p>
            
            <p className="font-semibold mb-2">On the part of the first contracting party:</p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Free delivery of 1 personalized piece of jewelry, selected by the brand based on the personal style of the second contracting party.</li>
              <li>Assignment of an exclusive discount code, which provides: 10% discount for the community; 20% commission on each sale.</li>
              {isPaidPartnership && (
                <li className="text-blue-700 font-medium">Payment of a fixed remuneration in the amount of {agreedPrice}€.</li>
              )}
            </ul>
            
            <p className="font-semibold mb-2">On the part of the second contracting party:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Creation and publication of one creative video and one photograph on their social media platforms.</li>
              <li>The video shall be published on TikTok and Instagram Reels, and the picture shall be published on Instagram Stories.</li>
              <li>The content must be completed and published within 5 days after receiving the product.</li>
              <li>The created content must be submitted in advance to the first contracting party for approval.</li>
            </ul>
          </div>
          
          <div className="mb-6">
            <p className="font-bold text-base mb-2">3. Ownership and Usage Rights</p>
            <p>
              The content shall remain the intellectual property of the second contracting party; however, 
              the first contracting party shall have full usage rights and may share it on its digital platforms 
              with proper credit given.
            </p>
          </div>
          
          <div className="mb-6">
            <p className="font-bold text-base mb-2">4. Remuneration and Commissions</p>
            {isPaidPartnership ? (
              <p>
                This collaboration includes the provision of a product, a sales commission (20%), and a fixed 
                remuneration of <strong>{agreedPrice}€</strong>. Commission payments will be made monthly, by the 10th day of each month.
                The fixed remuneration will be paid after the content is published and approved.
              </p>
            ) : (
              <p>
                This collaboration includes the provision of a product and a sales commission (20%). 
                <strong> The second contracting party will not receive any fixed remuneration.</strong> Commission payments 
                will be made monthly, by the 10th day of each month, based on sales generated through the exclusive discount code.
              </p>
            )}
          </div>
          
          <div className="mb-6">
            <p className="font-bold text-base mb-2">5. Confidentiality and Dispute Resolution</p>
            <p>
              Both parties agree to maintain the confidentiality of all information exchanged. 
              Any dispute shall be governed by Portuguese law.
            </p>
          </div>
          
          <div className="mb-6">
            <p className="font-bold text-base mb-2">6. Duration and Termination</p>
            <p>
              This agreement shall enter into force on the date of its acceptance and shall remain in effect 
              for an indefinite period, subject to termination upon five (5) business days' prior notice.
            </p>
          </div>
          
          <div className="mb-6">
            <p className="font-bold text-base mb-2">7. Final Considerations</p>
            <p>
              By accepting this agreement, both parties declare their full agreement with the points described above.
            </p>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      <div className="mb-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-5 h-5 text-[#0E1E37] border-gray-300 rounded focus:ring-[#0E1E37]"
          />
          <span className="text-sm text-gray-700">
            I have read and accept the terms of this collaboration agreement...
          </span>
        </label>
      </div>
      
      <button
        onClick={handleAccept}
        disabled={!accepted || loading}
        className="w-full py-3 bg-[#0E1E37] text-white font-semibold rounded-lg hover:bg-[#1a2f4f] transition disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Accept and Sign'}
      </button>
    </div>
  );
}

// Step 6: Contract Signed - Preparing Shipment
function Step6Preparing({ data }: { data: InfluencerData }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#0E1E37] mb-6 uppercase">Preparing Shipment</h2>
      
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-blue-900 mb-3">Preparing Your Order</h3>
        <p className="text-sm text-blue-700 mb-4">
          We've received your order and are preparing your personalized piece. 
          You'll receive tracking information once it's shipped.
        </p>
        <div className="text-xs text-blue-600 bg-blue-100 rounded-lg p-3">
          Contract signed! Preparing your jewelry...
        </div>
      </div>
    </div>
  );
}

// Step 7: Shipped
function Step7Shipped({ data }: { data: InfluencerData }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#0E1E37] mb-6 uppercase">Shipped</h2>
      
      <div className="border-l-4 border-green-500 bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold text-green-700 mb-2">On its way!</h3>
        <p className="text-sm text-gray-600 mb-6">
          Your order has been shipped and will be with you shortly.
        </p>

        <div className="space-y-4">
          {data.couponCode && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Your Coupon Code</p>
              <div className="p-3 border-2 border-dashed border-green-300 rounded-lg bg-green-50 text-center">
                <p className="text-lg font-mono font-bold text-green-700">{data.couponCode}</p>
                <p className="text-xs text-green-600 mt-1">10% off + 20% commission</p>
              </div>
            </div>
          )}

          {data.shippingAddress && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Delivery Address</p>
              <p className="text-sm text-gray-800">{data.shippingAddress}</p>
            </div>
          )}

          {data.chosenProduct && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Your Product</p>
              <a
                href={data.chosenProduct}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-gray-100 text-[#0E1E37] text-sm font-semibold rounded-lg hover:bg-gray-200 transition"
              >
                View product →
              </a>
            </div>
          )}

          {data.trackingUrl && (
            <div className="mt-6">
              <a
                href={data.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-4 bg-green-600 text-white text-center font-bold rounded-lg hover:bg-green-700 transition uppercase"
              >
                Track Order
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 8: Delivered - Partnership completed, can restart
function Step8Delivered({ data, token, onRestart }: { data: InfluencerData; token: string; onRestart: () => void }) {
  const [isRestarting, setIsRestarting] = useState(false);

  const handleRestart = async () => {
    if (!confirm('Deseja iniciar uma nova parceria? A parceria atual ficará guardada no histórico.')) {
      return;
    }

    setIsRestarting(true);
    try {
      const res = await fetch(`/api/portal/${token}/restart-partnership`, {
        method: 'POST',
      });

      if (res.ok) {
        // Force full page reload to load new workflow
        window.location.reload();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Erro ao reiniciar parceria. Tenta novamente.');
      }
    } catch (err) {
      alert('Erro ao reiniciar parceria.');
    } finally {
      setIsRestarting(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-[#0E1E37] mb-6 uppercase">Delivered</h2>
      
      <div className="border-l-4 border-green-500 bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold text-green-700 mb-2">Partnership Complete!</h3>
        <p className="text-sm text-gray-600 mb-6">
          Thank you for collaborating with Vecino Custom. We hope you love your personalized piece!
        </p>

        <div className="space-y-4">
          {data.couponCode && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Your Coupon Code</p>
              <div className="p-3 border-2 border-dashed border-green-300 rounded-lg bg-green-50 text-center">
                <p className="text-lg font-mono font-bold text-green-700">{data.couponCode}</p>
                <p className="text-xs text-green-600 mt-1">10% off + 20% commission</p>
              </div>
            </div>
          )}

          {data.trackingUrl && (
            <div>
              <a
                href={data.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-4 bg-green-600 text-white text-center font-bold rounded-lg hover:bg-green-700 transition uppercase"
              >
                Track Order
              </a>
            </div>
          )}

          {/* Info about partnership completion */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Obrigado pela colaboração! Se quiseres fazer uma nova parceria, entra em contacto com a VecinoCustom.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
