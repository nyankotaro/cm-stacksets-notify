#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { slackChannelId, slackWebhookUrl, slackWorkspaceId } from '../index';
import { ChatbotNotifyStack } from '../lib/chatbot-notify-stack';
import { WebhookNotifyStack } from '../lib/webhook-notify-stack';

const app = new cdk.App();

new ChatbotNotifyStack(app, 'ChatbotNotifyStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  synthesizer: new cdk.DefaultStackSynthesizer({ generateBootstrapVersionRule: false }),
  slackWorkspaceId,
  slackChannelId,
});

new WebhookNotifyStack(app, 'WebhookNotifyStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  synthesizer: new cdk.DefaultStackSynthesizer({ generateBootstrapVersionRule: false }),
  slackWebhookUrl,
});
