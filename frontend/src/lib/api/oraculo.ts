/**
 * Oráculo API client — comparison, adherence analysis and procedure generation
 */
import apiClient from './client'

export interface CompareRequest {
  source_a_id: string
  source_b_id: string
  model_id?: string
}

export interface CompareResponse {
  source_a_id: string
  source_b_id: string
  source_a_title?: string
  source_b_title?: string
  comparison_report: string
}

export interface AdherenceRequest {
  document_id: string
  reference_id: string
  model_id?: string
}

export interface AdherenceResponse {
  document_id: string
  reference_id: string
  document_title?: string
  reference_title?: string
  adherence_report: string
}

export interface ProcedureGenerateRequest {
  scope: string
  context_source_ids?: string[]
  model_id?: string
}

export interface ProcedureGenerateResponse {
  scope: string
  procedure_output: string
}

export const oraculoApi = {
  compare: async (data: CompareRequest): Promise<CompareResponse> => {
    const response = await apiClient.post<CompareResponse>('/compare', data)
    return response.data
  },

  analyzeAdherence: async (data: AdherenceRequest): Promise<AdherenceResponse> => {
    const response = await apiClient.post<AdherenceResponse>('/adherence/analyze', data)
    return response.data
  },

  generateProcedure: async (data: ProcedureGenerateRequest): Promise<ProcedureGenerateResponse> => {
    const response = await apiClient.post<ProcedureGenerateResponse>('/procedure/generate', data)
    return response.data
  },
}
