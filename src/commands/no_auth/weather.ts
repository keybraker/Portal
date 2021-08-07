/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Message } from 'discord.js';
import { RequestOptions } from 'https';
import moment from 'moment';
import config from '../../config.json';
import { create_rich_embed, get_json, message_help } from '../../libraries/help.library';
import { https_fetch } from '../../libraries/http.library';
import { ReturnPormise } from '../../types/classes/TypesPrtl.interface';

function kelvin_to_celsius(kelvin: number): number {
	return Math.round(kelvin - 273.15);
}

function kelvin_to_fahrenheit(kelvin: number): number {
	return Math.round(((kelvin - 273.15) * (9 / 5)) + 32);
}

function ms_to_ks(ms: number): number {
	return Math.round(ms * 3.6);
}

function ms_to_mlh(ms: number): number {
	return Math.round(ms * 2.237);
}

module.exports = async (
	message: Message, args: string[]
): Promise<ReturnPormise> => {
	return new Promise((resolve) => {
		if (args.length < 1)
			return resolve({
				result: false,
				value: message_help('commands', 'weather')
			});

		const location = args.join('%2C%20');
		const options: RequestOptions = {
			"method": "GET",
			"hostname": "api.openweathermap.org",
			"port": undefined,
			"path": `/data/2.5/weather?q=${location}&appid=${config.api_keys.OpenWeatherMap}`,
		};

		https_fetch(options)
			.then((rspns: Buffer) => {
				const json = get_json(rspns.toString().substring(rspns.toString().indexOf('{')));
				if (json === null) {
					return resolve({
						result: false,
						value: 'data from source was corrupted'
					});
				}

				if (json.cod === '404') {
					return resolve({
						result: false,
						value: message_help('commands', 'weather', 'city not found')
					});
				}

				if (json.cod === 200) {
					message.channel
						.send({
							embeds: [
								create_rich_embed(
									`${json.name}, ${json.sys.country} at ${moment().format('DD/MM/YY')}`,
									'powered by OpenWeatherMap',
									'#BFEFFF',
									[
										{
											emote: 'Temperature',
											role: `${kelvin_to_celsius(json.main.temp)}°C / ${kelvin_to_fahrenheit(json.main.temp)}°F`,
											inline: true
										},
										{
											emote: 'Feels like',
											role: `${kelvin_to_celsius(json.main.feels_like)}°C / ${kelvin_to_fahrenheit(json.main.feels_like)}°F`,
											inline: true
										},
										{
											emote: null,
											role: null,
											inline: false
										},
										{
											emote: 'Humidity',
											role: `${json.main.humidity}`,
											inline: true
										},
										{
											emote: 'Wind Speed',
											role: `${ms_to_ks(json.wind.speed)}kmh / ${ms_to_mlh(json.wind.speed)}mlh`,
											inline: true
										},
										{
											emote: 'Cloudiness',
											role: `${json.clouds.all}%`,
											inline: true
										},
										{
											emote: 'Condition',
											// eslint-disable-next-line @typescript-eslint/no-unsafe-call
											role: `${json.weather.map((w: any) => {
												return `${w.main} (${w.description})`;
											}).join(', ')}`,
											inline: false
										}
									],
									`http://openweathermap.org/img/wn/${json.weather[0].icon}@2x.png`,
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
						value: `${json.name} weather`
					});
				}
				else {
					return resolve({
						result: false,
						value: `could not access the server / ${json.cod}`
					});
				}
			})
			.catch((e: any) => {
				return resolve({
					result: false,
					value: `could not access the server / ${e}`
				});
			});
	});
};
