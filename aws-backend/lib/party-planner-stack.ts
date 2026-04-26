import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cwlogs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export class PartyPlannerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── S3 Bucket ───────────────────────────────────────────────────────────
    const assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      bucketName: `party-planner-assets-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
        allowedHeaders: ['*'],
      }],
      lifecycleRules: [{
        expiration: cdk.Duration.days(365),
        prefix: 'temp/',
      }],
    });

    // ─── Cognito User Pool ────────────────────────────────────────────────────
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'party-planner-users',
      selfSignUpEnabled: true,
      signInAliases: { username: true, email: true },
      autoVerify: { email: true },
      email: cognito.UserPoolEmail.withSES({
        fromEmail: 'contact@mim-online.com',
        fromName: 'Party Planner',
        sesRegion: 'us-east-1',
      }),
      passwordPolicy: {
        minLength: 6,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: 'party-planner-web',
      authFlows: {
        userPassword: true,
        userSrp: false,
      },
      generateSecret: false,
    });

    // ─── DynamoDB Tables ──────────────────────────────────────────────────────

    // Events table
    const eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: 'party-planner-events',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    eventsTable.addGlobalSecondaryIndex({
      indexName: 'by-status-date',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'eventDate', type: dynamodb.AttributeType.STRING },
    });

    // Guests table
    const guestsTable = new dynamodb.Table(this, 'GuestsTable', {
      tableName: 'party-planner-guests',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'guestId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    guestsTable.addGlobalSecondaryIndex({
      indexName: 'by-email',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
    });

    // Planning table (timeline, budget, menu, tasks, seating)
    const planningTable = new dynamodb.Table(this, 'PlanningTable', {
      tableName: 'party-planner-planning',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'categoryItemId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Invitations table
    const invitationsTable = new dynamodb.Table(this, 'InvitationsTable', {
      tableName: 'party-planner-invitations',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'invitationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Vendors table
    const vendorsTable = new dynamodb.Table(this, 'VendorsTable', {
      tableName: 'party-planner-vendors',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'vendorId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // WebSocket connections table
    const wsTable = new dynamodb.Table(this, 'WsTable', {
      tableName: 'party-planner-ws-connections',
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    wsTable.addGlobalSecondaryIndex({
      indexName: 'by-event',
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
    });

    // ─── Shared Lambda environment ────────────────────────────────────────────
    const commonEnv = {
      EVENTS_TABLE: eventsTable.tableName,
      GUESTS_TABLE: guestsTable.tableName,
      PLANNING_TABLE: planningTable.tableName,
      INVITATIONS_TABLE: invitationsTable.tableName,
      VENDORS_TABLE: vendorsTable.tableName,
      WS_TABLE: wsTable.tableName,
      ASSETS_BUCKET: assetsBucket.bucketName,
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      REGION: this.region,
    };

    const makeLogGroup = (name: string) => new cwlogs.LogGroup(this, name + 'LogGroup', {
      logGroupName: '/aws/lambda/party-planner-' + name,
      retention: cwlogs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const lambdaDefaults = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      environment: commonEnv,
    };

    // ─── Lambda Functions ─────────────────────────────────────────────────────

    const eventsLambda = new lambda.Function(this, 'EventsFunction', {
      ...lambdaDefaults,
      functionName: 'party-planner-events',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/events')),
      logGroup: makeLogGroup('events'),
    });

    const guestsLambda = new lambda.Function(this, 'GuestsFunction', {
      ...lambdaDefaults,
      functionName: 'party-planner-guests',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/guests')),
      logGroup: makeLogGroup('guests'),
    });

    const aiLambda = new lambda.Function(this, 'AiFunction', {
      ...lambdaDefaults,
      functionName: 'party-planner-ai',
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(60),
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/ai')),
      logGroup: makeLogGroup('ai'),
    });

    const invitationsLambda = new lambda.Function(this, 'InvitationsFunction', {
      ...lambdaDefaults,
      functionName: 'party-planner-invitations',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/invitations')),
      logGroup: makeLogGroup('invitations'),
    });

    const vendorsLambda = new lambda.Function(this, 'VendorsFunction', {
      ...lambdaDefaults,
      functionName: 'party-planner-vendors',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/vendors')),
      logGroup: makeLogGroup('vendors'),
    });

    const wsConnectLambda = new lambda.Function(this, 'WsConnectFunction', {
      ...lambdaDefaults,
      functionName: 'party-planner-ws-connect',
      handler: 'connect.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/websocket')),
      logGroup: makeLogGroup('ws-connect'),
    });

    const wsDisconnectLambda = new lambda.Function(this, 'WsDisconnectFunction', {
      ...lambdaDefaults,
      functionName: 'party-planner-ws-disconnect',
      handler: 'disconnect.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/websocket')),
      logGroup: makeLogGroup('ws-disconnect'),
    });

    // ─── IAM Permissions ──────────────────────────────────────────────────────

    // DynamoDB access
    [eventsLambda, guestsLambda, aiLambda, invitationsLambda, vendorsLambda, wsConnectLambda, wsDisconnectLambda].forEach(fn => {
      eventsTable.grantReadWriteData(fn);
      guestsTable.grantReadWriteData(fn);
      planningTable.grantReadWriteData(fn);
      invitationsTable.grantReadWriteData(fn);
      vendorsTable.grantReadWriteData(fn);
      wsTable.grantReadWriteData(fn);
      assetsBucket.grantReadWrite(fn);
    });

    // Bedrock access for AI lambda
    aiLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: ['arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0'],
    }));

    // SES access for invitations lambda
    invitationsLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    // Cognito admin access for events lambda (user lookup)
    eventsLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cognito-idp:AdminGetUser'],
      resources: [userPool.userPoolArn],
    }));

    // ─── REST API Gateway ─────────────────────────────────────────────────────
    const api = new apigateway.RestApi(this, 'RestApi', {
      restApiName: 'party-planner-api',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [userPool],
    });

    const authOptions = {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // /events
    const eventsResource = api.root.addResource('events');
    eventsResource.addMethod('GET', new apigateway.LambdaIntegration(eventsLambda), authOptions);
    eventsResource.addMethod('POST', new apigateway.LambdaIntegration(eventsLambda), authOptions);

    const eventResource = eventsResource.addResource('{eventId}');
    eventResource.addMethod('GET', new apigateway.LambdaIntegration(eventsLambda), authOptions);
    eventResource.addMethod('PUT', new apigateway.LambdaIntegration(eventsLambda), authOptions);
    eventResource.addMethod('DELETE', new apigateway.LambdaIntegration(eventsLambda), authOptions);

    // /events/{eventId}/planning
    const planningResource = eventResource.addResource('planning');
    planningResource.addMethod('GET', new apigateway.LambdaIntegration(eventsLambda), authOptions);
    planningResource.addMethod('PUT', new apigateway.LambdaIntegration(eventsLambda), authOptions);

    // /guests
    const guestsResource = eventResource.addResource('guests');
    guestsResource.addMethod('GET', new apigateway.LambdaIntegration(guestsLambda), authOptions);
    guestsResource.addMethod('POST', new apigateway.LambdaIntegration(guestsLambda), authOptions);

    const guestResource = guestsResource.addResource('{guestId}');
    guestResource.addMethod('PUT', new apigateway.LambdaIntegration(guestsLambda), authOptions);
    guestResource.addMethod('DELETE', new apigateway.LambdaIntegration(guestsLambda), authOptions);

    // /guests/rsvp/{token} — public, no auth
    const rsvpResource = api.root.addResource('rsvp').addResource('{token}');
    rsvpResource.addMethod('GET', new apigateway.LambdaIntegration(guestsLambda));
    rsvpResource.addMethod('POST', new apigateway.LambdaIntegration(guestsLambda));

    // /ai
    const aiResource = api.root.addResource('ai');
    aiResource.addMethod('POST', new apigateway.LambdaIntegration(aiLambda), authOptions);

    // /invitations
    const invResource = eventResource.addResource('invitations');
    invResource.addMethod('GET', new apigateway.LambdaIntegration(invitationsLambda), authOptions);
    invResource.addMethod('POST', new apigateway.LambdaIntegration(invitationsLambda), authOptions);

    const invItemResource = invResource.addResource('{invitationId}');
    invItemResource.addMethod('PUT', new apigateway.LambdaIntegration(invitationsLambda), authOptions);
    invItemResource.addMethod('DELETE', new apigateway.LambdaIntegration(invitationsLambda), authOptions);

    const sendResource = invItemResource.addResource('send');
    sendResource.addMethod('POST', new apigateway.LambdaIntegration(invitationsLambda), authOptions);

    // /vendors
    const vendorsResource = eventResource.addResource('vendors');
    vendorsResource.addMethod('GET', new apigateway.LambdaIntegration(vendorsLambda), authOptions);
    vendorsResource.addMethod('POST', new apigateway.LambdaIntegration(vendorsLambda), authOptions);

    const vendorResource = vendorsResource.addResource('{vendorId}');
    vendorResource.addMethod('PUT', new apigateway.LambdaIntegration(vendorsLambda), authOptions);
    vendorResource.addMethod('DELETE', new apigateway.LambdaIntegration(vendorsLambda), authOptions);

    // ─── WebSocket API ────────────────────────────────────────────────────────
    const wsApi = new apigatewayv2.WebSocketApi(this, 'WsApi', {
      apiName: 'party-planner-ws',
      connectRouteOptions: {
        integration: new apigatewayv2integrations.WebSocketLambdaIntegration('WsConnect', wsConnectLambda),
      },
      disconnectRouteOptions: {
        integration: new apigatewayv2integrations.WebSocketLambdaIntegration('WsDisconnect', wsDisconnectLambda),
      },
    });

    const wsStage = new apigatewayv2.WebSocketStage(this, 'WsStage', {
      webSocketApi: wsApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    // Allow lambdas to post to WebSocket connections
    const wsPostPolicy = new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [`arn:aws:execute-api:${this.region}:${this.account}:${wsApi.apiId}/*`],
    });
    [eventsLambda, guestsLambda, aiLambda].forEach(fn => fn.addToRolePolicy(wsPostPolicy));

    // Pass WS endpoint to lambdas that need to broadcast
    const wsEndpoint = `https://${wsApi.apiId}.execute-api.${this.region}.amazonaws.com/prod`;
    eventsLambda.addEnvironment('WS_ENDPOINT', wsEndpoint);
    guestsLambda.addEnvironment('WS_ENDPOINT', wsEndpoint);
    aiLambda.addEnvironment('WS_ENDPOINT', wsEndpoint);

    // ─── Outputs ──────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'REST API URL',
    });
    new cdk.CfnOutput(this, 'WsUrl', {
      value: wsStage.url,
      description: 'WebSocket URL',
    });
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito App Client ID',
    });
    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: assetsBucket.bucketName,
      description: 'S3 Assets Bucket',
    });
  }
}
