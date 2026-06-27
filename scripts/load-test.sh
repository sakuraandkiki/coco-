#!/usr/bin/env bash
# 对后端商品列表接口施压，验证 HPA 是否按 CPU 50% 阈值正常扩容
set -euo pipefail

NAMESPACE="mall"
TARGET_URL="${TARGET_URL:-http://localhost:8080/api/products}"
DURATION="${DURATION:-120s}"
CONCURRENCY="${CONCURRENCY:-50}"

echo "==> 压测目标: ${TARGET_URL}"
echo "==> 持续时间: ${DURATION}，并发: ${CONCURRENCY}"

if command -v hey >/dev/null 2>&1; then
  hey -z "${DURATION}" -c "${CONCURRENCY}" "${TARGET_URL}" &
  LOAD_PID=$!
else
  echo "!! 未安装 hey（https://github.com/rakyll/hey），改用简单的 curl 并发循环"
  END_TIME=$((SECONDS + ${DURATION%s}))
  while [[ ${SECONDS} -lt ${END_TIME} ]]; do
    for _ in $(seq 1 "${CONCURRENCY}"); do
      curl -s -o /dev/null "${TARGET_URL}" &
    done
    wait
  done &
  LOAD_PID=$!
fi

echo "==> 开始监控 HPA 状态（Ctrl+C 结束监控，压测进程会继续到设定时长）"
trap 'echo; echo "==> 监控已停止，压测进程 PID ${LOAD_PID} 仍在后台运行"; exit 0' INT

while kill -0 "${LOAD_PID}" 2>/dev/null; do
  kubectl get hpa -n "${NAMESPACE}"
  echo "---"
  sleep 10
done

echo "==> 压测结束，最终 HPA 状态："
kubectl get hpa -n "${NAMESPACE}"
kubectl get pods -n "${NAMESPACE}" -l app=backend
