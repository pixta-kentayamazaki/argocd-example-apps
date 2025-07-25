# Helmfile ハンズオン

このディレクトリには、Helmfileを使用して複数のHelmチャートを管理するためのサンプルが含まれています。

## 前提条件

- **minikube** または **Docker Desktop** (Kubernetesを有効化)
- [Helm](https://helm.sh/docs/intro/install/) (v3.0.0以上)
- [Helmfile](https://github.com/helmfile/helmfile#installation) (最新版)

## 環境セットアップ

### minikube の場合

```bash
# minikube開始
minikube start

# kubectl contextの確認
kubectl config current-context
```

### Docker Desktop の場合

```bash
# Docker DesktopでKubernetesを有効化
# Settings > Kubernetes > Enable Kubernetes

# kubectl contextの確認
kubectl config current-context
```

## ディレクトリ構造

```
helmfile/
├── charts/
│   └── redis/           # シンプルなRedisチャート
├── environments/        # 環境別設定
│   ├── dev/
│   ├── staging/
│   └── prod/
├── helmfile.yaml        # メインのHelmfile設定
└── values.yaml          # 共通の値
```

## 使用方法

### 1. ネームスペース作成

```bash
# 環境別ネームスペース作成
kubectl create namespace dev
kubectl create namespace staging
kubectl create namespace prod
```

### 2. 環境の一覧表示

```bash
helmfile -f helmfile.yaml list --environment dev
```

### 3. 開発環境へのデプロイ

```bash
helmfile -f helmfile.yaml --environment dev apply
```

### 4. アプリケーションの確認

```bash
# Podの状態確認
kubectl get pods -n dev

# サービスの確認
kubectl get svc -n dev

# minikubeの場合のアクセス
minikube service guestbook-helm-guestbook -n dev

# Docker Desktopの場合のポートフォワード
kubectl port-forward -n dev svc/guestbook-helm-guestbook 8080:80
```

### ステージング環境へのデプロイ

```bash
helmfile -f helmfile.yaml --environment staging apply
```

### 本番環境へのデプロイ

```bash
helmfile -f helmfile.yaml --environment prod apply
```

### 差分の確認

```bash
helmfile -f helmfile.yaml --environment dev diff
```

### テンプレートの確認

```bash
helmfile -f helmfile.yaml --environment dev template
```

### アンインストール

```bash
helmfile -f helmfile.yaml --environment dev destroy
```

## ローカル環境での注意点

### minikube
- LoadBalancerタイプのサービスは`minikube tunnel`が必要
- リソース制限に注意（CPU/メモリ）

### Docker Desktop
- LoadBalancerタイプは`localhost`でアクセス可能
- Windows/Macでのファイルパスに注意

## トラブルシューティング

### ポッドが起動しない場合

```bash
# ポッドの詳細情報
kubectl describe pod <pod-name> -n dev

# ログの確認
kubectl logs <pod-name> -n dev
```

### イメージのプルエラー

```bash
# minikubeの場合
minikube ssh docker pull <image-name>

# Docker Desktopの場合
docker pull <image-name>
```

## Helmfileの特徴

1. **複数環境の管理**
   - 開発、ステージング、本番など異なる環境ごとに設定を分離
   - 環境固有の値を簡単に上書き

2. **複数チャートの管理**
   - 複数のHelmチャートを1つのファイルで管理
   - チャート間の依存関係を定義可能

3. **テンプレート機能**
   - Go templatesを使用した柔軟な設定
   - 環境変数の利用

4. **差分確認**
   - 変更前に差分を確認可能

## ArgoCD との統合

HelmfileはArgoCDと組み合わせて使用することも可能です。ArgoCDのアプリケーションマニフェストでHelmfileを指定することで、
GitOpsワークフローの中でHelmfileを活用できます。

## 参考リンク

- [Helmfile公式ドキュメント](https://github.com/helmfile/helmfile)
- [Helm公式ドキュメント](https://helm.sh/docs/)
- [ArgoCD公式ドキュメント](https://argo-cd.readthedocs.io/)