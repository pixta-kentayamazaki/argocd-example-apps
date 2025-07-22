# Kubernetes基本リソース完全ハンズオン

## 目次
1. [基本概念の理解](#基本概念の理解)
2. [環境準備](#環境準備)
3. [ステップ1: Pod（最小単位）](#ステップ1-pod最小単位)
4. [ステップ2: Service（ネットワーク）](#ステップ2-serviceネットワーク)
5. [ステップ3: Deployment（Pod管理）](#ステップ3-deploymentpod管理)
6. [ステップ4: Kustomize（環境別管理）](#ステップ4-kustomize環境別管理)
7. [ステップ5: Helm（テンプレート管理）](#ステップ5-helmテンプレート管理)
8. [使い分けの判断基準](#使い分けの判断基準)

---

## 基本概念の理解

### Kubernetesの基本リソース

| リソース | 役割 | 例え |
|----------|------|------|
| **Pod** | 最小のデプロイ単位 | 1つのアプリケーション |
| **Service** | ネットワークアクセス | 電話番号（Podの住所が変わっても同じ番号でアクセス） |
| **Deployment** | Pod数の管理 | マネージャー（Podの数を監視・調整） |

### マニフェストの基本構造

```yaml
apiVersion: v1          # 使用するKubernetes APIのバージョン
kind: Pod              # リソースの種類
metadata:              # メタデータ（名前、ラベルなど）
  name: my-pod
  labels:
    app: nginx
spec:                  # リソースの仕様・設定
  containers:
  - name: nginx
    image: nginx:1.20
```

---

## 環境準備

### 前提条件
- Docker Desktop インストール済み
- minikube インストール済み
- kubectl インストール済み

### minikube起動

```bash
# minikubeクラスターを起動
minikube start

# クラスターの状態確認
kubectl get nodes
```

**期待する結果:**
```
NAME       STATUS   ROLES           AGE   VERSION
minikube   Ready    control-plane   1m    v1.33.1
```

---

## ステップ1: Pod（最小単位）

### 1.1 Podマニフェストの作成

**ファイル: `01-pod.yaml`**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
spec:
  containers:
  - name: nginx
    image: nginx:1.20
    ports:
    - containerPort: 80
```

### 1.2 Podのデプロイと確認

```bash
# Podを作成
kubectl apply -f 01-pod.yaml

# Pod一覧を確認
kubectl get pods

# Pod詳細を確認
kubectl describe pod nginx-pod
```

**期待する結果:**
```
NAME        READY   STATUS    RESTARTS   AGE
nginx-pod   1/1     Running   0          30s
```

### 1.3 重要なポイント

- **Pod = 1つ以上のコンテナのグループ**
- **IP アドレスが自動割り当て**（例: 10.244.0.46）
- **ラベル**（`app: nginx`）が後でServiceから参照される
- **単体では外部からアクセス不可**

---

## ステップ2: Service（ネットワーク）

### 2.1 Serviceマニフェストの作成

**ファイル: `02-service.yaml`**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx          # ラベルでPodを特定
  ports:
  - port: 80           # Serviceのポート
    targetPort: 80     # Podのポート
  type: ClusterIP      # クラスター内部からのみアクセス可能
```

### 2.2 Serviceのデプロイと確認

```bash
# Serviceを作成
kubectl apply -f 02-service.yaml

# Service一覧を確認
kubectl get services

# Service詳細を確認
kubectl describe service nginx-service
```

**期待する結果:**
```
NAME            TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)   AGE
nginx-service   ClusterIP   10.109.184.157   <none>        80/TCP    30s
```

### 2.3 アクセステスト

```bash
# 一時的なPodを作成してServiceにアクセス
kubectl run test-pod --image=curlimages/curl --rm -it --restart=Never -- curl nginx-service
```

**期待する結果:**
```html
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
...
```

### 2.4 重要なポイント

- **Service = Podへのネットワークアクセスを提供**
- **セレクター**（`app: nginx`）でPodを自動発見
- **ClusterIP**が割り当てられ、クラスター内から`nginx-service`でアクセス可能
- **Podが再起動してIPが変わってもServiceのIPは不変**

---

## ステップ3: Deployment（Pod管理）

### 3.1 既存リソースのクリーンアップ

```bash
# 単体のPodとServiceを削除
kubectl delete -f 02-service.yaml
kubectl delete -f 01-pod.yaml
```

### 3.2 Deploymentマニフェストの作成

**ファイル: `03-deployment.yaml`**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 2                    # Pod数を指定
  selector:
    matchLabels:
      app: nginx-deploy          # 管理対象Podのラベル
  template:                      # Podテンプレート
    metadata:
      labels:
        app: nginx-deploy        # Podに付けるラベル
    spec:
      containers:
      - name: nginx
        image: nginx:1.20
        ports:
        - containerPort: 80
```

### 3.3 Deployment用Serviceの作成

**ファイル: `04-deployment-service.yaml`**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-deploy-service
spec:
  selector:
    app: nginx-deploy           # Deploymentが作るPodのラベルと一致
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

### 3.4 デプロイと確認

```bash
# Deploymentを作成
kubectl apply -f 03-deployment.yaml

# Deployment、ReplicaSet、Podを確認
kubectl get deployments
kubectl get replicasets
kubectl get pods

# Serviceを作成
kubectl apply -f 04-deployment-service.yaml

# 全リソースを確認
kubectl get all
```

**期待する結果:**
```
NAME                                READY   STATUS    RESTARTS   AGE
pod/nginx-deployment-xxx-yyy        1/1     Running   0          1m
pod/nginx-deployment-xxx-zzz        1/1     Running   0          1m

NAME                           TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
service/nginx-deploy-service   ClusterIP   10.100.32.170   <none>        80/TCP    30s

NAME                               READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx-deployment   2/2     2            2           1m

NAME                                          DESIRED   CURRENT   READY   AGE
replicaset.apps/nginx-deployment-xxx          2         2         2       1m
```

### 3.5 重要なポイント

- **Deployment = Pod数の管理システム**
- **ReplicaSet**が中間管理層として自動作成される
- **2つのPod**が自動作成・管理される
- **1つのPodが停止しても、自動的に新しいPodが作成される**
- **ServiceはDeploymentとは独立したリソース**

### 3.6 実証: Deploymentの自動復旧機能

```bash
# Podを1つ削除してみる
kubectl delete pod $(kubectl get pods -l app=nginx-deploy -o jsonpath='{.items[0].metadata.name}')

# すぐにPod一覧を確認
kubectl get pods

# 数秒後に再確認（新しいPodが自動作成される）
kubectl get pods
```

---

## ステップ4: Kustomize（環境別管理）

### 4.1 問題設定

**課題:** 同じアプリケーションを環境別に異なる設定でデプロイしたい
- **開発環境**: レプリカ1個、名前に`dev-`プレフィックス
- **本番環境**: レプリカ3個、名前に`prod-`プレフィックス

### 4.2 ディレクトリ構造の作成

```bash
mkdir -p kustomize/{base,overlays/{dev,prod}}
```

**構造:**
```
kustomize/
├── base/                 # 共通の基本設定
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/            # 環境別の上書き設定
    ├── dev/
    │   └── kustomization.yaml
    └── prod/
        └── kustomization.yaml
```

### 4.3 ベース設定の作成

**ファイル: `kustomize/base/deployment.yaml`**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.20
        ports:
        - containerPort: 80
```

**ファイル: `kustomize/base/service.yaml`**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
```

**ファイル: `kustomize/base/kustomization.yaml`**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml
```

### 4.4 開発環境設定

**ファイル: `kustomize/overlays/dev/kustomization.yaml`**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base              # ベース設定を参照

namePrefix: dev-          # 全リソース名に"dev-"を追加

replicas:
- name: nginx-deployment  # レプリカ数を上書き
  count: 1
```

### 4.5 本番環境設定

**ファイル: `kustomize/overlays/prod/kustomization.yaml`**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base              # ベース設定を参照

namePrefix: prod-         # 全リソース名に"prod-"を追加

replicas:
- name: nginx-deployment  # レプリカ数を上書き
  count: 3
```

### 4.6 Kustomizeの動作確認

```bash
# 既存のDeploymentを削除
kubectl delete -f 04-deployment-service.yaml
kubectl delete -f 03-deployment.yaml

# 開発環境の設定内容を確認（実際にデプロイはしない）
kubectl kustomize kustomize/overlays/dev

# 本番環境の設定内容を確認
kubectl kustomize kustomize/overlays/prod
```

**開発環境の出力例:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: dev-nginx-service    # dev-プレフィックスが付いた
spec:
  # ...
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dev-nginx-deployment # dev-プレフィックスが付いた
spec:
  replicas: 1               # レプリカ数は1
  # ...
```

### 4.7 環境別デプロイ

```bash
# 開発環境をデプロイ
kubectl apply -k kustomize/overlays/dev

# 本番環境をデプロイ
kubectl apply -k kustomize/overlays/prod

# 結果確認
kubectl get deployments
kubectl get services
```

**期待する結果:**
```
NAME                     REPLICAS   READY   UP-TO-DATE   AVAILABLE   AGE
dev-nginx-deployment     1/1        1       1            1           1m
prod-nginx-deployment    3/3        3       3            3           1m

NAME                  TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
dev-nginx-service     ClusterIP   10.107.106.69   <none>        80/TCP    1m
prod-nginx-service    ClusterIP   10.108.45.123   <none>        80/TCP    1m
```

### 4.8 Kustomizeの重要なポイント

- **同じアプリの環境別バージョン**を管理
- **YAML上書き方式**で設定を変更
- **GitOpsに最適**（全てがYAMLファイル）
- **学習コストが低い**

---

## ステップ5: Helm（テンプレート管理）

### 5.1 問題設定

**課題:** 同じアプリケーションを複数のインスタンスとして独立してデプロイしたい
- 顧客A用nginx、顧客B用nginx
- それぞれ独立したライフサイクル管理

### 5.2 Helmチャートの作成

```bash
# Helmチャートの雛形を作成
helm create nginx-chart

# 不要なファイルを削除
rm -rf nginx-chart/templates/{serviceaccount.yaml,hpa.yaml,ingress.yaml,tests}
```

### 5.3 Values.yamlの設定

**ファイル: `nginx-chart/values.yaml`**
```yaml
replicaCount: 2

image:
  repository: nginx
  tag: "1.20"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

resources: {}
nodeSelector: {}
tolerations: []
affinity: {}
```

### 5.4 Deploymentテンプレートの作成

**ファイル: `nginx-chart/templates/deployment.yaml`**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "nginx-chart.fullname" . }}
  labels:
    {{- include "nginx-chart.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "nginx-chart.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "nginx-chart.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 80
              protocol: TCP
```

### 5.5 NOTES.txtの簡素化

**ファイル: `nginx-chart/templates/NOTES.txt`**
```
1. Get the application URL by running these commands:
   kubectl port-forward svc/{{ include "nginx-chart.fullname" . }} 8080:80
   echo "Visit http://127.0.0.1:8080 to use your application"
```

### 5.6 Helmでのデプロイ

```bash
# 1つ目のインスタンス（デフォルト設定）
helm install nginx-helm ./nginx-chart

# 2つ目のインスタンス（本番環境想定、レプリカ3個）
helm install nginx-prod ./nginx-chart --set replicaCount=3

# Helmリリース一覧を確認
helm list

# 結果確認
kubectl get deployments
```

**期待する結果:**
```
NAME                     REPLICAS   READY   UP-TO-DATE   AVAILABLE   AGE
nginx-helm-nginx-chart   2/2        2       2            2           1m
nginx-prod-nginx-chart   3/3        3       3            3           1m
```

### 5.7 Helmの管理機能

```bash
# 特定のリリースの詳細確認
helm get values nginx-helm
helm get values nginx-prod

# リリースのアップグレード
helm upgrade nginx-helm ./nginx-chart --set replicaCount=4

# リリースの削除
helm uninstall nginx-prod
```

### 5.8 Helmの重要なポイント

- **同じテンプレートから複数の独立したインスタンス**を作成
- **リリース単位での管理**（個別にアップグレード・削除可能）
- **テンプレート変数**で柔軟な設定変更
- **バージョン履歴管理**機能付き

---

## 使い分けの判断基準

### 現在の状況確認

最終的に以下のリソースが動作している状態：

```bash
kubectl get deployments -o custom-columns=NAME:.metadata.name,REPLICAS:.spec.replicas,METHOD:.metadata.labels
```

**結果:**
```
NAME                     REPLICAS   METHOD
dev-nginx-deployment     1          <none> (Kustomize)
prod-nginx-deployment    3          <none> (Kustomize)
nginx-helm-nginx-chart   2          map[...managed-by:Helm...] (Helm)
```

### 判断基準マトリックス

| 観点 | Kustomize | Helm |
|------|-----------|------|
| **目的** | 環境別設定管理 | 複数インスタンス管理 |
| **管理単位** | 環境（dev/prod） | リリース（独立したアプリ） |
| **設定方法** | YAML上書き | テンプレート変数 |
| **GitOps対応** | ◎ 完全対応 | △ values.yamlのみ |
| **複雑性** | シンプル | 高機能だが複雑 |
| **学習コスト** | 低 | 中〜高 |
| **バージョン管理** | Git | Helm内蔵 |

### 実際の選択指針

#### Kustomizeを選ぶべき場合 ✅

- **1つのアプリケーションを複数環境にデプロイ**
- 開発 → ステージング → 本番の流れ
- GitOpsワークフローを採用
- 設定の差分が比較的少ない
- チーム全体のKubernetes習熟度が低〜中

**例:**
```
同じWebアプリを環境別にデプロイ
├── 開発環境: レプリカ1、小さなリソース制限
├── ステージング環境: レプリカ2、中程度のリソース制限
└── 本番環境: レプリカ5、大きなリソース制限
```

#### Helmを選ぶべき場合 ✅

- **同じアプリケーションの複数インスタンスを独立管理**
- 顧客別、チーム別、プロジェクト別のデプロイ
- 複雑な設定の組み合わせが必要
- アプリケーションのライフサイクル管理が重要
- パッケージとしての配布が必要

**例:**
```
マルチテナントSaaS
├── 顧客A用インスタンス: 独自ドメイン、専用DB
├── 顧客B用インスタンス: 独自ドメイン、専用DB
└── 顧客C用インスタンス: 独自ドメイン、専用DB
```

#### 両方を組み合わせる場合 🔄

**HelmチャートをKustomizeで環境別カスタマイズ**

```
Helmチャート（基本テンプレート）
└── Kustomizeで環境別調整
    ├── 開発環境用values.yaml
    ├── ステージング環境用values.yaml
    └── 本番環境用values.yaml
```

---

## まとめ

### 学習した内容

1. **Pod**: Kubernetesの最小デプロイ単位
2. **Service**: ネットワークアクセスの抽象化
3. **Deployment**: Pod数の管理と高可用性
4. **Kustomize**: 環境別設定管理
5. **Helm**: テンプレートベースのパッケージ管理

### 重要な概念

- **ラベルセレクター**: リソース間の関連付けの仕組み
- **宣言的設定**: 「あるべき状態」を定義してKubernetesが実現
- **自動復旧**: Deploymentによる障害時の自動Pod再作成
- **設定の分離**: アプリケーションコードと設定の独立管理

### 次のステップ

- **ConfigMap/Secret**: 設定データと機密データの管理
- **Ingress**: 外部からのHTTP/HTTPSアクセス制御
- **Persistent Volume**: データの永続化
- **ArgoCD**: GitOpsによる継続的デプロイ

### クリーンアップ

```bash
# Kustomizeで作成したリソースを削除
kubectl delete -k kustomize/overlays/dev
kubectl delete -k kustomize/overlays/prod

# Helmで作成したリソースを削除
helm uninstall nginx-helm

# minikubeクラスターを停止
minikube stop
```

---

**🎉 お疲れさまでした！**

このハンズオンを通じて、Kubernetesの基本リソースとその管理方法について実践的に学習できました。実際のプロジェクトでは、要件に応じてKustomizeとHelmを使い分けることで、効率的なKubernetesアプリケーション管理が可能になります。