import { getActiveLoopsChannelId } from '../../../config/execution-panel-env';
import type { OpenLoop } from '../types/execution.types';

export function buildAlreadyOpenLoopReply(openLoop: OpenLoop): string {
  const channelId = openLoop.loopPanelChannelId ?? getActiveLoopsChannelId();
  const messageId = openLoop.loopPanelMessageId;
  if (messageId && channelId) {
    const url = `https://discord.com/channels/${openLoop.guildId}/${channelId}/${messageId}`;
    return `You already have an open loop. [Jump to it](${url})`;
  }
  return `You already have an open loop in <#${channelId}>.`;
}
