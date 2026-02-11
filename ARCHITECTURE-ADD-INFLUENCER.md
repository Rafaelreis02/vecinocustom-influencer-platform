# 🏗️ Architecture: Add Influencer Flow

**Version:** 1.0  
**Created:** 2026-02-11  
**Model:** Claude Opus 4  

---

## 📋 Overview

Complete architectural design for the "Add Influencer" feature that:
1. Accepts TikTok handle from user
2. Fetches basic data from Apify
3. Performs deep analysis with Sonnet via browser
4. Stores influencer with status "NEGOTIATING"

---

## 🎯 Requirements

### Functional
- ✅ Manual influencer addition via UI button
- ✅ TikTok handle input with validation
- ✅ Apify integration for basic stats (followers, engagement, etc.)
- ✅ Sonnet browser analysis for brand fit assessment
- ✅ Automatic status set to "NEGOTIATING" (manual additions)
- ✅ Error handling for invalid handles, API failures
- ✅ Loading states with progress indicators

### Non-Functional
- ✅ Response time: <30s for complete flow
- ✅ Cost optimization: Use Apify for bulk data, Sonnet only for analysis
- ✅ Resilience: Graceful degradation if Apify/Sonnet fails
- ✅ Type safety: Full TypeScript coverage
- ✅ Validation: Zod schemas for all data

---

## 🔄 Flow Diagram

```
┌─────────────┐
│  User Input │
│ @tiktok.handle │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Frontend Validation │
│  - Format check     │
│  - Duplicate check  │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────────┐
│  POST /api/influencers/  │
│       analyze-and-add    │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  1. Apify: Fetch Basic   │
│     Data (5-10s)         │
│  - Followers             │
│  - Engagement rate       │
│  - Recent videos         │
│  - Profile info          │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  2. Sonnet: Deep         │
│     Analysis (15-20s)    │
│  - Browser automation    │
│  - Content themes        │
│  - Audience analysis     │
│  - Brand fit score       │
│  - Summary & reasoning   │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  3. Save to Database     │
│  - Influencer record     │
│  - Status: NEGOTIATING   │
│  - Analysis results      │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│  Return to Frontend      │
│  - Success message       │
│  - Redirect to profile   │
└──────────────────────────┘
```

---

## 🗄️ Database Schema

### Influencer Model (Existing - Review)
```prisma
model Influencer {
  id                String   @id @default(cuid())
  
  // Basic Info
  name              String
  handle            String   @unique // TikTok @handle
  email             String?
  phone             String?
  
  // TikTok Stats (from Apify)
  followers         Int      @default(0)
  totalViews        Int      @default(0)
  totalLikes        Int      @default(0)
  engagementRate    Float    @default(0)
  videoCount        Int      @default(0)
  
  // Analysis (from Sonnet)
  brandFitScore     Float?   // 0-100
  contentThemes     String[] // ["fashion", "lifestyle", ...]
  audienceDemographics Json? // {ageGroups: {...}, gender: {...}}
  analysisSummary   String?  // Sonnet's written assessment
  analysisDate      DateTime?
  
  // Status & Metadata
  status            InfluencerStatus @default(PROSPECTING)
  source            String   @default("MANUAL") // MANUAL | AUTOMATED
  addedBy           String?  // User ID who added
  
  // Timestamps
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  campaigns         CampaignInfluencer[]
  videos            Video[]
  coupons           Coupon[]
  
  @@index([handle])
  @@index([status])
}

enum InfluencerStatus {
  PROSPECTING   // AI suggestions (future automated flow)
  NEGOTIATING   // Manual additions, under negotiation
  ACTIVE        // Partnership confirmed
  INACTIVE      // Ended partnership
  REJECTED      // Declined collaboration
}
```

**Schema Updates Needed:**
- ✅ Add `brandFitScore` field (Float?)
- ✅ Add `contentThemes` field (String[])
- ✅ Add `audienceDemographics` field (Json?)
- ✅ Add `analysisSummary` field (String?)
- ✅ Add `analysisDate` field (DateTime?)
- ✅ Add `source` field (default "MANUAL")
- ✅ Add `addedBy` field (String? - future: link to User model)

---

## 🔌 API Endpoints

### POST /api/influencers/analyze-and-add

**Purpose:** Complete flow for adding influencer with analysis

**Request Body:**
```typescript
{
  handle: string; // @tiktokhandle or just tiktokhandle
}
```

