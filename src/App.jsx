import { useState, useCallback } from 'react'
import { themes, getRandomTheme } from './data/themes'
import { generatePrompts, generateEpisodes, episodesToTxt, episodesToCsv } from './data/promptTemplates'
import './index.css'

function CopyButton({ text, label = 'COPY', size = 'sm' }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleCopy() }}
      className={`${size === 'lg' ? 'px-4 py-2 text-xs' : 'px-2.5 py-1 text-[10px]'} tracking-wide font-medium rounded-md transition shrink-0`}
      style={{
        background: copied ? 'var(--sk-success)' : 'var(--sk-primary-dim)',
        border: `1px solid ${copied ? 'var(--sk-success)' : 'var(--sk-primary)'}`,
        color: copied ? '#fff' : 'var(--sk-primary)',
      }}
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

function MoraBadge({ label, total, ok, cap }) {
  const color = ok ? 'var(--sk-success)' : 'var(--sk-danger)'
  return (
    <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{
      background: ok ? 'rgba(46,164,79,0.1)' : 'rgba(215,58,73,0.1)',
      color,
      border: `1px solid ${color}`,
    }}>
      {label} {total}/{cap}音 {ok ? '✓' : '△長い'}
    </span>
  )
}

function download(filename, text, type) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function BatchPanel({ seconds }) {
  const [count, setCount] = useState(100)
  const [shuffle, setShuffle] = useState(false)
  const [episodes, setEpisodes] = useState([])
  const [open, setOpen] = useState(null)

  const handleBuild = () => {
    setEpisodes(generateEpisodes(themes, count, { shuffle, seconds }))
    setOpen(null)
  }
  const okCount = episodes.filter(e => e.result.meta.ok).length
  const txt = episodes.length ? episodesToTxt(episodes) : ''

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--sk-primary-dim)', color: 'var(--sk-primary)' }}>BATCH</span>
          <span className="text-xs font-bold">まとめて生成（前編・後編を1話として）</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <label className="flex items-center gap-1.5">
            話数
            <select
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="px-2 py-1 rounded-md"
              style={{ border: '1px solid var(--sk-border)', background: '#fff' }}
            >
              {[10, 30, 50, 100, 200].map(n => <option key={n} value={n}>{n}話</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={shuffle} onChange={e => setShuffle(e.target.checked)} />
            テーマの順番をランダムにする
          </label>
          <button
            onClick={handleBuild}
            className="px-4 py-2 text-xs font-bold rounded-lg transition active:scale-95"
            style={{ background: 'var(--sk-primary)', color: '#fff' }}
          >
            {count}話を生成（{seconds}秒×2）
          </button>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: 'var(--sk-text-dim)' }}>
          テーマは{themes.length}個で、1話に1テーマを使います。100話を超える分は、2周目から別のセリフ案を使います（題名と説明文は同じものが出ます）。
        </p>
      </div>

      {episodes.length > 0 && (
        <>
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold">{episodes.length}話を生成しました</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{
                background: okCount === episodes.length ? 'rgba(46,164,79,0.1)' : 'rgba(215,58,73,0.1)',
                color: okCount === episodes.length ? 'var(--sk-success)' : 'var(--sk-danger)',
                border: `1px solid ${okCount === episodes.length ? 'var(--sk-success)' : 'var(--sk-danger)'}`,
              }}>
                セリフが12秒に収まる話 {okCount}/{episodes.length}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => download(`sukatto_${episodes.length}wa_${seconds}s_prompts.txt`, txt, 'text/plain;charset=utf-8')}
                className="px-3 py-2 text-xs font-bold rounded-lg"
                style={{ background: 'var(--sk-primary-dim)', border: '1px solid var(--sk-primary)', color: 'var(--sk-primary)' }}
              >
                ⬇ プロンプト全部（txt）
              </button>
              <button
                onClick={() => download(`sukatto_${episodes.length}wa_list.csv`, episodesToCsv(episodes), 'text/csv;charset=utf-8')}
                className="px-3 py-2 text-xs font-bold rounded-lg"
                style={{ background: 'var(--sk-gold-dim)', border: '1px solid var(--sk-gold)', color: 'var(--sk-gold)' }}
              >
                ⬇ 題名・説明文・台本の一覧（csv）
              </button>
              <CopyButton text={txt} label="◆ プロンプト全部をコピー" size="lg" />
            </div>
          </div>

          <div className="card overflow-hidden">
            {episodes.map((e, i) => (
              <div key={i}>
                <div
                  className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-black/[0.02] transition"
                  style={{ borderBottom: '1px solid var(--sk-border)' }}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <span className="shrink-0 w-8 text-center font-bold" style={{ color: 'var(--sk-text-light)' }}>{String(e.no).padStart(3, '0')}</span>
                  <p className="flex-1 leading-relaxed truncate">{e.theme.title}</p>
                  <MoraBadge label="前" total={e.result.meta.part1.total} ok={e.result.meta.part1.ok} cap={e.result.cfg.totalCap} />
                  <MoraBadge label="後" total={e.result.meta.part2.total} ok={e.result.meta.part2.ok} cap={e.result.cfg.totalCap} />
                  <CopyButton text={e.result.part1} label="前編" />
                  <CopyButton text={e.result.part2} label="後編" />
                </div>
                {open === i && (
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--sk-border)', background: 'rgba(0,0,0,0.015)' }}>
                    <PromptOutput result={e.result} theme={e.theme} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function PromptOutput({ result, theme }) {
  return (
    <div className="space-y-4">
      {/* YouTube Info */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--sk-primary-dim)', color: 'var(--sk-primary)' }}>POST INFO</span>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold" style={{ color: 'var(--sk-gold)' }}>TITLE + TAGS</span>
            <CopyButton text={theme.ytTitle} />
          </div>
          <p className="text-sm font-bold leading-relaxed">{theme.ytTitle}</p>
        </div>
        <div style={{ borderTop: '1px solid var(--sk-border)', paddingTop: '12px' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold" style={{ color: 'var(--sk-gold)' }}>DESCRIPTION</span>
            <CopyButton text={theme.ytDesc} />
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--sk-text-dim)' }}>{theme.ytDesc}</p>
        </div>
        <div className="flex justify-center pt-1" style={{ borderTop: '1px solid var(--sk-border)' }}>
          <CopyButton text={`${theme.ytTitle}\n\n${theme.ytDesc}`} label="◆ TITLE + DESC コピー" size="lg" />
        </div>
      </div>

      {/* Part 1 */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--sk-primary-dim)', borderBottom: '1px solid var(--sk-border)' }}>
          <span className="text-xs font-bold" style={{ color: 'var(--sk-primary)' }}>PART 1 — 前編</span>
          <CopyButton text={result.part1} label="COPY 前編" />
        </div>
        <pre className="p-4 text-[11px] leading-relaxed whitespace-pre-wrap overflow-x-auto" style={{ color: 'var(--sk-text)', fontFamily: "'Noto Sans JP', sans-serif" }}>
          {result.part1}
        </pre>
      </div>

      {/* Part 2 */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--sk-accent-dim)', borderBottom: '1px solid var(--sk-border)' }}>
          <span className="text-xs font-bold" style={{ color: 'var(--sk-accent)' }}>PART 2 — 後編</span>
          <CopyButton text={result.part2} label="COPY 後編" />
        </div>
        <pre className="p-4 text-[11px] leading-relaxed whitespace-pre-wrap overflow-x-auto" style={{ color: 'var(--sk-text)', fontFamily: "'Noto Sans JP', sans-serif" }}>
          {result.part2}
        </pre>
      </div>

      {/* Script */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--sk-gold-dim)', borderBottom: '1px solid var(--sk-border)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: 'var(--sk-gold)' }}>台本 — {result.meta.lineCount}行</span>
            <MoraBadge label="前編" total={result.meta.part1.total} ok={result.meta.part1.ok} cap={result.cfg.totalCap} />
            <MoraBadge label="後編" total={result.meta.part2.total} ok={result.meta.part2.ok} cap={result.cfg.totalCap} />
          </div>
          <CopyButton text={result.script} label="COPY 台本" />
        </div>
        <div className="p-4 space-y-2">
          {result.lines.map((line, i) => {
            const win = result.cfg.windows.find(w => w.key === line.w)
            return (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[9px] shrink-0 px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--sk-text-dim)', border: '1px solid var(--sk-border)' }}>
                  {line.part === 1 ? '前' : '後'} {win?.label}
                </span>
                <span className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded" style={{ background: 'var(--sk-primary-dim)', color: 'var(--sk-primary)' }}>
                  {line.speaker}
                </span>
                <p className="text-sm leading-relaxed flex-1">「{line.text}」</p>
                <span className="text-[9px] shrink-0 px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--sk-text-dim)', border: '1px solid var(--sk-border)' }}>
                  {line.mora}音
                </span>
              </div>
            )
          })}
          <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px dashed var(--sk-border)' }}>
            <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--sk-text-dim)', border: '1px solid var(--sk-border)' }}>
              {result.cfg.hold}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--sk-text-dim)' }}>無音の静止（セリフなし。語尾が切れない余白）</span>
          </div>
        </div>
        <div className="px-4 py-2" style={{ borderTop: '1px dashed var(--sk-border)', background: 'rgba(0,0,0,0.02)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: 'var(--sk-text-dim)' }}>テロップ</span>
            <CopyButton text={result.endText} />
          </div>
          <p className="text-sm font-bold mt-1" style={{ color: 'var(--sk-text)' }}>「{result.endText}」</p>
        </div>
      </div>

      {/* Copy All */}
      <div className="flex justify-center gap-2 py-2">
        <CopyButton
          text={`【タイトル】\n${theme.ytTitle}\n\n【前編プロンプト】\n${result.part1}\n\n【後編プロンプト】\n${result.part2}\n\n【台本】\n${result.script}\n\n【テロップ】\n${result.endText}\n\n【解説】\n${theme.ytDesc}`}
          label="◆ ALL COPY（全部まとめて）"
          size="lg"
        />
      </div>
    </div>
  )
}

function HistoryPanel({ history }) {
  const [expandedIndex, setExpandedIndex] = useState(null)
  if (!history.length) return null
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid var(--sk-border)' }}>
        <span className="text-xs font-bold" style={{ color: 'var(--sk-text)' }}>過去の生成結果 ({history.length}/5)</span>
        <span className="text-[10px]" style={{ color: 'var(--sk-text-dim)' }}>タップで展開</span>
      </div>
      <div>
        {history.map((item, i) => (
          <div key={i}>
            <div
              className="flex items-center gap-2 px-4 py-2 text-xs cursor-pointer hover:bg-black/[0.02] transition"
              style={{ borderBottom: expandedIndex === i ? 'none' : '1px solid var(--sk-border)' }}
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
            >
              <span className="shrink-0 w-5 text-center font-bold" style={{ color: expandedIndex === i ? 'var(--sk-primary)' : 'var(--sk-text-light)' }}>{i + 1}</span>
              <span className="shrink-0 text-[10px]" style={{ color: 'var(--sk-text-dim)' }}>{expandedIndex === i ? '▼' : '▶'}</span>
              <p className="flex-1 leading-relaxed truncate" style={{ color: 'var(--sk-text)' }}>{item.theme.ytTitle}</p>
              <CopyButton text={item.theme.ytTitle} label="COPY" />
            </div>
            {expandedIndex === i && (
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--sk-border)', background: 'rgba(0,0,0,0.015)' }}>
                <PromptOutput result={item.result} theme={item.theme} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [selectedTheme, setSelectedTheme] = useState(null)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [tab, setTab] = useState('latest')
  const [mode, setMode] = useState('single')
  const [seconds, setSeconds] = useState(12)

  const handleRandom = useCallback(() => {
    const theme = getRandomTheme()
    const r = generatePrompts(theme, { seconds })
    setSelectedTheme(theme)
    setResult(r)
    setHistory(prev => [{ theme, result: r }, ...prev].slice(0, 5))
    setTab('latest')
    setMode('single')
  }, [seconds])

  return (
    <div className="min-h-screen paper-bg">
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(250,248,245,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--sk-border)' }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--sk-primary)' }}>スカッと Prompt Generator</h1>
            <p className="text-[10px]" style={{ color: 'var(--sk-text-dim)' }}>ショートドラマ台本＆プロンプト — {themes.length}テーマ</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--sk-primary)' }}>
              {[12, 15].map(n => (
                <button
                  key={n}
                  onClick={() => setSeconds(n)}
                  className="px-3 py-2.5 text-xs font-bold transition"
                  style={{ background: seconds === n ? 'var(--sk-primary)' : 'transparent', color: seconds === n ? '#fff' : 'var(--sk-primary)' }}
                >
                  {n}秒×2
                </button>
              ))}
            </div>
            <button
              onClick={() => setMode('batch')}
              className="px-4 py-2.5 text-sm font-bold rounded-xl transition active:scale-95"
              style={{
                background: mode === 'batch' ? 'var(--sk-primary-dim)' : 'transparent',
                border: '1px solid var(--sk-primary)',
                color: 'var(--sk-primary)',
              }}
            >
              📦 100話
            </button>
            <button
              onClick={handleRandom}
              className="px-5 py-2.5 text-sm font-bold rounded-xl transition hover:shadow-lg active:scale-95"
              style={{ background: 'var(--sk-primary)', color: '#fff' }}
            >
              🎲 生成
            </button>
          </div>
        </div>
        {/* Tab bar */}
        {mode === 'single' && result && (
          <div className="max-w-3xl mx-auto px-4 flex gap-0" style={{ borderTop: '1px solid var(--sk-border)' }}>
            <button
              onClick={() => setTab('latest')}
              className="flex-1 py-2 text-xs font-bold transition"
              style={{
                color: tab === 'latest' ? 'var(--sk-primary)' : 'var(--sk-text-dim)',
                borderBottom: tab === 'latest' ? '2px solid var(--sk-primary)' : '2px solid transparent',
              }}
            >
              最新の生成結果
            </button>
            <button
              onClick={() => setTab('history')}
              className="flex-1 py-2 text-xs font-bold transition relative"
              style={{
                color: tab === 'history' ? 'var(--sk-primary)' : 'var(--sk-text-dim)',
                borderBottom: tab === 'history' ? '2px solid var(--sk-primary)' : '2px solid transparent',
              }}
            >
              履歴（{history.length}件）
            </button>
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* First visit message */}
        {mode === 'single' && !result && !history.length && (
          <div className="card p-8 text-center space-y-3">
            <p className="text-4xl">🎬</p>
            <p className="text-sm font-bold" style={{ color: 'var(--sk-text)' }}>右上の「🎲 生成」で1話、「📦 100話」でまとめて生成します</p>
            <p className="text-xs" style={{ color: 'var(--sk-text-dim)' }}>セリフは前編・後編とも12秒に収まる量です。プロンプト・台本・タイトルが生成されます</p>
          </div>
        )}

        {/* Latest Output */}
        {mode === 'batch' && <BatchPanel seconds={seconds} />}

        {mode === 'single' && tab === 'latest' && result && selectedTheme && (
          <PromptOutput result={result} theme={selectedTheme} />
        )}

        {/* History */}
        {mode === 'single' && tab === 'history' && (
          history.length > 0
            ? <HistoryPanel history={history} />
            : <div className="card p-8 text-center">
                <p className="text-sm" style={{ color: 'var(--sk-text-dim)' }}>まだ履歴がありません</p>
              </div>
        )}
      </main>

      <footer className="py-4 text-center">
        <p className="text-[10px]" style={{ color: 'var(--sk-text-light)' }}>Sukatto Prompt Generator v2.1</p>
      </footer>
    </div>
  )
}

export default App
