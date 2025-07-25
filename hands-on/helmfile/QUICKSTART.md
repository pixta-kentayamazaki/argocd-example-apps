# Helmfile クイックスタート（ローカル環境）

## 5分で始めるHelmfile

### 1. 環境確認

```bash
# Kubernetes接続確認
kubectl cluster-info

# Helm確認
helm version

# Helmfile確認
helmfile --version
```

### 2. ネームスペース作成

```bash
kubectl create namespace dev
```

### 3. デプロイ実行

```bash
cd hands-on/helmfile
helmfile -f helmfile.yaml --environment dev apply
```

### 4. 動作確認

```bash
# Pod確認
kubectl get pods -n dev

# サービス確認
kubectl get svc -n dev
```

### 5. アプリケーションアクセス

**minikubeの場合:**
```bash
minikube service guestbook-helm-guestbook -n dev
```

**Docker Desktopの場合:**
```bash
kubectl port-forward -n dev svc/guestbook-helm-guestbook 8080:80
# ブラウザで http://localhost:8080 にアクセス
```

### 6. クリーンアップ

```bash
helmfile -f helmfile.yaml --environment dev destroy
kubectl delete namespace dev
```

## よく使うコマンド

```bash
# 差分確認
helmfile -f helmfile.yaml --environment dev diff

# テンプレート確認
helmfile -f helmfile.yaml --environment dev template

# 特定のリリースのみデプロイ
helmfile -f helmfile.yaml --environment dev --selector name=guestbook apply
```