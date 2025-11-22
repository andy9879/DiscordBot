# DiscordBot

A simple discord music bot

## Set Your Discord Token in .env

<br>
example of .env

```
TOKEN=12345678

```

## Docker Commands

`docker build -t discord-bot:latest .`

`docker run -it --rm --mount type=bind,src=$(pwd),dst=/app/ discord-bot:latest`
