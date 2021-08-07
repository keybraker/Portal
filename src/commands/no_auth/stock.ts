/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Message } from 'discord.js';
import { RequestOptions } from 'https';
import moment from 'moment';
import config from '../../config.json';
// import { CountryCodes } from '../../data/lists/country_codes_iso.static';
import { create_rich_embed, get_json, message_help } from '../../libraries/help.library';
import { https_fetch } from '../../libraries/http.library';
import { ReturnPormise } from '../../types/classes/TypesPrtl.interface';

// const country_codes: { name: string; code: string; }[] = CountryCodes;

// const get_country_code = function (country: string): string | null {
// 	for (let i = 0; i < country_codes.length; i++) {
// 		if (voca.lowerCase(country_codes[i].name) === voca.lowerCase(country))
// 			return country_codes[i].name;
// 		else if (voca.lowerCase(country_codes[i].code) === voca.lowerCase(country))
// 			return country_codes[i].name;
// 	}
// 	return null;
// };

module.exports = async (
	message: Message, args: string[]
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		if (args.length === 0 || args.length > 1) {
			return resolve({
				result: false,
				value: message_help('commands', 'stock')
			});
		}

		const options: RequestOptions = {
			'method': 'GET',
			'hostname': 'yahoo-finance-low-latency.p.rapidapi.com',
			'port': undefined,
			'path': `/v8/finance/chart/${args[0]}?events=div%2Csplit`,
			'headers': {
				'x-rapidapi-host': 'yahoo-finance-low-latency.p.rapidapi.com',
				'x-rapidapi-key': config.api_keys.yahoo_finance,
				'useQueryString': 1
			}
		};

		https_fetch(options)
			.then((response: Buffer) => {

				const json = get_json(response.toString().substring(response.toString().indexOf('{')));
				if (json === null) {
					return resolve({
						result: false,
						value: 'data from source was corrupted'
					});
				}

				const chart = json.chart;

				if (chart === null) {
					return resolve({
						result: false,
						value: 'could not find any stock'
					});
				}

				const result = chart.result;

				if (result === null) {
					return resolve({
						result: false,
						value: 'there were no results'
					});
				}

				const meta = result[0];

				if (meta === null) {
					return resolve({
						result: false,
						value: 'there were no meta data'
					});
				}
				message.channel
					.send({
						embeds: [
							create_rich_embed(
								`STOCK ${meta.symbol} (${meta.regularMarketPrice}) - ${moment().format('DD/MM/YY')}`,
								'powered by yahoo finance',
								'#FF0000', [],
								// [
								// 	{
								// 		emote: `${voca.titleCase(crypto_name)} to ${voca.titleCase(currnc_name)} price`,
								// 		role: `${json[crypto_name][currnc_name]}`,
								// 		inline: false
								// 	}
								// ],
								null,
								null,
								true,
								null,
								null
							)]
					}
					)
					.catch(e => {
						return resolve({
							result: true,
							value: `failed to send message / ${e}`
						});
					});

				return resolve({
					result: true,
					value: message_help('commands', 'stock', `${json} crypto stats`)
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
