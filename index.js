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
import ytstream from "./YT-Stream/index.js";
import { channel } from "node:diagnostics_channel";

// Load environment variables from a .env file
dotenv.config();

class queueList {
	links = [];

	async playNext() {
		if (this.links.length > 0) {
			try {
				const stream = await ytstream.stream(this.links.shift(), {
					quality: "high",
					type: "audio",
					highWaterMark: 1048576 * 32,
					download: true,
				});
				const resource = createAudioResource(stream.stream);
				this.connection.subscribe(this.player);
				this.player.play(resource);
			} catch {
				console.log("Invalid Url");
				const channel = await client.channels.fetch(this.channelId);
				channel.send("🖕");
				this.playNext();
			}
		} else {
			this.destroy();
		}
	}

	destroy() {
		this.connection.destroy();
		guildQueueMap[this.guildId] = undefined;
	}

	constructor(links, interaction) {
		(async () => {
			this.channelId = interaction.channel.id;

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
					this.destroy();
				}
			);

			this.player.on(AudioPlayerStatus.Idle, (oldState, newState) => {
				if (this.links.length > 0) {
					this.playNext();
				} else {
					this.destroy();
				}
			});
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
	new SlashCommandBuilder()
		.setName("playlist")
		.setDescription("Plays songs from youtube playlist")
		.addStringOption((option) =>
			option.setName("link").setDescription("link to youtube playlist")
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
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages,
	],
});

async function addOrPlaySong(link, interaction, reply = true) {
	let guildId = interaction.guild.id;
	if (guildQueueMap[guildId] === undefined) {
		guildQueueMap[guildId] = new queueList([link], interaction);
		if (reply) interaction.reply("Playing Song");
	} else {
		guildQueueMap[guildId].links.push(link);
		if (reply) interaction.reply("Added to queue");
	}

	console.log("Playing Audio");
}

client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}!`);

	client.on("message", (message) => {});
});
// ...
client.on("messageCreate", async (msg) => {
	if (
		msg.author.globalName == "theycallmekyle" &&
		Math.floor(Math.random() * 100) == 1
	) {
		msg.react("🏳️‍🌈");
	}
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;

	if (interaction.commandName === "resume") {
		let queue = guildQueueMap[interaction.guild.id];
		queue != undefined
			? queue.player.unpause()
			: client.channels
					.fetch(interaction.channel.id)
					.then((channel) => channel.send("🖕🏽"));
		interaction.reply("resuming song");
	}

	if (interaction.commandName === "stop") {
		let queue = guildQueueMap[interaction.guild.id];
		queue != undefined
			? queue.destroy()
			: client.channels
					.fetch(interaction.channel.id)
					.then((channel) => channel.send("🖕🏽"));
		interaction.reply("Stopping Song");
	}

	if (interaction.commandName === "pause") {
		let queue = guildQueueMap[interaction.guild.id];
		queue != undefined
			? queue.player.pause()
			: client.channels
					.fetch(interaction.channel.id)
					.then((channel) => channel.send("🖕🏽"));
		interaction.reply("pausing song");
	}

	if (interaction.commandName === "skip") {
		let queue = guildQueueMap[interaction.guild.id];
		queue != undefined
			? queue.player.playNext()
			: client.channels
					.fetch(interaction.channel.id)
					.then((channel) => channel.send("🖕🏽"));
		interaction.reply("Skipping Song");
	}

	if (interaction.commandName === "link") {
		if (interaction.options._hoistedOptions[0] == undefined) {
			interaction.reply("🖕🏼");
			return;
		}
		let link = interaction.options._hoistedOptions[0].value;
		addOrPlaySong(link, interaction);
	}

	if (interaction.commandName === "play") {
		if (interaction.options._hoistedOptions[0] == undefined) {
			interaction.reply("🖕🏼");
			return;
		}
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

	if (interaction.commandName === "playlist") {
		if (interaction.options._hoistedOptions[0] == undefined) {
			interaction.reply("🖕🏼");
			return;
		}
		let url = interaction.options._hoistedOptions[0].value;
		try {
			let info = await ytstream.getPlaylist(url);
			let resultsText = `${info.title}\nAuthor : ${info.author}\nNumber Of Songs : ${info.videos.length}`;

			const row = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId("play")
					.setStyle(ButtonStyle.Primary)
					.setLabel("Play"),
				new ButtonBuilder()
					.setCustomId("shuffle")
					.setStyle(ButtonStyle.Primary)
					.setLabel("Shuffle")
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
				if (confirmation.customId == "play") {
					info.videos.forEach((song) => {
						addOrPlaySong(song.video_url, confirmation, false);
					});
					confirmation.reply("added Songs");
				} else {
					for (let i = info.videos.length - 1; i > 0; i--) {
						let j = Math.floor(Math.random() * (i + 1));
						let temp = info.videos[i];
						info.videos[i] = info.videos[j];
						info.videos[j] = temp;
					}

					info.videos.forEach((song) => {
						addOrPlaySong(song.video_url, confirmation, false);
					});
					confirmation.reply("Added and shuffled Songs");
				}
			} catch (e) {
				await interaction.editReply({
					content: " not received within 1 minute, cancelling",
					components: [],
				});
			}
		} catch {
			console.log("Invalid Playlist");
			interaction.reply("🖕🏿");
		}
	}
});

client.login(TOKEN);
