import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomUUID } from 'crypto';

const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const PLANNING_TABLE = process.env.PLANNING_TABLE!;
const MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';

const response = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  },
  body: JSON.stringify(body),
});

const invokeClaude = async (systemPrompt: string, userMessage: string): Promise<string> => {
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  };
  const cmd = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload),
  });
  const result = await bedrock.send(cmd);
  const parsed = JSON.parse(Buffer.from(result.body).toString());
  return parsed.content[0].text;
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const body = event.body ? JSON.parse(event.body) : {};
  const { action, eventContext, userMessage, eventId } = body;

  try {
    switch (action) {

      // Initial questionnaire response
      case 'questionnaire': {
        const system = `You are a friendly, expert party planner AI. Your job is to ask the user questions to understand their event and then create a comprehensive plan. Be conversational, warm, and enthusiastic. Ask one or two questions at a time. When you have enough information (after 5-8 exchanges), respond with a JSON block wrapped in <plan></plan> tags containing: eventType, theme, colorPalette, suggestedDate, estimatedBudget, guestCountRange, venueRecommendation, topThreeThemes, initialTaskList, menuIdeas, entertainmentIdeas. Always respond in plain text except for the final plan JSON.`;
        const aiResponse = await invokeClaude(system, userMessage);
        return response(200, { reply: aiResponse });
      }

      // Generate full event plan from questionnaire answers
      case 'generate-plan': {
        const system = `You are an expert party planner. Based on the event details provided, generate a comprehensive, detailed party plan. Return ONLY valid JSON with no markdown.`;
        const prompt = `Generate a complete party plan for this event: ${JSON.stringify(eventContext)}. 
        Return JSON with these exact keys:
        {
          "summary": "2-3 sentence event summary",
          "theme": { "name": "", "description": "", "colorPalette": ["#hex1","#hex2","#hex3"], "decorationIdeas": [] },
          "timeline": [{ "weeksBefore": 3, "tasks": [{ "title": "", "description": "", "priority": "high|medium|low", "category": "venue|food|invitations|entertainment|decorations|other" }] }],
          "menu": { "appetizers": [], "mainCourse": [], "dessert": "", "drinks": [], "cakeIdeas": [], "shoppingList": [] },
          "entertainment": [{ "type": "", "description": "", "ageAppropriate": true, "estimatedCost": "" }],
          "budget": { "total": 0, "breakdown": [{ "category": "", "estimated": 0, "notes": "" }] },
          "invitationText": { "formal": "", "casual": "", "fun": "" },
          "dayOfSchedule": [{ "time": "", "activity": "", "notes": "" }],
          "vendorSuggestions": [{ "type": "", "whatToLookFor": "", "questionsToAsk": [], "estimatedCost": "" }]
        }`;
        const aiResponse = await invokeClaude(system, prompt);
        const plan = JSON.parse(aiResponse);

        // Save plan to DynamoDB
        if (eventId) {
          await dynamo.send(new PutCommand({
            TableName: PLANNING_TABLE,
            Item: {
              eventId,
              categoryItemId: `AI_PLAN#${randomUUID()}`,
              category: 'AI_PLAN',
              content: plan,
              aiGenerated: true,
              createdAt: new Date().toISOString(),
            },
          }));
        }
        return response(200, { plan });
      }

      // Generate invitation content
      case 'generate-invitation': {
        const system = `You are a creative invitation designer. Generate beautiful, personalized invitation text. Return only JSON.`;
        const prompt = `Create invitation content for: ${JSON.stringify(eventContext)}.
        Return JSON: { "subject": "", "htmlBody": "<full HTML email>", "plainText": "", "designs": [{ "style": "elegant|playful|modern", "primaryColor": "#hex", "accentColor": "#hex", "fontSuggestion": "" }] }`;
        const aiResponse = await invokeClaude(system, prompt);
        return response(200, { invitation: JSON.parse(aiResponse) });
      }

      // Generate menu suggestions
      case 'generate-menu': {
        const system = `You are a professional chef and menu planner. Create detailed menus with recipes and shopping lists. Return only JSON.`;
        const prompt = `Create a menu for: ${JSON.stringify(eventContext)}.
        Return JSON: { "menu": { "appetizers": [{ "name": "", "recipe": "", "servings": 0, "prepTime": "" }], "mainCourse": [], "desserts": [], "drinks": [], "babyFriendly": [] }, "shoppingList": [{ "item": "", "quantity": "", "estimatedCost": 0 }], "totalEstimatedCost": 0, "prepTimeline": [{ "daysBefore": 0, "tasks": [] }] }`;
        const aiResponse = await invokeClaude(system, prompt);
        return response(200, { menu: JSON.parse(aiResponse) });
      }

      // Generate timeline/tasks
      case 'generate-timeline': {
        const system = `You are an expert event coordinator. Create detailed, actionable timelines. Return only JSON.`;
        const prompt = `Create a planning timeline for: ${JSON.stringify(eventContext)}.
        Event date: ${eventContext.eventDate}. Today is: ${new Date().toISOString().split('T')[0]}.
        Return JSON: { "phases": [{ "name": "", "startDate": "", "endDate": "", "tasks": [{ "id": "", "title": "", "description": "", "dueDate": "", "priority": "high|medium|low", "category": "", "estimatedTime": "", "completed": false }] }] }`;
        const aiResponse = await invokeClaude(system, prompt);
        return response(200, { timeline: JSON.parse(aiResponse) });
      }

      // Chat — general AI assistant for the event
      case 'chat': {
        const system = `You are a helpful party planning assistant. The user is planning: ${JSON.stringify(eventContext)}. Answer questions, give suggestions, and help with any aspect of their event. Be concise and practical.`;
        const aiResponse = await invokeClaude(system, userMessage);
        return response(200, { reply: aiResponse });
      }

      default:
        return response(400, { error: 'Unknown action' });
    }
  } catch (err: any) {
    console.error(err);
    return response(500, { error: err.message });
  }
};
