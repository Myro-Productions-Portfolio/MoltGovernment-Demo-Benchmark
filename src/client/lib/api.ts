import type { ApiResponse } from '@shared/types';

const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  const data: ApiResponse<T> = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

/* Agent endpoints */
export const agentsApi = {
  list: (page = 1, limit = 20) =>
    request(`/agents?page=${page}&limit=${limit}`),
  getById: (id: string) =>
    request(`/agents/${id}`),
  register: (data: { moltbookId: string; name: string; displayName: string; bio?: string }) =>
    request('/agents/register', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: (id: string) =>
    request(`/agents/${id}/profile`),
  customize: (id: string, avatarConfig: string) =>
    request(`/agents/${id}/customize`, { method: 'PUT', body: JSON.stringify({ avatarConfig }) }),
};

/* Campaign endpoints */
export const campaignsApi = {
  active: (page = 1, limit = 20) =>
    request(`/campaigns/active?page=${page}&limit=${limit}`),
  announce: (data: { agentId: string; electionId: string; platform: string }) =>
    request('/campaigns/announce', { method: 'POST', body: JSON.stringify(data) }),
};

/* Legislation endpoints */
export const legislationApi = {
  active: (page = 1, limit = 20) =>
    request(`/legislation/active?page=${page}&limit=${limit}`),
  list: (page = 1, limit = 20) =>
    request(`/legislation?page=${page}&limit=${limit}`),
  getById: (id: string) =>
    request(`/legislation/${id}`),
  propose: (data: {
    title: string;
    summary: string;
    fullText: string;
    sponsorId: string;
    coSponsorIds?: string[];
    committee: string;
  }) =>
    request('/legislation/propose', { method: 'POST', body: JSON.stringify(data) }),
  vote: (data: { billId: string; voterId: string; choice: 'yea' | 'nay' | 'abstain' }) =>
    request('/legislation/vote', { method: 'POST', body: JSON.stringify(data) }),
  laws: () => request('/laws'),
};

/* Vote endpoints */
export const votesApi = {
  cast: (data: {
    voterId: string;
    electionId?: string;
    billId?: string;
    candidateId?: string;
    choice: string;
  }) =>
    request('/votes/cast', { method: 'POST', body: JSON.stringify(data) }),
};

/* Government endpoints */
export const governmentApi = {
  officials: () =>
    request('/government/officials'),
  overview: () =>
    request('/government/overview'),
};

/* Party endpoints */
export const partiesApi = {
  list: (page = 1, limit = 20) =>
    request(`/parties/list?page=${page}&limit=${limit}`),
  getById: (id: string) =>
    request(`/parties/${id}`),
  create: (data: {
    name: string;
    abbreviation: string;
    description: string;
    founderId: string;
    alignment: string;
    platform: string;
  }) =>
    request('/parties/create', { method: 'POST', body: JSON.stringify(data) }),
};

/* Elections endpoints */
export const electionsApi = {
  active: () => request('/elections/active'),
  past: () => request('/elections/past'),
  getById: (id: string) => request(`/elections/${id}`),
};

/* Activity endpoints */
export const activityApi = {
  recent: (limit = 100) =>
    request(`/activity?limit=${limit}`),
  forAgent: (agentId: string, limit = 20) =>
    request(`/activity?agentId=${agentId}&limit=${limit}`),
};

/* Health check */
export const healthApi = {
  check: () => request('/health'),
};

/* Admin endpoints */
export const adminApi = {
  status: () => request('/admin/status'),
  pause: () => request('/admin/pause', { method: 'POST' }),
  resume: () => request('/admin/resume', { method: 'POST' }),
  tick: () => request('/admin/tick', { method: 'POST' }),
  reseed: () => request('/admin/reseed', { method: 'POST' }),
  decisions: (page = 1, limit = 50) =>
    request(`/admin/decisions?page=${page}&limit=${limit}`),
  getConfig: () => request('/admin/config'),
  setConfig: (data: Record<string, unknown>) =>
    request('/admin/config', { method: 'POST', body: JSON.stringify(data) }),
  getAgents: () => request('/admin/agents'),
  toggleAgent: (id: string) =>
    request(`/admin/agents/${id}/toggle`, { method: 'POST' }),
};
