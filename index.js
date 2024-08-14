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

class queueList {
	links = [];

	async playNext() {
		const stream = await ytstream.stream(this.links.shift(), {
			quality: "high",
			type: "audio",
			highWaterMark: 1048576 * 32,
			download: true,
		});
		const resource = createAudioResource(stream.stream);
		this.connection.subscribe(this.player);
		this.player.play(resource);

		this.player.on(AudioPlayerStatus.Idle, (oldState, newState) => {
			if (this.links.length > 0) {
				this.playNext();
			} else {
				this.connection.destroy();
			}
		});
	}

	constructor(links, interaction) {
		(async () => {
			this.connection = joinVoiceChannel({
				channelId: interaction.member.voice.channel.id,
				guildId: interaction.guild.id,
				adapterCreator: interaction.guild.voiceAdapterCreator,
			});

			this.links = links;
			this.player = createAudioPlayer();

			this.connection.on("stateChange", (oldState, newState) => {
				console.log(
					`Connection transitioned from ${oldState.status} to ${newState.status}`
				);
			});

			this.player.on("stateChange", (oldState, newState) => {
				console.log(
					`Audio player transitioned from ${oldState.status} to ${newState.status}`
				);
			});

			this.playNext();
		})();
	}
}

let guildQueueMap = {};

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
	{
		name: "pause",
		description: "pause music",
	},
	{
		name: "resume",
		description: "resumes music",
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

async function addOrPlaySong(link, interaction) {
	let guildId = interaction.guild.id;
	if (guildQueueMap[guildId] === undefined) {
		guildQueueMap[guildId] = new queueList([link], interaction);
		await interaction.reply("Playing Song");
	} else {
		guildQueueMap[guildId].links.push(link);
		await interaction.reply("Added to queue");
	}

	console.log("Playing Audio");
}

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
		let link = interaction.options._hoistedOptions[0].value;
		addOrPlaySong(link, interaction);
	}
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;

	if (interaction.commandName === "pause") {
		guildQueueMap[interaction.guild.id].player.pause();
	}
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;

	if (interaction.commandName === "resume") {
		guildQueueMap[interaction.guild.id].player.unpause();
	}
});

client.login(TOKEN);
