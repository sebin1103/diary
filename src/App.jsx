import { useState, useEffect, useRef } from 'react'

const STORAGE_KEY = 'diary_entries_v1'
const MOODS = [
  { value: '😊', label: '😊 좋음' },
  { value: '😐', label: '😐 보통' },
  { value: '😢', label: '😢 슬픔' },
  { value: '😡', label: '😡 화남' },
  { value: '😴', label: '😴 피곤' },
  { value: '🥰', label: '🥰 설렘' },
  { value: '🤩', label: '🤩 신남' },
]

function today() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
}

// ── Toast Hook ──────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState({ msg: '', show: false })
  const timerRef = useRef(null)

  const showToast = (msg) => {
    clearTimeout(timerRef.current)
    setToast({ msg, show: true })
    timerRef.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2400)
  }

  return { toast, showToast }
}

// ── DiaryEditor ─────────────────────────────────────────────
function DiaryEditor({ editingEntry, onSave, onCancel }) {
  const [date, setDate] = useState(today())
  const [mood, setMood] = useState('😊')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (editingEntry) {
      setDate(editingEntry.date)
      setMood(editingEntry.mood)
      setTitle(editingEntry.title)
      setContent(editingEntry.content)
    } else {
      setDate(today())
      setMood('😊')
      setTitle('')
      setContent('')
    }
  }, [editingEntry])

  const handleSave = () => {
    onSave({ date, mood, title: title.trim(), content: content.trim() })
  }

  const handleClear = () => {
    setDate(today())
    setMood('😊')
    setTitle('')
    setContent('')
    onCancel()
  }

  return (
    <div className="card">
      <div className="editor-header">
        <label>날짜</label>
        <input
          type="date"
          className="input-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <label>기분</label>
        <select
          className="input-select"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
        >
          {MOODS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <input
        type="text"
        className="input-title"
        placeholder="제목을 입력하세요"
        maxLength={80}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="input-content"
        placeholder="오늘 있었던 일을 자유롭게 적어보세요..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <div className="btn-row">
        <button className="btn btn-secondary" onClick={handleClear}>
          초기화
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          {editingEntry ? '수정 완료 ✏️' : '저장하기 💾'}
        </button>
      </div>
    </div>
  )
}

// ── DiaryEntry ──────────────────────────────────────────────
function DiaryEntry({ entry, onEdit, onDelete }) {
  return (
    <div className="entry">
      <div className="entry-meta">
        <span className="entry-mood">{entry.mood}</span>
        <span className="entry-date">{formatDate(entry.date)}</span>
      </div>
      <div className="entry-title">{entry.title}</div>
      <div className="entry-body">{entry.content}</div>
      <div className="entry-actions">
        <button className="icon-btn" title="수정" onClick={() => onEdit(entry)}>✏️</button>
        <button className="icon-btn" title="삭제" onClick={() => onDelete(entry.id)}>🗑️</button>
      </div>
    </div>
  )
}

// ── App (Root) ──────────────────────────────────────────────
export default function App() {
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  })
  const [editingEntry, setEditingEntry] = useState(null)
  const [search, setSearch] = useState('')
  const { toast, showToast } = useToast()
  const editorRef = useRef(null)

  // localStorage 동기화
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  }, [entries])

  const handleSave = ({ date, mood, title, content }) => {
    if (!date) return showToast('날짜를 선택해주세요.')
    if (!title) return showToast('제목을 입력해주세요.')
    if (!content) return showToast('내용을 입력해주세요.')

    if (editingEntry) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === editingEntry.id
            ? { ...e, date, mood, title, content, updatedAt: Date.now() }
            : e
        )
      )
      setEditingEntry(null)
      showToast('일기가 수정되었어요! ✏️')
    } else {
      setEntries((prev) => [
        { id: Date.now(), date, mood, title, content, createdAt: Date.now() },
        ...prev,
      ])
      showToast('일기가 저장되었어요! 🌿')
    }
  }

  const handleEdit = (entry) => {
    setEditingEntry(entry)
    editorRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleDelete = (id) => {
    if (!window.confirm('이 일기를 삭제할까요?')) return
    setEntries((prev) => prev.filter((e) => e.id !== id))
    showToast('일기가 삭제되었어요.')
  }

  const filtered = entries.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <header>
        <h1>📔 나의 일기장</h1>
        <p>오늘 하루를 기록해보세요</p>
      </header>

      <div ref={editorRef}>
        <DiaryEditor
          editingEntry={editingEntry}
          onSave={handleSave}
          onCancel={() => setEditingEntry(null)}
        />
      </div>

      <div className="card">
        <div className="section-title">
          📖 일기 목록
          <span className="count">{entries.length}</span>
        </div>

        <input
          type="text"
          className="search-input"
          placeholder="제목 또는 내용 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="entries-list">
          {filtered.length === 0 ? (
            <div className="empty">
              <span className="emoji">{search ? '🔍' : '🌱'}</span>
              {search ? '검색 결과가 없어요.' : '아직 작성된 일기가 없어요.\n첫 번째 일기를 남겨보세요!'}
            </div>
          ) : (
            filtered.map((e) => (
              <DiaryEntry
                key={e.id}
                entry={e}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>{toast.msg}</div>
    </>
  )
}
