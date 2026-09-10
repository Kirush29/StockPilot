export interface SaleItem {
  id?: string;
  productId: string;
  productSku: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  totalPrice?: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  branchId: string;
  branchName: string;
  saleDateUtc: string;
  paymentMethod: number;
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  customerReference?: string;
  notes?: string;
  items: SaleItem[];
}

export interface CreateSaleRequest {
  branchId?: string;
  branchName: string;
  paymentMethod: number;
  customerReference?: string;
  notes?: string;
  items: {
    productId: string;
    productSku: string;
    productName: string;
    category: string;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
  }[];
}

export interface DemandForecastItem {
  forecastDateUtc: string;
  predictedQuantity: number;
  lowerBoundQuantity: number;
  upperBoundQuantity: number;
}

export interface DemandForecast {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  branchId: string;
  branchName: string;
  period: number;
  generatedAtUtc: string;
  confidenceScore: number;
  predictedTotalDemand: number;
  averageDailyDemand: number;
  suggestedReorderDateUtc?: string;
  recommendedSafetyStock: number;
  recommendedReorderQuantity: number;
  trend: number;
  agentReasoning?: string;
  agentExecutionId: string;
  items: DemandForecastItem[];
}

export interface ReorderSuggestion {
  productId: string;
  productSku: string;
  productName: string;
  branchId: string;
  branchName: string;
  currentStock: number;
  averageDailySales: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  recommendedOrderQuantity: number;
  needsReorder: boolean;
  daysOfSupplyRemaining: number;
  urgencyLevel: 'Critical' | 'Warning' | 'Normal' | string;
}

export interface TopSellingProduct {
  productId: string;
  productSku: string;
  productName: string;
  unitsSold: number;
  totalRevenue: number;
  velocityCategory: string;
}

export interface SlowMovingProduct {
  productId: string;
  productSku: string;
  productName: string;
  unitsSold: number;
  totalRevenue: number;
  currentStock: number;
  daysSinceLastSale: number;
}

export interface DailySalesTrend {
  date: string;
  totalRevenue: number;
  totalQuantity: number;
  orderCount: number;
  isSpike?: boolean;
}

export interface CategorySalesShare {
  category: string;
  revenue: number;
  unitsSold?: number;
  percentage: number;
}

// Alias for backwards compatibility
export type CategorySalesDistribution = CategorySalesShare;

export interface BranchSalesComparison {
  branchId: string;
  branchName: string;
  revenue: number;
  unitsSold: number;
  orderCount: number;
  percentageOfTotal: number;
}

export interface DayOfWeekPattern {
  dayName: string;
  dayIndex: number;
  averageQuantity: number;
  averageRevenue: number;
  totalDaysObserved: number;
}

export interface TopCustomer {
  customerReference: string;
  orderCount: number;
  totalSpend: number;
  lastPurchaseDateUtc: string;
}

export interface CoPurchasedItem {
  primaryProductSku: string;
  primaryProductName: string;
  secondaryProductSku: string;
  secondaryProductName: string;
  coOccurrenceCount: number;
}

export interface CustomerBehaviorSummary {
  topCustomers: TopCustomer[];
  repeatCustomerRate: number;
  totalUniqueCustomers: number;
  productsBoughtTogether: CoPurchasedItem[];
}

export interface SalesAnalyticsSummary {
  totalRevenue: number;
  totalTransactions: number;
  totalUnitsSold: number;
  averageOrderValue: number;
  topSellingProducts: TopSellingProduct[];
  slowMovingProducts?: SlowMovingProduct[];
  dailyTrends: DailySalesTrend[];
  categoryShares: CategorySalesShare[];
  branchComparisons?: BranchSalesComparison[];
  dayOfWeekPatterns?: DayOfWeekPattern[];
  customerBehavior?: CustomerBehaviorSummary;
}

export interface WorkflowPlanStep {
  stepIndex: number;
  action: string;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed' | string;
}

export interface ToolExecution {
  toolName: string;
  inputParameters: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
  executedAtUtc: string;
  durationMs: number;
  isSuccess: boolean;
  errorMessage?: string;
}

export interface ValidationResult {
  rule: string;
  passed: boolean;
  details: string;
}

export interface WorkflowState {
  workflowId: string;
  objective: string;
  initiatedBy: string;
  currentStep: string;
  plan: WorkflowPlanStep[];
  toolExecutions: ToolExecution[];
  validationResults: ValidationResult[];
  errors: string[];
  retryCount: number;
  approvalStatus: string;
  finalOutcome?: Record<string, unknown>;
}

export interface AgentExecutionResult {
  isSuccess: boolean;
  forecast?: DemandForecast;
  workflowState: WorkflowState;
  summaryMessage: string;
}

export interface DemandForecastWorkflowRequest {
  productId: string;
  productSku: string;
  productName: string;
  branchId?: string;
  branchName?: string;
  forecastDays: number;
  leadTimeDays: number;
  currentStockLevel: number;
  marketContextNotes?: string;
  expectedUpliftPercent?: number;
  initiatedBy?: string;
}
