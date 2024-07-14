# stacksets-notify

このプロジェクトは、AWS CDKを使用してスタックセットの通知をSlackに送信するアプリケーションです。

## デプロイ方法

1. 必要な依存関係をインストールします。

    ```bash
    npm install
    ```

2. `index.ts`ファイルを編集し、ユーザーごとの環境情報を設定します。

    ```typescript
    // index.ts
    export const slackWorkspaceId = 'SlackワークスペースIDをここに入力';
    export const slackChannelId = 'SlackチャンネルIDをここに入力';
    export const slackWebhookUrl = 'Slack Webhook URLをここに入力';
    ```

3. 必要なスタックをデプロイを実行します。

    ```bash
    npx cdk deploy ChatbotNotifyStack
    npx cdk deploy WebhookNotifyStack
    ```

## CloudFormationテンプレート生成コマンド

CloudFormationテンプレートを生成するには、以下のコマンドを実行します。

```bash
npx cdk synth ChatbotNotifyStack --no-staging --no-version-reporting --no-path-metadata
npx cdk synth WebhookNotifyStack --no-staging --no-version-reporting --no-path-metadata
```
