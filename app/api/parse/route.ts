import { NextResponse } from 'next/server';
import { DISTRICT_KEYS, CROP_TYPES, SUPPLY_TYPES } from '@/lib/constants';
import { parseIntake, sanitizeIntake, type ParsedIntake } from '@/lib/parse-fallback';

export const dynamic = 'force-dynamic';

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

const SYSTEM_PROMPT = `You extract structured fields from a Punjab farmer's message about paddy/wheat stubble (parali) they want to sell.

Return ONLY a JSON object, no prose, no markdown fences, with these keys:
{
  "farmerName": string or null,
  "village": string or null,
  "district": one of [${DISTRICT_KEYS.join(', ')}] or null,
  "acres": number or null,
  "crop": "paddy" or "wheat" or null,
  "supply": "baled" or "loose" or null,
  "readyInDays": integer number of days from today until the straw is ready, or null,
  "phone": string or null
}

Rules:
- The message may be in Punjabi (Gurmukhi), Hindi (Devanagari), or English. Understand all three.
- "jhona"/"dhan"/"rice" = paddy. "gehun"/"wheat" = wheat.
- "bale"/"gaddi"/"gali" = baled. "loose"/"khula"/"khuli" = loose.
- "5 din"/"5 days"/"panch din" = readyInDays 5. "aaj"/"today" = 0. "parson"/"next week" = 7.
- Match the district to the closest spelling you recognise (e.g. "ludhianaa" -> "Ludhiana").
- If a field is not mentioned, use null. Never invent a value.`;

type GeminiPart = { text?: string };

function parseGeminiJson(text: string): unknown {
  // Models occasionally wrap JSON in prose or code fences despite instructions.
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object in model response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function parseWithGemini(text: string, apiKey: string): Promise<ParsedIntake> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(
      `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0 },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini responded ${response.status}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: GeminiPart[] } }[];
    };
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!raw) throw new Error('Empty model response');

    return sanitizeIntake(parseGeminiJson(raw) as ParsedIntake);
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  let text = '';
  try {
    const body = (await request.json()) as { text?: unknown };
    text = typeof body.text === 'string' ? body.text.slice(0, 600) : '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: 'Empty message' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // No key: go straight to the deterministic parser. The demo never stalls.
  if (!apiKey) {
    return NextResponse.json({ ...parseIntake(text), source: 'fallback', engine: 'none' });
  }

  try {
    const parsed = await parseWithGemini(text, apiKey);
    // The regex parser is a good second opinion on numbers — if the model
    // missed acres or a district, let the fallback fill the gap.
    const merged = sanitizeIntake({ ...parseIntake(text), ...parsed });
    return NextResponse.json({ ...merged, source: 'llm', engine: 'gemini' });
  } catch (error) {
    console.warn('[parse] Gemini call failed, using fallback parser:', (error as Error).message);
    return NextResponse.json({
      ...parseIntake(text),
      source: 'fallback',
      engine: 'none',
      warning: 'AI parsing is unavailable, used the offline parser instead.',
    });
  }
}

export async function GET() {
  return NextResponse.json({
    llmEnabled: Boolean(process.env.GEMINI_API_KEY),
    model: GEMINI_MODEL,
    crops: CROP_TYPES,
    supplyTypes: SUPPLY_TYPES,
    districts: DISTRICT_KEYS,
  });
}
