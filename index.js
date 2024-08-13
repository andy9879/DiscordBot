import { REST, Routes } from "discord.js";
import { Client, GatewayIntentBits } from "discord.js";
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

		const resource = createAudioResource("./audiofile.mp3");

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

client.login(TOKEN);