**Response (Success):**
```typescript
{
  success: true;
  influencer: {
    id: string;
    name: string;
    handle: string;
    followers: number;
    engagementRate: number;
    brandFitScore: number;
    analysisSummary: string;
    status: "NEGOTIATING";
  };
  redirect: string; // `/dashboard/influencers/${id}`
}
```

**Response (Error):**
```typescript
{
  success: false;
  error: {
    code: "INVALID_HANDLE" | "DUPLICATE" | "APIFY_FAILED" | "ANALYSIS_FAILED";
    message: string;
    details?: any;
  };
}
```

**Implementation Steps:**
```typescript
// 1. Validate handle
const schema = z.object({
  handle: z.string()
    .min(1)
    .regex(/^@?[a-zA-Z0-9._]+$/, "Invalid TikTok handle format")
    .transform(h => h.startsWith('@') ? h : `@${h}`),
});

// 2. Check for duplicates
const existing = await prisma.influencer.findUnique({
  where: { handle: normalizedHandle },
});
if (existing) throw new ApiError("Influencer already exists", 409);

// 3. Fetch from Apify
const apifyData = await fetchApifyData(handle);
if (!apifyData) throw new ApiError("Failed to fetch TikTok data", 502);

// 4. Analyze with Sonnet
const analysis = await analyzewithSonnet(handle, apifyData);

// 5. Save to database
const influencer = await prisma.influencer.create({
  data: {
    handle: normalizedHandle,
    name: apifyData.name,
    followers: apifyData.followers,
    totalViews: apifyData.totalViews,
    totalLikes: apifyData.totalLikes,
    engagementRate: apifyData.engagementRate,
    videoCount: apifyData.videoCount,
    brandFitScore: analysis.fitScore,
    contentThemes: analysis.themes,
    audienceDemographics: analysis.demographics,
    analysisSummary: analysis.summary,
    analysisDate: new Date(),
    status: "NEGOTIATING",
    source: "MANUAL",
  },
});

return influencer;
```

---

## 🔧 Service Layer

### src/lib/services/apify-service.ts

**Purpose:** Wrapper for Apify API interactions

```typescript
import { ApifyClient } from 'apify-client';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

const client = new ApifyClient({
  token: env.APIFY_API_TOKEN,
});

export interface ApifyProfileData {
  name: string;
  handle: string;
  followers: number;
  totalViews: number;
  totalLikes: number;
  engagementRate: number;
  videoCount: number;
  bio: string;
  verified: boolean;
  avatarUrl: string;
  recentVideos: {
    id: string;
    caption: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    createdAt: string;
  }[];
}

export async function fetchTikTokProfile(
  handle: string
): Promise<ApifyProfileData> {
  logger.info('Fetching TikTok profile from Apify', { handle });

  try {
    // Run Apify actor for TikTok profile scraping
    const run = await client.actor('ACTOR_ID_HERE').call({
      profiles: [handle],
      // Add other params based on Apify actor requirements
    });

    // Wait for results
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    if (!items || items.length === 0) {
      throw new Error('No data returned from Apify');
    }

    const profile = items[0];

    // Transform Apify response to our format
    return {
      name: profile.authorMeta?.name || handle,
      handle: profile.authorMeta?.name || handle,
      followers: profile.authorMeta?.fans || 0,
      totalViews: profile.authorMeta?.video || 0,
      totalLikes: profile.authorMeta?.heart || 0,
      engagementRate: calculateEngagementRate(profile),
      videoCount: profile.authorMeta?.video || 0,
      bio: profile.authorMeta?.signature || '',
      verified: profile.authorMeta?.verified || false,
      avatarUrl: profile.authorMeta?.avatar || '',
      recentVideos: profile.videos?.slice(0, 10).map((v: any) => ({
        id: v.id,
        caption: v.text,
        views: v.playCount,
        likes: v.diggCount,
        comments: v.commentCount,
        shares: v.shareCount,
        createdAt: new Date(v.createTime * 1000).toISOString(),
      })) || [],
    };
  } catch (error) {
    logger.error('Apify fetch failed', { handle, error });
    throw new ApiError('Failed to fetch TikTok data from Apify', 502, error);
  }
}

function calculateEngagementRate(profile: any): number {
  const totalEngagement = (profile.authorMeta?.heart || 0);
  const followers = profile.authorMeta?.fans || 1;
  return (totalEngagement / followers) * 100;
}
```

