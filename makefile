IMAGE_NAME = my-project # docker image name

run:
	docker run -it --rm -v $(PWD):/app -w /app $(IMAGE_NAME) python -m app.main

build:
	docker build -f docker/Dockerfile -t $(IMAGE_NAME) .

rebuild: build run