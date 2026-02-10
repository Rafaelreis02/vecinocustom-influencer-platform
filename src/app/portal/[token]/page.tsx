'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

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

// DDI options
const DDI_OPTIONS = [
  { code: '+351', country: 'PT' },
  { code: '+34', country: 'ES' },
  { code: '+33', country: 'FR' },
  { code: '+1', country: 'US' },
  { code: '+55', country: 'BR' },
];

export default function PortalPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [influencerData, setInfluencerData] = useState<InfluencerData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchMode, setSearchMode] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInfluencerData();
    }
  }, [token]);

  const fetchInfluencerData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/portal/${token}`);
      
      if (!res.ok) {
        if (res.status === 404) {
          setError('Invalid portal link');
        } else {
          setError('Failed to load data');
        }
        return;
      }

      const data = await res.json();
      setInfluencerData(data);
      
      // Determine current step based on status
      const step = getStepFromStatus(data.status);
      setCurrentStep(step);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getStepFromStatus = (status: string): number => {
    switch (status) {
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
          <div className="text-6xl mb-4">❌</div>
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
              onNext={() => setCurrentStep(2)}
            />
          )}
          {currentStep === 2 && (
            <Step2
              data={influencerData}
              token={token}
              onUpdate={fetchInfluencerData}
              onBack={() => setCurrentStep(1)}
              onNext={() => setCurrentStep(3)}
            />
          )}
          {currentStep === 3 && <Step3 />}
          {currentStep === 4 && <Step4 />}
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
function Step1({ data, token, onUpdate, onNext }: any) {
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
  
  const allFieldsDisabled = isAnalyzing;

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationError) setValidationError(null);
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
    setShowModal(false);
    setLoading(true);
    
    try {
      const res = await fetch(`/api/portal/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'AGREED',
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to accept proposal');
      }

      await onUpdate();
      
      // Wait 1.5s then advance to next step
      setTimeout(() => {
        onNext();
      }, 1500);
      
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
      setTimeout(() => setValidationError(null), 4000);
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch(`/api/portal/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'ANALYZING',
        }),
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
      setTimeout(() => setValidationError(null), 4000);
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await fetch(`/api/portal/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'AGREED',
        }),
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
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-semibold">
            ✅ Your proposal is already with our team to be analyzed
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
            disabled={allFieldsDisabled}
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37] disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>
        
        {/* Email (readonly) */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">E-mail *</label>
          <input
            type="email"
            value={formData.email}
            readOnly
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
          />
        </div>
        
        {/* Instagram */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Instagram *</label>
          <input
            type="text"
            value={formData.instagramHandle}
            onChange={(e) => handleChange('instagramHandle', e.target.value)}
            disabled={allFieldsDisabled}
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
            disabled={allFieldsDisabled}
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
              disabled={allFieldsDisabled}
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
              disabled={allFieldsDisabled}
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
                disabled={allFieldsDisabled}
                className="w-full pl-12 pr-4 py-4 text-3xl font-bold text-right border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37] disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      {!isAnalyzing && (
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

function Step2({ data, token, onUpdate, onBack, onNext }: any) {
  const [formData, setFormData] = useState({
    shippingAddress: data.shippingAddress || '',
    productSuggestion1: data.productSuggestion1 || '',
    productSuggestion2: data.productSuggestion2 || '',
    productSuggestion3: data.productSuggestion3 || '',
  });
  
  const [searchQuery1, setSearchQuery1] = useState('');
  const [searchQuery2, setSearchQuery2] = useState('');
  const [searchQuery3, setSearchQuery3] = useState('');
  const [searchResults1, setSearchResults1] = useState<any[]>([]);
  const [searchResults2, setSearchResults2] = useState<any[]>([]);
  const [searchResults3, setSearchResults3] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationError) setValidationError(null);
  };

  const searchProducts = async (query: string, setResults: Function) => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/portal/${token}/products?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const products = await res.json();
        setResults(products);
      }
    } catch (err) {
      console.error('Error searching products:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchQuery1, setSearchResults1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery1]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchQuery2, setSearchResults2);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery2]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchQuery3, setSearchResults3);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery3]);

  const selectProduct = (field: string, product: any, setSearch: Function, setResults: Function) => {
    handleChange(field, product.url);
    setSearch(product.title);
    setResults([]);
  };

  const validateForm = () => {
    if (!formData.shippingAddress.trim()) return 'Full address is required';
    if (!formData.productSuggestion1.trim()) return 'At least one product suggestion is required';
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      setValidationError(error);
      setTimeout(() => setValidationError(null), 4000);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/portal/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: 'PRODUCT_SELECTION',
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit');
      }

      await onUpdate();
      
      // Wait 1.5s then advance to next step
      setTimeout(() => {
        onNext();
      }, 1500);

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
        {/* Full Address */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Full address *</label>
          <textarea
            value={formData.shippingAddress}
            onChange={(e) => handleChange('shippingAddress', e.target.value)}
            rows={3}
            placeholder="Street, Number, City, Zip Code"
            className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37]"
          />
        </div>

        {/* Product Suggestion 1 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Suggestion 1 *</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery1}
              onChange={(e) => setSearchQuery1(e.target.value)}
              placeholder="Search for a product..."
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37]"
            />
            {searchResults1.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults1.map((product, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectProduct('productSuggestion1', product, setSearchQuery1, setSearchResults1)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                  >
                    {product.image && (
                      <img src={product.image} alt={product.title} className="w-12 h-12 object-cover rounded" />
                    )}
                    <span className="text-sm text-gray-900">{product.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {formData.productSuggestion1 && (
            <p className="mt-1 text-xs text-gray-600 truncate">{formData.productSuggestion1}</p>
          )}
        </div>

        {/* Product Suggestion 2 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Suggestion 2</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery2}
              onChange={(e) => setSearchQuery2(e.target.value)}
              placeholder="Search for a product..."
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37]"
            />
            {searchResults2.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults2.map((product, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectProduct('productSuggestion2', product, setSearchQuery2, setSearchResults2)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                  >
                    {product.image && (
                      <img src={product.image} alt={product.title} className="w-12 h-12 object-cover rounded" />
                    )}
                    <span className="text-sm text-gray-900">{product.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {formData.productSuggestion2 && (
            <p className="mt-1 text-xs text-gray-600 truncate">{formData.productSuggestion2}</p>
          )}
        </div>

        {/* Product Suggestion 3 */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Suggestion 3</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery3}
              onChange={(e) => setSearchQuery3(e.target.value)}
              placeholder="Search for a product..."
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E1E37]"
            />
            {searchResults3.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults3.map((product, idx) => (
                  <button
                    key={idx}
                    onClick={() => selectProduct('productSuggestion3', product, setSearchQuery3, setSearchResults3)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                  >
                    {product.image && (
                      <img src={product.image} alt={product.title} className="w-12 h-12 object-cover rounded" />
                    )}
                    <span className="text-sm text-gray-900">{product.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {formData.productSuggestion3 && (
            <p className="mt-1 text-xs text-gray-600 truncate">{formData.productSuggestion3}</p>
          )}
        </div>
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
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-lg font-bold text-green-800 mb-3">We are preparing your piece</h3>
        <p className="text-sm text-green-700">
          From now on all communication will be through WhatsApp. We will send over the product we chose along with previews of the pieces.
        </p>
      </div>
    </div>
  );
}

function Step4() {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#0E1E37] mb-6 uppercase">Contract</h2>
      
      <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg text-center">
        <div className="text-4xl mb-4">📝</div>
        <h3 className="text-lg font-bold text-blue-800 mb-3">Just one step away</h3>
        <p className="text-sm text-blue-700">
          We've sent the contract via e-mail and WhatsApp. Please sign it to move forward.
        </p>
      </div>
    </div>
  );
}

function Step5({ data }: any) {
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
