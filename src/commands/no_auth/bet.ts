/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Message } from 'discord.js';
import { RequestOptions } from 'https';
import moment from 'moment';
import { OpapGameIdEnum } from '../../data/enums/OpapGames.enum';
import { create_rich_embed, get_json, get_key_from_enum, message_help } from '../../libraries/help.library';
import { https_fetch } from '../../libraries/http.library';
import { ReturnPormise } from '../../types/classes/TypesPrtl.interface';

module.exports = async (
	message: Message, args: string[]
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		let game_code: number | undefined = undefined;

		if (args.length === 2) {
			if (args[0].toLowerCase() !== 'opap') {
				return resolve({
					result: false,
					value: message_help('commands', 'bet', `${args[0]} is not a provider`)
				});
			} else {
				if (isNaN(+args[1])) {
					game_code = <number>get_key_from_enum(args[1].toLowerCase(), OpapGameIdEnum);
				}

				if (!game_code) {
					return resolve({
						result: false,
						value: message_help('commands', 'bet', `${args[1]} does not exist in ${args[0]}`)
					});
				}
			}
		} else {
			return resolve({
				result: false,
				value: message_help('commands', 'bet', '')
			});
		}

		const options: RequestOptions = {
			'method': 'GET',
			'hostname': `api.opap.gr`,
			'port': undefined,
			'path': `/draws/v3.0/${game_code}/last-result-and-active`,
			'headers': {
				'x-opap-host': 'api.opap.gr',
				'useQueryString': 1
			}
		};

		https_fetch(options)
			.then((response: Buffer) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const json = get_json(response.toString()
					.substring(response.toString().indexOf('{')));

				if (json === null) {
					return resolve({
						result: false,
						value: 'data from source is corrupted'
					});
				}

				message.channel
					.send({
						embeds: [
							create_rich_embed(
								`${args[1]} from ${args[0]} | ${moment(json.last.drawTime).format('DD/MM/YY')}`,
								`powered by ${args[0]}`,
								'#0384fc',
								[
									{
										emote: 'Winning Numbers',
										// eslint-disable-next-line @typescript-eslint/no-unsafe-call
										role: `${json.last.winningNumbers.list.map((n: number) => n).join(', ')}`,
										inline: true
									},
									{
										emote: 'Tzoker',
										role: `${json.last.winningNumbers.bonus}`,
										inline: true
									},
									{
										emote: `${(json.last.prizeCategories[0].winners > 1) ? 'Winners' : 'Winner'}`,
										role: `${json.last.prizeCategories[0].winners}`,
										inline: true
									},
									{
										emote: 'Draw Number',
										role: `${json.last.drawId}`,
										inline: true
									},
									{
										emote: 'Columns Cast',
										role: `${json.last.wagerStatistics.columns}`,
										inline: true
									},
									{
										emote: 'Wagers',
										role: `${json.last.wagerStatistics.wagers}`,
										inline: true
									}
								],
								null,
								null,
								true,
								null,
								null
							)]
					}
					)
					.catch((e: any) => {
						return resolve({
							result: false,
							value: `failed to send message / ${e}`
						});
					});


				return resolve({
					result: true,
					value: ''
				});

			})
			.catch((e: any) => {
				return resolve({
					result: false,
					value: `could not access the server / ${e}`
				});
			});
	});
};
