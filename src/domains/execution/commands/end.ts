import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';

import { executionLog } from '../../../shared/logging';
import { formatPublicSessionCompleteMessage } from '../formatters/session-summary-formatter';
import { executionAccessService, toExecutionAccessContext } from '../services/execution-access-service';
import { ExecutionSessionService } from '../services/execution-session-service';
import { START_REPLY_DENIED, START_REPLY_ERROR } from './start';

/** Ephemeral when there is nothing to end. */
export const END_REPLY_NO_ACTIVE_SESSION =
  'No active session. Use `/start` to begin.';

/** Ephemeral after a successful end (always sent once). */
export const END_REPLY_SUCCESS = 'Session ended.';

const executionSessionService = new ExecutionSessionService();

export const endSlashCommand = new SlashCommandBuilder()
  .setName('end')
  .setDescription('End your execution session');

export async function handleEndCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (
    !interaction.inGuild() ||
    interaction.guildId === null ||
    interaction.channelId === null
  ) {
    executionLog.info('end_blocked', {
      reason: 'invalid_context',
      userId: interaction.user.id,
    });
    await interaction.reply({
      content: START_REPLY_DENIED,
      ephemeral: true,
    });
    return;
  }

  const ctx = toExecutionAccessContext(interaction);
  if (!executionAccessService.canUseExecutionCommand(ctx)) {
    executionLog.info('end_blocked', {
      reason: 'execution_not_allowed',
      userId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
    });
    await interaction.reply({
      content: START_REPLY_DENIED,
      ephemeral: true,
    });
    return;
  }

  executionLog.info('end_attempt', {
    userId: interaction.user.id,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
  });

  try {
    // Persistence (completed session write + active delete) happens inside endSession, before any public post.
    const result = await executionSessionService.endSession({
      discordUserId: interaction.user.id,
    });

    if (!result.ok) {
      executionLog.info('end_blocked', {
        reason: 'no_active_session',
        userId: interaction.user.id,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
      });
      await interaction.reply({
        content: END_REPLY_NO_ACTIVE_SESSION,
        ephemeral: true,
      });
      return;
    }

    executionLog.info('end_success', {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      completedSessionId: result.completedSessionId,
    });

    await interaction.reply({
      content: END_REPLY_SUCCESS,
      ephemeral: true,
    });

    const allowPublic = executionAccessService.canPostPublicExecutionMessage(ctx);
    if (!allowPublic) return;

    const channel = interaction.channel;
    if (channel === null || !channel.isTextBased()) return;

    const publicContent = formatPublicSessionCompleteMessage({
      discordUserId: interaction.user.id,
      durationMs: result.completedSession.durationMs,
    });

    try {
      await channel.send({ content: publicContent });
    } catch (sendErr) {
      executionLog.error(
        'end_public_post_failed',
        {
          userId: interaction.user.id,
          guildId: interaction.guildId,
          channelId: interaction.channelId,
          completedSessionId: result.completedSessionId,
        },
        sendErr,
      );
    }
  } catch (err) {
    executionLog.error(
      'end_error',
      {
        userId: interaction.user.id,
        guildId: interaction.guildId ?? undefined,
        channelId: interaction.channelId ?? undefined,
      },
      err,
    );
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: START_REPLY_ERROR,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: START_REPLY_ERROR,
        ephemeral: true,
      });
    }
  }
}
