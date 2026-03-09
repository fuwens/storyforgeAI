.PHONY: dev build start db-push db-studio lint

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

db-push:
	DATABASE_URL="postgresql://postgres:123456@localhost:5432/storyforge" npx prisma db push

db-studio:
	DATABASE_URL="postgresql://postgres:123456@localhost:5432/storyforge" npx prisma studio

lint:
	npm run lint

setup:
	@echo "1. 确保 base-server-conf 的 Docker 容器在跑 (make run)"
	@echo "2. 创建数据库: docker exec local_postgres psql -U postgres -c 'CREATE DATABASE storyforge'"
	@echo "3. 复制 .env.example 为 .env.local 并修改 TOAPIS_KEY"
	@echo "4. npm install"
	@echo "5. make db-push"
	@echo "6. make dev"
