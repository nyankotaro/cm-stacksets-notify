import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { slackChannelId, slackWebhookUrl, slackWorkspaceId } from '../index';
import { ChatbotNotifyStack } from '../lib/chatbot-notify-stack';
import { WebhookNotifyStack } from '../lib/webhook-notify-stack';

test('ChatbotNotifyStack Snapshot', () => {
  const app = new cdk.App();
  const stack = new ChatbotNotifyStack(app, 'ChatbotNotifyStack', {
    slackWorkspaceId,
    slackChannelId,
  });
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});

test('WebhookNotifyStack Snapshot', () => {
  const app = new cdk.App();
  const stack = new WebhookNotifyStack(app, 'WebhookNotifyStack', {
    slackWebhookUrl,
  });
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});
