const MODE_DESC = {
  business: '격식있고 전문적인 비즈니스 문체로',
  sns: '자연스럽고 가볍게 — SNS 게시용 어투로',
  email: '이메일 형식으로 공손하고 명확하게'
};

const KO_POLISH = {
  business: '다음 한국어 문장을 비즈니스 격식체로 자연스럽게 다듬어줘. 원문 의미는 유지하되 어색한 표현만 교정. 결과만 출력.',
  sns: '다음 한국어 문장을 캐주얼하고 자연스러운 구어체로 다듬어줘. 결과만 출력.',
  email: '다음 한국어 문장을 이메일에 적합한 정중한 문장으로 다듬어줘. 결과만 출력.'
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text, lang, mode } = req.body;
    if (!text || !lang) {
      return res.status(400).json({ error: '파라미터 오류' });
    }

    let prompt, system;
    if (lang === 'ko') {
      const style = KO_POLISH[mode] || KO_POLISH.business;
      prompt = `${style}\n\n${text}`;
      system = '당신은 한국어 교정 전문가입니다. 입력된 문장을 다듬은 결과만 출력하세요. 대화, 인사, 부연 설명, 원문 반복은 절대 하지 마세요. 오직 다듬어진 문장만 출력하세요.';
    } else {
      const target = lang === 'cn' ? '중국어 간체' : '영어';
      const style = MODE_DESC[mode] || MODE_DESC.business;
      prompt = `다음 한국어를 ${target}로 번역하세요. 스타일: ${style}.\n\n${text}`;
      system = '당신은 번역 전문가입니다. 입력된 텍스트를 지정된 언어로 번역한 결과만 출력하세요. 대화, 인사, 부연 설명, 원문 반복은 절대 하지 마세요. 오직 번역문만 출력하세요.';
    }

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
        system,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }

    const data = await r.json();
    const result = data.content?.map(b => b.text || '').join('').trim() || '';
    return res.status(200).json({ result });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
