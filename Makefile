COMPOSE_FILE := docker-compose.yml

all: up

up:
	docker compose -f $(COMPOSE_FILE) up -d --build

down:
	docker compose -f $(COMPOSE_FILE) down

clean:
	docker compose -f $(COMPOSE_FILE) down --volumes --rmi all

fclean: clean
	docker system prune --all --force --volumes

re: down up


.PHONY: all up down re clean fclean