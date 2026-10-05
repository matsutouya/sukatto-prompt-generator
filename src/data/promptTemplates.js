import { shortLines } from './shortLines.js';

// ===== SETTING DESCRIPTIONS =====
const settingDescriptions = {
  "電車": "Crowded Japanese commuter train interior. Silver poles, blue priority seats, afternoon light through windows. The train sways gently.",
  "新幹線": "Japanese Shinkansen bullet train interior. Green car, comfortable seats, large windows showing countryside blur past. Quiet atmosphere.",
  "カフェ": "A cozy neighborhood cafe. Warm lighting, wooden tables, plants by the window. Afternoon sun streams through windows. A peaceful atmosphere.",
  "レストラン": "Upscale Japanese restaurant interior. Warm indirect lighting, clean wooden counter, private dining area. Evening setting.",
  "コンビニ": "Japanese convenience store interior. Bright fluorescent lighting, organized shelves, clean floor. Late afternoon.",
  "オフィス": "Modern Japanese office. Open plan workspace, fluorescent ceiling lights, desks with computers. Business hours.",
  "会議室": "Corporate meeting room. Long table, projector screen, glass walls looking out to the office floor. Tense atmosphere.",
  "病院": "Japanese hospital corridor and waiting area. Clean white walls, blue chairs, soft lighting. Quiet, hushed tones.",
  "学校": "Japanese school hallway or classroom. Wooden desks, blackboard, afternoon light through large windows. After school hours.",
  "駐車場": "Large shopping mall outdoor parking lot. Bright afternoon sun. Marked parking spaces near the entrance.",
  "スーパー": "Japanese supermarket interior. Wide aisles, product displays, checkout counters. Afternoon shopping hours.",
  "公園": "Japanese neighborhood park. Benches, trees, playground equipment. Warm afternoon sunlight filtering through leaves.",
  "住宅街": "Quiet Japanese residential neighborhood. Narrow streets, low houses, evening light. Calm atmosphere.",
  "マンション": "Modern Japanese apartment building entrance hall and corridor. Clean, well-maintained, automatic doors.",
  "結婚式場": "Japanese wedding venue interior. Elegant decorations, round tables, chandelier lighting. Guests in formal attire.",
  "役所": "Japanese municipal government office. Counter windows, waiting area with number tickets, bureaucratic atmosphere.",
  "銀行": "Japanese bank interior. Polished floors, teller windows, waiting area with numbered tickets. Business hours.",
  "美容院": "Japanese hair salon. Mirrors, styling chairs, warm lighting. Magazines on the counter.",
  "ファミレス": "Japanese family restaurant. Booth seating, menu tablets, warm interior lighting. Casual dining atmosphere.",
  "居酒屋": "Japanese izakaya interior. Warm wood tones, paper lanterns, small dishes on the counter. Evening atmosphere.",
  "タクシー": "Inside a Japanese taxi. Clean interior, white seat covers, meter running. City streets visible through windows.",
  "面接室": "Japanese job interview room. Simple desk, two chairs facing each other, company logo on the wall. Formal atmosphere.",
};

// ===== STRIP ALL DIALOGUE FROM SCENE TEXT =====
// 動画生成AIのフィルターに弾かれる語は、生成時に言い換える
function softenBanned(text) {
  return text
    .replace(/revenge/gi, 'payback')
    .replace(/horror/gi, 'shock')
    .replace(/terror/gi, 'shock')
    .replace(/hyper-detailed skin textures?/gi, 'natural skin');
}

