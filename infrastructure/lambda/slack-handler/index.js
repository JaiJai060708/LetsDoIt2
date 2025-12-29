/**
 * Lambda handler for Slack integration
 * Handles /slack/todo, /slack/interactions, and /slack/oauth/callback routes
 */

const https = require('https');

const DOMAIN = 'www.' + process.env.DOMAIN || 'www.lets-do-it.xyz';
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;

/**
 * Parse Slack slash command payload
 * Slack sends application/x-www-form-urlencoded data
 */
function parseSlackPayload(body, isBase64Encoded) {
  const decoded = isBase64Encoded ? Buffer.from(body, 'base64').toString('utf-8') : body;
  const params = new URLSearchParams(decoded);
  return Object.fromEntries(params.entries());
}

/**
 * Build the task creation URL with parameters
 */
function buildTaskUrl(params = {}) {
  const url = new URL(`https://${DOMAIN}/add-task`);
  
  if (params.title) {
    url.searchParams.set('title', params.title);
  }
  if (params.note) {
    url.searchParams.set('note', params.note);
  }
  if (params.due) {
    url.searchParams.set('due', params.due);
  }
  if (params.tags) {
    url.searchParams.set('tags', params.tags);
  }
  
  return url.toString();
}

/**
 * Build Slack response with interactive button
 */
function buildSlackResponse(text, channelId, channelName, teamId) {
  // Build task title from command text or default
  const taskTitle = text?.trim() 
    ? `Slack - ${text.trim()}`
    : `Slack - Reply to #${channelName || 'channel'}`;
  
  // Build note with Slack deep link if channel ID is available
  // Include team_id for proper routing (required for channels, optional for DMs)
  let note = null;
  if (channelId && teamId) {
    note = `https://slack.com/app_redirect?channel=${channelId}&team=${teamId}`;
  } else if (channelId) {
    note = `https://slack.com/app_redirect?channel=${channelId}`;
  }
  
  const taskUrl = buildTaskUrl({
    title: taskTitle,
    note: note,
    due: 'today'
  });

  return {
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Create a LetsDoIt task:*'
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📝 _${taskTitle}_`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ Open LetsDoIt',
              emoji: true
            },
            url: taskUrl,
            style: 'primary'
          }
        ]
      }
    ]
  };
}

/**
 * Handle /slack/todo - Slack slash command endpoint
 */
function handleTodoCommand(event) {
  const payload = parseSlackPayload(event.body, event.isBase64Encoded);
  
  // Extract relevant fields from Slack payload
  const {
    text,           // Command text after /todo
    channel_id,     // Channel ID where command was triggered
    channel_name,   // Channel name
    user_name,      // User who triggered the command
    team_id,        // Team/Workspace ID (needed for channel deep links)
  } = payload;
  
  console.log(`Slash command from ${user_name} in #${channel_name} (team: ${team_id}): ${text || '(no text)'}`);
  
  const response = buildSlackResponse(text, channel_id, channel_name, team_id);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(response)
  };
}

/**
 * Exchange OAuth code for access token
 */
function exchangeCodeForToken(code) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code: code
    });

    const options = {
      hostname: 'slack.com',
      path: '/api/oauth.v2.access',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(params.toString())
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse Slack response'));
        }
      });
    });

    req.on('error', reject);
    req.write(params.toString());
    req.end();
  });
}

/**
 * Handle /slack/oauth/callback - OAuth callback endpoint
 */
async function handleOAuthCallback(event) {
  const queryParams = event.queryStringParameters || {};
  const { code, error } = queryParams;

  // Handle OAuth errors (user denied, etc.)
  if (error) {
    console.error('OAuth error:', error);
    return {
      statusCode: 302,
      headers: {
        'Location': `https://${DOMAIN}?slack_error=${encodeURIComponent(error)}`
      },
      body: ''
    };
  }

  // No code provided
  if (!code) {
    console.error('No OAuth code provided');
    return {
      statusCode: 302,
      headers: {
        'Location': `https://${DOMAIN}?slack_error=no_code`
      },
      body: ''
    };
  }

  try {
    // Exchange the code for an access token
    const tokenResponse = await exchangeCodeForToken(code);
    
    console.log('OAuth response:', JSON.stringify(tokenResponse, null, 2));

    if (!tokenResponse.ok) {
      console.error('Slack OAuth failed:', tokenResponse.error);
      return {
        statusCode: 302,
        headers: {
          'Location': `https://${DOMAIN}?slack_error=${encodeURIComponent(tokenResponse.error)}`
        },
        body: ''
      };
    }

    // Successfully installed!
    const teamName = tokenResponse.team?.name || 'your workspace';
    console.log(`App installed to workspace: ${teamName} (${tokenResponse.team?.id})`);

    // Redirect to success page
    return {
      statusCode: 302,
      headers: {
        'Location': `https://${DOMAIN}?slack_installed=true&team=${encodeURIComponent(teamName)}`
      },
      body: ''
    };

  } catch (err) {
    console.error('OAuth exchange failed:', err);
    return {
      statusCode: 302,
      headers: {
        'Location': `https://${DOMAIN}?slack_error=exchange_failed`
      },
      body: ''
    };
  }
}

/**
 * Handle /slack/interactions - Slack interactive components endpoint
 */
function handleInteractions(event) {
  const payload = parseSlackPayload(event.body, event.isBase64Encoded);
  
  // Slack sends interactions as a JSON string in the 'payload' field
  let interactionPayload;
  try {
    interactionPayload = JSON.parse(payload.payload || '{}');
  } catch (e) {
    console.error('Failed to parse interaction payload:', e);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid payload' })
    };
  }
  
  const { type, actions, user } = interactionPayload;
  
  console.log(`Interaction type: ${type}, user: ${user?.username}, actions: ${JSON.stringify(actions)}`);
  
  // For button clicks that open URLs, Slack handles the redirect
  // We just need to acknowledge the interaction
  if (type === 'block_actions') {
    // The button opens a URL, so we just acknowledge
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        response_type: 'ephemeral',
        text: 'Opening LetsDoIt...'
      })
    };
  }
  
  // Handle other interaction types as needed
  return {
    statusCode: 200,
    body: ''
  };
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  const path = event.rawPath || event.path || '';
  const method = event.requestContext?.http?.method || event.httpMethod || 'POST';
  
  // Route handling
  if (path.endsWith('/slack/todo') && method === 'POST') {
    return handleTodoCommand(event);
  }
  
  if (path.endsWith('/slack/interactions') && method === 'POST') {
    return handleInteractions(event);
  }
  
  // OAuth callback endpoint
  if (path.endsWith('/slack/oauth/callback') && method === 'GET') {
    return handleOAuthCallback(event);
  }
  
  // Health check endpoint
  if (path.endsWith('/slack/health')) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'ok',
        service: 'letsdoit-slack-handler',
        timestamp: new Date().toISOString()
      })
    };
  }
  
  // Unknown route
  return {
    statusCode: 404,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      error: 'Not Found',
      path: path
    })
  };
};
