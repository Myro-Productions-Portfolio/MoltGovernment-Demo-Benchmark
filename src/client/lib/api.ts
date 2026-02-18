import type { ApiResponse } from '@shared/types';

const API_BASE = '/api';

// Clerk token provider — set once on app mount via setTokenProvider()
let _tokenProvider: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>): void {
  _tokenProvider = fn;
}

async function request<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;

  const token = _tokenProvider ? await _tokenProvider() : null;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
  recent: (opts?: { since?: number; limit?: number }) => {
    const params = new URLSearchParams();
    params.set('limit', String(opts?.limit ?? 100));
    if (opts?.since) params.set('since', String(opts.since));
    return request(`/activity?${params.toString()}`);
  },
  forAgent: (agentId: string, limit = 20) =>
    request(`/activity?agentId=${agentId}&limit=${limit}`),
};

/* Search endpoint */
export const searchApi = {
  global: (q: string, types?: string) => {
    const params = new URLSearchParams({ q });
    if (types) params.set('types', types);
    return request(`/search?${params.toString()}`);
  },
};

/* Calendar endpoints */
export const calendarApi = {
  upcoming: () => request('/calendar'),
  events: (view?: 'upcoming' | 'past') =>
    request(`/calendar/events${view ? `?view=${view}` : ''}`),
  getEvent: (id: string) => request(`/calendar/events/${id}`),
};

export const forumApi = {
  threads: (category?: string) =>
    request(`/forum/threads${category && category !== 'all' ? `?category=${category}` : ''}`),
  thread: (id: string) => request(`/forum/threads/${id}`),
  posts: (threadId: string) => request(`/forum/threads/${threadId}/posts`),
  latest: () => request('/forum/latest'),
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
  getEconomy: () => request('/admin/economy'),
  setEconomy: (data: { treasuryBalance?: number; taxRatePercent?: number }) =>
    request('/admin/economy', { method: 'POST', body: JSON.stringify(data) }),
  createAgent: (data: Record<string, unknown>) =>
    request('/admin/agents/create', { method: 'POST', body: JSON.stringify(data) }),
  getUsers: () => request('/admin/users'),
  setUserRole: (id: string, role: 'admin' | 'user') =>
    request(`/admin/users/${id}/role`, { method: 'POST', body: JSON.stringify({ role }) }),
};

export const profileApi = {
  me: () => request('/profile/me'),
  getAgents: () => request('/profile/agents'),
  createAgent: (data: Record<string, unknown>) =>
    request('/profile/agents/create', { method: 'POST', body: JSON.stringify(data) }),
  getApiKeys: () => request('/profile/apikeys'),
  setApiKey: (provider: string, data: { key: string; model?: string }) =>
    request(`/profile/apikeys/${provider}`, { method: 'POST', body: JSON.stringify(data) }),
  deleteApiKey: (provider: string) =>
    request(`/profile/apikeys/${provider}`, { method: 'DELETE' }),
};

export const providersApi = {
  list: () => request('/admin/providers'),
  set: (name: string, data: { key?: string; isActive?: boolean; ollamaBaseUrl?: string }) =>
    request(`/admin/providers/${name}`, { method: 'POST', body: JSON.stringify(data) }),
  test: (name: string) =>
    request(`/admin/providers/${name}/test`, { method: 'POST' }),
  clear: (name: string) =>
    request(`/admin/providers/${name}`, { method: 'DELETE' }),
};
