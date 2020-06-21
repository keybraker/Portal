/* eslint-disable no-unused-vars */

module.exports = async (client, message, args, portal_guilds, portal_managed_guilds_path) => {
	return new Promise((resolve) => {
		const msg = await message.channel.send('Ping?');
		msg.edit(`Pong!\nLatency of rtt is ${msg.createdTimestamp - message.createdTimestamp}ms.\n` +
			`Latency to portal is ${client.ws.ping}ms`);
		return resolve ({ result: true, value: '*ping ran successfully.*' });
	});
};