import { CfnParameter, Stack, StackProps } from 'aws-cdk-lib';
import * as chatbot from 'aws-cdk-lib/aws-chatbot';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { CloudFormationInterface } from './helpers';

interface ChatbotNotifyStackProps extends StackProps {
  slackWorkspaceId: string;
  slackChannelId: string;
}

export class ChatbotNotifyStack extends Stack {
  constructor(scope: Construct, id: string, props: ChatbotNotifyStackProps) {
    super(scope, id, props);

    const { slackWorkspaceId, slackChannelId } = props;

    // Parameters
    const slackWorkspaceIdParam = new CfnParameter(this, 'SlackWorkspaceId', {
      type: 'String',
      description: 'Slack Workspace ID',
    });

    const slackChannelIdParam = new CfnParameter(this, 'SlackChannelId', {
      type: 'String',
      description: 'Slack Channel ID',
    });

    // SNSトピックの作成
    const topic = new sns.Topic(this, 'ChatbotErrorTopic', {
      topicName: 'ChatbotErrorNotifications',
    });

    // Chatbotの設定（Slackの場合）
    new chatbot.SlackChannelConfiguration(this, 'ChatbotErrorSlackChannel', {
      loggingLevel: chatbot.LoggingLevel.ERROR,
      slackChannelConfigurationName: 'chatbot-error-notifications',
      slackWorkspaceId: slackWorkspaceIdParam.valueAsString,
      slackChannelId: slackChannelIdParam.valueAsString,
      notificationTopics: [topic],
    });

    // EventBridgeルールの作成
    const rule = new events.Rule(this, 'ChatbotErrorRule', {
      eventPattern: {
        source: ['aws.cloudformation'],
        detailType: ['CloudFormation StackSet StackInstance Status Change'],
        detail: {
          'status-details': {
            'detailed-status': ['INOPERABLE', 'CANCELLED', 'FAILED', 'FAILED_IMPORT', 'SKIPPED_SUSPENDED_ACCOUNT'],
          },
        },
      },
    });

    // 入力トランスフォーマーとテンプレートの組み合わせ
    const message = events.RuleTargetInput.fromObject({
      version: '1.0',
      source: 'custom',
      content: {
        textType: 'client-markdown',
        title: `:warning: CloudFormation StackSet StackInstance Status Change | ${events.EventField.fromPath(
          '$.region'
        )} | Account: ${events.EventField.fromPath('$.account')}`,
        description: `アカウントID: ${events.EventField.fromPath('$.account')}\nリージョン: ${events.EventField.fromPath(
          '$.region'
        )}\n\nスタックセットARN: ${events.EventField.fromPath('$.detail.stack-set-arn')}\n\nステータス: ${events.EventField.fromPath(
          '$.detail.status-details.status'
        )}\nステータス詳細: ${events.EventField.fromPath(
          '$.detail.status-details.detailed-status'
        )}\nステータス理由: ${events.EventField.fromPath('$.detail.status-details.status-reason')}`,
      },
    });

    // EventBridgeルールのターゲットとしてSNSトピックを設定
    rule.addTarget(
      new targets.SnsTopic(topic, {
        message,
      })
    );

    // CloudFormation Interfaceの設定
    const cfnInterface = new CloudFormationInterface();
    cfnInterface.addToParamGroups('Slack Configuration', slackWorkspaceIdParam.logicalId, slackChannelIdParam.logicalId);
    cfnInterface.addToParamLabels('Slack Workspace ID', slackWorkspaceIdParam.logicalId);
    cfnInterface.addToParamLabels('Slack Channel ID', slackChannelIdParam.logicalId);
    cfnInterface.applyToTemplate(this);
  }
}
