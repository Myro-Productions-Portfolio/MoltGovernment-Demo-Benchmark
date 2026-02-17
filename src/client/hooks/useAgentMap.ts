// src/client/hooks/useAgentMap.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../lib/useWebSocket';
import { agentsApi, activityApi } from '../lib/api';
import type { Agent } from '@shared/types';

// Maps activity types (from DB) to building IDs
const ACTIVITY_TYPE_TO_BUILDING: Record<string, string> = {
  vote: 'capitol',
  bill_proposed: 'capitol',
  bill_resolved: 'capitol',
  bill_advanced: 'capitol',
  bill: 'capitol',
  debate: 'capitol',
  campaign_speech: 'party-hall',
  election_voting_started: 'election-center',
  election_completed: 'election-center',
  election: 'election-center',
  law: 'archives',
  party: 'party-hall',
};

export type SpeechBubble = {
  id: string;
  agentId: string;
  text: string;
  type: 'speech' | 'vote';
  expiresAt: number;
};

export type BuildingPulse = {
  buildingId: string;
  color: string;
  triggeredAt: number;
};

export type TickerEvent = {
  id: string;
  text: string;
  highlight: string;
  type: string;
  timestamp: number;
};

export interface AgentMapState {
  agents: Agent[];
  // agentId -> buildingId
  agentLocations: Record<string, string>;
  speechBubbles: SpeechBubble[];
  buildingPulses: BuildingPulse[];
  tickerEvents: TickerEvent[];
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  isLoading: boolean;
}

const DEFAULT_BUILDING = 'party-hall';

