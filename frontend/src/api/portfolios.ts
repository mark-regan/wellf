import api from './client';
import { Portfolio, PortfolioSummary, Holding, HoldingWithPortfolio, Transaction, CashAccount, PaginatedResponse, PortfolioMetadata } from '@/types';

interface CreatePortfolioRequest {
  name: string;
  type: string;
  currency?: string;
  description?: string;
  metadata?: PortfolioMetadata;
}

interface CreateHoldingRequest {
  symbol: string;
  quantity: number;
  average_cost?: number;
  purchased_at?: string;
}

interface CreateTransactionRequest {
  symbol?: string;
  transaction_type: string;
  quantity?: number;
  price?: number;
  total_amount?: number;
  currency?: string;
  transaction_date: string;
  notes?: string;
}

interface CreateCashAccountRequest {
  account_name: string;
  account_type: string;
  institution?: string;
  balance: number;
  currency?: string;
  interest_rate?: number;
}

interface ImportTransactionsResponse {
  success: boolean;
  imported?: number;
  message: string;
  error?: string;
  invalid_symbols?: string[];
  row_errors?: string[];
}

export const portfolioApi = {
  list: async (): Promise<Portfolio[]> => {
    const response = await api.get<Portfolio[]>('/portfolios');
    return response.data;
  },

  get: async (id: string): Promise<Portfolio> => {
    const response = await api.get<Portfolio>(`/portfolios/${id}`);
    return response.data;
  },

  create: async (data: CreatePortfolioRequest): Promise<Portfolio> => {
    const response = await api.post<Portfolio>('/portfolios', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreatePortfolioRequest>): Promise<Portfolio> => {
    const response = await api.put<Portfolio>(`/portfolios/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/portfolios/${id}`);
  },

  getSummary: async (id: string): Promise<PortfolioSummary> => {
    const response = await api.get<PortfolioSummary>(`/portfolios/${id}/summary`);
    return response.data;
  },

  // Holdings
  getAllHoldings: async (): Promise<HoldingWithPortfolio[]> => {
    const response = await api.get<HoldingWithPortfolio[]>('/holdings');
    return response.data;
  },

  getHoldings: async (portfolioId: string): Promise<Holding[]> => {
    const response = await api.get<Holding[]>(`/portfolios/${portfolioId}/holdings`);
    return response.data;
  },

  createHolding: async (portfolioId: string, data: CreateHoldingRequest): Promise<Holding> => {
    const response = await api.post<Holding>(`/portfolios/${portfolioId}/holdings`, data);
    return response.data;
  },

  updateHolding: async (holdingId: string, data: { quantity?: number; average_cost?: number }): Promise<Holding> => {
    const response = await api.put<Holding>(`/holdings/${holdingId}`, data);
    return response.data;
  },

  deleteHolding: async (holdingId: string): Promise<void> => {
    await api.delete(`/holdings/${holdingId}`);
  },

  // Transactions
  getTransactions: async (portfolioId: string, page = 1, perPage = 20): Promise<PaginatedResponse<Transaction>> => {
    const response = await api.get<PaginatedResponse<Transaction>>(
      `/portfolios/${portfolioId}/transactions?page=${page}&per_page=${perPage}`
    );
    return response.data;
  },

  createTransaction: async (portfolioId: string, data: CreateTransactionRequest): Promise<Transaction> => {
    const response = await api.post<Transaction>(`/portfolios/${portfolioId}/transactions`, data);
    return response.data;
  },

  deleteTransaction: async (transactionId: string): Promise<void> => {
    await api.delete(`/transactions/${transactionId}`);
  },

  importTransactions: async (
    portfolioId: string,
    file: File,
    mode: 'replace' | 'append'
  ): Promise<ImportTransactionsResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    const response = await api.post<ImportTransactionsResponse>(
      `/portfolios/${portfolioId}/transactions/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Cash Accounts
  getAllCashAccounts: async (): Promise<CashAccount[]> => {
    const response = await api.get<CashAccount[]>('/cash-accounts');
    return response.data;
  },

  getCashAccounts: async (portfolioId: string): Promise<CashAccount[]> => {
    const response = await api.get<CashAccount[]>(`/portfolios/${portfolioId}/cash-accounts`);
    return response.data;
  },

  createCashAccount: async (portfolioId: string, data: CreateCashAccountRequest): Promise<CashAccount> => {
    const response = await api.post<CashAccount>(`/portfolios/${portfolioId}/cash-accounts`, data);
    return response.data;
  },

  updateCashAccount: async (accountId: string, data: Partial<CreateCashAccountRequest>): Promise<CashAccount> => {
    const response = await api.put<CashAccount>(`/cash-accounts/${accountId}`, data);
    return response.data;
  },

  deleteCashAccount: async (accountId: string): Promise<void> => {
    await api.delete(`/cash-accounts/${accountId}`);
  },
};
