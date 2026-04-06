import { EmbedBuilder } from 'discord.js';

import { sanitizeCommitmentDisplay } from './loop-formatters';

const LOOP_COCKPIT_COLOR = 0xffd700;

export function formatElapsedCompact(openedAt: number): string {
  const elapsedMs = Math.max(0, Date.now() - openedAt);
  if (elapsedMs < 60000) return `${Math.max(1, Math.floor(elapsedMs / 1000))}s`;
  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (remMin === 0) return `${hours}h`;
  return `${hours}h ${remMin}m`;
}

export function buildLoopOpenCockpitEmbed(params: {
  intention: string;
  openedAt: number;
}): EmbedBuilder {
  const intention = sanitizeCommitmentDisplay(params.intention, 500) || '—';
  return new EmbedBuilder()
    .setColor(LOOP_COCKPIT_COLOR)
    .setTitle('▸ LOOP OPEN')
    .addFields(
      { name: '◈ EXECUTING', value: intention, inline: false },
      { name: '◈ TIME IN', value: formatElapsedCompact(params.openedAt), inline: false },
      { name: '◈ STATUS', value: 'In progress', inline: false },
    )
    .setFooter({ text: 'Close when done.' });
}
