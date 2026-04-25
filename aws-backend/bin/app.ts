#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PartyPlannerStack } from '../lib/party-planner-stack';

const app = new cdk.App();
new PartyPlannerStack(app, 'PartyPlannerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});
