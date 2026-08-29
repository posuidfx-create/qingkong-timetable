import { APP_VERSION } from "@/constants/appVersion"

export type ChangelogChangeType = "new" | "improved" | "fixed" | "security"
export interface ChangelogEntry { version: string; title: string; description: string; isCurrent?: boolean; changes: Array<{ type: ChangelogChangeType; text: string }> }
const changes = (items: string[], type: ChangelogChangeType = "improved") => items.map((text) => ({ type, text }))

export const changelog: readonly ChangelogEntry[] = [
  { version: APP_VERSION, title: "校园视觉焕新", description: "让晴空课表从课程工具进一步成为属于国际教育学院同学的校园学习生活小助手。", isCurrent: true, changes: changes(["明确“晴空课表”校园小助手产品定位", "加入大连东软信息学院与国际教育学院（中外合作办学）信息", "全新优化登录与注册页面", "优化课程表页面视觉层级与 24级 / 25级切换体验", "聊天、私聊、同学列表、待办与“我的”页面焕新", "完善深色模式与移动端、桌面端响应式体验"]) },
  { version: "2.2.0", title: "管理与聊天升级", description: "聊天、管理和学院事务提醒变得更加完整。", changes: [...changes(["全面优化群聊消息气泡与私聊实时消息体验", "增加明显的私聊入口、最近会话和未读提醒", "增加管理员发布待办：全部同学、24级、25级与指定同学", "管理员待办完成状态按用户独立保存，保留原有个人本地待办"]), ...changes(["修复超级管理员权限管理并强化 Supabase RLS 权限安全"], "security")] },
  { version: "2.1.0", title: "同学交流上线", description: "从这一版开始，晴空课表不再只是一个人的课表。", changes: [...changes(["新增公共、24级、25级聊天室与用户私聊", "新增实时消息、Presence 在线状态、私聊未读状态和同学列表", "支持查看同学年级与角色，管理员可进入两个年级聊天室", "用户所属年级与课表查看年级正式分离"], "new"), ...changes(["加强聊天室与私聊数据库权限隔离"], "security")] },
  { version: "2.0.0", title: "账号系统上线", description: "晴空课表正式拥有账号与用户体系。", changes: [...changes(["接入 Supabase，新增注册、登录、退出登录与用户资料", "新增所属年级与 user / admin / super_admin 角色体系", "新增超级管理员和用户列表", "保留原有本地课程、待办与设置数据"], "new"), ...changes(["新增 Supabase RLS 数据安全策略"], "security")] },
  { version: "1.4.0", title: "24/25级课表", description: "24级和25级同学都可以更方便地查看自己的课程安排。", changes: changes(["内置国际教育学院（中外合作办学）24级与25级课表", "新增 24级 / 25级快速切换与首次年级选择", "切换年级不会删除用户自己添加的课程", "Todo、统计和冲突检测支持当前年级内置课程"], "new") },
  { version: "1.3.0", title: "移动体验升级", description: "晴空课表开始真正像一个可以装进手机里的校园 App。", changes: changes(["支持 PWA 与应用图标", "优化移动端、320px 小屏、平板和桌面显示", "增加深色模式与离线课表使用体验", "优化 Bottom Navigation"], "improved") },
  { version: "1.2.0", title: "学习助手", description: "除了看课表，也开始帮助同学管理学习安排。", changes: changes(["新增个人待办：创建、编辑、删除、完成与课程关联", "增加今日与逾期判断", "新增课程、周负载、待办与冲突统计", "新增学期、作息、周末、数据导出恢复设置"], "new") },
  { version: "1.1.0", title: "课表增强", description: "让真实学校课表能够更方便地进入晴空课表。", changes: changes(["新增真实 Excel 课表导入", "支持教师、教室、课程周数、单双周与不同周次课程", "新增课程冲突检测", "支持手动添加、编辑、删除课程与课程卡片优化"], "new") },
  { version: "1.0.0", title: "晴空启程", description: "晴空课表，从一张简单的课程表开始。", changes: changes(["建立基础周课程表与课程时间展示", "建立移动端基础界面", "建立暖白与低饱和粉彩视觉风格", "建立课程颜色体系与基础数据存储"], "new") },
]
