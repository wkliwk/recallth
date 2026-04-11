import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import OrangeHeader from '../components/OrangeHeader'
import Wave from '../components/Wave'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

/* ------------------------------------------------------------------ */
/*  Relative time helper                                               */
/* ------------------------------------------------------------------ */
function relativeTime(dateStr) {
  const diffMin = Math.floor((Date.now() - new Date(dateStr)) / 60000)
  if (diffMin < 60) return `${diffMin || 1}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return diffDay === 1 ? 'Yesterday' : `${diffDay}d ago`
}

/* ------------------------------------------------------------------ */
/*  Sparkle icon                                                       */
/* ------------------------------------------------------------------ */
function SparkleIcon() {
  return (
    <div
      className="w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0"
      style={{ background: '#F5F3FF' }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#7C3AED"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Chevron icon                                                       */
/* ------------------------------------------------------------------ */
function ChevronRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-ink4 shrink-0"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton row                                                       */
/* ------------------------------------------------------------------ */
function SkeletonRow() {
  return (
    <div className="bg-white rounded-card border border-border px-4 py-[14px] flex items-center gap-[14px] animate-pulse">
      <div className="w-[40px] h-[40px] rounded-full bg-sand shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="h-[14px] w-3/4 bg-sand rounded-pill" />
        <div className="h-[12px] w-1/2 bg-sand rounded-pill" />
      </div>
      <div className="w-[16px] h-[16px] bg-sand rounded-pill shrink-0" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Conversation row                                                   */
/* ------------------------------------------------------------------ */
function ConversationRow({ item, fallback, onClick }) {
  const title =
    item.title ||
    item.messages?.[0]?.content?.slice(0, 40) ||
    fallback

  const time = item.createdAt ? relativeTime(item.createdAt) : ''
  const countLabel =
    item.messageCount != null ? ` · ${item.messageCount} messages` : ''

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-card border border-border px-4 py-[14px] flex items-center gap-[14px] cursor-pointer hover:bg-sand/30 transition-colors"
    >
      <SparkleIcon />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-ink1 truncate leading-snug">
          {title}
        </p>
        {(time || countLabel) && (
          <p className="text-[12px] text-ink3 mt-[2px]">
            {time}
            {countLabel}
          </p>
        )}
      </div>
      <ChevronRight />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  History screen                                                     */
/* ------------------------------------------------------------------ */
export default function History() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true)
      setError(null)
      try {
        const data = await api.history.list()
        setConversations(Array.isArray(data) ? data : data.data ?? [])
      } catch (err) {
        setError(err.message || 'Failed to load history')
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const filtered = conversations.filter((item) => {
    const title =
      item.title ||
      item.messages?.[0]?.content?.slice(0, 40) ||
      t('conversationFallback')
    return title.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <OrangeHeader
        title={t('historyTitle')}
        subtitle={t('historySub', conversations.length)}
      />

      {/* Wave separator */}
      <div className="-mt-[40px]">
        <Wave />
      </div>

      {/* Search bar */}
      <div className="px-5 py-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-ink3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchConversations')}
            className="w-full bg-white border-[1.5px] border-border-md rounded-pill py-[10px] pr-4 pl-10 text-[11px] text-ink1 placeholder:text-ink4 outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3 px-5 pb-[100px]">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-ink3 text-[14px]">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            {conversations.length === 0 ? (
              <>
                <div
                  className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#F5F3FF' }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#7C3AED"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" />
                  </svg>
                </div>
                <p className="text-ink2 text-[14px] font-medium">{t('noConversationsTitle')}</p>
                <p className="text-ink3 text-[13px] mt-1">
                  <Link to="/chat" className="text-orange underline">
                    {t('startConversation')}
                  </Link>
                </p>
              </>
            ) : (
              <p className="text-ink3 text-[14px]">{t('noConversationsMatch')}</p>
            )}
          </div>
        ) : (
          filtered.map((item) => (
            <ConversationRow
              key={item._id}
              item={item}
              fallback={t('conversationFallback')}
              onClick={() => navigate('/chat?id=' + item._id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