---

### src/lib/services/analysis-service.ts

**Purpose:** Sonnet-powered influencer analysis via browser automation

```typescript
import { Anthropic } from '@anthropic-ai/sdk';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import type { ApifyProfileData } from './apify-service';

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export interface InfluencerAnalysis {
  fitScore: number; // 0-100
  themes: string[]; // ["fashion", "lifestyle", "jewelry"]
  demographics: {
    primaryAge: string; // "18-24"
    gender: { female: number; male: number }; // percentages
    locations: string[]; // top countries
  };
  summary: string; // 2-3 paragraph assessment
  strengths: string[];
  concerns: string[];
}

export async function analyzeInfluencer(
  handle: string,
  apifyData: ApifyProfileData
): Promise<InfluencerAnalysis> {
  logger.info('Starting Sonnet analysis', { handle });

  try {
    // Build context from Apify data
    const context = buildAnalysisContext(apifyData);

    // Call Sonnet with structured prompt
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 2000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: buildAnalysisPrompt(handle, context),
        },
      ],
    });

    // Parse Sonnet's response
    const analysis = parseAnalysisResponse(response.content[0].text);

    logger.info('Analysis complete', {
      handle,
      fitScore: analysis.fitScore,
      themes: analysis.themes,
    });

    return analysis;
  } catch (error) {
    logger.error('Analysis failed', { handle, error });
    throw new ApiError('Failed to analyze influencer', 500, error);
  }
}

function buildAnalysisContext(data: ApifyProfileData): string {
  return `
TikTok Profile: ${data.handle}
Name: ${data.name}
Followers: ${data.followers.toLocaleString()}
Engagement Rate: ${data.engagementRate.toFixed(2)}%
Total Videos: ${data.videoCount}
Verified: ${data.verified ? 'Yes' : 'No'}

Bio: ${data.bio}

Recent Videos (Top 10):
${data.recentVideos.map((v, i) => `
${i + 1}. ${v.caption}
   Views: ${v.views.toLocaleString()} | Likes: ${v.likes.toLocaleString()} | Comments: ${v.comments.toLocaleString()}
`).join('\n')}
  `.trim();
}

function buildAnalysisPrompt(handle: string, context: string): string {
  return `
You are an expert influencer analyst for VecinoCustom, a Portuguese brand specializing in personalized jewelry (custom necklaces, bracelets, rings with names, initials, etc.).

Your task: Analyze this TikTok influencer and assess their fit for a brand partnership.

${context}

**Brand Context - VecinoCustom:**
- Product: Personalized jewelry (necklaces, bracelets, rings)
- Style: Elegant, trendy, gift-worthy
- Target Audience: Women 18-35, fashion-conscious, sentimental
- Values: Personalization, quality, emotional connection
- Portuguese market but global reach

**Analysis Required:**

1. **Brand Fit Score (0-100):** Rate how well this influencer aligns with VecinoCustom
   - Consider: Content style, audience demographics, authenticity, engagement quality
   - High scores (80+): Perfect match
   - Medium (50-79): Potential with guidance
   - Low (<50): Not recommended

2. **Content Themes:** List 3-5 primary content categories (e.g., "fashion", "lifestyle", "beauty", "jewelry")

3. **Audience Demographics:** Estimate:
   - Primary age group (e.g., "18-24", "25-34")
   - Gender split (% female / % male)
   - Top geographic locations (countries)

4. **Summary (2-3 paragraphs):** 
   - Overview of influencer's content and style
   - Why they would/wouldn't be a good fit
   - Potential partnership approach

5. **Strengths:** 3-5 key advantages for this partnership

6. **Concerns:** 2-3 potential risks or considerations

**Output Format (JSON):**
\`\`\`json
{
  "fitScore": 85,
  "themes": ["fashion", "lifestyle", "jewelry", "shopping"],
  "demographics": {
    "primaryAge": "18-24",
    "gender": {"female": 75, "male": 25},
    "locations": ["Portugal", "Spain", "Brazil"]
  },
  "summary": "...",
  "strengths": [
    "High engagement with female audience in target age group",
    "...",
    "..."
  ],
  "concerns": [
    "Limited content explicitly featuring jewelry",
    "..."
  ]
}
\`\`\`

Respond ONLY with the JSON object. Be honest and critical in your assessment.
  `.trim();
}

