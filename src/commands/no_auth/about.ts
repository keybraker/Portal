import { Message } from "discord.js";
import config from '../../config.json';
import { create_rich_embed } from "../../libraries/help.library";
import { ReturnPormise } from "../../types/classes/TypesPrtl.interface";

module.exports = async (
    message: Message
): Promise<ReturnPormise> => {
    return new Promise((resolve) => {
        message.channel.send({
            embeds: [
                create_rich_embed(
                    'About',
                    'A fully fledged and feature rich bot for Discord',
                    '#1DB954',
                    [
                        {
                            emote: 'Website',
                            role: '[portal-bot.xyz](https://portal-bot.xyz)',
                            inline: true
                        },
                        {
                            emote: 'Creator',
                            role: '[Keybraker](https://github.com/keybraker/Portal)',
                            inline: true
                        },
                        {
                            emote: 'Version',
                            role: `[${config.version}](https://portal-bot.xyz/blog/${config.version})`,
                            inline: true
                        },
                        {
                            emote: 'Official Server',
                            role: '[Portal Official](https://discord.gg/WrMUzJYyzJ)',
                            inline: true
                        },
                        {
                            emote: 'Github',
                            role: '[keybraker/Portal](https://www.github.com/keybraker/Portal)',
                            inline: true
                        },
                        {
                            emote: 'Upvote',
                            role: '[Top.gg](https://top.gg/bot/704400876860735569) | [Bot.gg](https://discord.bots.gg/bots/704400876860735569)',
                            inline: true
                        }
                    ],
                    null,
                    null,
                    true,
                    null,
                    null,
                    // undefined,
                    // undefined,
                    // 'since 2020'
                )]
        }
        )
            .catch(e => {
                return resolve({
                    result: true,
                    value: `failed to send about message ${e}`
                });
            });

        return resolve({
            result: true,
            value: ''
        });
    });
};