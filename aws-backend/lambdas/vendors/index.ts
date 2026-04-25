import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const VENDORS_TABLE = process.env.VENDORS_TABLE!;

const response = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  },
  body: JSON.stringify(body),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const body = event.body ? JSON.parse(event.body) : {};
  const eventId = event.pathParameters?.eventId;
  const vendorId = event.pathParameters?.vendorId;

  try {
    if (method === 'GET') {
      const result = await dynamo.send(new QueryCommand({
        TableName: VENDORS_TABLE,
        KeyConditionExpression: 'eventId = :eid',
        ExpressionAttributeValues: { ':eid': eventId },
      }));
      return response(200, result.Items || []);
    }

    if (method === 'POST') {
      const newId = randomUUID();
      const item = {
        eventId,
        vendorId: newId,
        status: 'inquired',
        createdAt: new Date().toISOString(),
        ...body,
      };
      await dynamo.send(new PutCommand({ TableName: VENDORS_TABLE, Item: item }));
      return response(201, item);
    }

    if (method === 'PUT') {
      const now = new Date().toISOString();
      const updateExpr = 'SET updatedAt = :now' + Object.keys(body).map(k => `, #${k} = :${k}`).join('');
      const exprNames: any = {};
      const exprValues: any = { ':now': now };
      Object.entries(body).forEach(([k, v]) => { exprNames[`#${k}`] = k; exprValues[`:${k}`] = v; });
      const result = await dynamo.send(new UpdateCommand({
        TableName: VENDORS_TABLE,
        Key: { eventId, vendorId },
        UpdateExpression: updateExpr,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ReturnValues: 'ALL_NEW',
      }));
      return response(200, result.Attributes);
    }

    if (method === 'DELETE') {
      await dynamo.send(new DeleteCommand({ TableName: VENDORS_TABLE, Key: { eventId, vendorId } }));
      return response(200, { deleted: true });
    }

    return response(404, { error: 'Route not found' });
  } catch (err: any) {
    console.error(err);
    return response(500, { error: err.message });
  }
};
