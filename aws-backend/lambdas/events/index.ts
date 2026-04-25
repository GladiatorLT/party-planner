import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const EVENTS_TABLE = process.env.EVENTS_TABLE!;
const PLANNING_TABLE = process.env.PLANNING_TABLE!;

const response = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  },
  body: JSON.stringify(body),
});

const getUserId = (event: APIGatewayProxyEvent): string => {
  return event.requestContext.authorizer?.claims?.sub || '';
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = event.resource;
  const userId = getUserId(event);
  const body = event.body ? JSON.parse(event.body) : {};
  const eventId = event.pathParameters?.eventId;

  try {
    // GET /events — list all events for user
    if (method === 'GET' && path === '/events') {
      const result = await client.send(new QueryCommand({
        TableName: EVENTS_TABLE,
        KeyConditionExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': userId },
        ScanIndexForward: false,
      }));
      return response(200, result.Items || []);
    }

    // POST /events — create event
    if (method === 'POST' && path === '/events') {
      const newEventId = randomUUID();
      const now = new Date().toISOString();
      const item = {
        userId,
        eventId: newEventId,
        ...body,
        status: 'planning',
        createdAt: now,
        updatedAt: now,
      };
      await client.send(new PutCommand({ TableName: EVENTS_TABLE, Item: item }));
      return response(201, item);
    }

    // GET /events/{eventId}
    if (method === 'GET' && path === '/events/{eventId}') {
      const result = await client.send(new GetCommand({
        TableName: EVENTS_TABLE,
        Key: { userId, eventId },
      }));
      if (!result.Item) return response(404, { error: 'Event not found' });
      return response(200, result.Item);
    }

    // PUT /events/{eventId}
    if (method === 'PUT' && path === '/events/{eventId}') {
      const now = new Date().toISOString();
      const updateExpr = 'SET updatedAt = :now' + Object.keys(body).map(k => `, #${k} = :${k}`).join('');
      const exprNames: any = {};
      const exprValues: any = { ':now': now };
      Object.entries(body).forEach(([k, v]) => {
        exprNames[`#${k}`] = k;
        exprValues[`:${k}`] = v;
      });
      const result = await client.send(new UpdateCommand({
        TableName: EVENTS_TABLE,
        Key: { userId, eventId },
        UpdateExpression: updateExpr,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ReturnValues: 'ALL_NEW',
      }));
      return response(200, result.Attributes);
    }

    // DELETE /events/{eventId}
    if (method === 'DELETE' && path === '/events/{eventId}') {
      await client.send(new DeleteCommand({
        TableName: EVENTS_TABLE,
        Key: { userId, eventId },
      }));
      return response(200, { deleted: true });
    }

    // GET /events/{eventId}/planning
    if (method === 'GET' && path === '/events/{eventId}/planning') {
      const result = await client.send(new QueryCommand({
        TableName: PLANNING_TABLE,
        KeyConditionExpression: 'eventId = :eid',
        ExpressionAttributeValues: { ':eid': eventId },
      }));
      return response(200, result.Items || []);
    }

    // PUT /events/{eventId}/planning
    if (method === 'PUT' && path === '/events/{eventId}/planning') {
      const { category, content } = body;
      const categoryItemId = `${category}#${randomUUID()}`;
      const now = new Date().toISOString();
      const item = { eventId, categoryItemId, category, content, updatedAt: now };
      await client.send(new PutCommand({ TableName: PLANNING_TABLE, Item: item }));
      return response(200, item);
    }

    return response(404, { error: 'Route not found' });
  } catch (err: any) {
    console.error(err);
    return response(500, { error: err.message });
  }
};
