import type { Client } from 'discord.js';
import { getExecutionFeedChannelId } from '../config/execution-panel-env';
import { buildExecutionFeedEmbed } from '../domains/execution/formatters/execution-feed-formatter';
import type { ReflectionStatus } from '../domains/execution/types/execution.types';
import { executionLog } from '../shared/logging';

export type ExecutionFeedPostParams = {
  userId: string;
  taskText: string;
  durationMs: number;
  reflectionStatus?: ReflectionStatus;
  proofText?: string;
  proofAttachmentUrls?: string[];
};

export async function sendExecutionCompleteToFeed(
  client: Client,
  params: ExecutionFeedPostParams,
): Promise<void> {
  const channelId = getExecutionFeedChannelId();
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || !channel.isSendable()) {
    executionLog.warn('execution_feed_post_skipped_channel_missing', { channelId });
    return;
  }
  const embed = buildExecutionFeedEmbed({
    durationMs: params.durationMs,
    executedText: params.taskText,
    proofText: params.proofText,
    proofAttachmentUrls: params.proofAttachmentUrls,
  });
  await channel.send({ embeds: [embed] });
}
