const { SlashCommandBuilder, SlashCommandSubcommandBuilder, ChatInputCommandInteraction, EmbedBuilder, VoiceState, Snowflake, VoiceChannel } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource} = require('@discordjs/voice');
const ytdl = require("ytdl-core");

/**
 * Gets the VC that the user is in
 * @param guild
 * @param {Snowflake} userId
 * @returns {VoiceChannel | null}
 */
function getVc(guild, userId) {
	return guild.channels.cache.find(channel => (channel.type === 2 && channel.members.has(userId)));
}

function _joinVc(client, guild, channelId) {
	client.musicPlayer = createAudioPlayer();
	client.musicConnection = joinVoiceChannel({
		channelId: channelId,
		guildId: guild.id,
		adapterCreator: guild.voiceAdapterCreator
	});
	client.musicConnection.subscribe(client.musicPlayer);
}

/**
 * @param {ChatInputCommandInteraction} interaction
 */
async function joinVc(interaction) {
	if (getVc(interaction.guild, interaction.client.user.id)) {
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
	_joinVc(interaction.client, interaction.guild, userVc.id);
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
 * @param {ChatInputCommandInteraction} interaction
 */
function playMusic(interaction) {
	const vc = getVc(interaction.guild, interaction.user.id);
	if (!vc) {
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

	const botVc = getVc(interaction.guild, interaction.client.user.id);
	if (vc !== botVc) {
		return interaction.reply({
			ephemeral: true,
			embeds: [
				new EmbedBuilder()
					.setTitle('Error')
					.setColor('Red')
					.setDescription('You must be in the same VC as the bot to use this command.  Use `/music join` to make the bot join your current VC.')
			]
		});
	}

	const stream = ytdl("https://www.youtube.com/watch?v=liTfD88dbCo", { filter: 'audioonly' });
	interaction.client.musicPlayer.play(createAudioResource(stream));
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
			_joinVc(newState.client, newState.guild, newState.channelId);
		}
		return;
	}

	// If everyone else has left the VC, leave.
	if (botVc.members.size === 1) {
		await (await newState.guild.members.fetchMe()).voice.disconnect();
		newState.client.musicConnection = null;  // Let the garbage collector remove the music connection
		newState.client.musicPlayer?.stop();
		newState.client.musicPlayer = null;  // Let the garbage collector remove the music player
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
		).addSubcommand(
			new SlashCommandSubcommandBuilder()
				.setName('play')
				.setDescription('Starts the music bot.')
		),
	/**
	 * @param {ChatInputCommandInteraction} interaction
	 */
	async execute(interaction) {
		switch (interaction.options.getSubcommand()) {
			case 'join': return joinVc(interaction);
			case 'play': return playMusic(interaction);
		}
	},
	onVoiceStateUpdate: onVoiceStateUpdate
};
