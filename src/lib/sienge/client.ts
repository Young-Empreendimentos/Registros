const SIENGE_BASE_URL = process.env.SIENGE_BASE_URL!;
const SIENGE_USERNAME = process.env.SIENGE_USERNAME!;
const SIENGE_PASSWORD = process.env.SIENGE_PASSWORD!;

function getAuthHeader(): string {
  const credentials = Buffer.from(`${SIENGE_USERNAME}:${SIENGE_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
}

async function siengeGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${SIENGE_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SIENGE API error ${response.status}: ${text}`);
  }

  return response.json();
}

interface SiengeListResponse<T> {
  resultSetMetadata: {
    count: number;
    offset: number;
    limit: number;
  };
  results: T[];
}

export interface SiengeEnterprise {
  id: number;
  name: string;
  companyId: number;
  companyName: string;
}

export interface SiengeUnit {
  id: number;
  enterpriseId: number;
  contractId: number | null;
  name: string;
  commercialStock: string; // "E" = estoque, "V" = vendido
  terrainValue: number;
  specialValues: Array<{ description?: string; value?: number }>;
}

export interface SiengeContractCustomer {
  id: number;
  name: string;
  main: boolean;
  spouse: boolean;
  participationPercentage: number;
}

export interface SiengeContractUnit {
  id: number;
  main: boolean;
  name: string;
  participationPercentage: number;
}

export interface SiengePaymentCondition {
  conditionTypeId: string;
  conditionTypeName: string;
  totalValue: number;
  outstandingBalance: number;
  amountPaid: number;
  installmentsNumber: number;
  openInstallmentsNumber: number;
}

export interface SiengeContract {
  id: number;
  companyId: number;
  enterpriseId: number;
  internalEnterpriseId: number;
  enterpriseName: string;
  number: string;
  situation: string; // "Emitido", "Cancelado", etc.
  value: number;
  totalSellingValue: number;
  contractDate: string;
  cancellationDate: string | null;
  creationDate: string;
  lastUpdateDate: string;
  salesContractCustomers: SiengeContractCustomer[];
  salesContractUnits: SiengeContractUnit[];
  paymentConditions: SiengePaymentCondition[];
}

export interface SiengeCustomer {
  id: number;
  name: string;
  email?: string;
  emails?: Array<{ email: string }>;
}

async function fetchAllPaginated<T>(
  path: string,
  extraParams?: Record<string, string>
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  const limit = 200;
  let hasMore = true;

  while (hasMore) {
    const data = await siengeGet<SiengeListResponse<T>>(path, {
      ...extraParams,
      limit: String(limit),
      offset: String(offset),
    });
    all.push(...(data.results || []));
    hasMore = (data.results?.length || 0) === limit;
    offset += limit;
  }

  return all;
}

export async function fetchEnterprises(): Promise<SiengeEnterprise[]> {
  return fetchAllPaginated<SiengeEnterprise>('/enterprises');
}

export async function fetchUnits(enterpriseId: number): Promise<SiengeUnit[]> {
  return fetchAllPaginated<SiengeUnit>('/units', { enterpriseId: String(enterpriseId) });
}

export async function fetchSalesContracts(
  params?: Record<string, string>
): Promise<SiengeContract[]> {
  return fetchAllPaginated<SiengeContract>('/sales-contracts', params);
}

export async function fetchCustomer(customerId: number): Promise<SiengeCustomer> {
  return siengeGet<SiengeCustomer>(`/customers/${customerId}`);
}

export function calculatePaidValue(contract: SiengeContract): number {
  return contract.paymentConditions.reduce((sum, pc) => sum + (pc.amountPaid || 0), 0);
}

export function getMainCustomer(contract: SiengeContract): SiengeContractCustomer | undefined {
  return contract.salesContractCustomers.find((c) => c.main);
}

export function getMainUnitId(contract: SiengeContract): number | undefined {
  return contract.salesContractUnits.find((u) => u.main)?.id;
}

export async function testConnection(): Promise<{ success: boolean; message: string; data?: unknown }> {
  try {
    const data = await siengeGet<SiengeListResponse<SiengeEnterprise>>('/enterprises', {
      limit: '1',
      offset: '0',
    });
    return {
      success: true,
      message: `Conexão OK. ${data.resultSetMetadata?.count || 0} empreendimento(s).`,
      data: data.results?.[0],
    };
  } catch (error) {
    return {
      success: false,
      message: `Erro: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
