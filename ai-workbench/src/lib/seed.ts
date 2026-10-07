import type {
  Client,
  Payment,
  Project,
  Quote,
  Service,
  Settings,
  Todo,
  Tool,
  WorkbenchData,
} from "./types";
import { addDays, toDateKey } from "./utils";

export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: Settings = {
  businessName: "AI 创意工作室",
  ownerName: "",
  contact: "微信：your-wechat",
  quoteFooter: "报价有效期内确认可锁定排期。确认后支付 50% 定金开工，交付验收后支付尾款。",
  replyReminderDays: 2,
  dueSoonDays: 3,
};

/**
 * 生成示例数据。所有日期相对 now 计算，任何时候打开都"像是正在使用中"。
 */
export function createSeedData(now = new Date()): WorkbenchData {
  const day = (offset: number) => toDateKey(addDays(now, offset));
  const ts = (offset: number, hour = 10) => {
    const d = addDays(now, offset);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const base = (id: string, offset: number) => ({ id, createdAt: ts(offset), updatedAt: ts(offset) });

  const tools: Tool[] = [
    t("chatgpt", "ChatGPT", "大语言模型", "https://chatgpt.com", "文案、提示词、头脑风暴、图像编辑", "免费 / Plus $20/月", false, false, ["image", "document", "report", "operation", "website"], "日常主力，GPT 图像编辑适合改字和小修", 5),
    t("claude", "Claude", "大语言模型", "https://claude.ai", "长文写作、代码、文档分析", "免费 / Pro $20/月", false, false, ["document", "website", "agent", "report", "knowledge", "consulting"], "写代码和长文质量最好，适合交付级内容", 5),
    t("codex", "Codex", "AI 编程", "https://openai.com/codex", "自动编写代码、修 Bug、写测试", "随 ChatGPT 订阅", false, false, ["website", "agent", "workflow", "devenv"], "适合并行处理多个小任务", 4),
    t("gemini", "Gemini", "大语言模型", "https://gemini.google.com", "深度研究、长上下文、多模态", "免费 / Advanced", false, false, ["report", "knowledge", "document"], "Deep Research 写行业报告初稿很省时间", 4),
    t("deepseek", "DeepSeek", "大语言模型", "https://chat.deepseek.com", "中文写作、推理、低成本 API", "免费 / API 极低价", true, true, ["document", "report", "knowledge", "workflow", "operation"], "API 便宜，适合批量内容与低预算项目", 4),
    t("midjourney", "Midjourney", "AI 绘画", "https://www.midjourney.com", "海报、封面、插画、概念图", "$10–$60/月", false, false, ["image", "operation"], "审美最好，商用需付费订阅", 5),
    t("flux", "Flux", "AI 绘画", "https://blackforestlabs.ai", "文生图、文字渲染、局部重绘", "开源 / API 按量", true, true, ["image", "operation"], "文字渲染能力强，配合 ComfyUI 本地跑", 4),
    t("kling", "Kling 可灵", "AI 视频", "https://klingai.com", "文生视频、图生视频", "积分制，月卡约 ¥66 起", false, false, ["video", "operation"], "国内可用，动态效果好，积分消耗快", 4),
    t("minimax", "MiniMax 海螺", "AI 视频/语音", "https://hailuoai.com", "视频生成、语音合成", "免费额度 / 会员", false, false, ["video"], "人物动作自然，可作为可灵的备选", 4),
    t("elevenlabs", "ElevenLabs", "AI 语音", "https://elevenlabs.io", "配音、声音克隆、多语言", "免费 / $5 起", false, false, ["video", "operation"], "英文配音最佳，中文也可用", 4),
    t("dify", "Dify", "AI 应用平台", "https://dify.ai", "知识库、工作流、Agent 编排", "开源 / 云版免费额度", true, true, ["knowledge", "agent", "workflow"], "私有化部署交付给企业客户的首选", 5),
    t("coze", "Coze 扣子", "AI 应用平台", "https://www.coze.cn", "零代码 Bot、工作流、发布到微信/飞书", "免费为主", false, false, ["agent", "workflow", "knowledge"], "上手最快，适合预算低的 Bot 项目", 4),
    t("remotion", "Remotion", "视频开发", "https://www.remotion.dev", "用 React 代码批量生成视频", "开源（商用需授权）", true, true, ["video", "operation"], "适合做可复用的视频模板", 4),
    t("ffmpeg", "FFmpeg", "音视频工具", "https://ffmpeg.org", "剪辑、转码、压制、加字幕", "免费开源", true, true, ["video", "operation"], "命令行神器，批处理必备", 5),
    t("moneyprinterturbo", "MoneyPrinterTurbo", "AI 视频", "https://github.com/harry0703/MoneyPrinterTurbo", "一键生成口播类短视频", "免费开源", true, true, ["video", "operation"], "低预算批量短视频，质量一般需人工把关", 3),
    t("openmontage", "OpenMontage", "AI 视频", "https://github.com/search?q=OpenMontage", "AI 自动剪辑与素材拼接", "免费开源", true, true, ["video"], "实验性工具，适合自动粗剪", 3),
    t("comfyui", "ComfyUI", "AI 绘画", "https://github.com/comfyanonymous/ComfyUI", "节点式本地出图工作流", "免费开源", true, true, ["image", "devenv"], "环境配置类订单经常装这个", 4),
    t("cursor", "Cursor", "AI 编程", "https://cursor.com", "AI 代码编辑器", "免费 / Pro $20/月", false, true, ["website", "devenv"], "做网站项目时搭配 Claude 使用", 4),
    t("n8n", "n8n", "自动化", "https://n8n.io", "可视化自动化工作流", "开源 / 云版付费", true, true, ["workflow", "agent"], "对接各类 SaaS 比 Dify 更灵活", 4),
    t("suno", "Suno", "AI 音乐", "https://suno.com", "生成背景音乐与歌曲", "免费 / $10/月", false, false, ["video", "operation"], "商用需付费计划", 3),
  ];

  function t(
    key: string,
    name: string,
    category: string,
    url: string,
    usage: string,
    pricing: string,
    openSource: boolean,
    local: boolean,
    suitableFor: Tool["suitableFor"],
    experience: string,
    rating: number,
  ): Tool {
    return { ...base(`tool_${key}`, -90), name, category, url, usage, pricing, openSource, local, suitableFor, experience, rating, notes: "" };
  }

  const services: Service[] = [
    s("poster", "AI海报", "image", 200, 2, "海报 1 张（2 个初稿方向）+ 高清 PNG + 可编辑源文件", 3, "门店开业、活动推广、电商促销", ["Midjourney", "Flux", "ChatGPT"], "中文大字建议后期排版，避免 AI 错字"),
    s("xhs", "小红书封面", "image", 40, 0.5, "3:4 封面图，单张或月包", 2, "博主、品牌号、知识博主", ["Midjourney", "Flux"], "注意平台尺寸 1242×1660，文字要大要醒目"),
    s("gzh", "公众号配图", "image", 60, 0.8, "首图 900×383 + 次图 + 文中插图", 2, "公众号运营者、企业号", ["Midjourney", "ChatGPT"], "保持一个系列的统一风格"),
    s("video", "短视频", "video", 600, 8, "15–60 秒成片 + 字幕 + 配乐 + 工程文件", 2, "电商、品牌宣传、知识口播", ["Kling", "ElevenLabs", "FFmpeg"], "先确认脚本再生成，视频积分成本高"),
    s("ppt", "PPT优化", "document", 15, 0.3, "按页计价：版式重排、配图、图表美化", 2, "职场汇报、路演、课程", ["Claude", "ChatGPT"], "基础价按页，内容重写另计"),
    s("resume", "简历优化", "document", 199, 2, "中文简历 1 份（Word+PDF）+ 修改建议", 2, "应届生、跳槽者", ["Claude", "ChatGPT"], "工作经历必须真实，只做表达优化"),
    s("website", "AI网站", "website", 2000, 16, "响应式网站 + 部署上线 + 源码", 3, "小微企业、民宿、个人品牌", ["Claude", "Codex", "Cursor"], "合同写清页面数与功能，防止范围蔓延"),
    s("kb", "AI知识库", "knowledge", 1500, 12, "知识库搭建 + 问答机器人 + 使用文档", 2, "企业内部、培训机构、客服团队", ["Dify", "Claude", "DeepSeek"], "API 费用由客户承担需写明"),
    s("agent", "AI Agent", "agent", 2500, 16, "定制 Agent + 工具接入 + 测试报告", 2, "电商客服、销售助理、运营自动化", ["Dify", "Claude", "Coze"], "验收标准量化：成功率/测试用例"),
    s("report", "行业报告", "report", 800, 10, "5000–10000 字报告 + 图表 + 数据来源", 2, "咨询顾问、创业者、学生", ["Gemini", "Claude"], "数据必须核实并标注来源"),
    s("workflow", "AI工作流", "workflow", 1000, 8, "自动化工作流 + 流程图 + 操作手册", 2, "内容团队、电商、行政", ["Dify", "n8n", "Coze"], "需要客户提供账号与 API 权限"),
    s("ops", "AI内容代运营", "operation", 3000, 20, "月度内容规划 + 20 条内容生产 + 周报复盘", 1, "实体门店、品牌号、个人 IP", ["ChatGPT", "Midjourney", "Kling"], "按月结算，提前约定 KPI 与内容数量"),
    s("devenv", "AI环境配置", "devenv", 200, 2, "远程安装配置 + 验证 + 使用文档", 1, "设计师、开发者、学生", ["ComfyUI", "Claude"], "远程前确认备份与硬件条件"),
    s("acceptance", "AI项目验收", "consulting", 500, 4, "验收报告 + 问题清单 + 复验", 1, "外包项目甲方、创业团队", ["Claude", "Codex"], "先书面确认验收标准"),
  ];

  function s(
    key: string,
    name: string,
    category: Service["category"],
    basePrice: number,
    estimatedHours: number,
    deliverables: string,
    defaultRevisions: number,
    targetCustomers: string,
    recommendedTools: string[],
    cautions: string,
  ): Service {
    return { ...base(`svc_${key}`, -90), name, category, basePrice, estimatedHours, deliverables, defaultRevisions, targetCustomers, recommendedTools, cautions, active: true };
  }

  const clients: Client[] = [
    c("lin", "林小姐", "xiaohongshu", ["回头客"], { wechat: "lin_coffee", company: "拾光咖啡", notes: "喜欢日系简约风" }, -80),
    c("echo", "Echo", "xiaohongshu", ["博主", "高价值", "回头客"], { wechat: "echo_beauty", phone: "13800001111", notes: "美妆博主，5万粉，长期合作" }, -60),
    c("edu", "王老师", "wechat", ["企业"], { wechat: "wang_edu", company: "启明教育", email: "wang@qiming-edu.com" }, -50),
    c("shop", "陈老板", "taobao", ["电商", "急单"], { wechat: "chen_shop", phone: "13900002222", company: "陈记家居旗舰店" }, -45),
    c("office", "张晓", "xianyu", ["个人"], { wechat: "zx_2024" }, -30),
    c("grad", "李同学", "xianyu", ["学生"], { email: "li.student@example.com", notes: "目标岗位：产品经理" }, -42),
    c("bnb", "周姐", "referral", ["高价值"], { wechat: "zhou_bnb", company: "山居民宿", notes: "朋友小赵介绍" }, -35),
    c("tech", "刘经理", "zbj", ["企业", "高价值"], { phone: "13700003333", email: "liu@yunfan-tech.com", company: "云帆科技" }, -12),
    c("food", "赵总", "douyin", ["企业", "长期"], { wechat: "zhao_food", company: "老赵火锅" }, -28),
    c("designer", "阿杰", "xianyu", ["个人"], { wechat: "ajie_design", notes: "RTX 4070，Windows 11" }, -5),
  ];

  function c(
    key: string,
    name: string,
    channel: Client["channel"],
    tags: string[],
    extra: Partial<Client>,
    offset: number,
  ): Client {
    return { ...base(`cli_${key}`, offset), name, channel, tags, ...extra };
  }

  type P = Partial<Project> & Pick<Project, "name" | "clientId" | "status">;
  const p = (key: string, offset: number, data: P): Project => ({
    ...base(`prj_${key}`, offset),
    requirement: "",
    priority: "medium",
    quality: "standard",
    maxRevisions: 2,
    deliverables: [],
    revisions: [],
    statusChangedAt: ts(offset),
    ...data,
  });

  const projects: Project[] = [
    p("coffee", -25, {
      name: "咖啡店开业海报", clientId: "cli_lin", serviceId: "svc_poster", status: "completed", priority: "medium",
      requirement: "开业活动海报，A3 尺寸用于门店张贴，同时出一版朋友圈竖图。日系简约风，主色奶咖色。",
      budget: 300, quotedPrice: 300, finalPrice: 300, startDate: day(-25), dueDate: day(-21),
      statusChangedAt: ts(-18), completedAt: ts(-18),
      deliverables: [
        { id: "dl_coffee1", type: "netdisk", label: "百度网盘-最终版", url: "https://pan.baidu.com/s/example-coffee", isFinal: true, createdAt: ts(-19) },
      ],
      revisions: [
        { id: "rv_coffee1", version: 1, clientFeedback: "整体喜欢，希望 logo 再大一点", changes: "放大 logo，调整标题字距", createdAt: ts(-22) },
        { id: "rv_coffee2", version: 2, clientFeedback: "可以了，再出一版朋友圈尺寸", changes: "新增 1080×1920 竖版", createdAt: ts(-20) },
      ],
    }),
    p("echo-cover", -6, {
      name: "小红书封面月包（20张）", clientId: "cli_echo", serviceId: "svc_xhs", status: "in_progress", priority: "high",
      requirement: "10 月份 20 张美妆笔记封面，统一系列感，每周交付 5 张。", budget: 800, quotedPrice: 800, finalPrice: 800,
      startDate: day(-5), dueDate: day(3), statusChangedAt: ts(-5), maxRevisions: 2,
      deliverables: [{ id: "dl_echo1", type: "gdrive", label: "第1周 5 张", url: "https://drive.google.com/drive/folders/example-echo", isFinal: false, createdAt: ts(-2) }],
    }),
    p("edu-images", -9, {
      name: "公众号系列配图", clientId: "cli_edu", serviceId: "svc_gzh", status: "client_review", priority: "medium",
      requirement: "4 篇招生推文的首图和次图，扁平插画风，需要包含机构 logo。", budget: 500, quotedPrice: 480, finalPrice: 450,
      startDate: day(-8), dueDate: day(2), statusChangedAt: ts(-3),
      revisions: [{ id: "rv_edu1", version: 1, clientFeedback: "人物太卡通，希望更写实一点", changes: "改为半写实插画风", createdAt: ts(-4) }],
    }),
    p("shop-video", -12, {
      name: "产品宣传短视频 30s", clientId: "cli_shop", serviceId: "svc_video", status: "revising", priority: "urgent", quality: "premium",
      requirement: "新款实木餐桌 30 秒宣传视频，用于淘宝主图视频和抖音投放。需要配音和字幕。", budget: 1500, quotedPrice: 1600, finalPrice: 1500,
      startDate: day(-10), dueDate: day(-1), statusChangedAt: ts(-1), maxRevisions: 2,
      deliverables: [{ id: "dl_shop1", type: "link", label: "第2版预览", url: "https://example.com/preview/table-v2.mp4", isFinal: false, createdAt: ts(-2) }],
      revisions: [
        { id: "rv_shop1", version: 1, clientFeedback: "节奏太慢，开头 3 秒要抓人", changes: "重剪开头，加入产品特写", createdAt: ts(-5) },
        { id: "rv_shop2", version: 2, clientFeedback: "配音换成女声，结尾加优惠信息", changes: "更换 ElevenLabs 女声，结尾加价格卡", createdAt: ts(-2) },
      ],
    }),
    p("ppt", -8, {
      name: "年终汇报 PPT 优化（20页）", clientId: "cli_office", serviceId: "svc_ppt", status: "delivered", priority: "medium",
      requirement: "20 页年终汇报 PPT 美化，内容不改，统一配色和图表。", budget: 300, quotedPrice: 300, finalPrice: 280,
      startDate: day(-7), dueDate: day(-3), statusChangedAt: ts(-3),
      deliverables: [{ id: "dl_ppt1", type: "file", label: "年终汇报_优化版.pptx", url: "https://pan.quark.cn/s/example-ppt", isFinal: true, createdAt: ts(-3) }],
    }),
    p("resume", -40, {
      name: "产品经理简历优化", clientId: "cli_grad", serviceId: "svc_resume", status: "completed", priority: "low",
      requirement: "应届生简历，目标互联网产品经理岗，突出实习项目。", budget: 199, quotedPrice: 199, finalPrice: 199,
      startDate: day(-40), dueDate: day(-37), statusChangedAt: ts(-36), completedAt: ts(-36),
    }),
    p("bnb-site", -32, {
      name: "山居民宿官网", clientId: "cli_bnb", serviceId: "svc_website", status: "in_progress", priority: "high",
      requirement: "民宿官网：首页、房型、预订咨询、周边玩法、联系方式。手机端优先，需要接入微信咨询。", budget: 4000, quotedPrice: 3800, finalPrice: 3800,
      startDate: day(-30), dueDate: day(10), statusChangedAt: ts(-30), maxRevisions: 3,
      deliverables: [{ id: "dl_bnb1", type: "github", label: "源码仓库", url: "https://github.com/example/shanju-bnb", isFinal: false, createdAt: ts(-20) }],
    }),
    p("tech-kb", -10, {
      name: "企业内部知识库", clientId: "cli_tech", serviceId: "svc_kb", status: "confirming", priority: "high", quality: "premium",
      requirement: "200+ 份产品文档搭建内部问答知识库，私有化部署，员工通过飞书访问。", budget: 7000, quotedPrice: 6800,
      dueDate: day(30), statusChangedAt: ts(-4),
    }),
    p("cs-agent", -1, {
      name: "抖店智能客服 Agent", clientId: "cli_food", serviceId: "svc_agent", status: "quoting", priority: "medium",
      requirement: "处理团购券咨询、门店地址、营业时间、预约，复杂问题转人工。", budget: 3000, dueDate: day(20), statusChangedAt: ts(-1),
    }),
    p("echo-flow", -4, {
      name: "小红书笔记自动化工作流", clientId: "cli_echo", serviceId: "svc_workflow", status: "communicating", priority: "low",
      requirement: "想要选题→文案→封面的半自动流程，还在了解阶段。", budget: 1200, statusChangedAt: ts(-3),
    }),
    p("ev-report", -75, {
      name: "新能源汽车行业报告", clientId: "cli_edu", serviceId: "svc_report", status: "completed", priority: "medium", quality: "premium",
      requirement: "8000 字新能源汽车产业链分析，含图表与数据来源。", budget: 1200, quotedPrice: 1200, finalPrice: 1200,
      startDate: day(-75), dueDate: day(-65), statusChangedAt: ts(-62), completedAt: ts(-62),
    }),
    p("food-ops", -28, {
      name: "抖音账号代运营（月度）", clientId: "cli_food", serviceId: "svc_ops", status: "in_progress", priority: "high",
      requirement: "每月 20 条短视频选题+脚本+剪辑，周报复盘。", budget: 5000, quotedPrice: 4500, finalPrice: 4500,
      startDate: day(-26), dueDate: day(24), statusChangedAt: ts(-26),
    }),
    p("comfy", -3, {
      name: "ComfyUI 本地部署", clientId: "cli_designer", serviceId: "svc_devenv", status: "completed", priority: "medium",
      requirement: "Windows 安装 ComfyUI + Flux 模型 + 常用插件，远程操作。", budget: 260, quotedPrice: 260, finalPrice: 260,
      startDate: day(-2), dueDate: day(-2), statusChangedAt: ts(-2), completedAt: ts(-2),
    }),
    p("miniapp-check", -70, {
      name: "小程序外包项目验收", clientId: "cli_bnb", serviceId: "svc_acceptance", status: "cancelled", priority: "low",
      requirement: "帮忙验收外包团队交付的预订小程序。", budget: 800, quotedPrice: 800, statusChangedAt: ts(-66),
      notes: "客户和外包方解约，项目取消",
    }),
    p("shop-poster", 0, {
      name: "双十一海报套装", clientId: "cli_shop", serviceId: "svc_poster", status: "in_progress", priority: "urgent",
      requirement: "主图海报 3 张 + 详情页头图 2 张，双十一促销风格。", budget: 900, quotedPrice: 900, finalPrice: 900,
      startDate: day(0), dueDate: day(0), statusChangedAt: ts(0, 9),
    }),
  ];

  const pay = (key: string, projectId: string, amount: number, kind: Payment["kind"], method: Payment["method"], offset: number, note = ""): Payment => ({
    ...base(`pay_${key}`, offset),
    projectId,
    amount,
    kind,
    method,
    paidAt: day(offset),
    note,
  });

  const payments: Payment[] = [
    pay("coffee1", "prj_coffee", 150, "deposit", "wechat", -25),
    pay("coffee2", "prj_coffee", 150, "final", "wechat", -18),
    pay("echo1", "prj_echo-cover", 400, "deposit", "alipay", -5),
    pay("edu1", "prj_edu-images", 200, "deposit", "bank", -8),
    pay("shop1", "prj_shop-video", 750, "deposit", "taobao", -10),
    pay("ppt1", "prj_ppt", 100, "deposit", "xianyu", -7),
    pay("resume1", "prj_resume", 199, "final", "xianyu", -36),
    pay("bnb1", "prj_bnb-site", 1500, "deposit", "bank", -30),
    pay("bnb2", "prj_bnb-site", 1000, "progress", "bank", -12, "首页与房型页验收后"),
    pay("ev1", "prj_ev-report", 600, "deposit", "wechat", -75),
    pay("ev2", "prj_ev-report", 600, "final", "wechat", -62),
    pay("food1", "prj_food-ops", 2000, "deposit", "alipay", -26),
    pay("comfy1", "prj_comfy", 260, "final", "xianyu", -2),
    pay("shop2", "prj_shop-poster", 450, "deposit", "taobao", 0),
  ];

  const quotes: Quote[] = [
    {
      ...base("quo_kb", -5), number: `Q-${toDateKey(addDays(now, -5)).replace(/-/g, "")}-001`, clientId: "cli_tech", projectId: "prj_tech-kb",
      items: [
        { id: "qi_kb1", serviceId: "svc_kb", name: "AI知识库（私有化部署）", unitPrice: 4500, quantity: 1 },
        { id: "qi_kb2", serviceId: "svc_workflow", name: "飞书接入工作流", unitPrice: 1000, quantity: 1 },
      ],
      addons: [{ id: "qa_kb1", name: "文档清洗与结构化（200份）", price: 1500 }],
      discountType: "amount", discountValue: 500, rushFee: 0, revisionFee: 0, otherFee: 300, otherFeeLabel: "服务器部署",
      validUntil: day(9), status: "sent", notes: "包含 1 个月免费维护",
    },
    {
      ...base("quo_bnb", -33), number: `Q-${toDateKey(addDays(now, -33)).replace(/-/g, "")}-001`, clientId: "cli_bnb", projectId: "prj_bnb-site",
      items: [{ id: "qi_bnb1", serviceId: "svc_website", name: "AI网站（6页）", unitPrice: 3200, quantity: 1 }],
      addons: [{ id: "qa_bnb1", name: "微信咨询接入", price: 400 }, { id: "qa_bnb2", name: "域名与服务器配置", price: 400 }],
      discountType: "percent", discountValue: 5, rushFee: 0, revisionFee: 0, otherFee: 0,
      validUntil: day(-26), status: "accepted",
    },
    {
      ...base("quo_echo", -7), number: `Q-${toDateKey(addDays(now, -7)).replace(/-/g, "")}-001`, clientId: "cli_echo", projectId: "prj_echo-cover",
      items: [{ id: "qi_echo1", serviceId: "svc_xhs", name: "小红书封面", unitPrice: 40, quantity: 20 }],
      addons: [], discountType: "amount", discountValue: 0, rushFee: 0, revisionFee: 0, otherFee: 0,
      validUntil: day(0), status: "accepted", notes: "老客户月包价",
    },
    {
      ...base("quo_agent", -1), number: `Q-${toDateKey(addDays(now, -1)).replace(/-/g, "")}-001`, clientId: "cli_food", projectId: "prj_cs-agent",
      items: [{ id: "qi_ag1", serviceId: "svc_agent", name: "AI Agent（抖店客服）", unitPrice: 2500, quantity: 1 }],
      addons: [{ id: "qa_ag1", name: "常见问题库整理", price: 300 }],
      discountType: "percent", discountValue: 0, rushFee: 300, revisionFee: 0, otherFee: 0,
      validUntil: day(6), status: "draft",
    },
  ];

  const todos: Todo[] = [
    { ...base("todo_1", 0), title: "整理本周交付素材上传网盘", dueDate: day(0), done: false },
    { ...base("todo_2", 0), title: "回复闲鱼新咨询消息", dueDate: day(0), done: true },
    { ...base("todo_3", -1), title: "续费 Midjourney 订阅", dueDate: day(1), done: false },
    { ...base("todo_4", -2), title: "更新作品集（加入民宿官网案例）", dueDate: day(2), done: false, projectId: "prj_bnb-site" },
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    clients,
    projects,
    services,
    quotes,
    payments,
    tools,
    todos,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function createEmptyData(): WorkbenchData {
  const seed = createSeedData();
  // 清空业务数据，但保留服务库和工具库（它们是"配置"性质的数据）
  return { ...seed, clients: [], projects: [], quotes: [], payments: [], todos: [] };
}
