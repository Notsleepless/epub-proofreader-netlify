exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { text } = JSON.parse(event.body);

    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No text provided' })
      };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are a professional editor fixing machine-translated Chinese xianxia novels.

ANALYZE THIS TEXT AND RETURN ONLY VALID JSON (no other text):

${text}

Return ONLY:
{
  "suggestions": [
    {
      "original": "exact phrase",
      "suggestion": "improved version",
      "reason": "grammar/clarity/awkward",
      "severity": "high|medium|low"
    }
  ]
}`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Claude API error' })
      };
    }

    const data = await response.json();
    const content = data.content[0].text;

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          statusCode: 200,
          body: JSON.stringify(parsed)
        };
      }
    } catch (e) {
      console.error('Parse error:', e);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ suggestions: [] })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
