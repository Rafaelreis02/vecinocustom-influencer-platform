// status-step-mapping.ts - Centralized mapping between InfluencerStatus and WorkflowStep

// Maps influencer status to the expected workflow step
export const STATUS_TO_STEP: Record<string, number> = {
  // Pre-partnership statuses (no active workflow)
  'UNKNOWN': 0,              // No workflow yet
  'SUGGESTION': 0,           // No workflow yet
  'IMPORT_PENDING': 0,       // No workflow yet
  'CONTACTED': 0,            // No workflow yet
  
  // Partnership flow (SIMPLIFIED - 8 steps)
  'ANALYZING': 1,                    // Step 1: Partnership
  'COUNTER_PROPOSAL': 1,             // Step 1: Partnership (counter proposal)
  'AGREED': 2,                       // Step 2: Shipping
  'PRODUCT_SELECTION': 3,            // Step 3: Preparing
  'DESIGN_REFERENCE_SUBMITTED': 4,   // Step 4: Design Review
  'DESIGN_REVIEW': 4,                // Step 4: Design Review
  'ALTERATIONS_REQUESTED': 4,        // Step 4: Design Review
  'CONTRACT_PENDING': 5,             // Step 5: Contract
  'CONTRACT_SIGNED': 6,              // Step 6: Contract Signed
  'SHIPPED': 7,                      // Step 7: Shipped
  'DELIVERED': 7,                    // Step 7: Shipped (simplified - no separate Delivered step)
  'COMPLETED': 8,                    // Step 8: Completed
  
  // Special statuses
  'CANCELLED': 0,            // No active workflow
  'BLACKLISTED': 0,          // No active workflow
};

// Maps workflow step to expected influencer status (SIMPLIFIED - 8 steps)
export const STEP_TO_STATUS: Record<number, string> = {
  1: 'ANALYZING',
  2: 'AGREED',
  3: 'PRODUCT_SELECTION',
  4: 'DESIGN_REVIEW',
  5: 'CONTRACT_PENDING',
  6: 'CONTRACT_SIGNED',
  7: 'SHIPPED',
  8: 'COMPLETED',
};

// Check if status has an active workflow
export function hasActiveWorkflow(status: string): boolean {
  const step = STATUS_TO_STEP[status];
  return step >= 1 && step <= 9;
}

// Get expected step for status
export function getStepForStatus(status: string): number {
  return STATUS_TO_STEP[status] || 0;
}

// Get expected status for step
export function getStatusForStep(step: number): string {
  return STEP_TO_STATUS[step] || 'UNKNOWN';
}

// Validate if workflow step matches influencer status
export function validateWorkflowConsistency(
  influencerStatus: string,
  workflowStep: number
): { isValid: boolean; expectedStep: number; expectedStatus: string } {
  const expectedStep = getStepForStatus(influencerStatus);
  const expectedStatus = getStatusForStep(workflowStep);
  
  return {
    isValid: expectedStep === workflowStep,
    expectedStep,
    expectedStatus,
  };
}
