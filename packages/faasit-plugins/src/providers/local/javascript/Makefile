FAASIT_HOME := $(HOME)/faasit
FAASIT_RUNTIME := $(FAASIT_HOME)/packages/faasit-runtime/javascript

all: build-docker

install:
	cd nodejs14 && npm install

build-docker: build-faasit-runtime
	docker build -t nodejs-runtime .

build-faasit-runtime: 
	cp -r $(FAASIT_RUNTIME) $(CURDIR)
	rm -rf faasit-runtime && mv javascript faasit-runtime
	cd faasit-runtime && rm package-lock.json && npm install --node-bin-links . && pnpm build

