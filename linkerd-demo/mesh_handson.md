# サービスメッシュ ハンズオン

## 1. サービスメッシュとは？

### 基本概念

サービスメッシュは、マイクロサービス間の通信を管理・制御するインフラストラクチャ層です。

**従来の問題**:

- サービス間通信の複雑化
- セキュリティ（暗号化）の実装負担
- 可観測性（ログ、メトリクス）の不足
- 障害時の制御（リトライ、タイムアウト）

**サービスメッシュの解決策**:

- 各サービスにプロキシ（サイドカー）を配置
- 通信をプロキシ経由で制御
- アプリケーションコードを変更せずに機能追加

## 2. 今回のデモ構成

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │───▶│   Backend   │───▶│    Redis    │
│   (Nginx)   │    │  (Node.js)  │    │ (Database)  │
│   :8080     │    │    :3001    │    │    :6379    │
└─────────────┘    └─────────────┘    └─────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌─────────────┐
                    │ mesh network│
                    │  (Docker)   │
                    └─────────────┘
```

### 各コンポーネントの役割

**Frontend (Nginx)**:

- リバースプロキシとして動作
- 外部からのリクエストを受信
- バックエンド API へルーティング

**Backend (Node.js)**:

- REST API 提供
- Redis との通信
- メッセージの保存・取得

**Redis**:

- データストレージ
- メッセージの永続化

**mesh network**:

- サービス間の専用ネットワーク
- サービスディスカバリー機能
- ネットワーク分離

## 3. ファイル構成の詳細解説

### ディレクトリ構成

```
linkerd-demo/
├── docker-compose.yml    # サービス定義とネットワーク設定
├── nginx.conf           # Nginxプロキシ設定
├── server.js           # Node.js APIサーバー
└── mesh_handson.md     # このハンズオン資料
```

### docker-compose.yml

```yaml
version: "3.8"

services:
  # フロントエンド（Nginx）
  frontend:
    image: nginx:alpine # 軽量なNginxイメージ
    ports:
      - "8080:80" # ホスト8080 → コンテナ80
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf # 設定ファイルマウント
    depends_on:
      - backend # バックエンド起動後に開始
    networks:
      - mesh # meshネットワークに参加

  # バックエンド（Node.js API）
  backend:
    image: node:alpine
    ports:
      - "3001:3001"
    working_dir: /app
    command: sh -c "npm init -y && npm install express redis && node server.js"
    volumes:
      - ./server.js:/app/server.js # アプリケーションコードマウント
    depends_on:
      - redis
    networks:
      - mesh

  # データベース（Redis）
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    networks:
      - mesh

networks:
  mesh:
    driver: bridge # Docker bridgeネットワーク
```

### nginx.conf

```nginx
events {}

http {
  # バックエンドサーバーの定義
  upstream backend {
    server backend:3001;        # サービス名で名前解決
  }

  server {
    listen 80;

    # ルートパス - 静的レスポンス
    location / {
      return 200 'Frontend Service - Linkerd Demo';
      add_header Content-Type text/plain;
    }

    # APIパス - バックエンドへプロキシ
    location /api/ {
      proxy_pass http://backend;
      proxy_set_header Host $host;
    }
  }
}
```

### server.js

```javascript
const express = require("express");
const redis = require("redis");

const app = express();
// Redisクライアント作成（サービス名で接続）
const client = redis.createClient({ host: "redis", port: 6379 });

app.use(express.json());

// メッセージ一覧取得API
app.get("/api/messages", async (req, res) => {
  try {
    const messages = await client.lRange("messages", 0, -1);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// メッセージ投稿API
app.post("/api/messages", async (req, res) => {
  try {
    await client.lPush("messages", req.body.message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log("Backend running on port 3001");
});
```

## 4. ハンズオン実行手順

### 4.1 環境起動

```bash
# プロジェクトディレクトリに移動
cd linkerd-demo

# サービス起動
docker-compose up -d

# 起動確認
docker-compose ps
```

### 4.2 動作確認

**フロントエンドアクセス**:

```bash
curl http://localhost:8080
# 期待値: Frontend Service - Linkerd Demo
```

**バックエンド API 直接アクセス**:

```bash
# メッセージ一覧取得
curl http://localhost:3001/api/messages
# 期待値: []

# メッセージ投稿
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Service Mesh!"}'
# 期待値: {"success":true}

# 再度一覧取得
curl http://localhost:3001/api/messages
# 期待値: ["Hello Service Mesh!"]
```

**プロキシ経由での API アクセス**:

```bash
# Nginx経由でバックエンドAPI呼び出し
curl http://localhost:8080/api/messages
# 期待値: ["Hello Service Mesh!"]
```

### 4.3 ネットワーク確認

```bash
# meshネットワークの詳細確認
docker network inspect linkerd-demo_mesh

# サービス間通信確認
docker-compose exec frontend ping backend
docker-compose exec backend ping redis
```

## 5. サービスメッシュの学習ポイント

### 5.1 サービスディスカバリー

- `backend:3001`、`redis:6379`でサービス名による名前解決
- IP アドレスを直接指定する必要がない
- サービスの場所が変わっても設定変更不要

### 5.2 プロキシパターン

- Nginx がリバースプロキシとして動作
- 外部からの全リクエストを受信・ルーティング
- 実際のサービスメッシュでは Envoy プロキシが各サービスに配置

### 5.3 ネットワーク分離

- `mesh`ネットワークで通信を分離
- 外部からは直接バックエンド・Redis にアクセス不可
- セキュリティ境界の実現

### 5.4 依存関係管理

- `depends_on`でサービス起動順序を制御
- 実際の環境ではヘルスチェックも重要

## 6. 実際の Linkerd との違い

### 今回のデモ

- Docker Compose による簡易実装
- 1 つのプロキシ（Nginx）のみ
- 基本的な通信制御

### 実際の Linkerd

- 各サービスにサイドカープロキシ（Envoy）配置
- 自動 mTLS 暗号化
- 詳細なメトリクス・トレーシング
- 高度なトラフィック制御（カナリアデプロイ等）
- 障害時の自動リトライ・サーキットブレーカー

## 7. 次のステップ

1. **Kubernetes での実践**: 実際の Linkerd を Kubernetes 環境で試す
2. **可観測性**: Prometheus、Grafana、Jaeger との連携
3. **セキュリティ**: mTLS、認証・認可ポリシー
4. **トラフィック管理**: カナリアデプロイ、A/B テスト

## 8. クリーンアップ

```bash
# サービス停止・削除
docker-compose down

# イメージも削除する場合
docker-compose down --rmi all

# ボリュームも削除する場合
docker-compose down -v
```

## まとめ
