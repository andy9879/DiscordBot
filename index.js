import { REST, Routes } from "discord.js";
import {
	Client,
	GatewayIntentBits,
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from "discord.js";
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
		if (this.links.length > 0) {
			const stream = await ytstream.stream(this.links.shift(), {
				quality: "high",
				type: "audio",
				highWaterMark: 1048576 * 32,
				download: true,
			});
			const resource = createAudioResource(stream.stream);
			this.connection.subscribe(this.player);
			this.player.play(resource);
		} else {
			this.connection.destroy();
			guildQueueMap[this.guildId] = undefined;
		}
	}

	constructor(links, interaction) {
		(async () => {
			this.guildId = interaction.guild.id;
			this.connection = joinVoiceChannel({
				channelId: interaction.member.voice.channel.id,
				guildId: interaction.guild.id,
				adapterCreator: interaction.guild.voiceAdapterCreator,
			});

			this.links = links;
			this.player = createAudioPlayer();

			this.playNext();

			this.connection.on(
				VoiceConnectionStatus.Disconnected,
				(oldState, newState) => {
					this.connection.destroy();
					guildQueueMap[this.guildId] = undefined;
				}
			);
		})();
	}
}

let guildQueueMap = {};

let TOKEN = process.env.TOKEN; // Make sure to set this in your .env file

const commands = [
	new SlashCommandBuilder()
		.setName("play")
		.setDescription("Plays song from youtube query")
		.addStringOption((option) =>
			option.setName("query").setDescription("Search Query")
		),
	{
		name: "pause",
		description: "pause music",
	},
	{
		name: "resume",
		description: "resumes music",
	},
	{
		name: "stop",
		description: "stops music",
	},
	{
		name: "skip",
		description: "skips song",
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

	if (interaction.commandName === "resume") {
		guildQueueMap[interaction.guild.id].player.unpause();
		interaction.reply("resuming song");
	}

	if (interaction.commandName === "stop") {
		guildQueueMap[interaction.guild.id].connection.destroy();
		guildQueueMap[interaction.guild.id] = undefined;
		interaction.reply("Stopping Song");
	}

	if (interaction.commandName === "pause") {
		guildQueueMap[interaction.guild.id].player.pause();
		interaction.reply("pausing song");
	}

	if (interaction.commandName === "skip") {
		if (guildQueueMap[interaction.guild.id] === undefined) {
			interaction.reply("No Song Playing");
		} else {
			guildQueueMap[interaction.guild.id].playNext();
			interaction.reply("Skipping Song");
		}
	}

	if (interaction.commandName === "link") {
		let link = interaction.options._hoistedOptions[0].value;
		addOrPlaySong(link, interaction);
	}

	if (interaction.commandName === "play") {
		let searchQuery = interaction.options._hoistedOptions[0].value;
		const results = await ytstream.search(searchQuery);

		let resultsText = "";

		for (let i = 0; i < 4; i++) {
			resultsText += `${i + 1} : ${results[i].title}\n Author : ${
				results[i].author
			}\n\n`;
		}

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId("play-0")
				.setStyle(ButtonStyle.Primary)
				.setLabel("1"),
			new ButtonBuilder()
				.setCustomId("play-1")
				.setStyle(ButtonStyle.Primary)
				.setLabel("2"),
			new ButtonBuilder()
				.setCustomId("play-2")
				.setStyle(ButtonStyle.Primary)
				.setLabel("3"),
			new ButtonBuilder()
				.setCustomId("play-3")
				.setStyle(ButtonStyle.Primary)
				.setLabel("4")
		);

		const response = await interaction.reply({
			content: resultsText,
			components: [row],
		});

		const collectorFilter = (i) => i.user.id === interaction.user.id;

		try {
			const confirmation = await response.awaitMessageComponent({
				filter: collectorFilter,
				time: 60_000,
			});
			let playNumber = parseInt(confirmation.customId.replace("play-", ""));

			addOrPlaySong(results[playNumber].url, confirmation);
		} catch (e) {
			await interaction.editReply({
				content: " not received within 1 minute, cancelling",
				components: [],
			});
		}
	}
});

client.login(TOKEN);
