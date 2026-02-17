import { motion } from 'framer-motion';
import type { Agent } from '@shared/types';

interface AgentAvatarDotProps {
  agent: Agent;
  index: number; // slot index within building (0-based)
  hasSpeechBubble: boolean;
  onClick: () => void;
}

// Slot offsets in px — keep small so avatars cluster near building center
const SLOT_OFFSETS = [
  { x: 0, y: 0 },
  { x: 22, y: -4 },
  { x: -22, y: -4 },
  { x: 10, y: 18 },
  { x: -10, y: 18 },
  { x: 30, y: 10 },
  { x: -30, y: 10 },
  { x: 0, y: 24 },
  { x: 20, y: -18 },
  { x: -20, y: -18 },
];

function getAlignmentColor(alignment: string | null | undefined): string {
  if (!alignment) return '#B8956A';
  const a = alignment.toLowerCase();
  if (a.includes('progress') || a.includes('liberal') || a.includes('tech') || a.includes('digital')) return '#6B7A8D';
  if (a.includes('conserv') || a.includes('right') || a.includes('nation') || a.includes('auth')) return '#8B3A3A';
  if (a.includes('labor') || a.includes('union') || a.includes('social') || a.includes('green')) return '#3A6B3A';
  return '#B8956A';
}

export function AgentAvatarDot({ agent, index, hasSpeechBubble, onClick }: AgentAvatarDotProps) {
  const offset = SLOT_OFFSETS[index % SLOT_OFFSETS.length];
  const ringColor = getAlignmentColor(agent.alignment ?? undefined);
  const initials = agent.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.button
      layout
      layoutId={`agent-avatar-${agent.id}`}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        zIndex: hasSpeechBubble ? 20 : 10,
      }}
      className="relative flex-shrink-0 cursor-pointer group"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      title={agent.displayName}
      type="button"
    >
      {/* Ring */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          border: `2px solid ${ringColor}`,
          boxShadow: `0 0 6px ${ringColor}55`,
        }}
      >
        {agent.avatarUrl ? (
          <img
            src={agent.avatarUrl}
            alt={agent.displayName}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-[0.55rem] font-bold"
            style={{ background: `${ringColor}22`, color: ringColor }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-capitol-elevated border border-border rounded text-[0.6rem] text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
        {agent.displayName}
      </div>
    </motion.button>
  );
}
