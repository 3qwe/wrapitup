import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()
const MODEL = 'claude-haiku-5-5'

const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

async function generateGifts(req) {
  let input
  try {
    input = await req.json()
  } catch {
    return json({ error: 'Invalid request.' }, 400)
  }

  const name = clean(input.name, 60)
  const age = clean(input.age, 40)
  const gender = clean(input.gender, 40)
  const occasion = clean(input.occasion, 60)
  const extra = clean(input.extra, 600)
  const budget = Math.min(500, Math.max(5, Number(input.budget) || 50))
  const interests = Array.isArray(input.interests)
    ? input.interests.slice(0, 20).map((i) => clean(i, 30)).filter(Boolean)
    : []

  if (!age || !occasion) {
    return json({ error: 'Please select at least an age range and occasion.' }, 400)
  }

  const details = [
    name && `- Name: ${name}`,
    `- Age group: ${age}`,
    `- Gender: ${gender || 'not specified'}`,
    `- Occasion: ${occasion}`,
    `- Budget: up to £${budget}`,
    `- Interests: ${interests.length ? interests.join(', ') : 'not specified'}`,
    extra && `- Additional info: ${extra}`,
  ]
    .filter(Boolean)
    .join('\n')

  const prompt = `You are a thoughtful gift advisor for a UK gift shop. Generate 6 unique, personalised, ethical gift ideas for this person:
${details}

For each gift give a SHORT name (under 6 words), a ONE sentence reason why it suits this person, and an approximate price in GBP that is within the budget.

Respond ONLY with a valid JSON array and no other text, like:
[{"name":"Gift name","reason":"Why this suits them.","price":"£25"}]`

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
    const match = text.match(/\[[\s\S]*\]/)
    const gifts = JSON.parse(match ? match[0] : text)

    const result = (Array.isArray(gifts) ? gifts : [])
      .filter((g) => g && g.name)
      .slice(0, 6)
      .map((g) => ({
        name: String(g.name).slice(0, 80),
        reason: String(g.reason || '').slice(0, 300),
        price: g.price ? String(g.price).slice(0, 20) : '',
      }))

    if (!result.length) throw new Error('No gifts in AI response')
    return json({ gifts: result })
  } catch (err) {
    console.error('Gift generation failed:', err)
    return json({ error: 'We couldn’t generate ideas right now. Please try again.' }, 502)
  }
}

export default {
  async fetch(req) {
    const { pathname } = new URL(req.url)
    if (pathname === '/api/gift-ideas') {
      if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
      return generateGifts(req)
    }
    return json({ error: 'Not found' }, 404)
  },
}

export const config = { path: '/api/*' }
