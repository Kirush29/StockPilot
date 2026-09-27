import { apiClient } from './apiClient';

export interface EvaluateQuotationsRequest {
  productId: string;
}

export interface SupplierEvaluationResultDto {
  supplierId: string;
  quotationId: string;
  quotationReference: string;
  unitPrice: number;
  deliveryDays: number;
  supplierRating: number | null;
  status: string;
  eligibility: boolean;
  eligibilityReason: string;
  priceScore: number | null;
  deliveryScore: number | null;
  ratingScore: number | null;
  overallScore: number | null;
}

export interface SupplierEvaluationCandidateDto {
  supplierId: string;
  quotationId: string;
  quotationReference: string;
  unitPrice: number;
  deliveryDays: number;
  supplierRating: number | null;
  priceScore: number;
  deliveryScore: number;
  ratingScore: number;
  overallScore: number;
}

export interface SupplierEvaluationResponseDto {
  allEvaluations: SupplierEvaluationResultDto[];
  eligibleCandidates: SupplierEvaluationCandidateDto[];
  decisionStatus: string;
  humanApprovalRequired: boolean;
}

const ENDPOINT = '/SupplierEvaluation';

export const supplierEvaluationService = {
  evaluateSupplier: (productId: string) => 
    apiClient.post<SupplierEvaluationResponseDto>(`${ENDPOINT}/evaluate`, { productId } as EvaluateQuotationsRequest)
};
