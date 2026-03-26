import Airtable from 'airtable';

export default async (req, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(req.url);
  const newsId = url.searchParams.get('id');

  if (!newsId) {
    return new Response(JSON.stringify({ error: 'id parameter is required' }), {
      status: 400,
      headers,
    });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers,
    });
  }

  try {
    const base = new Airtable({ apiKey }).base(baseId);

    const records = await base('Comments')
      .select({
        filterByFormula: `FIND("${newsId}", ARRAYJOIN(NewsID, ","))`,
        sort: [{ field: 'CreatedAt', direction: 'asc' }],
      })
      .all();

    const comments = records
      .filter(record => record.fields.IsApproved !== false)
      .map((record, index) => ({
        number: index + 1,
        userID: record.fields.UserID || 'ID:unknown',
        userName: record.fields.UserName || '名無しさん@競馬板',
        content: record.fields.Content || '',
        isOP: record.fields.IsOP || false,
        createdAt: record.fields.CreatedAt || new Date().toISOString(),
      }));

    return new Response(JSON.stringify({ comments }), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('get-comments error:', error.message);
    return new Response(JSON.stringify({ error: 'Failed to fetch comments' }), {
      status: 500,
      headers,
    });
  }
};

export const config = {
  path: '/api/comments',
};