export function useAgentMap(): AgentMapState {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentLocations, setAgentLocations] = useState<Record<string, string>>({});
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubble[]>([]);
  const [buildingPulses, setBuildingPulses] = useState<BuildingPulse[]>([]);
  const [tickerEvents, setTickerEvents] = useState<TickerEvent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { subscribe } = useWebSocket();
  const bubbleIdRef = useRef(0);
  const tickerIdRef = useRef(0);

  // Initial data load
  useEffect(() => {
    async function load() {
      try {
        const [agentRes, activityRes] = await Promise.all([
          agentsApi.list(1, 50),
          activityApi.recent(100),
        ]);

        const agentList = (agentRes.data as Agent[]) ?? [];
        setAgents(agentList);

        // Derive each agent's location from their most recent activity
        const activityList = (activityRes.data as Array<{ agentId: string | null; type: string }>) ?? [];
        const locations: Record<string, string> = {};

        // Process activities newest-first; only set location for agent if not already set
        for (const event of activityList) {
          if (event.agentId && !locations[event.agentId]) {
            const building = ACTIVITY_TYPE_TO_BUILDING[event.type] ?? DEFAULT_BUILDING;
            locations[event.agentId] = building;
          }
        }

        // Any agent without a location gets the default
        for (const agent of agentList) {
          if (!locations[agent.id]) {
            locations[agent.id] = DEFAULT_BUILDING;
          }
        }

        setAgentLocations(locations);
      } catch (err) {
        console.error('[useAgentMap] Load failed:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Helper: add a building pulse
  const triggerPulse = useCallback((buildingId: string, color: string) => {
    const pulse: BuildingPulse = { buildingId, color, triggeredAt: Date.now() };
    setBuildingPulses((prev) => [...prev.filter((p) => p.buildingId !== buildingId), pulse]);
    // Remove after animation (2s)
    setTimeout(() => {
      setBuildingPulses((prev) => prev.filter((p) => p.triggeredAt !== pulse.triggeredAt));
    }, 2000);
  }, []);

  // Helper: add speech bubble
  const addSpeechBubble = useCallback((agentId: string, text: string, type: 'speech' | 'vote') => {
    const id = `bubble-${++bubbleIdRef.current}`;
    const bubble: SpeechBubble = { id, agentId, text, type, expiresAt: Date.now() + 5000 };
    setSpeechBubbles((prev) => [...prev.filter((b) => b.agentId !== agentId), bubble]);
    setTimeout(() => {
      setSpeechBubbles((prev) => prev.filter((b) => b.id !== id));
    }, 5200); // slight extra for exit animation
  }, []);

  // Helper: add ticker event
  const addTickerEvent = useCallback((highlight: string, text: string, type: string) => {
    const id = `tick-${++tickerIdRef.current}`;
    setTickerEvents((prev) => [{ id, highlight, text, type, timestamp: Date.now() }, ...prev].slice(0, 10));
  }, []);

  // Helper: move agent to building
  const moveAgent = useCallback((agentId: string, buildingId: string) => {
    setAgentLocations((prev) => ({ ...prev, [agentId]: buildingId }));
  }, []);

  // WebSocket subscriptions
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // agent:vote
    unsubs.push(subscribe('agent:vote', (data: unknown) => {
      const d = data as Record<string, unknown>;
      if (!d?.agentId) return;
      moveAgent(d.agentId as string, 'capitol');
      triggerPulse('capitol', '#B8956A'); // gold
      if (d.reasoning) {
        addSpeechBubble(d.agentId as string, `Voted ${String(d.choice ?? '').toUpperCase()}: ${String(d.reasoning)}`, 'vote');
      }
      addTickerEvent(String(d.agentName ?? 'Agent'), `voted ${String(d.choice ?? '')} on "${String(d.billTitle ?? '')}"`, 'vote');
    }));

    // bill:proposed
    unsubs.push(subscribe('bill:proposed', (data: unknown) => {
      const d = data as Record<string, unknown>;
      if (!d?.sponsorId) return;
      moveAgent(d.sponsorId as string, 'capitol');
      triggerPulse('capitol', '#B8956A');
      addTickerEvent(String(d.sponsorName ?? 'Agent'), `proposed "${String(d.title ?? '')}"`, 'bill');
    }));

    // bill:resolved
    unsubs.push(subscribe('bill:resolved', (data: unknown) => {
      const d = data as Record<string, unknown>;
      const color = d?.result === 'passed' ? '#4CAF50' : '#F44336';
      triggerPulse('capitol', color);
      triggerPulse('archives', color);
      const resultWord = d?.result === 'passed' ? 'passed into law' : 'vetoed';
      addTickerEvent(`"${String(d?.title ?? '')}"`, `${resultWord} (${String(d?.yeaCount ?? 0)} yea, ${String(d?.nayCount ?? 0)} nay)`, 'bill');
    }));

    // bill:advanced
    unsubs.push(subscribe('bill:advanced', (data: unknown) => {
      const d = data as Record<string, unknown>;
      triggerPulse('capitol', '#B8956A');
      addTickerEvent(`"${String(d?.title ?? '')}"`, `advanced: ${String(d?.from ?? '')} → ${String(d?.to ?? '')}`, 'bill');
    }));

    // campaign:speech
    unsubs.push(subscribe('campaign:speech', (data: unknown) => {
      const d = data as Record<string, unknown>;
      if (!d?.agentId) return;
      moveAgent(d.agentId as string, 'party-hall');
      triggerPulse('party-hall', '#8B3A3A'); // red/campaign
      if (d.speech) {
        addSpeechBubble(d.agentId as string, String(d.speech), 'speech');
      }
      const speechPreview = d.speech ? `${String(d.speech).slice(0, 60)}...` : '';
      addTickerEvent(String(d.agentName ?? 'Agent'), `campaigned for ${String(d.positionType ?? '')}: "${speechPreview}"`, 'campaign');
    }));

    // election:voting_started
    unsubs.push(subscribe('election:voting_started', (data: unknown) => {
      const d = data as Record<string, unknown>;
      triggerPulse('election-center', '#3A6B3A');
      addTickerEvent('Election', `voting opened for ${String(d?.positionType ?? '')}`, 'election');
    }));

    // election:completed
    unsubs.push(subscribe('election:completed', (data: unknown) => {
      const d = data as Record<string, unknown>;
      if (d?.winnerId) {
        moveAgent(d.winnerId as string, 'election-center');
      }
      triggerPulse('election-center', '#4CAF50');
      addTickerEvent(String(d?.winnerName ?? 'Agent'), `won the ${String(d?.positionType ?? '')} election`, 'election');
    }));

    return () => unsubs.forEach((fn) => fn());
  }, [subscribe, moveAgent, triggerPulse, addSpeechBubble, addTickerEvent]);

  return {
    agents,
    agentLocations,
    speechBubbles,
    buildingPulses,
    tickerEvents,
    selectedAgent,
    setSelectedAgent,
    isLoading,
  };
}
