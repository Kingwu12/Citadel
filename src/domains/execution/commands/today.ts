import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';

import { formatTodayExecutionSummary } from '../formatters/session-summary-formatter';
import { SessionRepo } from '../repositories/session-repo';
import { executionAccessService, toExecutionAccessContext } from '../services/execution-access-service';
import { START_REPLY_DENIED, START_REPLY_ERROR } from './start';

const sessionRepo = new SessionRepo();

export const todaySlashCommand = new SlashCommandBuilder()
  .setName('today')
  .setDescription("See today's completed execution sessions");

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
      ephemeral: true,
    });
    return;
  }

  const ctx = toExecutionAccessContext(interaction);
  if (!executionAccessService.canUseExecutionCommand(ctx)) {
    await interaction.reply({
      content: START_REPLY_DENIED,
      ephemeral: true,
    });
    return;
  }

  try {
    const sessions = await sessionRepo.getTodaySessionsByUser(interaction.user.id);
    const totalMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
    const content = formatTodayExecutionSummary(sessions.length, totalMs);

    await interaction.reply({
      content,
      ephemeral: true,
    });
  } catch {
    await interaction.reply({
      content: START_REPLY_ERROR,
      ephemeral: true,
    });
  }
}