function stripDialogue(text) {
  return softenBanned(text)
    .replace(/\n?\[.*?\](?:,\s*[^:]*)?:\s*「[^」]*」/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}


// ===== 12秒クリップの時間枠とセリフ上限 =====
// 日本語の音声は1秒6音ほど。枠ごとに上限を決め、1つのセリフは1つの枠の中で言い終える。
export const WINDOWS = [
  { key: 'A', label: '0:00-0:04' },
  { key: 'B', label: '0:04-0:08' },
  { key: 'C', label: '0:08-0:10.5' },
];
export const HOLD_LABEL = '0:10.5-0:12';
export const CAPS = {
  part1: { A: 24, B: 24, C: 15 },
  part2: { A: 21, B: 24, C: 15 },
};
export const TOTAL_CAP = 55;

// 音の数: かな=1・漢字=2・数字=2・英字=1・句読点と「…」=0（小さい ゃゅょ も0）
export function mora(s) {
  let n = 0;
  for (const ch of s) {
    if (/[ぁ-んァ-ヶー]/.test(ch)) n += /[ゃゅょぁぃぅぇぉャュョ]/.test(ch) ? 0 : 1;
    else if (/[一-龥々]/.test(ch)) n += 2;
    else if (/[0-9]/.test(ch)) n += 2;
    else if (/[A-Za-z]/.test(ch)) n += 1;
  }
  return n;
}

function lowerFirst(text) {
  // 「Close-up」→「close-up」。人物ID（RUDE_MAN など）で始まるときはそのまま
  return /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function measure(part, lines) {
  const caps = CAPS[part];
  const perWindow = { A: 0, B: 0, C: 0 };
  for (const l of lines) perWindow[l.w] += mora(l.t);
  const total = lines.reduce((s, l) => s + mora(l.t), 0);
  const ok = total <= TOTAL_CAP && WINDOWS.every(w => perWindow[w.key] <= caps[w.key]);
  return { perWindow, total, ok };
}

function buildPart({ part, charBlock, setting, scenes, lines }) {
  const isPart2 = part === 'part2';
  const head = `Cinematic short drama, 9:16 vertical, 4K, photorealistic, dramatic lighting, Japanese contemporary setting. 12 seconds. No background music.${isPart2 ? ' Continuing directly from Part 1, same location, same lighting, same characters.' : ''}`;

  const windows = WINDOWS.map((w, i) => {
    let action = stripDialogue(scenes[i] || '');
    if (isPart2 && i === 0) action = `Silent beat for half a second, then ${lowerFirst(action)}`;
    const spoken = lines
      .filter(l => l.w === w.key)
      .map(l => `[${l.c}]: 「${l.t}」`)
      .join('\n');
    return `(${w.label}) ${action}${spoken ? `\n${spoken}` : ''}`;
  }).join('\n\n');

  const hold = isPart2
    ? `(${HOLD_LABEL}) Wide shot, static hold, no dialogue, no camera movement. Characters nearly still. Silent.`
    : `(${HOLD_LABEL}) Static hold, no dialogue, no camera movement, no character motion. Silent.`;

  return `${head}

#CHARACTERS${isPart2 ? ' (identical to Part 1 — same face, same hair, same clothes)' : ''}
${charBlock}

#SETTING
${setting}

#SCENE (12 seconds, no text on screen, no background music)
${windows}

${hold}`;
}

// ===== MAIN GENERATION =====
// opts.v1 / opts.v2: 使う案の番号（0〜4）。省略するとランダム。
export function generatePrompts(theme, opts = {}) {
  const setting = settingDescriptions[theme.setting] || settingDescriptions["オフィス"];
  const sl = shortLines[theme.id];
  if (!sl) throw new Error(`theme ${theme.id}: 短縮セリフがありません`);
  // 元のキャラ一覧にいない人物（社長・警察など）は、その回のセリフで話すときだけ人物欄に足す
  const extra = sl.extra || [];
  const charBlockFor = lines => [...theme.characters, ...extra.filter(e => lines.some(l => l.c === e.id))]
    .map(c => `${c.id}: ${c.appearance}`).join('\n');
  const i1 = opts.v1 ?? Math.floor(Math.random() * sl.v1.length);
  const i2 = opts.v2 ?? Math.floor(Math.random() * sl.v2.length);
  const lines1 = sl.v1[i1];
  const lines2 = sl.v2[i2];

  const part1 = softenBanned(buildPart({ part: 'part1', charBlock: charBlockFor(lines1), setting, scenes: theme.scene1, lines: lines1 }));
  const part2 = softenBanned(buildPart({ part: 'part2', charBlock: charBlockFor(lines2), setting, scenes: theme.scene2, lines: lines2 }));

  const allLines = [...lines1.map(l => ({ ...l, part: 1 })), ...lines2.map(l => ({ ...l, part: 2 }))]
    .map(l => ({ speaker: l.jp, text: l.t, w: l.w, part: l.part, mora: mora(l.t) }));
  const scriptText = allLines.map(l => `${l.speaker}「${l.text}」`).join('\n');

  const m1 = measure('part1', lines1);
  const m2 = measure('part2', lines2);

  return {
    part1, part2,
    script: scriptText,
    lines: allLines,
    endText: theme.endText,
    variant: { v1: i1, v2: i2 },
    meta: {
      lineCount: allLines.length,
      part1: m1,
      part2: m2,
      ok: m1.ok && m2.ok,
    },
  };
}

// ===== 一括生成（100話など） =====
// 100テーマを1話ずつ使う。100話を超えるときは2周目から別の案を使う。
export function generateEpisodes(themeList, count, { shuffle = false } = {}) {
  let order = themeList.slice();
  if (shuffle) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  const episodes = [];
  for (let n = 0; n < count; n++) {
    const theme = order[n % order.length];
    const round = Math.floor(n / order.length);
    const result = generatePrompts(theme, round === 0 ? {} : { v1: round % 5, v2: round % 5 });
    episodes.push({ no: n + 1, theme, result });
  }
  return episodes;
}

const pad3 = n => String(n).padStart(3, '0');

// check_dialogue.py にそのまま通せる形（===== 名前 ===== 区切り）
export function episodesToTxt(episodes) {
  return episodes.map(e => {
    const name = `${pad3(e.no)}`;
    return `===== ${name}-A ${e.theme.title}（前編） =====\n${e.result.part1}\n\n===== ${name}-B ${e.theme.title}（後編） =====\n${e.result.part2}\n`;
  }).join('\n');
}

function csvCell(v) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

// 題名・説明文・台本・テロップの一覧（Excel・スプレッドシートで開ける）
export function episodesToCsv(episodes) {
  const head = ['話数', 'テーマ', 'YouTube題名', '説明文', '前編セリフ', '後編セリフ', '前編音数', '後編音数', 'テロップ'];
  const rows = episodes.map(e => {
    const l1 = e.result.lines.filter(l => l.part === 1).map(l => `${l.speaker}「${l.text}」`).join('\n');
    const l2 = e.result.lines.filter(l => l.part === 2).map(l => `${l.speaker}「${l.text}」`).join('\n');
    return [pad3(e.no), e.theme.title, e.theme.ytTitle, e.theme.ytDesc, l1, l2,
      e.result.meta.part1.total, e.result.meta.part2.total, e.result.endText].map(csvCell).join(',');
  });
  return '﻿' + [head.map(csvCell).join(','), ...rows].join('\r\n');
}
