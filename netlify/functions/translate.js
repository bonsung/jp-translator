const MODE_DESC = {
  business: '격식있고 전문적인 비즈니스 문체로',
  sns: '자연스럽고 가볍게 — SNS 게시용 어투로',
  email: '이메일 형식으로 공손하고 명확하게'
};

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  }

  try {
    const { text, lang, mode } = JSON.parse(event.body);
    if (!text || !lang) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: '파라미터 오류' }) };
    }

    const target = lang === 'cn' ? '중국어 간체' : '영어';
    const style = MODE_DESC[mode] || MODE_DESC.business;
    const prompt = `다음 한국어를 ${target}로 번역하세요. 스타일: ${style}.\n\n${text}`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: '당신은 번역 전문가입니다. 입력된 텍스트를 지정된 언어로 번역한 결과만 출력하세요. 대화, 인사, 부연 설명, 원문 반복은 절대 하지 마세요. 오직 번역문만 출력하세요.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return { statusCode: r.status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err }) };
    }

    const data = await r.json();
    const result = data.content?.map(b => b.text || '').join('').trim() || '';
    return {
      statusCode: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ result })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
