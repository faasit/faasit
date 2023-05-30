# Intro

E2E K8s Cluster for faasit

It will deploy some serverless platform on kubernetes cluster.

## Use case

1. Create K8s cluster using kind

   ```sh
   make init-kind-k8s-cluster
   ```

   It will create a cluster named faasit-e2e

   It will create 2 ports mapping from the host to the cluster internal.

   - 30082:30082: for faasit ingress gateway (like traefik)
   - 36082:6443: exposed k8s api server

   So the ingress controller should listen to the port 30082.

2. Deploy infra

   ```sh
   make deploy-infra
   ```

   It will deploy some infra components to the cluster.

   - ingress controller: traefik

3. Deploy Openwhisk

   安装 Helm 与 Kustomize

   ```sh
   make deploy-openwhisk
   ```
