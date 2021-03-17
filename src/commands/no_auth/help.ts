import { Message } from "discord.js";
import { create_rich_embed, message_help } from "../../libraries/help.library";
import { GuildPrtl } from "../../types/classes/GuildPrtl.class";
import { get_attribute_guide, get_attribute_help, get_attribute_help_super } from "../../types/interfaces/Attribute.interface";
import { get_command_guide, get_command_help, get_command_help_super } from "../../types/interfaces/Command.interface";
import { Field, ReturnPormise } from "../../types/classes/TypesPrtl.interface";
import { get_pipe_guide, get_pipe_help, get_pipe_help_super } from "../../types/interfaces/Pipe.interface";
import { get_structure_guide, get_structure_help, get_structure_help_super } from "../../types/interfaces/Structure.interface";
import { get_variable_guide, get_variable_help, get_variable_help_super } from "../../types/interfaces/Variable.interface";

module.exports = async (
	message: Message, args: string[], guild_object: GuildPrtl
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		if (args.length === 0) {
			const help_array: Field[] = [
				{
					emote: null,
					role: '**[Commands](https://portal-bot.xyz/docs/commands/description)**',
					inline: false
				},
				{
					emote: '`./help commands` or `./help commands guide`',
					role: 'Commands are mini programs you can use to get a response or action\n',
					inline: false
				},
				{
					emote: null,
					role: '**[Text Interpreter](https://portal-bot.xyz/docs/interpreter/description)**',
					inline: false
				},
				{
					emote: '`./help variables` or `./help variables guide`',
					role: 'Variables are live data about the current state of things\n' +
						'_for more click [here](https://portal-bot.xyz/docs/interpreter/objects/variables/description)_',
					inline: false
				},
				{
					emote: '`./help pipes` or `./help pipes guide`',
					role: 'Pipes are mini-programs that manipulate text or even variables and attributes\n' +
						'_for more click [here](https://portal-bot.xyz/docs/interpreter/objects/pipes/description)_',
					inline: false
				},
				{
					emote: '`./help attributes` or `./help attributes guide`',
					role: 'Attributes are options that can be altered with **[set](https://portal-bot.xyz/docs/commands/detailed/set)** command\n' +
						'_for more click [here](https://portal-bot.xyz/docs/interpreter/objects/attributes/description)_',
					inline: false
				},
				{
					emote: '`./help structures` or `./help structures guide`',
					role: 'Structures are rules to further manipulate the text outcome\n' +
						'_for more click [here](https://portal-bot.xyz/docs/interpreter/objects/structures/description)_',
					inline: false
				},
				{
					emote: null,
					role: 'Specific help',
					inline: false
				},
				{
					emote: '`./help <specific_property_name>`',
					role: 'If you want to get a complete description of any property\n' +
						'_(lets say you want to learn more about variables year, just type **./help year**)_',
					inline: false
				},
				{
					emote: null,
					role: '**[FAQ](https://portal-bot.xyz/help#faq)** _frequently asked questioned_',
					inline: false
				}
			];

			message.reply(
				create_rich_embed(
					'Detailed Documentation at https://portal-bot.xyz/docs',
					'> To make a member a **dj**, give him role with name `p.dj`\n' +
					'> To make a member an **admin**, give him role with name `p.admin`\n' +
					'> To **ignore** a member, give him role with name `p.ignore`\n' +
					'> for more click [here](https://portal-bot.xyz/help#q-how-can-i-give-members-authority)',
					'#05d1ff',
					help_array,
					null,
					null,
					true,
					null,
					null
				))
				.catch(console.error);

			return resolve({
				result: true,
				value: ''
			});
		}
		else if (args.length === 2) {
			if (args[0] === 'commands' && args[1] === 'guide') {
				message.author
					.send(get_command_guide())
					.catch(console.error);
			}
			else if (args[0] === 'variables' && args[1] === 'guide') {
				message.author
					.send(get_variable_guide())
					.catch(console.error);
			}
			else if (args[0] === 'pipes' && args[1] === 'guide') {
				message.author
					.send(get_pipe_guide())
					.catch(console.error);
			}
			else if (args[0] === 'attributes' && args[1] === 'guide') {
				message.author
					.send(get_attribute_guide())
					.catch(console.error);
			}
			else if (args[0] === 'structures' && args[1] === 'guide') {
				message.author
					.send(get_structure_guide())
					.catch(console.error);
			}
			else {
				return resolve({
					result: false,
					value: message_help('commands', 'bet', `*${args[0]} ${args[1]}* does not exist in portal`)
				});
			}
		}
		else if (args.length === 1) {
			if (args[0] === 'all') {
				get_command_help().forEach(embed =>
					message.author
						.send(embed)
						.catch(console.error)
				);
				get_variable_help().forEach(embed =>
					message.author
						.send(embed)
						.catch(console.error)
				);
				get_pipe_help().forEach(embed =>
					message.author
						.send(embed)
						.catch(console.error)
				);
				get_attribute_help().forEach(embed =>
					message.author
						.send(embed)
						.catch(console.error)
				);
				get_structure_help().forEach(embed =>
					message.author
						.send(embed)
						.catch(console.error)
				);
			}
			else if (args[0] === 'commands') {
				get_command_help().forEach(embed =>
					message.author
						.send(embed)
						.catch(console.error)
				);
			}
			else if (args[0] === 'variables') {
				get_variable_help().forEach(embed =>
					message.author
						.send(embed)
						.catch(console.error)
				);
			}
			else if (args[0] === 'pipes') {
				get_pipe_help().forEach(embed =>
					message.author
						.send(embed)
						.catch(console.error)
				);
			}
			else if (args[0] === 'attributes') {
				get_attribute_help().forEach(embed =>
					message.author
						.send(embed)
						.catch(console.error)
				);
			}
			else if (args[0] === 'structures') {
				get_structure_help().forEach(embed =>
					message.author
						.send(embed)
						.catch(console.error)
				);
			} else {
				const cmmd_detailed = get_command_help_super(args[0]);
				if (cmmd_detailed) {
					message.author
						.send(cmmd_detailed)
						.catch(console.error);
				}
				const vrbl_detailed = get_variable_help_super(args[0]);
				if (vrbl_detailed) {
					message.author
						.send(vrbl_detailed)
						.catch(console.error);
				}
				const pipe_detailed = get_pipe_help_super(args[0]);
				if (pipe_detailed) {
					message.author
						.send(pipe_detailed)
						.catch(console.error);
				}
				const attr_detailed = get_attribute_help_super(args[0]);
				if (attr_detailed) {
					message.author
						.send(attr_detailed)
						.catch(console.error);
				}
				const strc_detailed = get_structure_help_super(args[0]);
				if (strc_detailed) {
					message.author
						.send(strc_detailed)
						.catch(console.error);
				}

				if (!cmmd_detailed && !vrbl_detailed && !pipe_detailed && !attr_detailed && !strc_detailed) {
					return resolve({
						result: false,
						value: message_help('commands', 'help', `*${args[0]}* does not exist in portal`)
					});
				}
			}

			return resolve({
				result: true,
				value: message_help('commands', 'help', 'I sent you a private message')
			});
		}
	});
};