import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const WS_TABLE = process.env.WS_TABLE!;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId!;
  const eventId = event.queryStringParameters?.eventId || '';
  const userId = event.queryStringParameters?.userId || '';
  const ttl = Math.floor(Date.now() / 1000) + 86400; // 24h TTL

  await dynamo.send(new PutCommand({
    TableName: WS_TABLE,
    Item: { connectionId, eventId, userId, connectedAt: new Date().toISOString(), ttl },
  }));

  return { statusCode: 200, body: 'Connected' };
};
