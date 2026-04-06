import type { Client, Message, MessageCreateOptions, TextBasedChannel, Webhook } from 'discord.js';
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

const EXECUTION_FEED_WEBHOOK_NAME = 'Execution Feed Relay';

function isWebhookCapableChannel(channel: TextBasedChannel): channel is TextBasedChannel & {
  fetchWebhooks: () => Promise<Awaited<ReturnType<TextBasedChannel['fetchWebhooks']>>>;
  createWebhook: (options: { name: string; reason?: string }) => Promise<Webhook>;
} {
  return 'fetchWebhooks' in channel && 'createWebhook' in channel;
}

async function getOrCreateFeedWebhook(
  client: Client,
  channel: TextBasedChannel,
): Promise<Webhook | null> {
  if (!isWebhookCapableChannel(channel)) return null;
  const hooks = await channel.fetchWebhooks();
  const reusable = hooks.find((hook) =>
    hook.token &&
    hook.isIncoming() &&
    (
      hook.applicationId === client.application?.id ||
      hook.owner?.id === client.user?.id
    ),
  );
  if (reusable) return reusable;
  return channel.createWebhook({
    name: EXECUTION_FEED_WEBHOOK_NAME,
    reason: 'Execution feed user-identity relay',
  });
}

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
  await sendUserStyledChannelMessage(client, {
    channel,
    userId: params.userId,
    embeds: [embed],
    logPrefix: 'execution_feed',
  });
}

export async function sendUserStyledChannelMessage(
  client: Client,
  params: {
    channel: TextBasedChannel;
    userId: string;
    embeds?: MessageCreateOptions['embeds'];
    content?: string;
    components?: MessageCreateOptions['components'];
    logPrefix: string;
  },
): Promise<Message | null> {
  const channel = params.channel;
  if (!channel.isSendable()) {
    executionLog.warn(`${params.logPrefix}_post_skipped_channel_unsendable`, {
      userId: params.userId,
      channelId: channel.id,
    });
    return null;
  }
  const guild = channel.isDMBased() ? null : channel.guild;
  const member = guild ? await guild.members.fetch(params.userId).catch(() => null) : null;
  const user = member?.user ?? await client.users.fetch(params.userId).catch(() => null);
  const displayName = member?.displayName ?? user?.globalName ?? user?.username ?? params.userId;
  const avatarURL = member?.displayAvatarURL() ?? user?.displayAvatarURL();

  try {
    const hook = await getOrCreateFeedWebhook(client, channel);
    if (!hook || !hook.token) {
      throw new Error('no_reusable_webhook');
    }
    const sent = await hook.send({
      username: displayName,
      avatarURL,
      content: params.content,
      embeds: params.embeds,
      components: params.components,
    });
    executionLog.info(`${params.logPrefix}_posted_via_webhook`, {
      channelId: channel.id,
      userId: params.userId,
      webhookId: hook.id,
    });
    return sent;
  } catch (err) {
    executionLog.warn(`${params.logPrefix}_webhook_failed_fallback_send`, {
      channelId: channel.id,
      userId: params.userId,
      reason: err instanceof Error ? err.message : String(err),
    });
    const sent = await channel.send({
      content: params.content,
      embeds: params.embeds,
      components: params.components,
    });
    executionLog.info(`${params.logPrefix}_posted_via_bot_fallback`, {
      channelId: channel.id,
      userId: params.userId,
    });
    return sent;
  }
}
