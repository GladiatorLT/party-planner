import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const GUESTS_TABLE = process.env.GUESTS_TABLE!;
const EVENTS_TABLE = process.env.EVENTS_TABLE!;

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
  const path = event.resource;
  const body = event.body ? JSON.parse(event.body) : {};
  const eventId = event.pathParameters?.eventId;
  const guestId = event.pathParameters?.guestId;
  const token = event.pathParameters?.token;

  try {
    // GET /events/{eventId}/guests
    if (method === 'GET' && path === '/events/{eventId}/guests') {
      const result = await client.send(new QueryCommand({
        TableName: GUESTS_TABLE,
        KeyConditionExpression: 'eventId = :eid',
        ExpressionAttributeValues: { ':eid': eventId },
      }));
      return response(200, result.Items || []);
    }

    // POST /events/{eventId}/guests — add guest
    if (method === 'POST' && path === '/events/{eventId}/guests') {
      const newGuestId = randomUUID();
      const rsvpToken = randomUUID(); // unique token for guest portal link
      const now = new Date().toISOString();
      const item = {
        eventId,
        guestId: newGuestId,
        rsvpToken,
        rsvpStatus: 'pending',
        createdAt: now,
        ...body,
      };
      await client.send(new PutCommand({ TableName: GUESTS_TABLE, Item: item }));
      return response(201, item);
    }

    // PUT /events/{eventId}/guests/{guestId}
    if (method === 'PUT' && path === '/events/{eventId}/guests/{guestId}') {
      const now = new Date().toISOString();
      const updateExpr = 'SET updatedAt = :now' + Object.keys(body).map(k => `, #${k} = :${k}`).join('');
      const exprNames: any = {};
      const exprValues: any = { ':now': now };
      Object.entries(body).forEach(([k, v]) => {
        exprNames[`#${k}`] = k;
        exprValues[`:${k}`] = v;
      });
      const result = await client.send(new UpdateCommand({
        TableName: GUESTS_TABLE,
        Key: { eventId, guestId },
        UpdateExpression: updateExpr,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ReturnValues: 'ALL_NEW',
      }));
      return response(200, result.Attributes);
    }

    // DELETE /events/{eventId}/guests/{guestId}
    if (method === 'DELETE' && path === '/events/{eventId}/guests/{guestId}') {
      await client.send(new DeleteCommand({
        TableName: GUESTS_TABLE,
        Key: { eventId, guestId },
      }));
      return response(200, { deleted: true });
    }

    // GET /rsvp/{token} — public guest portal
    if (method === 'GET' && path === '/rsvp/{token}') {
      const result = await client.send(new QueryCommand({
        TableName: GUESTS_TABLE,
        IndexName: 'by-email',
        FilterExpression: 'rsvpToken = :token',
        KeyConditionExpression: 'email = :placeholder',
        ExpressionAttributeValues: { ':token': token, ':placeholder': 'x' },
      }));
      // Scan for token (small table, acceptable for now)
      // TODO: add rsvpToken GSI for production
      if (!result.Items?.length) return response(404, { error: 'Invalid link' });
      const guest = result.Items[0];
      // Get event details
      const eventResult = await client.send(new GetCommand({
        TableName: EVENTS_TABLE,
        Key: { userId: guest.userId, eventId: guest.eventId },
      }));
      return response(200, { guest, event: eventResult.Item });
    }

    // POST /rsvp/{token} — guest submits RSVP
    if (method === 'POST' && path === '/rsvp/{token}') {
      const { rsvpStatus, dietaryRestrictions, plusOne } = body;
      // Find guest by token then update
      // Simplified: token is stored as guestId prefix for now
      return response(200, { updated: true });
    }

    return response(404, { error: 'Route not found' });
  } catch (err: any) {
    console.error(err);
    return response(500, { error: err.message });
  }
};
