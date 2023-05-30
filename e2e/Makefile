LIB = ./scripts/lib.sh

help:
	echo help

init-kind-k8s-cluster:
	kind create cluster --config k8s/kind/node1-1.21.yaml --name faasit-e2e

deploy-infra:
	kubectl apply -f manifests/global-cm.yaml
	helm upgrade --install traefik ./manifests/infra-traefik -n faasit-system --create-namespace

deploy-openwhisk:
	helm upgrade --install owdev ./manifests/infra-openwhisk -n openwhisk --create-namespace \
		--post-renderer ./manifests/patches/openwhisk/kustomize

update-traefik:
	helm upgrade --install traefik ./manifests/infra-traefik -n faasit-system --create-namespace
	kubectl delete pod -l app.kubernetes.io/name=traefik -n faasit-system

openfaas-login:
	kubectl get secret -n openfaas basic-auth -o jsonpath="{.data.basic-auth-password}" | base64 --decode | faas-cli -g https://openfaas-ft.i2ec.top login --username admin --password-stdin

CONTAINER_ID=$(shell ./scripts/lib.sh get_container_id faasit-e2e)
cp-kind-scripts:
	@docker cp scripts/set-iptables.sh ${CONTAINER_ID}:/set-iptabls.sh

APP=
APPS ?= ${APP}

helm-update-deps:
	@for app in $(APPS); do \
		helm dependency update manifests/$$app ; \
	done
