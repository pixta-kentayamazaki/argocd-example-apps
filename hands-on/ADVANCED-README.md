# 高度なKubernetesハンズオン

## Kustomizeを使った環境別管理

### 開発環境デプロイ
```bash
kubectl apply -k kustomize/overlays/dev
```

### 本番環境デプロイ（3レプリカ）
```bash
kubectl apply -k kustomize/overlays/prod
```

### 設定確認
```bash
kubectl kustomize kustomize/overlays/dev
kubectl kustomize kustomize/overlays/prod
```

## Helmを使ったパッケージ管理

### インストール
```bash
helm install nginx-helm ./nginx-chart
```

### アップグレード
```bash
helm upgrade nginx-helm ./nginx-chart --set replicaCount=3
```

### 削除
```bash
helm uninstall nginx-helm
```

### 値の確認
```bash
helm get values nginx-helm
```

## 比較

| 方法 | 特徴 | 用途 |
|------|------|------|
| **生YAML** | シンプル | 学習・小規模 |
| **Kustomize** | 環境別カスタマイズ | 企業環境 |
| **Helm** | テンプレート・パッケージ管理 | 複雑なアプリ |

## クリーンアップ
```bash
kubectl delete -k kustomize/overlays/dev
helm uninstall nginx-helm
```