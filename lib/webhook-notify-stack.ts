import { CfnParameter, Stack, StackProps } from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { CloudFormationInterface } from './helpers';

interface WebhookNotifyStackProps extends StackProps {
  slackWebhookUrl?: string;
}

export class WebhookNotifyStack extends Stack {
  constructor(scope: Construct, id: string, props: WebhookNotifyStackProps) {
    super(scope, id, props);

    const { slackWebhookUrl } = props;

    // Parameters
    const slackWebhookUrlParam = new CfnParameter(this, 'SlackWebhookUrl', {
      type: 'String',
      description: 'Slack Webhook URL',
    });

    // Lambda関数の作成
    const slackNotifierLambda = new lambda.Function(this, 'SlackNotifierLambda', {
      runtime: lambda.Runtime.PYTHON_3_12,
      code: lambda.Code.fromInline(`
import boto3
import os
import json
import urllib.request
from logging import getLogger, INFO

logger = getLogger()
logger.setLevel(INFO)

organizations = boto3.client("organizations")

SLACK_WEBHOOK_URL = os.environ['SLACK_WEBHOOK_URL']

def get_account_name(account_id):
    resp = organizations.describe_account(AccountId=account_id)
    return resp['Account']['Name']

def lambda_handler(event, context):
    # メッセージ作成に必要なパラメータの取得
    detail_type = event['detail-type']
    stack_set_arn = event['detail'].get('stack-set-arn')
    stack_set_name = stack_set_arn.split('/')[1].split(':')[0]
    stack_id = event['detail'].get('stack-id')
    region = stack_id.split(':')[3]
    account_id = stack_id.split(':')[4]
    account_name = get_account_name(account_id)
    status = event['detail']['status-details'].get('status')
    detailed_status = event['detail']['status-details'].get('detailed-status')
    status_reason = event['detail']['status-details'].get('status-reason')

    # メッセージ作成
    title = f":warning: *{detail_type} | {region} | Account: {account_id}*"
    message = ( f'{title}\n'
                f'アカウント: {account_name} ({account_id})\n'
                f'リージョン: {region}\n\n'
                f'スタックセット名: {stack_set_name}\n'
                f'スタックセットARN: {stack_set_arn}\n\n'
                f'ステータス: {status}\n'
                f'ステータス詳細: {detailed_status}\n'
                f'ステータス理由: {status_reason}')

    # Slack通知
    slack_message = {
        'text': message
    }

    data = json.dumps(slack_message).encode('utf-8')
    req = urllib.request.Request(SLACK_WEBHOOK_URL, data=data, headers={'Content-Type': 'application/json'})
    try:
        response = urllib.request.urlopen(req)
        response_body = response.read()
        logger.info(f'Slack notification sent successfully: {response_body}')
    except urllib.error.HTTPError as e:
        logger.error(f'Failed to send Slack notification: {e.reason}')
        raise

    return {
        'statusCode': 200,
        'body': json.dumps('Slack notification sent successfully')
}
      `),
      handler: 'index.lambda_handler',
      environment: {
        SLACK_WEBHOOK_URL: slackWebhookUrlParam.valueAsString,
      },
    });

    // 必要なIAMポリシーの付与
    slackNotifierLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['organizations:DescribeAccount'],
        resources: ['*'],
      })
    );

    // EventBridgeルールの作成
    const rule = new events.Rule(this, 'StackSetsErrorRule', {
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

    // EventBridgeルールのターゲットとしてLambdaを設定
    rule.addTarget(new targets.LambdaFunction(slackNotifierLambda));

    // CloudFormation Interfaceの設定
    const cfnInterface = new CloudFormationInterface();
    cfnInterface.addToParamGroups('Slack Configuration', slackWebhookUrlParam.logicalId);
    cfnInterface.addToParamLabels('Slack Webhook URL', slackWebhookUrlParam.logicalId);
    cfnInterface.applyToTemplate(this);
  }
}
