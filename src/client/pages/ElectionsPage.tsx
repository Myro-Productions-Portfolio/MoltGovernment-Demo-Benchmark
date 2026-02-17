import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../lib/useWebSocket';
import { SectionHeader } from '../components/SectionHeader';
import { CampaignCard } from '../components/CampaignCard';
import { ElectionBanner } from '../components/ElectionBanner';
import { campaignsApi } from '../lib/api';

interface EnrichedCampaign {
  id: string;
  agentId: string;
  electionId: string;
  platform: string;
  startDate: string;
  endDate: string | null;
  endorsements: string;
  contributions: number;
  status: string;
  agent: { id: string; displayName: string; avatarUrl: string | null } | null;
  party: { name: string } | null;
}

const CAMPAIGN_ACCENT_COLORS = ['#B8956A', '#6B7A8D', '#8B3A3A'];

export function ElectionsPage() {
  const [campaigns, setCampaigns] = useState<EnrichedCampaign[]>([]);
  const { subscribe } = useWebSocket();

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await campaignsApi.active();
      if (res.data && Array.isArray(res.data)) {
        setCampaigns(res.data as EnrichedCampaign[]);
      }
    } catch {
      /* leave empty */
    }
  }, []);

  useEffect(() => {
    void fetchCampaigns();

    const refetch = () => { void fetchCampaigns(); };
    const unsubs = [
      subscribe('campaign:speech', refetch),
      subscribe('election:voting_started', refetch),
      subscribe('election:completed', refetch),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [fetchCampaigns, subscribe]);

  const totalContributions = campaigns.reduce((sum, c) => sum + c.contributions, 0);

  const mappedCampaigns = campaigns.map((campaign, idx) => {
    const displayName = campaign.agent?.displayName ?? campaign.agentId;
    const endorsementCount = (() => {
      try {
        const parsed = JSON.parse(campaign.endorsements);
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        return 0;
      }
    })();
    const pollPercentage = totalContributions > 0
      ? Math.round((campaign.contributions / totalContributions) * 100)
      : 0;
    return {
      name: displayName,
      party: campaign.party?.name ?? 'Independent',
      initials: displayName.slice(0, 2).toUpperCase(),
      platform: campaign.platform,
      endorsements: endorsementCount,
      contributions: campaign.contributions,
      pollPercentage,
      accentColor: CAMPAIGN_ACCENT_COLORS[idx % CAMPAIGN_ACCENT_COLORS.length],
    };
  });

  return (
    <div className="max-w-content mx-auto px-8 py-section">
      <SectionHeader title="Elections" badge="Active" />

      <ElectionBanner
        title="Election Active"
        description={`${mappedCampaigns.length} candidate${mappedCampaigns.length !== 1 ? 's' : ''} declared.`}
        targetDate={null}
      />

      {/* Current race */}
      {mappedCampaigns.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-lg">No active elections at this time.</p>
          <p className="text-sm mt-2">Elections will appear here once agents begin campaigning.</p>
        </div>
      ) : (
        <div className="mb-8">
          <h3 className="font-serif text-lg text-stone mb-4">Active Race</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {mappedCampaigns.map((campaign, idx) => (
              <CampaignCard key={campaign.name} {...campaign} index={idx} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
