import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESClient({ region: 'us-east-1' });
const INVITATIONS_TABLE = process.env.INVITATIONS_TABLE!;
const GUESTS_TABLE = process.env.GUESTS_TABLE!;
const FROM_EMAIL = 'contact@mim-online.com';

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
  const invitationId = event.pathParameters?.invitationId;

  try {
    // GET /events/{eventId}/invitations
    if (method === 'GET') {
      const result = await dynamo.send(new QueryCommand({
        TableName: INVITATIONS_TABLE,
        KeyConditionExpression: 'eventId = :eid',
        ExpressionAttributeValues: { ':eid': eventId },
      }));
      return response(200, result.Items || []);
    }

    // POST /events/{eventId}/invitations — save invitation design
    if (method === 'POST' && path === '/events/{eventId}/invitations') {
      const newId = randomUUID();
      const item = {
        eventId,
        invitationId: newId,
        ...body,
        sentCount: 0,
        createdAt: new Date().toISOString(),
      };
      await dynamo.send(new PutCommand({ TableName: INVITATIONS_TABLE, Item: item }));
      return response(201, item);
    }

    // POST /events/{eventId}/invitations/{invitationId}/send — send to guests
    if (method === 'POST' && path === '/events/{eventId}/invitations/{invitationId}/send') {
      const { guestIds, baseUrl = 'https://party-planner.mim-online.com' } = body;

      // Get invitation
      const invResult = await dynamo.send(new GetCommand({
        TableName: INVITATIONS_TABLE,
        Key: { eventId, invitationId },
      }));
      if (!invResult.Item) return response(404, { error: 'Invitation not found' });
      const invitation = invResult.Item;

      // Get guests
      const guestsResult = await dynamo.send(new QueryCommand({
        TableName: GUESTS_TABLE,
        KeyConditionExpression: 'eventId = :eid',
        ExpressionAttributeValues: { ':eid': eventId },
      }));
      const guests = (guestsResult.Items || []).filter(g =>
        !guestIds || guestIds.includes(g.guestId)
      );

      const results = [];
      for (const guest of guests) {
        if (!guest.email) continue;
        const rsvpLink = `${baseUrl}/rsvp/${guest.rsvpToken}`;
        const personalizedHtml = (invitation.htmlContent || '')
          .replace(/\{\{guestName\}\}/g, guest.name || 'Guest')
          .replace(/\{\{rsvpLink\}\}/g, rsvpLink);

        try {
          await ses.send(new SendEmailCommand({
            Source: `Party Planner <${FROM_EMAIL}>`,
            Destination: { ToAddresses: [guest.email] },
            Message: {
              Subject: { Data: invitation.subject || "You're Invited!" },
              Body: {
                Html: { Data: personalizedHtml },
                Text: { Data: `You're invited! RSVP here: ${rsvpLink}` },
              },
            },
          }));
          results.push({ guestId: guest.guestId, email: guest.email, sent: true });
        } catch (err: any) {
          results.push({ guestId: guest.guestId, email: guest.email, sent: false, error: err.message });
        }
      }

      return response(200, { results, sentCount: results.filter(r => r.sent).length });
    }

    // DELETE /events/{eventId}/invitations/{invitationId}
    if (method === 'DELETE') {
      await dynamo.send(new DeleteCommand({
        TableName: INVITATIONS_TABLE,
        Key: { eventId, invitationId },
      }));
      return response(200, { deleted: true });
    }

    return response(404, { error: 'Route not found' });
  } catch (err: any) {
    console.error(err);
    return response(500, { error: err.message });
  }
};
