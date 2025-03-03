const { SlashCommandBuilder, SlashCommandSubcommandBuilder, ChatInputCommandInteraction, EmbedBuilder, VoiceState, Snowflake, VoiceChannel } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

/**
 *
 * @param guild
 * @param {Snowflake} userId
 * @returns {VoiceChannel | null}
 */
function getVc(guild, userId) {
	return guild.channels.cache.find(channel => (channel.type === 2 && channel.members.has(userId)));
}

/**
 * @param {ChatInputCommandInteraction} interaction
 */
async function joinVc(interaction) {
	if (interaction.guild.channels.cache.some(channel => (channel.type === 2 && channel.members.has(interaction.client.user.id)))) {
		return interaction.reply({
			ephemeral: true,
			embeds: [
				new EmbedBuilder()
					.setTitle('Error')
					.setColor('Red')
					.setDescription('The bot is already in a voice channel.  Please use `/vc leave` or join the bot\'s VC.')
			]
		});
	}

	let userVc = getVc(interaction.guild, interaction.user.id);
	if (!userVc) {
		return interaction.reply({
			ephemeral: true,
			embeds: [
				new EmbedBuilder()
					.setTitle('Error')
					.setColor('Red')
					.setDescription('You need to be in a VC to use this command.')
			]
		});
	}

	await interaction.deferReply({});
	const connection = joinVoiceChannel({
		channelId: userVc.id,
		guildId: interaction.guildId,
		adapterCreator: interaction.guild.voiceAdapterCreator
	});
	await interaction.editReply({
		embeds: [
			new EmbedBuilder()
				.setTitle('Success')
				.setColor('Green')
				.setDescription('Successfully joined the voice channel.')
		]
	});

}

/**
 * @param {VoiceState} oldState
 * @param {VoiceState} newState
 */
async function onVoiceStateUpdate(oldState, newState) {
	console.log(oldState);
	console.log(newState);
	const botVc = getVc(newState.guild, newState.client.user.id);
	if (!botVc) {
		// If the bot isn't in a VC, and someone joins the music VC, auto join
		if (newState.channelId && newState.channelId === process.env.MUSIC_CHANNEL_ID) {
			const connection = joinVoiceChannel({
				channelId: newState.channelId,
				guildId: newState.guild.id,
				adapterCreator: newState.guild.voiceAdapterCreator
			});
		}
		return;
	}

	// If everyone else has left the VC, leave.
	if (botVc.members.size === 1) {
		await (await newState.guild.members.fetchMe()).voice.disconnect();
		return;
	}
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('music')
		.setDescription('Manages the music functionality of the bot.')
		.addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName('join')
				.setDescription('Makes the bot join the VC you\'re currently in.')
		),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	async execute(interaction) {
		if (interaction.options.getSubcommand() === 'join') {
			await joinVc(interaction);
		}
	},
	onVoiceStateUpdate: onVoiceStateUpdate
};
