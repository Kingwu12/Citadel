import {
  type ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import { executionLog } from '../../../shared/logging';
import { executionAccessService, toExecutionAccessContext } from '../services/execution-access-service';
import { requireLoopAccess } from '../services/loop-access-guard';
import { buildTodayLoopsSummaryForUser } from '../services/today-loops-summary';
import { START_REPLY_DENIED, START_REPLY_ERROR } from './start';

export const todaySlashCommand = new SlashCommandBuilder()
  .setName('today')
  .setDescription("Today's loops");
const TODAY_EPHEMERAL_DELETE_DELAY_MS = 4000;

export async function handleTodayCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (
    !interaction.inGuild() ||
    interaction.guildId === null ||
    interaction.channelId === null
  ) {
    await interaction.reply({
      content: START_REPLY_DENIED,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const ctx = toExecutionAccessContext(interaction);
  if (!executionAccessService.canUseExecutionCommand(ctx)) {
    await interaction.reply({
      content: START_REPLY_DENIED,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!(await requireLoopAccess(interaction))) {
    return;
  }

  try {
    executionLog.info('today_summary_requested', {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      source: 'slash',
    });

    const content = await buildTodayLoopsSummaryForUser(interaction.user.id);

    await interaction.reply({
      content,
      flags: MessageFlags.Ephemeral,
    });
    setTimeout(() => {
      void interaction.deleteReply().catch(() => {});
    }, TODAY_EPHEMERAL_DELETE_DELAY_MS);
  } catch (err) {
    executionLog.error(
      'today_summary_error',
      {
        userId: interaction.user.id,
        guildId: interaction.guildId ?? undefined,
        channelId: interaction.channelId ?? undefined,
      },
      err,
    );
    await interaction.reply({
      content: START_REPLY_ERROR,
      flags: MessageFlags.Ephemeral,
    });
  }
}
