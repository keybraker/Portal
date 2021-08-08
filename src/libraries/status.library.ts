import { Activity, GuildMember, VoiceChannel } from "discord.js";
import { GameNames } from "../data/lists/game_names.static";
import { ProgramNames } from "../data/lists/program_names.static";
import { VoiceChannelPrtl } from "../types/classes/VoiceChannelPrtl.class";
import { LocaleEnum } from "../data/enums/Locales.enum";

function status_aliases(
	activities: Activity[], locale: number
): string[] {
	const new_status: string[] = [];

	activities.forEach(activity => {
		let found = false;

		if (activity.name.toLowerCase() === 'custom status') {
			found = true;
		}

		if (!found) {
			for (let l = 0; l < GameNames.game_attributes.length; l++) {
				if (activity.name.trim() == GameNames.game_attributes[l].status) {
					if (locale === LocaleEnum.gr) {
						new_status.push(GameNames.game_attributes[l].locale.gr);
					}
					else if (locale === LocaleEnum.de) {
						new_status.push(GameNames.game_attributes[l].locale.de);
					}
					else {
						new_status.push(GameNames.game_attributes[l].locale.en);
					}

					found = true;
				}
			}
		}

		if (!found) {
			for (let l = 0; l < ProgramNames.program_attributes.length; l++) {
				if (activity.name.trim() == ProgramNames.program_attributes[l].status) {
					if (locale === LocaleEnum.gr) {
						new_status.push(ProgramNames.program_attributes[l].locale.gr);
					}
					else if (locale === LocaleEnum.de) {
						new_status.push(ProgramNames.program_attributes[l].locale.de);
					}
					else {
						new_status.push(ProgramNames.program_attributes[l].locale.en);
					}

					found = true;
				}
			}
		}

		if (!found) {
			new_status.push(activity.name);
		}
	});

	return new_status;
}

export function get_status_list(
	voice_channel: VoiceChannel, voice_object: VoiceChannelPrtl
): string[] {
	const array_of_statuses: string[] = [];

	voice_channel.members.forEach((member: GuildMember) => {
		if (!member.user.bot) {
			if (member.presence?.activities !== undefined) {
				if (member.presence.activities.length > 0) {
					status_aliases(member.presence.activities, voice_object.locale)
						.forEach(stat => {
							if (!array_of_statuses.includes(stat)) {
								array_of_statuses.push(stat);
							}
						});
				}
			}
		}
	});

	if (array_of_statuses.length === 0) {
		if (voice_object.locale === LocaleEnum.gr) {
			array_of_statuses.push('Άραγμα');
		}
		else if (voice_object.locale === LocaleEnum.de) {
			array_of_statuses.push('Chillen');
		}
		else {
			array_of_statuses.push('Chilling');
		}
	}

	return array_of_statuses;
}
