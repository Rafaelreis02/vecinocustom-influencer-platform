'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, XCircle, CheckCircle, FileText } from 'lucide-react';
import { ProductSearchInput } from './components/ProductSearchInput';

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
}

interface StepProps {
  data: InfluencerData;
  token: string;
  onUpdate: () => Promise<void>;
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

  useEffect(() => {
    if (token) {
      fetchInfluencerData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchInfluencerData = async () => {
    try {
      setLoading(true);
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
      
      // Use currentStep directly from workflow
      setCurrentStep(data.currentStep);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getStepFromStatus = (status: string): number => {
    switch (status) {
      case 'UNKNOWN':
      case 'COUNTER_PROPOSAL':
      case 'ANALYZING':
        return 1;
      case 'AGREED':
        return 2;
      case 'PRODUCT_SELECTION':
        return 3;
      case 'CONTRACT_PENDING':
        return 4;
      case 'SHIPPED':
        return 5;
      default:
        return 1;
    }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This portal link is invalid or has expired.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-[#0E1E37] text-white font-semibold rounded-lg hover:bg-[#1a2f4f] transition"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Portal Content */}
      <div className="max-w-[480px] mx-auto px-4 py-8">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#0E1E37] mb-2">VECINOCUSTOM</h1>
          <p className="text-sm text-gray-600">Influencer Portal</p>
        </div>

        {/* Progress Bar - Hidden on entry screen */}
        {!searchMode && <ProgressBar currentStep={currentStep} />}

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
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
            <Step4
              data={influencerData}
              token={token}
              onUpdate={fetchInfluencerData}
              onNext={() => setCurrentStep(5)}
            />
          )}
          {currentStep === 5 && <Step5 data={influencerData} />}
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

// Progress Bar Component
function ProgressBar({ currentStep }: { currentStep: number }) {
  const steps = [1, 2, 3, 4, 5];
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center flex-1">
            {/* Circle */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                step < currentStep
                  ? 'bg-[#27ae60] text-white'
                  : step === currentStep
                  ? 'bg-[#0E1E37] text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {step}
            </div>
            {/* Line */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 transition-colors ${
                  step < currentStep ? 'bg-[#27ae60]' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Step 1 - Partnership Details
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

  // Update formData when data changes (e.g., when coming back from Step 2)
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

  // Per-field lock logic
  const getFieldDisabled = (fieldName: string): boolean => {
    if (isReviewMode) return true; // All fields locked in review mode
    return isFieldLocked(fieldName, data, data.status);
  };

  const validateForm = () => {
    if (!formData.name.trim()) return 'Name is required';
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.instagramHandle.trim()) return 'Instagram is required';
    if (!formData.tiktokHandle.trim()) return 'TikTok is required';
    if (!formData.phone.trim()) return 'WhatsApp is required';
    if (hasPrice && formData.agreedPrice <= 0) return 'Price must be greater than 0';
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
      // Map form fields to workflow fields
      const workflowData = {
        contactEmail: formData.email,
        contactInstagram: formData.instagramHandle,
        contactWhatsapp: formData.phone,
        name: formData.name,
        tiktokHandle: formData.tiktokHandle,
      };
      
      // Update workflow
      const res = await fetch(`/api/portal/${token}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to accept proposal');
      }

      // Advance step
      const advanceRes = await fetch(`/api/portal/${token}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!advanceRes.ok) {
        const error = await advanceRes.json();
        throw new Error(error.error || 'Failed to advance step');
      }

      await onUpdate();
      
      // Wait 1.5s then advance to next step
      setTimeout(() => {
        onNext();
      }, STEP_TRANSITION_DELAY);
      
    } catch (err: any) {
      alert(err.message);
    } finally {
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
      // Map form fields to workflow fields
      const workflowData = {
        contactEmail: formData.email,
        contactInstagram: formData.instagramHandle,
        contactWhatsapp: formData.phone,
      };
      
      const res = await fetch(`/api/portal/${token}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save');
      }

      await onUpdate();
      onNext();
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-[#0E1E37] mb-6 uppercase">Partnership Details</h2>
      
      {/* Analyzing Banner */}
      {isAnalyzing && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 font-semibold">
            A sua proposta está em análise
          </p>
        </div>
      )}
      
      {/* Validation Error */}
      {validationError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{validationError}</p>
        </div>
      )}
      
      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Full name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={getFieldDisabled('name')}
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>
        
        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">E-mail *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={getFieldDisabled('email')}
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>
        
        {/* Instagram */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Instagram *</label>
          <input
            type="text"
            value={formData.instagramHandle}
            onChange={(e) => handleChange('instagramHandle', e.target.value)}
            disabled={getFieldDisabled('instagramHandle')}
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>
        
        {/* TikTok */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">TikTok *</label>
          <input
            type="text"
            value={formData.tiktokHandle}
            onChange={(e) => handleChange('tiktokHandle', e.target.value)}
            disabled={getFieldDisabled('tiktokHandle')}
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>
        
        {/* WhatsApp */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">WhatsApp *</label>
          <div className="flex gap-2">
            <select
              value={formData.ddiCode}
              onChange={(e) => handleChange('ddiCode', e.target.value)}
              disabled={getFieldDisabled('phone')}
              className="px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37] disabled:bg-gray-50 disabled:cursor-not-allowed"
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
              className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37] disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
        
        {/* Value (only if hasPrice) */}
        {hasPrice && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Value *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-[#0E1E37]">€</span>
              <input
                type="number"
                value={formData.agreedPrice}
                onChange={(e) => handleChange('agreedPrice', parseFloat(e.target.value) || 0)}
                disabled={getFieldDisabled('agreedPrice')}
                className="w-full pl-12 pr-4 py-4 text-3xl font-bold text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37] disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      {isReviewMode ? (
        // Review mode: only show Next button
        <div className="mt-6">
          <button
            onClick={onNext}
            className="w-full py-3 bg-[#0E1E37] text-white font-semibold rounded-lg hover:bg-[#1a2f4f] transition"
          >
            Next
          </button>
        </div>
      ) : !isAnalyzing && (
        <div className="mt-6 space-y-3">
          {hasPrice ? (
            // Scenario A: Has price - show Accept and Counterproposal
            <>
              <button
                onClick={handleAccept}
                disabled={loading || priceChanged}
                className="w-full py-3 bg-[#27ae60] text-white font-semibold rounded-lg hover:bg-[#229954] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Accept'}
              </button>
              <button
                onClick={handleCounterproposal}
                disabled={loading || !priceChanged}
                className="w-full py-3 bg-[#0E1E37] text-white font-semibold rounded-lg hover:bg-[#1a2f4f] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Counterproposal'}
              </button>
            </>
          ) : (
            // Scenario B: No price - show Save and continue
            <button
              onClick={handleSaveAndContinue}
              disabled={loading}
              className="w-full py-3 bg-[#0E1E37] text-white font-semibold rounded-lg hover:bg-[#1a2f4f] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Save and continue'}
            </button>
          )}
        </div>
      )}
      
      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-[#0E1E37] mb-3">Accept proposal?</h3>
            <p className="text-sm text-gray-600 mb-6">
              By accepting, you agree to the partnership terms.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                No
              </button>
              <button
                onClick={confirmAccept}
                className="flex-1 py-2 bg-[#27ae60] text-white font-semibold rounded-lg hover:bg-[#229954] transition"
              >
                Yes
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

      // Update workflow data
      const res = await fetch(`/api/portal/${token}/workflow`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingAddress,
          productSuggestion1: formData.productSuggestion1,
          productSuggestion2: formData.productSuggestion2,
          productSuggestion3: formData.productSuggestion3,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit');
      }
      
      // Advance to next step via workflow API
      const advanceRes = await fetch(`/api/portal/${token}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!advanceRes.ok) {
        const error = await advanceRes.json();
        throw new Error(error.error || 'Failed to advance step');
      }

      // Refresh data before navigating
      await onUpdate();
      
      // Navigate immediately (no delay needed since data is already saved)
      onNext();

    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-[#0E1E37] mb-6 uppercase">Shipping & Suggestions</h2>

      {/* Validation Error */}
      {validationError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{validationError}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Shipping Address - Separated Fields */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-3 uppercase">Shipping Address</label>
          
          {/* Street */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Street Address *</label>
            <input
              type="text"
              value={formData.shippingStreet}
              onChange={(e) => handleChange('shippingStreet', e.target.value)}
              disabled={getFieldDisabled('shippingAddress')}
              placeholder="e.g., Rua da Paz, 123"
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37] disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Postal Code */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Postal Code *</label>
            <input
              type="text"
              value={formData.shippingPostalCode}
              onChange={(e) => handleChange('shippingPostalCode', e.target.value)}
              disabled={getFieldDisabled('shippingAddress')}
              placeholder="e.g., 4000-123"
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37] disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Country *</label>
            <input
              type="text"
              value={formData.shippingCountry}
              onChange={(e) => handleChange('shippingCountry', e.target.value)}
              disabled={getFieldDisabled('shippingAddress')}
              placeholder="e.g., Portugal"
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37] disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Product Suggestion 1 */}
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
          label="Suggestion 1"
          required={true}
        />

        {/* Product Suggestion 2 */}
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
          label="Suggestion 2"
          required={false}
        />

        {/* Product Suggestion 3 */}
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
          label="Suggestion 3"
          required={false}
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-6 space-y-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Review details
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-3 bg-[#0E1E37] text-white font-semibold rounded-lg hover:bg-[#1a2f4f] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Send details'}
        </button>
      </div>
    </div>
  );
}

function Step3() {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#0E1E37] mb-6 uppercase">Preparing</h2>
      
      <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg text-center">
        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
        <h3 className="text-lg font-bold text-green-800 mb-3">We are preparing your piece</h3>
        <p className="text-sm text-green-700">
          From now on all communication will be through WhatsApp. We will send over the product we chose along with previews of the pieces.
        </p>
      </div>
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
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 max-h-96 overflow-y-auto text-sm">
        <h3 className="text-center font-bold text-lg mb-4">COLLABORATION AGREEMENT</h3>
        <p className="text-center text-sm mb-4">BETWEEN THE BRAND VECINO CUSTOM AND CONTENT CREATOR</p>
        
        <div className="space-y-3 text-gray-700">
          <p>Between the parties:</p>
          <p><strong>VECINO CUSTOM</strong>, a registered brand owned by the company BRILLOSCURO LDA, with its registered office at RUA COMENDADOR SÁ COUTO 112, 4520-192 SANTA MARIA DA FEIRA, tax identification number 517924773, hereinafter referred to as the "first contracting party", and</p>
          <p><strong>{data.name}</strong> (@{handle}), hereinafter referred to as the "second contracting party",</p>
          <p>Enter into the present Collaboration Agreement, which shall be governed by the following clauses:</p>
          
          <p className="font-bold mt-4">1. Purpose of the Collaboration</p>
          <p>The purpose of this partnership is the creation of original digital content by the second contracting party, with the aim of promoting the products of the VECINO CUSTOM brand, namely a personalized piece of jewelry.</p>
          
          <p className="font-bold mt-4">2. Collaboration Terms</p>
          <p className="font-semibold">On the part of the first contracting party:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Free delivery of 1 personalized piece of jewelry, selected by the brand based on the personal style of the second contracting party.</li>
            <li>Assignment of an exclusive discount code, which provides: 10% discount for the community; 20% commission on each sale.</li>
            <li>Payment of a fixed remuneration in the amount of {agreedPrice}€.</li>
          </ul>
          
          <p className="font-semibold mt-2">On the part of the second contracting party:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Creation and publication of one creative video and one photograph on their social media platforms.</li>
            <li>The video shall be published on TikTok and Instagram Reels, and the picture shall be published on Instagram Stories.</li>
            <li>The content must be completed and published within 5 days after receiving the product.</li>
            <li>The created content must be submitted in advance to the first contracting party for approval.</li>
          </ul>
          
          <p className="font-bold mt-4">3. Ownership and Usage Rights</p>
          <p>The content shall remain the intellectual property of the second contracting party; however, the first contracting party shall have full usage rights and may share it on its digital platforms with proper credit given.</p>
          
          <p className="font-bold mt-4">4. Remuneration and Commissions</p>
          <p>This collaboration includes the provision of a product, a sales commission (20%), and a fixed remuneration ({agreedPrice}€). Commission payments will be made monthly, by the 10th day of each month.</p>
          
          <p className="font-bold mt-4">5. Confidentiality and Dispute Resolution</p>
          <p>Both parties agree to maintain the confidentiality of all information exchanged. Any dispute shall be governed by Portuguese law.</p>
          
          <p className="font-bold mt-4">6. Duration and Termination</p>
          <p>This agreement shall enter into force on the date of its acceptance and shall remain in effect for an indefinite period, subject to termination upon five (5) business days' prior notice.</p>
          
          <p className="font-bold mt-4">7. Final Considerations</p>
          <p>By accepting this agreement, both parties declare their full agreement with the points described above.</p>
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

function Step5({ data }: { data: InfluencerData }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#0E1E37] mb-6 uppercase">Shipped</h2>
      
      <div className="border-l-4 border-[#0E1E37] bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#0E1E37] mb-2">On its way</h3>
        <p className="text-sm text-gray-600 mb-6">
          Your order has been shipped and will be with you shortly.
        </p>

        <div className="space-y-4">
          {/* Coupon Code */}
          {data.couponCode && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Your Coupon Code</p>
              <div className="p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
                <p className="text-lg font-mono font-bold text-[#0E1E37]">{data.couponCode}</p>
              </div>
            </div>
          )}

          {/* Address */}
          {data.shippingAddress && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Delivery Address</p>
              <p className="text-sm text-gray-800">{data.shippingAddress}</p>
            </div>
          )}

          {/* Product Link */}
          {data.chosenProduct && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase">Product</p>
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

          {/* Track Order Button */}
          {data.trackingUrl && (
            <div className="mt-6">
              <a
                href={data.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-4 bg-[#0E1E37] text-white text-center font-bold rounded-lg hover:bg-[#1a2f4f] transition uppercase"
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