function parseAnalysisResponse(text: string): InfluencerAnalysis {
  // Extract JSON from markdown code blocks if present
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;

  try {
    const parsed = JSON.parse(jsonText);
    
    // Validate structure
    if (typeof parsed.fitScore !== 'number' ||
        !Array.isArray(parsed.themes) ||
        !parsed.demographics ||
        typeof parsed.summary !== 'string') {
      throw new Error('Invalid analysis structure');
    }

    return parsed;
  } catch (error) {
    logger.error('Failed to parse analysis response', { text, error });
    throw new ApiError('Invalid analysis format from Sonnet', 500, error);
  }
}
```

---

## 🎨 Frontend Components

### src/app/dashboard/influencers/new/page.tsx

**Purpose:** UI for adding new influencer

```typescript
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';

export default function AddInfluencerPage() {
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{
    step: 'idle' | 'validating' | 'fetching' | 'analyzing' | 'saving';
    message: string;
  }>({ step: 'idle', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!handle.trim()) {
      toast({ title: 'Error', description: 'Please enter a TikTok handle' });
      return;
    }

    setLoading(true);
    
    try {
      // Step 1: Validation
      setProgress({ step: 'validating', message: 'Validating handle...' });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Fetch from Apify
      setProgress({ step: 'fetching', message: 'Fetching profile data from TikTok...' });
      
      // Step 3: Analyze with Sonnet
      setProgress({ step: 'analyzing', message: 'Analyzing brand fit (this may take 20-30s)...' });
      
      // Step 4: Save
      setProgress({ step: 'saving', message: 'Saving influencer...' });

      const response = await fetch('/api/influencers/analyze-and-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to add influencer');
      }

      toast({
        title: 'Success!',
        description: `${data.influencer.name} added successfully`,
      });

      router.push(data.redirect);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setProgress({ step: 'idle', message: '' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Add New Influencer</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="handle" className="block text-sm font-medium mb-2">
            TikTok Handle
          </label>
          <Input
            id="handle"
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@username or username"
            disabled={loading}
            className="text-lg"
          />
          <p className="text-sm text-gray-500 mt-2">
            Enter the TikTok username (with or without @)
          </p>
        </div>

        {progress.step !== 'idle' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              <div>
                <p className="font-medium text-blue-900">
                  {progress.step === 'validating' && '1/4 Validating'}
                  {progress.step === 'fetching' && '2/4 Fetching Data'}
                  {progress.step === 'analyzing' && '3/4 Analyzing'}
                  {progress.step === 'saving' && '4/4 Saving'}
                </p>
                <p className="text-sm text-blue-700">{progress.message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Processing...' : 'Analyze & Import'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">What happens next?</h3>
        <ol className="text-sm space-y-2 text-gray-600">
          <li>1. We fetch basic stats from TikTok (followers, engagement, etc.)</li>
          <li>2. Our AI analyzes their content for brand fit with VecinoCustom</li>
          <li>3. Influencer is added with status "Negotiating"</li>
          <li>4. You can review the analysis and decide next steps</li>
        </ol>
      </div>
    </div>
  );
}
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// __tests__/lib/services/apify-service.test.ts
describe('fetchTikTokProfile', () => {
  it('should fetch and transform profile data', async () => {
    // Mock Apify client
    // Test data transformation
  });

  it('should handle API errors gracefully', async () => {
    // Test error scenarios
  });
});

// __tests__/lib/services/analysis-service.test.ts
describe('analyzeInfluencer', () => {
  it('should generate valid analysis', async () => {
    // Mock Anthropic API
    // Validate response structure
  });

  it('should parse JSON correctly', async () => {
    // Test parseAnalysisResponse function
  });
});
```

### Integration Tests

```typescript
// __tests__/api/influencers/analyze-and-add.test.ts
describe('POST /api/influencers/analyze-and-add', () => {
  it('should add influencer successfully', async () => {
    const response = await fetch('/api/influencers/analyze-and-add', {
      method: 'POST',
      body: JSON.stringify({ handle: '@test_user' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.influencer).toHaveProperty('id');
    expect(data.influencer.status).toBe('NEGOTIATING');
  });

  it('should reject duplicate handles', async () => {
    // Add influencer first
    // Try to add again
    // Expect 409 conflict
  });
});
```

---

## 📊 Monitoring & Observability

### Metrics to Track

1. **Performance:**
   - Average time for Apify fetch (target: <10s)
   - Average time for Sonnet analysis (target: <20s)
   - Total flow duration (target: <30s)

2. **Success Rates:**
   - Apify fetch success rate (target: >95%)
   - Sonnet analysis completion rate (target: >98%)
   - Overall flow success rate (target: >90%)

3. **Quality:**
   - Average brand fit scores
   - Distribution of influencer statuses
   - Time from add to first contact

### Logging Strategy

```typescript
// Key events to log:
logger.info('Influencer analysis started', { handle, userId });
logger.info('Apify fetch completed', { handle, duration, followers });
logger.info('Sonnet analysis completed', { handle, duration, fitScore });
logger.info('Influencer saved', { id, handle, status });

// Errors to log:
logger.error('Apify fetch failed', { handle, error, retries });
logger.error('Sonnet analysis failed', { handle, error });
logger.error('Database save failed', { handle, error });
```

---

## 🚀 Deployment Checklist

### Environment Variables
```bash
# Apify
APIFY_API_TOKEN=apify_api_xxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Database (already configured)
DATABASE_URL=postgresql://...
```

### Database Migration
```bash
# Add new fields to Influencer model
npx prisma migrate dev --name add_analysis_fields

# Deploy to production
npx prisma migrate deploy
```

### Feature Flags (Optional)
```typescript
// src/lib/features.ts
export const FEATURES = {
  ADD_INFLUENCER_ENABLED: process.env.FEATURE_ADD_INFLUENCER === 'true',
  SONNET_ANALYSIS_ENABLED: process.env.FEATURE_SONNET_ANALYSIS === 'true',
};

// Use in UI:
{FEATURES.ADD_INFLUENCER_ENABLED && (
  <Button onClick={goToAddInfluencer}>Add Influencer</Button>
)}
```

---

## 🔮 Future Enhancements

### Phase 2: Automated Discovery (Cron Job)
- Scheduled scraping of trending TikTok accounts
- Automatic analysis and filtering
- Influencers added with status "PROSPECTING" (not "NEGOTIATING")
- Weekly digest of AI suggestions sent to team

### Phase 3: Enhanced Analysis
- Sentiment analysis on comments
- Competitor brand detection (who they've worked with)
- Price estimation based on engagement metrics
- Historical performance tracking

### Phase 4: Campaign Integration
- Auto-suggest influencers for new campaigns
- Predict campaign ROI based on influencer metrics
- A/B testing recommendations

---

## ✅ Implementation Checklist

### Backend
- [ ] Update Prisma schema with new fields
- [ ] Run database migration
- [ ] Create `apify-service.ts` with Apify integration
- [ ] Create `analysis-service.ts` with Sonnet analysis
- [ ] Create API route `/api/influencers/analyze-and-add`
- [ ] Add Zod validation schemas
- [ ] Add comprehensive error handling
- [ ] Add logging throughout flow
- [ ] Write unit tests for services
- [ ] Write integration tests for API

### Frontend
- [ ] Create `/dashboard/influencers/new` page
- [ ] Build form with handle input
- [ ] Add loading states with progress indicators
- [ ] Add error display
- [ ] Add success redirect
- [ ] Add "Add Influencer" button to dashboard
- [ ] Update navigation to include new route

### DevOps
- [ ] Add `APIFY_API_TOKEN` to environment variables
- [ ] Configure Vercel environment variables
- [ ] Test deployment on staging environment
- [ ] Monitor performance metrics
- [ ] Set up error alerts (Sentry, LogRocket, etc.)

### Documentation
- [ ] Update README with new feature
- [ ] Document Apify actor requirements
- [ ] Document Sonnet prompt customization
- [ ] Create user guide for "Add Influencer" feature

---

## 📝 Notes

- **Cost Estimation:** 
  - Apify: ~$0.01-0.05 per profile fetch
  - Sonnet: ~$0.02-0.05 per analysis (2000 tokens)
  - Total: ~$0.03-0.10 per influencer added

- **Rate Limits:**
  - Apify: 5 requests/second (adjust if needed)
  - Anthropic: 50 requests/minute (Tier 2)

- **Fallback Strategy:**
  - If Apify fails: Allow manual data entry
  - If Sonnet fails: Save with basic data, mark for manual review

---

**End of Architecture Document**
