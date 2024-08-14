import { REST, Routes } from "discord.js";
import { Client, GatewayIntentBits, SlashCommandBuilder } from "discord.js";
import dotenv from "dotenv";
import {
	joinVoiceChannel,
	getVoiceConnection,
	createAudioPlayer,
	VoiceConnectionStatus,
	AudioPlayerStatus,
} from "@discordjs/voice";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import { createAudioResource, StreamType } from "@discordjs/voice";
import ytstream from "yt-stream";

// Load environment variables from a .env file
dotenv.config();

let TOKEN = process.env.TOKEN; // Make sure to set this in your .env file

const commands = [
	{
		name: "ping",
		description: "Replies with Pong!",
	},
	{
		name: "play",
		description: "plays music",
	},
	new SlashCommandBuilder()
		.setName("link")
		.setDescription("Plays song from youtube link")
		.addStringOption((option) =>
			option.setName("link").setDescription("link to youtube")
		),
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
	try {
		console.log("Started refreshing application (/) commands.");

		await rest.put(Routes.applicationCommands("869940781853597787"), {
			body: commands,
		});

		console.log("Successfully reloaded application (/) commands.");
	} catch (error) {
		console.error("Error refreshing application commands:", error);
	}
})();

const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}!`);

	client.on("message", (message) => {});
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;

	if (interaction.commandName === "play") {
		let userId = interaction.user.id;

		joinVoiceChannel({
			channelId: interaction.member.voice.channel.id,
			guildId: interaction.guild.id,
			adapterCreator: interaction.guild.voiceAdapterCreator,
		});
		const stream = await ytstream.stream(
			`https://www.youtube.com/watch?v=dQw4w9WgXcQ`,
			{
				quality: "high",
				type: "audio",
				highWaterMark: 1048576 * 32,
				download: true,
			}
		);

		const resource = createAudioResource(stream.stream);

		const player = createAudioPlayer();

		const connection = getVoiceConnection(interaction.guild.id);

		connection.on("stateChange", (oldState, newState) => {
			console.log(
				`Connection transitioned from ${oldState.status} to ${newState.status}`
			);
		});

		player.on("stateChange", (oldState, newState) => {
			console.log(
				`Audio player transitioned from ${oldState.status} to ${newState.status}`
			);
		});

		connection.subscribe(player);

		player.play(resource);

		console.log(connection.state.status);

		console.log("Playing Audio");
	}
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;

	if (interaction.commandName === "ping") {
		await interaction.reply("Pong!");
	}
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;

	if (interaction.commandName === "link") {
		joinVoiceChannel({
			channelId: interaction.member.voice.channel.id,
			guildId: interaction.guild.id,
			adapterCreator: interaction.guild.voiceAdapterCreator,
		});
		const stream = await ytstream.stream(
			interaction.options._hoistedOptions[0].value,
			{
				quality: "high",
				type: "audio",
				highWaterMark: 1048576 * 32,
				download: true,
			}
		);

		const resource = createAudioResource(stream.stream);

		const player = createAudioPlayer();

		const connection = getVoiceConnection(interaction.guild.id);

		connection.subscribe(player);

		player.play(resource);

		console.log("Playing Audio");

		await interaction.reply("Playing Song");
	}
});

client.login(TOKEN);
