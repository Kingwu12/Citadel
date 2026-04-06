import { EmbedBuilder } from 'discord.js';

import type { ReflectionStatus } from '../types/execution.types';

import { sanitizeCommitmentDisplay } from './loop-formatters';

const FEED_EMBED_COLOR = 0x1e1f22;

/** Human-readable duration for execution output (e.g. 42m, 1h 5m). */
export function formatExecutionDurationShort(ms: number): string {
  if (ms < 60000) return '<1m';
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export type ExecutionCompleteFeedParams = {
  userId: string;
  actorName?: string;
  actorAvatarUrl?: string;
  durationMs: number;
  /** Text from when the loop was opened. */
  taskText: string;
  proofText?: string;
  reflectionStatus: ReflectionStatus;
  proofAttachmentUrls?: string[];
};

export function buildExecutionCompleteEmbed(p: ExecutionCompleteFeedParams): EmbedBuilder {
  const actor = p.actorName?.trim() || `<@${p.userId}>`;
  const duration = formatExecutionDurationShort(p.durationMs);
  const executed = sanitizeCommitmentDisplay(p.taskText, 500) || '—';
  const proofText = p.proofText ? sanitizeCommitmentDisplay(p.proofText, 700) : undefined;
  const proofValue = proofText ?? (p.proofAttachmentUrls?.length ? 'Attachment' : undefined);
  const proofLine = proofValue ?? `${p.reflectionStatus}`;

  return new EmbedBuilder()
    .setColor(FEED_EMBED_COLOR)
    .setTitle('Loop closed')
    .setAuthor({
      name: actor,
      iconURL: p.actorAvatarUrl,
    })
    .addFields(
      { name: 'Duration', value: duration, inline: true },
      { name: 'Executed', value: `"${executed}"`, inline: false },
      { name: 'Proof', value: proofLine, inline: false },
    )
    .setFooter({ text: 'CITADEL // execution feed' });
}
