import type { SlashCommandBuilder } from 'discord.js';

import { endSlashCommand } from '../domains/execution/commands/end';
import { startSlashCommand } from '../domains/execution/commands/start';
import { todaySlashCommand } from '../domains/execution/commands/today';

/**
 * All slash command definitions registered with Discord (REST) and routed from {@link routeChatInputCommand}.
 */
export const slashCommandBuilders: SlashCommandBuilder[] = [
  startSlashCommand,
  endSlashCommand,
  todaySlashCommand,
];
