# Kubernetes基本リソース ハンズオン

## 実行手順

### 1. Pod（単体）
```bash
# Podを作成
kubectl apply -f 01-pod.yaml

# Pod確認
kubectl get pods
kubectl describe pod nginx-pod

# Pod削除
kubectl delete -f 01-pod.yaml
```

### 2. Service（Pod用）
```bash
# PodとServiceを作成
kubectl apply -f 01-pod.yaml
kubectl apply -f 02-service.yaml

# Service確認
kubectl get services
kubectl describe service nginx-service

# 削除
kubectl delete -f 02-service.yaml
kubectl delete -f 01-pod.yaml
```

### 3. Deployment（複数Pod管理）
```bash
# Deploymentを作成
kubectl apply -f 03-deployment.yaml

# Deployment確認
kubectl get deployments
kubectl get pods
kubectl describe deployment nginx-deployment

# 削除
kubectl delete -f 03-deployment.yaml
```

### 4. Deployment + Service
```bash
# DeploymentとServiceを作成
kubectl apply -f 03-deployment.yaml
kubectl apply -f 04-deployment-service.yaml

# 確認
kubectl get all

# 削除
kubectl delete -f 04-deployment-service.yaml
kubectl delete -f 03-deployment.yaml
```

## 重要なポイント
- **Pod**: 最小のデプロイ単位
- **Service**: ネットワークアクセスの提供
- **Deployment**: Pod数の管理とローリングアップデート
- **ラベルセレクター**: ServiceとPodを紐付ける仕組み