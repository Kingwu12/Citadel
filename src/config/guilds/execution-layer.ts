import { mergeGuildFeatures } from '../features';
import type { GuildConfig } from './types';

/**
 * Execution Layer — execution sessions domain.
 *
 * @temporary Testing: `executionChannelId` is intentionally unset so commands work in any channel
 * in this guild. Re-pin a channel when you want to lock execution traffic again.
 * Replace `guildId` with the live Discord snowflake.
 */
export const executionLayerGuild: GuildConfig = {
  guildId: 'PLACEHOLDER_EXECUTION_LAYER_GUILD_ID',
  guildType: 'execution',
  features: mergeGuildFeatures({
    missionsEnabled: false,
    executionEnabled: true,
    publicSessionMessages: false,
    verdictEnabled: true,
  }),
  channels: {},
};
