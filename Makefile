.PHONY: setup pull-latest down logs

setup:
	cp -n .env.example .env
	docker compose up --build

pull-latest:
	git pull origin testing
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f
