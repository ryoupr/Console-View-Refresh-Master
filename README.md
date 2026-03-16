# CloudFormation Refresher

AWS CloudFormation コンソールの更新ボタンを自動的にクリックする Chrome 拡張機能です。スタックの状態を定期的に確認する際に便利です。

## 機能

- AWS CloudFormation コンソール上の全ての更新ボタンを同時にクリック
- カスタマイズ可能な更新間隔（最小 1 秒、デフォルト 3 秒）
- 簡単な開始/停止の切り替え
- 更新状態の視覚的フィードバック（ポップアップ表示時に現在の状態を自動反映）

## インストール方法

### 一般利用者向け

1. (Chrome ウェブストア)[https://chromewebstore.google.com/detail/cloudformation-refresher/gpkknjnhiakkgigfepmocdabcfmggcce?hl=ja] から導入

### 開発者向け

1. Google Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. このリポジトリのフォルダを選択

## 使用方法

1. AWS CloudFormation コンソール画面にアクセス
2. Chrome 右上の拡張機能アイコンをクリック
3. 更新間隔を設定（1秒以上の数値を入力、デフォルト 3 秒）
4. 「開始」ボタンをクリックして自動更新を開始
5. 「停止」ボタンをクリックして自動更新を停止

## ファイル構成

```
cloudformation_reflesher/
├── manifest.json     # 拡張機能の設定ファイル
├── popup.html       # ポップアップUI
├── popup.js        # ポップアップのロジック
└── content.js      # 自動更新の実行ロジック
```

## 注意事項

- この拡張機能は AWS CloudFormation コンソール（`https://*.console.aws.amazon.com/*cloudformation*`）でのみ動作します
- ブラウザのパフォーマンスに影響を与える可能性があるため、使用しない時は必ず停止してください
- 更新間隔を短くしすぎると、ブラウザや AWS コンソールの応答が遅くなる可能性があります

## 開発者向け情報

### 拡張機能の仕組み

1. `manifest.json`: Chrome 拡張機能の設定を定義
2. `popup.html/js`: ユーザーインターフェースと設定の管理。ポップアップ表示時に `content.js` へ `getStatus` メッセージを送り、現在の実行状態を取得・表示する。
3. `content.js`: AWS CloudFormation コンソール上で実行され、更新ボタンの自動クリックを制御。`popup.js` からのメッセージ (`start`, `stop`, `getStatus`) に応じて動作する。

### 更新ボタンの検出

AWS CloudFormationコンソール上の `data-testid="refresh-button"` 属性を持つ更新ボタンを検出します：

```javascript
const buttons = document.querySelectorAll(
  'button[data-testid="refresh-button"]',
);
```

この実装により、画面上に存在する2つの更新ボタン（スタック一覧とイベント履歴など）を同時にクリックします。

### 権限について

この拡張機能は以下の権限のみを使用します：

- `activeTab`: 現在のタブでのみ操作を行うために必要
- `content_scripts`: AWS CloudFormation コンソールでの自動更新処理のために必要
