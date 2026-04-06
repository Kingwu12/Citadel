import { ChannelType, type Client } from 'discord.js';

import { getExecutionFeedChannelId } from '../config/execution-panel-env';
import {
  buildExecutionCompleteEmbed,
  type ExecutionCompleteFeedParams,
} from '../domains/execution/formatters/execution-feed-formatter';
import { executionLog } from '../shared/logging';

export async function sendExecutionCompleteToFeed(
  client: Client,
  params: ExecutionCompleteFeedParams,
): Promise<void> {
  const feedChannelId = getExecutionFeedChannelId();
  try {
    const ch = await client.channels.fetch(feedChannelId);
    if (!ch?.isSendable()) {
      executionLog.warn('execution_feed_send_skipped', {
        reason: 'channel_not_sendable',
        feedChannelId,
      });
      return;
    }
    let actorName: string | undefined;
    let actorAvatarUrl: string | undefined;
    if (ch.isDMBased() === false && 'guild' in ch) {
      const member = await ch.guild.members.fetch(params.userId).catch(() => null);
      actorName = member?.displayName;
      actorAvatarUrl = member?.displayAvatarURL();
    }
    if (!actorName || !actorAvatarUrl) {
      const user = await client.users.fetch(params.userId).catch(() => null);
      actorName = actorName ?? user?.displayName ?? user?.username;
      actorAvatarUrl = actorAvatarUrl ?? user?.displayAvatarURL();
    }

    const payload: ExecutionCompleteFeedParams = {
      ...params,
      actorName,
      actorAvatarUrl,
    };

    if (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) {
      try {
        const hooks = await ch.fetchWebhooks();
        const existing = hooks.find((h) => h.owner?.id === client.user?.id);
        const hook = existing ?? (await ch.createWebhook({ name: 'Citadel Feed' }));
        await hook.send({
          username: payload.actorName ?? `<@${payload.userId}>`,
          avatarURL: payload.actorAvatarUrl,
          embeds: [buildExecutionCompleteEmbed(payload)],
          files: payload.proofAttachmentUrls ?? [],
        });
        return;
      } catch (webhookErr) {
        executionLog.warn('execution_feed_webhook_failed', {
          feedChannelId,
          reason: webhookErr instanceof Error ? webhookErr.message : 'unknown',
        });
      }
    }

    await ch.send({
      embeds: [buildExecutionCompleteEmbed(payload)],
      files: payload.proofAttachmentUrls ?? [],
    });
  } catch (err) {
    executionLog.error('execution_feed_send_failed', { feedChannelId }, err);
  }
}
