/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Message } from 'discord.js';
import { RequestOptions } from 'https';
import moment from 'moment';
import voca from 'voca';
import config from '../../config.json';
import { CountryCodes } from '../../data/lists/country_codes_iso.static';
import { create_rich_embed, get_json, message_help } from '../../libraries/help.library';
import { https_fetch } from '../../libraries/http.library';
import { ReturnPormise } from '../../types/classes/TypesPrtl.interface';

const country_codes: { name: string; code: string; }[] = CountryCodes;

const get_country_code = function (country: string): string | null {
	for (let i = 0; i < country_codes.length; i++) {
		if (voca.lowerCase(country_codes[i].name) === voca.lowerCase(country))
			return country_codes[i].name;
		else if (voca.lowerCase(country_codes[i].code) === voca.lowerCase(country))
			return country_codes[i].name;
	}

	return null;
};

module.exports = async (
	message: Message, args: string[]
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		let code: string | null = null;

		if (args.length === 1) {
			code = get_country_code(args[0]);
			if (code === null) {
				return resolve({
					result: false,
					value: message_help('commands', 'corona', `${args[0]} is neither a country name nor code`)
				});
			}
		} else if (args.length > 1) {
			return resolve({
				result: false,
				value: message_help('commands', 'corona', 'you must give only one argument')
			});
		} else {
			return resolve({
				result: false,
				value: message_help('commands', 'corona')
			});
		}

		const options: RequestOptions = {
			'method': 'GET',
			'hostname': 'covid-193.p.rapidapi.com',
			'port': undefined,
			'path': '/statistics',
			'headers': {
				'x-rapidapi-host': 'covid-193.p.rapidapi.com',
				'x-rapidapi-key': config.api_keys.covid_193,
				'useQueryString': 1
			},
		};

		https_fetch(options)
			.then((response: Buffer) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const json = get_json(response.toString().substring(response.toString().indexOf('{')));

				if (json === null) {
					return resolve({
						result: false,
						value: 'data from source was corrupted'
					});
				}

				if (json.errors.length === 0) {
					const country_data = json.response.find((data: any) => data.country === code);

					if (!country_data) {
						return resolve({
							result: false,
							value: `${args[0]} is neither a country name nor code`
						});
					}

					message.channel
						.send({
							embeds: [
								create_rich_embed(
									`${country_data.country} | ${moment(country_data.time).format('DD/MM/YY')}`,
									'Covid19 stats by covid-193',
									'#FF0000',
									[
										{
											emote: 'NEW cases',
											role: `${country_data.cases.new ? country_data.cases.new : 'N/A'}`,
											inline: true
										},
										{
											emote: 'NEW deaths',
											role: `${country_data.deaths.new ? country_data.deaths.new : 'N/A'}`,
											inline: true
										},
										{
											emote: 'Tests P1M',
											role: `${country_data.tests['1M_pop']}`,
											inline: true
										},
										{
											emote: 'Cases',
											role: `${country_data.cases.total}`,
											inline: true
										},
										{
											emote: 'Deaths',
											role: `${country_data.deaths.total}`,
											inline: true
										},
										{
											emote: 'Recovered',
											role: `${country_data.cases.recovered}`,
											inline: true
										},
										{
											emote: '%Recovered',
											role: `${((country_data.cases.recovered / country_data.cases.total) * 100)
												.toFixed(2)}%`,
											inline: true
										},
										{
											emote: '%Diseased',
											role: `${((country_data.deaths.total / country_data.cases.total) * 100)
												.toFixed(2)}%`,
											inline: true
										},
										{
											emote: 'Critical',
											role: `${country_data.cases.critical}`,
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
				}
				else {
					return resolve({
						result: false,
						value: `fetched data had errors`
					});
				}
			})
			.catch(e => {
				return resolve({
					result: false,
					value: `could not access the server / ${e}`
				});
			});
	});
};
