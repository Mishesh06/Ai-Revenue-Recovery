import { fetchApi } from "./api-client";
import { 
    DashboardResponse, TransactionOut, RecoveryCaseOut, PolicyOut, PolicyEvaluationOut, 
    ManualReviewOut, SimulationRunOut, SimulationCreateRequest, SimulationCreateResponse,
    AuditEventOut, PaginatedResponse,
    AgentStatusResponse, AgentActivityResponse, AgentRunOut,
    AnalyticsResponse
} from "../types/api";

export const getDashboard = (merchantId: string) =>
    fetchApi<DashboardResponse>("/dashboard", { merchantId });

export const getTransactions = (merchantId: string, page = 1, size = 50) =>
    fetchApi<PaginatedResponse<TransactionOut>>("/transactions", { merchantId, params: { page, page_size: size } });

export const getTransaction = (merchantId: string, id: string) =>
    fetchApi<TransactionOut>(`/transactions/${id}`, { merchantId });

export const getRecoveryCases = (merchantId: string, page = 1, size = 50, state?: string) =>
    fetchApi<PaginatedResponse<RecoveryCaseOut>>("/recovery", { merchantId, params: { page, page_size: size, ...(state ? { state } : {}) } });

export const getRecoveryCase = (merchantId: string, id: string) =>
    fetchApi<RecoveryCaseOut>(`/recovery/${id}`, { merchantId });

export const analyzeRecovery = (merchantId: string, id: string) =>
    fetchApi<Record<string, unknown>>(`/recovery/${id}/analyze`, { method: "POST", merchantId });

export const recommendRecovery = (merchantId: string, id: string) =>
    fetchApi<Record<string, unknown>>(`/recovery/${id}/recommend`, { method: "POST", merchantId });

export const executeRecovery = (merchantId: string, id: string, payload: Record<string, unknown>) =>
    fetchApi<Record<string, unknown>>(`/recovery/${id}/execute`, { 
        method: "POST", 
        merchantId, 
        body: JSON.stringify(payload) 
    });

export const getPolicies = (merchantId: string, page = 1, size = 50) =>
    fetchApi<PaginatedResponse<PolicyOut>>("/policies", { merchantId, params: { page, page_size: size } });

export const evaluatePolicy = (merchantId: string, payload: Record<string, unknown>) =>
    fetchApi<PolicyEvaluationOut>("/policies/evaluate", {
        method: "POST",
        merchantId,
        body: JSON.stringify(payload)
    });

export const getReviews = (merchantId: string, page = 1, size = 50, decision?: string) =>
    fetchApi<PaginatedResponse<ManualReviewOut>>("/reviews", { merchantId, params: { page, page_size: size, ...(decision ? { decision } : {}) } });

export const submitReview = (merchantId: string, id: string, payload: Record<string, unknown>) =>
    fetchApi<ManualReviewOut>(`/reviews/${id}`, {
        method: "POST",
        merchantId,
        body: JSON.stringify(payload)
    });

export const createSimulation = (merchantId: string, payload: SimulationCreateRequest) =>
    fetchApi<SimulationCreateResponse>("/simulations", {
        method: "POST",
        merchantId,
        body: JSON.stringify(payload)
    });

export const getSimulation = (id: string) =>
    fetchApi<SimulationRunOut>(`/simulations/${id}`);

export const getAnalytics = (merchantId: string, params?: Record<string, string | number | boolean | undefined>) =>
    fetchApi<AnalyticsResponse>("/analytics", { merchantId, params });

export const getAudit = (merchantId: string, params?: Record<string, string | number | boolean | undefined>) => {
    const formattedParams: Record<string, string | number | boolean | undefined> = params ? { ...params } : {};
    if ("size" in formattedParams && !("page_size" in formattedParams)) {
        formattedParams.page_size = formattedParams.size;
        delete formattedParams.size;
    }
    return fetchApi<PaginatedResponse<AuditEventOut>>("/audit", { merchantId, params: formattedParams });
};

export const getAuditEvent = (merchantId: string, id: string) =>
    fetchApi<AuditEventOut>(`/audit/${id}`, { merchantId });

export const getAgentStatus = () =>
    fetchApi<AgentStatusResponse>("/agents/status");

export const getAgentActivity = (limit = 20) =>
    fetchApi<AgentActivityResponse>("/agents/activity", { params: { limit } });

export const getAgentRuns = (page = 1, size = 50) =>
    fetchApi<PaginatedResponse<AgentRunOut>>("/agents", { params: { page, page_size: size } });

export const getSystemHealth = () =>
    fetchApi<Record<string, string>>("/system/health");
