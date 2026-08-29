import { useEffect, useMemo, useState, type FormEvent } from "react"
import { MessageCircle, Send, Trash2, UsersRound } from "lucide-react"

import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble"
import { RoleBadge } from "@/components/profile/RoleBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { appendRoomMessage, deleteRoomMessage, fetchRoomMessages, sendRoomMessage, subscribeToRoomMessages } from "@/lib/chatService"
import { getAvailableRooms, getRoomLabel } from "@/lib/chat"
import { appendPrivateMessage, fetchPrivateConversations, fetchPrivateMessages, markPrivateMessagesRead, sendPrivateMessage, subscribeToPrivateMessages } from "@/lib/privateChat"
import { fetchProfiles } from "@/lib/profiles"
import { useAuthStore } from "@/store/authStore"
import type { Profile } from "@/types/auth"
import type { ChatMessage, ChatRoomType, PresenceUser, PrivateConversation, PrivateMessage } from "@/types/chat"

export function ChatPage({ onlineUsers, onUnreadHandled }: { onlineUsers: PresenceUser[]; onUnreadHandled: () => void }) {
  const profile = useAuthStore((state) => state.profile)
  const user = useAuthStore((state) => state.user)
  const rooms = useMemo(() => profile ? getAvailableRooms(profile) : ["public"] as ChatRoomType[], [profile])
  const [room, setRoom] = useState<ChatRoomType>("public")
  const activeRoom = rooms.includes(room) ? room : rooms[0]
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [usersOpen, setUsersOpen] = useState(false)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [privateTarget, setPrivateTarget] = useState<Profile | null>(null)
  const [viewTarget, setViewTarget] = useState<Profile | null>(null)
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([])
  const [privateDraft, setPrivateDraft] = useState("")
  const [networkOnline, setNetworkOnline] = useState(() => navigator.onLine)
  const [chatMode, setChatMode] = useState<"rooms" | "private">("rooms")
  const [conversations, setConversations] = useState<PrivateConversation[]>([])

  useEffect(() => {
    let active = true
    void fetchRoomMessages(activeRoom).then((items) => { if (active) setMessages(items) }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "聊天暂不可用。") }).finally(() => { if (active) setLoading(false) })
    const channel = subscribeToRoomMessages(activeRoom, (message) => { if (active) setMessages((items) => appendRoomMessage(items, message)) })
    return () => { active = false; void channel.unsubscribe() }
  }, [activeRoom])
  useEffect(() => { if (usersOpen) void fetchProfiles().then(setAllProfiles).catch((reason) => setError(reason instanceof Error ? reason.message : "无法读取用户列表。")) }, [usersOpen])
  useEffect(() => { if (chatMode === "private") void fetchPrivateConversations().then(setConversations).catch((reason) => setError(reason instanceof Error ? reason.message : "无法读取私聊会话。")) }, [chatMode])
  useEffect(() => { const updateNetwork = () => setNetworkOnline(navigator.onLine); window.addEventListener("online", updateNetwork); window.addEventListener("offline", updateNetwork); return () => { window.removeEventListener("online", updateNetwork); window.removeEventListener("offline", updateNetwork) } }, [])
  useEffect(() => {
    if (!privateTarget || !user) return
    let active = true
    void fetchPrivateMessages(privateTarget.id).then((items) => { if (active) setPrivateMessages(items) }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "无法读取私聊。") })
    void markPrivateMessagesRead(privateTarget.id).then(onUnreadHandled).catch(() => undefined)
    const channel = subscribeToPrivateMessages(user.id, privateTarget.id, (message) => { if (active) setPrivateMessages((items) => appendPrivateMessage(items, message)) })
    return () => { active = false; void channel.unsubscribe() }
  }, [privateTarget, user, onUnreadHandled])
  if (!profile || !user) return <p className="text-sm text-muted-foreground">正在读取聊天资料…</p>

  const submitRoom = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); try { const message = await sendRoomMessage(activeRoom, draft); setMessages((items) => appendRoomMessage(items, message)); setDraft("") } catch (reason) { setError(reason instanceof Error ? reason.message : "发送失败。") } }
  const submitPrivate = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!privateTarget) return; try { const message = await sendPrivateMessage(privateTarget.id, privateDraft); setPrivateMessages((items) => appendPrivateMessage(items, message)); setPrivateDraft("") } catch (reason) { setError(reason instanceof Error ? reason.message : "发送失败。") } }
  const remove = async (id: string) => { try { await deleteRoomMessage(id); setMessages((items) => items.filter((item) => item.id !== id)) } catch (reason) { setError(reason instanceof Error ? reason.message : "删除失败。") } }
  const onlineIds = new Set(onlineUsers.map((item) => item.userId))

  if (chatMode === "private") return <section className="mx-auto w-full max-w-md" aria-labelledby="chat-title"><div className="flex items-center justify-between gap-3"><div><h2 id="chat-title" className="text-2xl font-semibold">私聊</h2><p className="mt-1 text-sm text-muted-foreground">和同学聊聊课程与校园生活。</p></div><Button onClick={() => setChatMode("rooms")} size="sm" variant="secondary">聊天室</Button></div><div className="mt-4 flex gap-2"><Button onClick={() => setChatMode("rooms")} size="sm" variant="secondary">聊天室</Button><Button size="sm">私聊 {conversations.reduce((total, item) => total + item.unreadCount, 0) || ""}</Button></div><div className="mt-4 space-y-2">{conversations.map((item) => <button className="flex w-full items-center justify-between gap-3 rounded-[20px] border bg-card p-3 text-left shadow-xs" key={item.userId} onClick={() => { setPrivateTarget({ id: item.userId, username: item.username, avatarUrl: null, role: item.role, cohortYear: item.cohortYear, createdAt: "" }); setChatMode("rooms") }} type="button"><div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{item.username}</span><RoleBadge role={item.role} /></div><p className="mt-1 truncate text-xs text-muted-foreground">{item.lastContent}</p></div><div className="shrink-0 text-right"><time className="block text-[11px] text-muted-foreground">{new Date(item.lastCreatedAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</time>{item.unreadCount > 0 && <span className="mt-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground">{item.unreadCount > 99 ? "99+" : item.unreadCount}</span>}</div></button>)}{conversations.length === 0 && <div className="rounded-[22px] border bg-card p-7 text-center"><p className="text-sm font-semibold">还没有私聊</p><p className="mt-1 text-xs text-muted-foreground">去找同学聊聊吧</p><Button className="mt-4" onClick={() => setChatMode("rooms")} size="sm" variant="secondary">查看同学</Button></div>}</div></section>

  return <section className="mx-auto flex min-h-[calc(100dvh-9.5rem)] w-full max-w-md flex-col" aria-labelledby="chat-title"><div className="flex items-start justify-between gap-3"><div><div className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary"><MessageCircle className="size-5" /></div><h2 id="chat-title" className="mt-3 text-2xl font-semibold">聊天</h2><p className="mt-1 text-sm text-muted-foreground">和同学聊聊课程与校园生活 · 在线 {onlineUsers.length} 人</p></div><Button aria-label="查看同学" className="mt-1 size-11" onClick={() => setUsersOpen(true)} size="icon" variant="secondary"><UsersRound /></Button></div>{!networkOnline && <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground" role="status">当前离线，聊天暂不可用。</p>}<div className="mt-4 flex gap-2"><Button size="sm">聊天室</Button><Button onClick={() => setChatMode("private")} size="sm" variant="secondary">私聊</Button></div><div className="mt-3 flex gap-2 overflow-x-auto pb-1">{rooms.map((item) => <Button key={item} className="shrink-0" onClick={() => setRoom(item)} size="sm" variant={activeRoom === item ? "default" : "secondary"}>{getRoomLabel(item).replace("聊天室", "")}</Button>)}</div><p className="mt-1 text-xs text-muted-foreground">{activeRoom === "public" ? "国际教育学院同学都可以参与" : activeRoom === "cohort_2024" ? "24级同学专属" : "25级同学专属"}</p><div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-[22px] border bg-card p-3">{loading && <p className="py-8 text-center text-sm text-muted-foreground">正在加载消息…</p>}{messages.map((message) => { const own = message.senderId === user.id; return <div className="space-y-1" key={message.id}><ChatMessageBubble content={message.content} createdAt={message.createdAt} own={own} role={message.sender?.role} username={message.sender?.username ?? "同学"} />{profile.role !== "user" && <Button aria-label="删除消息" className={own ? "ml-auto block" : "block"} onClick={() => void remove(message.id)} size="icon-xs" variant="ghost"><Trash2 /></Button>}</div>})}{!loading && messages.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">还没有人说话，来打个招呼吧</p>}</div>{error && <p className="mt-2 rounded-xl bg-destructive/10 p-2 text-xs text-destructive" role="alert">{error}</p>}<form className="sticky bottom-0 mt-3 flex gap-2 border-t bg-background py-3 [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]" onSubmit={submitRoom}><Input aria-label="聊天消息" className="h-11 min-w-0 flex-1" disabled={!networkOnline} maxLength={2000} onChange={(event) => setDraft(event.target.value)} placeholder="说点什么…" value={draft} /><Button aria-label="发送消息" className="size-11" disabled={!networkOnline} size="icon" type="submit"><Send /></Button></form>
    <Sheet open={usersOpen} onOpenChange={setUsersOpen}><SheetContent side="bottom" className="responsive-bottom-sheet max-h-[88dvh] rounded-t-3xl"><SheetHeader><SheetTitle>用户</SheetTitle><SheetDescription>在线 {onlineUsers.length} 人 · 可发起私聊</SheetDescription></SheetHeader><div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">{allProfiles.filter((item) => item.id !== user.id).map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-2xl border p-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-sm font-medium">{item.username}</span><RoleBadge role={item.role} /></div><p className="mt-1 text-xs text-muted-foreground">{item.cohortYear ? `${item.cohortYear === 2024 ? "24" : "25"}级` : "未选择年级"} · {onlineIds.has(item.id) ? "在线" : "离线"}</p></div><div className="flex shrink-0 gap-1"><Button onClick={() => setViewTarget(item)} size="sm" variant="secondary">资料</Button><Button onClick={() => { setPrivateTarget(item); setUsersOpen(false) }} size="sm">发消息</Button></div></div>)}</div></SheetContent></Sheet>
    <Sheet open={Boolean(viewTarget)} onOpenChange={(open) => { if (!open) setViewTarget(null) }}><SheetContent side="bottom" className="responsive-bottom-sheet rounded-t-3xl"><SheetHeader><SheetTitle>{viewTarget?.username ?? "用户资料"}</SheetTitle><SheetDescription>仅展示公开的基础资料。</SheetDescription></SheetHeader><div className="space-y-3 px-4 pb-5"><RoleBadge role={viewTarget?.role ?? "user"} /><p className="text-sm text-muted-foreground">{viewTarget?.cohortYear ? `${viewTarget.cohortYear === 2024 ? "24" : "25"}级` : "暂未选择年级"} · {viewTarget && onlineIds.has(viewTarget.id) ? "在线" : "离线"}</p>{viewTarget && <Button className="w-full" onClick={() => { setPrivateTarget(viewTarget); setViewTarget(null) }}>发起私聊</Button>}</div></SheetContent></Sheet>
    <Sheet open={Boolean(privateTarget)} onOpenChange={(open) => { if (!open) setPrivateTarget(null) }}><SheetContent side="bottom" className="responsive-bottom-sheet max-h-[92dvh] rounded-t-3xl"><SheetHeader><SheetTitle>与 {privateTarget?.username ?? "同学"} 私聊</SheetTitle><SheetDescription>{privateTarget && onlineIds.has(privateTarget.id) ? "在线" : "离线"} · {privateTarget?.cohortYear === 2024 ? "24级" : privateTarget?.cohortYear === 2025 ? "25级" : "未选择年级"}</SheetDescription></SheetHeader><div className="flex min-h-0 flex-1 flex-col px-4"><div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-3">{privateMessages.map((message) => <ChatMessageBubble content={message.content} createdAt={message.createdAt} key={message.id} own={message.senderId === user.id} role={message.sender?.role} username={message.sender?.username ?? privateTarget?.username ?? "同学"} />)}</div><form className="flex gap-2 border-t py-3 [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]" onSubmit={submitPrivate}><Input aria-label="私聊消息" className="h-11 min-w-0 flex-1" maxLength={2000} onChange={(event) => setPrivateDraft(event.target.value)} placeholder="发送私聊消息…" value={privateDraft} /><Button aria-label="发送私聊消息" className="size-11" size="icon" type="submit"><Send /></Button></form></div></SheetContent></Sheet>
  </section>
}
