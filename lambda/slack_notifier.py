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
    # #####
    # メッセージ作成に必要なパラメータの取得
    # #####
    detail_type = event['detail-type']
    # ### スタックセット名
    stack_set_arn = event['detail'].get('stack-set-arn')
    stack_set_name = stack_set_arn.split('/')[1].split(':')[0]
    # ### リージョン, アカウントID, アカウント名
    stack_id = event['detail'].get('stack-id')
    region = stack_id.split(':')[3]
    account_id = stack_id.split(':')[4]
    account_name = get_account_name(account_id)
    # ### ステータス, ステータス詳細, ステータス理由
    status = event['detail']['status-details'].get('status')
    detailed_status = event['detail']['status-details'].get('detailed-status')
    status_reason = event['detail']['status-details'].get('status-reason')

    # #####
    # メッセージ作成
    # #####
    title = f":warning: *{detail_type} | {region} | Account: {account_id}*"
    message = ( f'{title}\n'
                f'アカウント: {account_name} ({account_id})\n'
                f'リージョン: {region}\n\n'
                f'スタックセット名: {stack_set_name}\n'
                f'スタックセットARN: {stack_set_arn}\n\n'
                f'ステータス: {status}\n'
                f'ステータス詳細: {detailed_status}\n'
                f'ステータス理由: {status_reason}')

    # #####
    # Slack通知
    # #####
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