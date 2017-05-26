[![Github All Releases](https://img.shields.io/github/downloads/hexcodech/booki/total.svg)]()
[![Docker Stars](https://img.shields.io/docker/stars/hexcodech/booki.svg)]()
[![Docker Pulls](https://img.shields.io/docker/pulls/hexcodech/booki.svg)]()
[![Docker Automated build](https://img.shields.io/docker/automated/hexcodech/booki.svg)]()
[![Docker Build Status](https://img.shields.io/docker/build/hexcodech/booki.svg)]()

# Booki

## Setup
1. Download the appropriate `docker-compose.yml` file
2. Run `docker-compose pull` to download the latest image
3. Run `docker swarm init` to make it a master node or `docker swarm join` to join a swarm
4. Run `docker stack deploy -c docker-compose.yml booki` to run the service
