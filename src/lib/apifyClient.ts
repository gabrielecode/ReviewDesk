const APIFY_BASE_URL = 'https://api.apify.com/v2';
const APIFY_TOKEN = process.env.APIFY_TOKEN;

async function apifyRequest(endpoint: string, method: string = 'GET', body?: any) {
  const response = await fetch(`${APIFY_BASE_URL}${endpoint}?token=${APIFY_TOKEN}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`Apify API error: ${response.statusText}`);
  return response.json();
}

export const apifyClient = {
  createTask: (name: string, actId: string, input: any) => 
    apifyRequest(`/actor-tasks`, 'POST', { name, actId, input }),
  
  createSchedule: (name: string, taskId: string, cron: string, input: any) =>
    apifyRequest(`/schedules`, 'POST', { name, action: { type: 'runTask', taskId }, cron, input }),

  createWebhook: (eventTypes: string[], url: string, payloadTemplate: any) =>
    apifyRequest(`/webhooks`, 'POST', { eventTypes, requestUrl: url, payloadTemplate }),

  deleteTask: (taskId: string) => apifyRequest(`/actor-tasks/${taskId}`, 'DELETE'),
  
  deleteSchedule: (scheduleId: string) => apifyRequest(`/schedules/${scheduleId}`, 'DELETE'),

  deleteWebhook: (webhookId: string) => apifyRequest(`/webhooks/${webhookId}`, 'DELETE'),

  fetchDataset: (datasetId: string) => apifyRequest(`/datasets/${datasetId}/items`),
  
  runActor: (actId: string, input: any) => apifyRequest(`/acts/${actId}/runs`, 'POST', input),
};
