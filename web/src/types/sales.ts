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

export interface DailySalesTrend {
  date: string;
  totalRevenue: number;
  totalQuantity: number;
  orderCount: number;
}

export interface CategorySalesShare {
  category: string;
  revenue: number;
  percentage: number;
}

export interface SalesAnalyticsSummary {
  totalRevenue: number;
  totalTransactions: number;
  totalUnitsSold: number;
  averageOrderValue: number;
  topSellingProducts: TopSellingProduct[];
  dailyTrends: DailySalesTrend[];
  categoryShares: CategorySalesShare[];
}
