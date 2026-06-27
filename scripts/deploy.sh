#!/usr/bin/env bash
# 按依赖顺序将 k8s 清单应用到集群
set -euo pipefail

cd "$(dirname "$0")/.."

K8S_DIR="./k8s"
NAMESPACE="mall"

echo "==> 创建命名空间"
kubectl apply -f "${K8S_DIR}/namespace.yaml"

if [[ -f "${K8S_DIR}/secret.yaml" ]]; then
  echo "==> 应用 Secret"
  kubectl apply -f "${K8S_DIR}/secret.yaml"
else
  echo "!! 未找到 ${K8S_DIR}/secret.yaml"
  echo "!! 请先复制 secret.yaml.template 为 secret.yaml 并填入真实的数据库密码/JWT密钥/邮箱SMTP账号，"
  echo "!! 或者改用 kubectl create secret 命令式创建（见模板文件顶部注释）。"
  exit 1
fi

echo "==> 应用 ConfigMap"
kubectl apply -f "${K8S_DIR}/configmap.yaml"

echo "==> 部署 MySQL / Redis / MinIO"
kubectl apply -f "${K8S_DIR}/mysql-deploy.yaml"
kubectl apply -f "${K8S_DIR}/redis-deploy.yaml"
kubectl apply -f "${K8S_DIR}/minio-deploy.yaml"

echo "==> 等待 MySQL / Redis / MinIO 就绪"
kubectl rollout status deployment/mysql -n "${NAMESPACE}" --timeout=180s
kubectl rollout status deployment/redis -n "${NAMESPACE}" --timeout=120s
kubectl rollout status deployment/minio -n "${NAMESPACE}" --timeout=120s

echo "==> 初始化数据库表结构"
MYSQL_POD=$(kubectl get pod -n "${NAMESPACE}" -l app=mysql -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n "${NAMESPACE}" "${MYSQL_POD}" -i -- \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' < ./sql/init.sql

echo "==> 部署后端 / 前端"
kubectl apply -f "${K8S_DIR}/backend-deploy.yaml"
kubectl apply -f "${K8S_DIR}/frontend-deploy.yaml"

kubectl rollout status deployment/backend -n "${NAMESPACE}" --timeout=180s
kubectl rollout status deployment/frontend -n "${NAMESPACE}" --timeout=120s

echo "==> 应用 HPA / NetworkPolicy"
kubectl apply -f "${K8S_DIR}/hpa.yaml"
kubectl apply -f "${K8S_DIR}/networkpolicy.yaml"

echo "==> 应用网关路由（需已安装 APISIX + Ingress Controller）"
kubectl apply -f "${K8S_DIR}/gateway.yaml" || echo "!! 网关相关 CRD 未安装，跳过 gateway.yaml"

echo "==> 应用证书（需已安装 cert-manager）"
kubectl apply -f "${K8S_DIR}/certificate.yaml" || echo "!! cert-manager CRD 未安装，跳过 certificate.yaml"

echo "==> 部署完成"
kubectl get pods -n "${NAMESPACE}"
