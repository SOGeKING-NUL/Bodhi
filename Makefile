.PHONY: run cli dev

run:
	cd backend && uvicorn src.api.app:app --reload --host 0.0.0.0 --port 8000

cli:
	cd backend && python -m src.main

dev:
	cd client && npm run dev
