[![Github All Releases](https://img.shields.io/github/downloads/hexcodech/booki/total.svg)]()
[![Docker Stars](https://img.shields.io/docker/stars/hexcode/booki.svg)]()
[![Docker Pulls](https://img.shields.io/docker/pulls/hexcode/booki.svg)]()
[![Travis](https://img.shields.io/travis/hexcodech/booki.svg)]()

# Booki

## Setup
1. Download the appropriate `docker-compose.yml` files
2. Download the `config-sample.json`, edit it and save it in the working directory as `config.json`
3. (optional) For letsencrypt, add the folder `.well-known` to the working directory
4. Run `docker-compose -f docker-compose.yml [-f docker-compose-xyz.yml] up -d --no-deps --build <service_name>` to download the latest image and run it, also works for updates

#Migrations
1. Download the `migrations-config-sample.json`, edit it and save it in the working directory as `migrations-config.json`
2. Run `node_modules/.bin/sequelize db:migrate --config migrations-config.json --env <environment>`
