import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { MessageCircle, Send, Trash2, UsersRound } from "lucide-react"

import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble"
import { RoleBadge } from "@/components/profile/RoleBadge"
import { UserAvatar } from "@/components/shared/UserAvatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { getAvailableRooms, getChatMessagePresentation, getRoomLabel, shouldSendChatOnEnter } from "@/lib/chat"
import { appendRoomMessage, deleteRoomMessage, fetchRoomMessages, sendRoomMessage, subscribeToRoomMessages } from "@/lib/chatService"
import { appendPrivateMessage, fetchPrivateConversations, fetchPrivateMessages, markPrivateMessagesRead, sendPrivateMessage, subscribeToPrivateMessages } from "@/lib/privateChat"
import { fetchProfiles } from "@/lib/profiles"
import { useAuthStore } from "@/store/authStore"
import type { Profile } from "@/types/auth"
import type { ChatMessage, ChatRoomType, PresenceUser, PrivateConversation, PrivateMessage } from "@/types/chat"

type ChatMode = "rooms" | "private"

function ConversationList({ conversations, onSelect }: { conversations: readonly PrivateConversation[]; onSelect: (conversation: PrivateConversation) => void }) {
  return <div className="space-y-1.5">{conversations.map((item) => <button className="flex min-h-14 w-full items-center justify-between gap-2 rounded-2xl border border-transparent p-2 text-left transition-colors duration-150 hover:border-border hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60" key={item.userId} onClick={() => onSelect(item)} type="button"><UserAvatar id={item.userId} name={item.username} className="size-9 rounded-xl text-xs" /><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="truncate text-sm font-semibold">{item.username}</span><RoleBadge role={item.role} /></div><p className="mt-0.5 truncate text-xs text-muted-foreground">{item.lastContent}</p></div><div className="shrink-0 text-right">{item.unreadCount > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] leading-5 text-primary-foreground">{item.unreadCount > 99 ? "99+" : item.unreadCount}</span>}</div></button>)}</div>
}

export function ChatPage({ onlineUsers, onUnreadHandled }: { onlineUsers: PresenceUser[]; onUnreadHandled: () => void }) {
  const profile = useAuthStore((state) => state.profile)
  const user = useAuthStore((state) => state.user)
  const rooms = useMemo(() => profile ? getAvailableRooms(profile) : ["public"] as ChatRoomType[], [profile])
  const [room, setRoom] = useState<ChatRoomType>("public")
  const activeRoom = rooms.includes(room) ? room : rooms[0]
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([])
  const [conversations, setConversations] = useState<PrivateConversation[]>([])
  const [privateTarget, setPrivateTarget] = useState<Profile | null>(null)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [usersOpen, setUsersOpen] = useState(false)
  const [mode, setMode] = useState<ChatMode>("rooms")
  const [roomDraft, setRoomDraft] = useState("")
  const [privateDraft, setPrivateDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [networkOnline, setNetworkOnline] = useState(() => navigator.onLine)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const messageListRef = useRef<HTMLDivElement>(null)
  const privateListRef = useRef<HTMLDivElement>(null)
  const wasNearBottom = useRef(true)

  const selectConversation = (conversation: PrivateConversation) => {
    setPrivateTarget({ id: conversation.userId, username: conversation.username, title: null, avatarUrl: null, role: conversation.role, cohortYear: conversation.cohortYear, createdAt: "" })
    setMode("private")
  }
  const selectRoom = (nextRoom: ChatRoomType) => { setRoom(nextRoom); setMode("rooms"); setPrivateTarget(null); setNewMessageCount(0) }
  const scrollToLatest = (ref: React.RefObject<HTMLDivElement | null>) => ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" })
  const checkScrollPosition = () => { const element = messageListRef.current; if (element) wasNearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 96 }

  useEffect(() => {
    let active = true
    void fetchRoomMessages(activeRoom).then((items) => { if (active) setMessages(items) }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "聊天暂不可用。") }).finally(() => { if (active) setLoading(false) })
    const channel = subscribeToRoomMessages(activeRoom, (message) => { if (!active) return; setMessages((items) => appendRoomMessage(items, message)); if (!wasNearBottom.current) setNewMessageCount((count) => count + 1) })
    return () => { active = false; void channel.unsubscribe() }
  }, [activeRoom])
  useEffect(() => { if (usersOpen) void fetchProfiles().then(setAllProfiles).catch((reason) => setError(reason instanceof Error ? reason.message : "无法读取同学列表。")) }, [usersOpen])
  useEffect(() => { void fetchPrivateConversations().then(setConversations).catch((reason) => setError(reason instanceof Error ? reason.message : "无法读取私聊会话。")) }, [])
  useEffect(() => { const updateNetwork = () => setNetworkOnline(navigator.onLine); window.addEventListener("online", updateNetwork); window.addEventListener("offline", updateNetwork); return () => { window.removeEventListener("online", updateNetwork); window.removeEventListener("offline", updateNetwork) } }, [])
  useEffect(() => {
    if (!privateTarget || !user) return
    let active = true
    void fetchPrivateMessages(privateTarget.id).then((items) => { if (active) setPrivateMessages(items) }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "无法读取私聊。") })
    void markPrivateMessagesRead(privateTarget.id).then(onUnreadHandled).catch(() => undefined)
    const channel = subscribeToPrivateMessages(user.id, privateTarget.id, (message) => { if (active) setPrivateMessages((items) => appendPrivateMessage(items, message)) })
    return () => { active = false; void channel.unsubscribe() }
  }, [privateTarget, user, onUnreadHandled])
  useEffect(() => { if (wasNearBottom.current) requestAnimationFrame(() => scrollToLatest(messageListRef)) }, [messages])
  useEffect(() => { requestAnimationFrame(() => scrollToLatest(privateListRef)) }, [privateMessages])

  if (!profile || !user) return <p className="text-sm text-muted-foreground">正在读取聊天资料…</p>

  const sendRoom = async () => { try { const message = await sendRoomMessage(activeRoom, roomDraft); setMessages((items) => appendRoomMessage(items, message)); setRoomDraft(""); wasNearBottom.current = true } catch (reason) { setError(reason instanceof Error ? reason.message : "发送失败。") } }
  const sendPrivate = async () => { if (!privateTarget) return; try { const message = await sendPrivateMessage(privateTarget.id, privateDraft); setPrivateMessages((items) => appendPrivateMessage(items, message)); setPrivateDraft("") } catch (reason) { setError(reason instanceof Error ? reason.message : "发送失败。") } }
  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>, send: () => Promise<void>) => { if (shouldSendChatOnEnter({ key: event.key, shiftKey: event.shiftKey, isComposing: event.nativeEvent.isComposing })) { event.preventDefault(); void send() } }
  const remove = async (id: string) => { if (!window.confirm("确定删除这条消息吗？")) return; try { await deleteRoomMessage(id); setMessages((items) => items.filter((item) => item.id !== id)) } catch (reason) { setError(reason instanceof Error ? reason.message : "删除失败。") } }
  const roomPresentation = getChatMessagePresentation(messages)
  const privatePresentation = getChatMessagePresentation(privateMessages)
  const onlineIds = new Set(onlineUsers.map((item) => item.userId))
  const roomDescription = activeRoom === "public" ? "国际教育学院同学都可以参与" : activeRoom === "cohort_2024" ? "24级同学专属" : "25级同学专属"
  const isPrivateView = mode === "private"
  const activeList = isPrivateView ? privatePresentation : roomPresentation
  const activeTargetName = isPrivateView ? privateTarget?.username : getRoomLabel(activeRoom)

  return <section className="mx-auto w-full max-w-md md:max-w-6xl" aria-labelledby="chat-title">
    <div className="mb-4 flex items-start justify-between gap-3 md:hidden"><div><div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary"><MessageCircle className="size-5" /></div><h2 id="chat-title" className="mt-3 text-2xl font-semibold">聊天</h2><p className="mt-1 text-sm text-muted-foreground">和同学聊聊课程与校园生活 · 在线 {onlineUsers.length} 人</p></div><Button aria-label="查看同学" className="mt-1 size-11" onClick={() => setUsersOpen(true)} size="icon" variant="secondary"><UsersRound /></Button></div>
    {!networkOnline && <p className="mb-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground" role="status">当前离线，聊天暂不可用。</p>}
    <div className="chat-layout overflow-hidden rounded-[24px] border bg-card shadow-xs md:grid md:h-[calc(100dvh-7.75rem)] md:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="hidden min-h-0 border-r bg-muted/25 p-3 md:flex md:flex-col"><div className="flex items-center justify-between"><div><h2 id="chat-title" className="text-lg font-semibold">聊天</h2><p className="text-xs text-muted-foreground">在线 {onlineUsers.length} 人</p></div><Button aria-label="查看同学" onClick={() => setUsersOpen(true)} size="icon-sm" variant="secondary"><UsersRound /></Button></div><p className="mt-5 px-2 text-xs font-semibold text-muted-foreground">聊天室</p><div className="mt-2 space-y-1">{rooms.map((item) => <button className={item === activeRoom && !isPrivateView ? "flex min-h-11 w-full items-center rounded-xl bg-primary/12 px-3 text-left text-sm font-semibold text-primary" : "flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-muted-foreground hover:bg-muted"} key={item} onClick={() => selectRoom(item)} type="button">{getRoomLabel(item)}</button>)}</div><p className="mt-6 px-2 text-xs font-semibold text-muted-foreground">最近私聊</p><div className="mt-2 min-h-0 flex-1 overflow-y-auto"><ConversationList conversations={conversations} onSelect={selectConversation} />{conversations.length === 0 && <p className="px-2 py-4 text-xs leading-5 text-muted-foreground">还没有私聊，去找同学聊聊吧。</p>}</div></aside>
      <div className="flex min-h-[calc(100dvh-11rem)] min-w-0 flex-col md:min-h-0"><div className="border-b p-3.5 md:p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold">{activeTargetName ?? "选择一位同学开始聊天"}</h3><p className="mt-1 text-xs text-muted-foreground">{isPrivateView ? privateTarget ? `${privateTarget.cohortYear === 2024 ? "24级" : privateTarget.cohortYear === 2025 ? "25级" : "未选择年级"} · ${onlineIds.has(privateTarget.id) ? "在线" : "离线"}` : "选择一位同学开始聊天" : roomDescription}</p></div><Button className="md:hidden" onClick={() => setUsersOpen(true)} size="sm" variant="secondary">同学</Button></div><div className="mt-3 flex gap-2 md:hidden"><Button onClick={() => { setMode("rooms"); setPrivateTarget(null) }} size="sm" variant={!isPrivateView ? "default" : "secondary"}>聊天室</Button><Button onClick={() => setMode("private")} size="sm" variant={isPrivateView ? "default" : "secondary"}>私聊</Button></div>{!isPrivateView && <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">{rooms.map((item) => <Button key={item} className="shrink-0" onClick={() => selectRoom(item)} size="sm" variant={activeRoom === item ? "default" : "secondary"}>{getRoomLabel(item).replace("聊天室", "")}</Button>)}</div>}</div>
        {isPrivateView && !privateTarget ? <div className="flex flex-1 flex-col items-center justify-center px-6 text-center"><MessageCircle className="size-8 text-primary/55" /><p className="mt-3 text-sm font-semibold">选择一位同学开始聊天</p><Button className="mt-4" onClick={() => setUsersOpen(true)} size="sm" variant="secondary">查看同学</Button></div> : <><div ref={isPrivateView ? privateListRef : messageListRef} onScroll={!isPrivateView ? checkScrollPosition : undefined} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5 md:p-4">{loading && !isPrivateView && <p className="py-8 text-center text-sm text-muted-foreground">正在加载消息…</p>}{activeList.map((presentation) => { const message = presentation.item; const own = message.senderId === user.id; const sender = message.sender; return <div className="group" key={message.id}>{presentation.dateDivider && <p className="my-4 flex items-center gap-3 text-center text-[11px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">{presentation.dateDivider}</p>}<div className="flex items-end gap-1"><ChatMessageBubble content={message.content} createdAt={message.createdAt} own={own} role={sender?.role} senderId={message.senderId} showSender={presentation.showSender} username={sender?.username ?? (own ? "我" : privateTarget?.username ?? "同学")} />{!isPrivateView && profile.role !== "user" && <Button aria-label="删除消息" className="mb-4 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100" onClick={() => void remove(message.id)} size="icon-xs" variant="ghost"><Trash2 /></Button>}</div></div> })}{!loading && !isPrivateView && messages.length === 0 && <div className="py-12 text-center"><p className="text-sm font-semibold">{activeRoom === "public" ? "还没有人说话，来打个招呼吧" : `${activeRoom === "cohort_2024" ? "24" : "25"}级聊天室还很安静`}</p></div>}</div>{newMessageCount > 0 && !isPrivateView && <button className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-full border bg-card px-3 py-2 text-xs font-semibold text-primary shadow-sm" onClick={() => { wasNearBottom.current = true; setNewMessageCount(0); scrollToLatest(messageListRef) }} type="button">有新消息 ↓</button>}<form className="flex items-end gap-2 border-t bg-card p-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void (isPrivateView ? sendPrivate() : sendRoom()) }}><Textarea aria-label={isPrivateView ? "私聊消息" : "聊天消息"} className="h-11 min-h-11 max-h-28 min-w-0 flex-1 resize-none py-2.5 text-sm" disabled={!networkOnline || isPrivateView && !privateTarget} maxLength={2000} onChange={(event) => isPrivateView ? setPrivateDraft(event.target.value) : setRoomDraft(event.target.value)} onKeyDown={(event) => onComposerKeyDown(event, isPrivateView ? sendPrivate : sendRoom)} placeholder="说点什么…" rows={1} value={isPrivateView ? privateDraft : roomDraft} /><Button aria-label="发送消息" className="size-11 shrink-0" disabled={!networkOnline || isPrivateView && !privateTarget} size="icon" type="submit"><Send /></Button></form></>}</div>
    </div>
    {error && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-xs text-destructive" role="alert">{error}</p>}
    <Sheet open={usersOpen} onOpenChange={setUsersOpen}><SheetContent side="bottom" className="responsive-bottom-sheet max-h-[88dvh] rounded-t-3xl"><SheetHeader><SheetTitle>同学列表</SheetTitle><SheetDescription>在线 {onlineUsers.length} 人 · 可发起私聊</SheetDescription></SheetHeader><div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">{allProfiles.filter((item) => item.id !== user.id).map((item) => <button key={item.id} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border p-3 text-left" onClick={() => { setPrivateTarget(item); setMode("private"); setUsersOpen(false) }} type="button"><UserAvatar id={item.id} name={item.username} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{item.username}</span><RoleBadge role={item.role} /></div>{item.title && <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.title}</p>}<p className="mt-1 text-xs text-muted-foreground">{item.cohortYear === 2024 ? "24级" : item.cohortYear === 2025 ? "25级" : "未选择年级"} · {onlineIds.has(item.id) ? "在线" : "离线"}</p></div><span className="text-xs font-semibold text-primary">发消息</span></button>)}</div></SheetContent></Sheet>
  </section>
}
