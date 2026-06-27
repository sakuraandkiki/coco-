#!/usr/bin/env bash
# 构建前后端镜像并推送到镜像仓库
set -euo pipefail

cd "$(dirname "$0")/.."

REGISTRY="${REGISTRY:-registry.local/mall}"
TAG="${TAG:-latest}"

echo "==> 构建后端镜像 ${REGISTRY}/backend:${TAG}"
docker build -t "${REGISTRY}/backend:${TAG}" ./backend

echo "==> 构建前端镜像 ${REGISTRY}/frontend:${TAG}"
docker build -t "${REGISTRY}/frontend:${TAG}" ./frontend

if [[ "${PUSH:-false}" == "true" ]]; then
  echo "==> 推送镜像到 ${REGISTRY}"
  docker push "${REGISTRY}/backend:${TAG}"
  docker push "${REGISTRY}/frontend:${TAG}"
else
  echo "==> 跳过推送（设置 PUSH=true 以推送镜像）"
fi

echo "==> 构建完成"
