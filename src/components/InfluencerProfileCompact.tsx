'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Instagram,
  TrendingUp,
  BarChart3,
  Video,
  Award,
  Calendar,
  ExternalLink,
  Loader2,
  MapPin,
  Hash,
  CheckCircle2,
  ChevronRight,
  Send,
  FileText,
  Package,
  Palette,
  Truck,
  Star,
  Plus
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { InfluencerStatusBadge } from '@/components/InfluencerStatusBadge';

interface InfluencerProfileCompactProps {
  influencerId: string;
  onUpdate?: () => void;
}

export function InfluencerProfileCompact({ influencerId, onUpdate }: InfluencerProfileCompactProps) {
  // Log immediately when component renders
  console.log('[RENDER] InfluencerProfileCompact called with influencerId:', influencerId);
  
  const { addToast } = useToast();
  const [influencer, setInfluencer] = useState<any>(null);
  const [workflow, setWorkflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingPartnership, setIsCreatingPartnership] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'content'>('overview');

  // Workflow steps definition
  const workflowSteps = [
    { id: 0, name: 'Proposal', icon: Send, description: 'Send proposal' },
    { id: 1, name: 'Details', icon: FileText, description: 'Shipping info' },
    { id: 2, name: 'Product', icon: Package, description: 'Confirm product' },
    { id: 3, name: 'Design', icon: Palette, description: 'Design review' },
    { id: 4, name: 'Contract', icon: FileText, description: 'Sign contract' },
    { id: 5, name: 'Shipped', icon: Truck, description: 'Send tracking' },
    { id: 6, name: 'Complete', icon: Star, description: 'Done' },
  ];

  // Fetch data on mount and when influencerId changes
  useEffect(() => {
    fetchData();
  }, [influencerId]);

  const fetchData = async () => {
    if (!influencerId) return;
    
    try {
      setLoading(true);
      
      // Fetch influencer data
      const infRes = await fetch(`/api/influencers/${influencerId}`);
      if (infRes.ok) {
        const infData = await infRes.json();
        setInfluencer(infData);
        
        // Use the partnerships array from influencer data (not filtered by ACTIVE status)
        const partnerships = infData.partnerships || [];
        const mostRecentWorkflow = partnerships.length > 0 ? partnerships[0] : null;
        setWorkflow(mostRecentWorkflow);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePartnership = async () => {
    if (!influencer?.email) {
      addToast('Influencer has no email', 'error');
      return;
    }

    const price = parseFloat(agreedPrice);
    if (isNaN(price) || price < 0) {
      addToast('Please enter a valid price', 'error');
      return;
    }

    try {
      setIsCreatingPartnership(true);
      const res = await fetch('/api/partnerships/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          influencerId,
          agreedPrice: price,
          commission: 20,
        }),
      });

      if (!res.ok) throw new Error();
      
      addToast('Partnership created!', 'success');
      setShowCreateForm(false);
      setAgreedPrice('');
      await fetchData();
      onUpdate?.();
    } catch (error) {
      addToast('Error creating partnership', 'error');
    } finally {
      setIsCreatingPartnership(false);
    }
  };

  const handleAdvanceStep = async () => {
    if (!workflow) return;

    try {
      setIsAdvancing(true);
      const res = await fetch(`/api/partnerships/${workflow.id}/advance`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error();
      
      addToast('Step advanced!', 'success');
      await fetchData();
      onUpdate?.();
    } catch (error) {
      addToast('Error advancing step', 'error');
    } finally {
      setIsAdvancing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!influencer) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <p className="text-sm text-gray-400">Influencer not found</p>
      </div>
    );
  }

  const currentStep = workflow?.currentStep || 0;
  const progress = workflow ? Math.min(((currentStep + 1) / 7) * 100, 100) : 0;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-[#0E1E37] to-[#1a2f4f] flex items-center justify-center shrink-0">
              {influencer.avatarUrl ? (
                <img 
                  src={influencer.avatarUrl} 
                  alt={influencer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xl font-semibold">
                  {influencer.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            
            {/* Name & Status */}
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{influencer.name}</h3>
              <InfluencerStatusBadge status={influencer.status} />
            </div>
          </div>
          
          <Link 
            href={`/dashboard/influencers/${influencerId}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Open full profile"
          >
            <ExternalLink className="h-4 w-4 text-gray-400" />
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-lg font-semibold text-gray-900">
              {influencer.engagementRate?.toFixed(1) || '-'}
            </p>
            <p className="text-[10px] text-gray-400 uppercase">Eng. Rate</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-lg font-semibold text-gray-900">
              {influencer.followerCount ? (influencer.followerCount / 1000).toFixed(1) + 'K' : '-'}
            </p>
            <p className="text-[10px] text-gray-400 uppercase">Followers</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 text-center">
            <p className="text-lg font-semibold text-gray-900">
              {influencer.matchScore || '-'}
            </p>
            <p className="text-[10px] text-gray-400 uppercase">Match</p>
          </div>
        </div>
      </div>

      {/* WORKFLOW SECTION - PRINCIPAL */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#0E1E37]/5 to-blue-50/50 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-gray-700 uppercase">Partnership Workflow</h4>
          {workflow && (
            <span className="text-xs font-medium text-[#0E1E37]">
              Step {currentStep + 1}/7
            </span>
          )}
        </div>
        
        {!workflow ? (
          !showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full py-2.5 bg-[#0E1E37] text-white text-sm font-medium rounded-xl hover:bg-[#1a2f4f] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Partnership
            </button>
          ) : (
            <div className="space-y-3 bg-white rounded-xl p-3 border-2 border-[#0E1E37]">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Valor Acordado (€)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">€</span>
                  <input
                    type="number"
                    value={agreedPrice}
                    onChange={(e) => setAgreedPrice(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border-0 rounded-lg text-lg font-semibold text-gray-900 focus:ring-2 focus:ring-[#0E1E37]/20 placeholder:text-gray-300"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  (pode ser 0€ para comissão apenas)
                </p>
              </div>
              
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreatePartnership}
                  disabled={isCreatingPartnership || agreedPrice === ''}
                  className="flex-1 py-2.5 bg-[#0E1E37] text-white text-sm font-medium rounded-lg hover:bg-[#1a2f4f] transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isCreatingPartnership ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Criar Parceria'
                  )}
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-2">
            {/* Current Step */}
            {workflowSteps.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              const Icon = step.icon;
              
              if (!isCompleted && !isCurrent) return null;
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl ${
                    isCurrent 
                      ? 'bg-white border-2 border-[#0E1E37] shadow-sm' 
                      : 'bg-white/50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isCurrent 
                      ? 'bg-[#0E1E37] text-white' 
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-600'}`}>
                      {step.name}
                    </p>
                    <p className="text-xs text-gray-400">{step.description}</p>
                  </div>
                  {isCurrent && (
                    <button
                      onClick={handleAdvanceStep}
                      disabled={isAdvancing}
                      className="px-3 py-1.5 bg-[#0E1E37] text-white text-xs font-medium rounded-lg hover:bg-[#1a2f4f] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isAdvancing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          A processar...
                        </>
                      ) : currentStep === 6 ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Completar Parceria
                        </>
                      ) : currentStep === 5 && !workflow?.trackingUrl ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Adicionar Tracking
                        </>
                      ) : (
                        <>
                          Avançar
                          <ChevronRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
            
            {/* Progress Bar */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#0E1E37] rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 font-medium">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'stats', label: 'Stats', icon: BarChart3 },
          { id: 'content', label: 'Content', icon: Video },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
              activeTab === tab.id 
                ? 'text-[#0E1E37] border-b-2 border-[#0E1E37]' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Contact Info */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase">Contact</h4>
              
              {influencer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 truncate">{influencer.email}</span>
                </div>
              )}
              
              {influencer.instagramHandle && (
                <div className="flex items-center gap-2 text-sm">
                  <Instagram className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">@{influencer.instagramHandle}</span>
                </div>
              )}
              
              {influencer.tiktokHandle && (
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">@{influencer.tiktokHandle}</span>
                </div>
              )}
              
              {influencer.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">{influencer.location}</span>
                </div>
              )}
            </div>

            {/* Notes */}
            {influencer.notes && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">
                  {influencer.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-4">
            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-gray-400">Avg Views</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {influencer.avgVideoViews ? (influencer.avgVideoViews / 1000).toFixed(1) + 'K' : '-'}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span className="text-xs text-gray-400">Fit Score</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {influencer.fitScore?.toFixed(1) || '-'}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-gray-400">Added</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {influencer.createdAt 
                    ? new Date(influencer.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
                    : '-'
                  }
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Video className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-gray-400">Videos</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {influencer.videos?.length || 0}
                </p>
              </div>
            </div>

            {/* Categories */}
            {influencer.categories && influencer.categories.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase">Categories</h4>
                <div className="flex flex-wrap gap-1">
                  {influencer.categories.map((cat: string) => (
                    <span 
                      key={cat}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-3">
            {influencer.videos && influencer.videos.length > 0 ? (
              influencer.videos.slice(0, 5).map((video: any) => (
                <div key={video.id} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm text-gray-800 line-clamp-2 mb-2">
                    {video.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{(video.views / 1000).toFixed(1)}K views</span>
                    <span>•</span>
                    <span>{video.engagementRate?.toFixed(1)}% eng</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Video className="h-12 w-12 mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No videos yet</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <Link 
          href={`/dashboard/influencers/${influencerId}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          View Full Profile
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
