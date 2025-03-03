const { SlashCommandBuilder, SlashCommandSubcommandBuilder, ChatInputCommandInteraction, EmbedBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');

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

	let userVc = interaction.guild.channels.cache.find(channel => (channel.type === 2 && channel.members.has(interaction.user.id)));
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
		adapterCreator: interaction.guild.voiceAdapterCreator // Should be referring to the correct client
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
};
