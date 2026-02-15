# Prospecting Feature - "Adicionar Prospect"

## Overview

A complete prospecting workflow that allows Scout to add new influencers with **automatic Gemini 3-Flash analysis**. Similar to "Adicionar Influencer" but with one critical difference: analysis happens automatically at add time.

## Architecture

### API Endpoint
**POST** `/api/influencers/add-prospect`

**Request:**
```json
{
  "name": "Giulia Conti",
  "tiktokHandle": "@giuliaconti.ch",
  "tiktokFollowers": 28000,
  "country": "Itália",
  "language": "Italiano",
  "engagementRate": 7.1,
  "niche": "Jewelry/UGC"
}
```

**Response:**
```json
{
  "success": true,
  "influencer": {
    "id": "prospect-giulia-001",
    "name": "Giulia Conti",
    "tiktokHandle": "@giuliaconti.ch",
    "status": "SUGGESTION",
    "analysis": {
      "recommendation": "CONTACTA",
      "estimatedPrice": "60",
      "risk": "Baixo"
    }
  },
  "message": "✅ Giulia Conti adicionado como Sugestão (Recomendação: CONTACTA)"
}
```

### What Happens Internally

1. **Receives Form Data**
   - Name, Handle, Followers, Country, Language, Engagement, Niche

2. **Analyzes with Gemini 3-Flash** (live)
   - Sends prospect profile to Gemini with Scout's joinery context
   - Gemini returns: Strengths, Estimated Price, Risk, Recommendation, Analysis

3. **Extracts Key Metrics**
   - Recommendation: CONTACTA / VALIDA MAIS / SKIP
   - Price: €50, €60, €75, etc.
   - Risk: Alto / Médio / Baixo

4. **Populates Internal Notes**
   - Full Gemini analysis saved in `notes` field
   - Format: "Scout Prospecting - DD/MM/YY\n\nANÁLISE GEMINI 3-FLASH:\n[full text]\n\n---\nRECOMENDAÇÃO: CONTACTA\nPREÇO EST.: 60€\nRISCO: Baixo"

5. **Saves to Database**
   - Status: `SUGGESTION` (visible in dashboard)
   - Created by current user
   - Ready for review and action

## Frontend Component

**File:** `src/components/AddProspectModal.tsx`

**Usage in a page:**
```tsx
'use client';

import { useState } from 'react';
import { AddProspectModal } from '@/components/AddProspectModal';

export default function ProspectingPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        + Adicionar Prospect
      </button>

      <AddProspectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          // Refresh influencers list
          fetchInfluencers();
        }}
      />
    </>
  );
}
```

**Features:**
- Beautiful modal form (identical to "Adicionar Influencer")
- Input fields for all required data
- "Análise + Adicionar" button triggers Gemini analysis
- Shows analysis results before saving
- Auto-saves on success

## Workflow

### For Scout (Programmatic)

```bash
curl -X POST https://vecinocustom-influencer-platform.vercel.app/api/influencers/add-prospect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Giulia Conti",
    "tiktokHandle": "@giuliaconti.ch",
    "tiktokFollowers": 28000,
    "country": "Itália",
    "language": "Italiano",
    "engagementRate": 7.1,
    "niche": "Jewelry/UGC"
  }'
```

### For Users (Dashboard)

1. Navigate to `/dashboard/influencers/prospecting`
2. Click "+ Adicionar Prospect" button
3. Fill form with influencer data
4. Click "Análise + Adicionar"
5. Wait for Gemini analysis (2-3 seconds)
6. See results and confirmation
7. Prospect saved as SUGGESTION status

## Integration Points

### Prospecting Page
`/dashboard/influencers/prospecting/page.tsx` - Add button to open modal

### Influencer List
When status = SUGGESTION, prospect appears in this dashboard section with:
- Name, handle, country, engagement
- Internal notes visible on hover (shows full Gemini analysis)
- Option to move to next phase or delete

## Recommendation Levels

Gemini returns one of three recommendations:

| Recommendation | Action | When |
|---|---|---|
| **CONTACTA** | Contact immediately (high priority) | Score 80+, low risk, good fit |
| **VALIDA MAIS** | Validate more before contacting | Score 70-79, medium risk, needs review |
| **SKIP** | Don't contact (skip) | Score <70, high risk, poor fit |

## Price Estimation

Gemini estimates fair market price based on:
- Country (Itália/Espanha: €50-80, Portugal: €30-100)
- Engagement rate
- Follower count
- Niche match

## Risk Assessment

| Risk | Meaning |
|---|---|
| **Baixo** (Low) | High probability of success, low drama |
| **Médio** (Medium) | Normal friction expected, negotiate if needed |
| **Alto** (High) | May require extra management or skip entirely |

## Example: From CSV to Database

```python
# Scout finds influencers via Apify
prospects = [
  {"name": "Giulia Conti", "handle": "@giuliaconti.ch", ...},
  {"name": "Sofia Rossi", "handle": "@sofiarossiofficial", ...},
]

# For each prospect:
for p in prospects:
  POST /api/influencers/add-prospect {
    "name": p.name,
    "tiktokHandle": p.handle,
    ...
  }
  # ✅ Saved with Gemini analysis as SUGGESTION
```

## Key Differences from "Adicionar Influencer"

| Aspect | Adicionar Influencer | Adicionar Prospect |
|---|---|---|
| Status | Varies by input | Always SUGGESTION |
| Analysis | Manual | Automatic (Gemini) |
| Internal Notes | User-filled | Auto-generated from Gemini |
| Use Case | Known influencers | New prospects from prospecting |
| Next Step | Negotiation | Review recommendations first |

## Future Enhancements

1. **Bulk Import** - CSV file with prospects, auto-analyze all
2. **Apify Integration** - Direct link from Apify crawler to prospect creation
3. **Feedback Loop** - Track if CONTACTA recommendations actually converted
4. **Smart Scoring** - Machine learning on recommendation accuracy over time

---

**Deploy:** Commit d1b2327
**Status:** ✅ Production-ready
**Integration:** Ready to connect to ProspectingPage UI
