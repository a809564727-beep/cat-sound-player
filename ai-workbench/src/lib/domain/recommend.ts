import type { QualityLevel, ServiceCategory, Tool } from "../types";
import { round2 } from "../utils";

/**
 * 规则推荐引擎（第一版，不调用外部 AI）。
 * 未来接入 AI API 时，保持 RecommendInput / Recommendation 接口不变，
 * 实现一个 aiRecommend() 并在 UI 中切换即可。
 */

export interface RecommendInput {
  category: ServiceCategory;
  /** 客户预算（元），可选 */
  budget?: number;
  /** 距截止日期的天数，可选 */
  daysAvailable?: number;
  quality: QualityLevel;
  /** 服务库里的预计工时，用于覆盖默认值 */
  baseHours?: number;
  /** 服务基础价格，用于判断预算是否合理 */
  basePrice?: number;
}

export interface ToolPick {
  name: string;
  reason: string;
  tool?: Tool;
}

export interface Risk {
  level: "high" | "medium" | "low";
  text: string;
}

export interface Recommendation {
  tools: ToolPick[];
  workflow: string[];
  estimatedHours: number;
  estimatedDays: number;
  suggestedPrice: number;
  risks: Risk[];
}

interface Rule {
  hours: number;
  /** 各质量档位的工具，basic 档会优先免费/开源工具 */
  tools: Record<QualityLevel, Array<[string, string]>>;
  workflow: string[];
  premiumSteps?: string[];
  risks: string[];
  price: number;
}

const RULES: Record<ServiceCategory, Rule> = {
  image: {
    hours: 2,
    price: 150,
    tools: {
      basic: [["Flux", "开源可本地部署，零边际成本出图"], ["DeepSeek", "快速生成/润色提示词与文案"]],
      standard: [["Midjourney", "审美稳定，适合海报与封面"], ["ChatGPT", "提示词迭代与文案"], ["Flux", "需要精确文字/局部重绘时补充"]],
      premium: [["Midjourney", "主视觉高质量出图"], ["Flux", "局部重绘与风格统一"], ["ChatGPT", "图像编辑与文字排版辅助"], ["Claude", "品牌文案与卖点提炼"]],
    },
    workflow: ["确认尺寸、用途、风格参考与必须出现的文字", "用 LLM 拆解需求、生成 3–5 组提示词", "批量出图并挑选 2–3 个方向给客户初审", "根据反馈精修（局部重绘、放大、加文字排版）", "按平台规范导出（尺寸/格式/压缩）并交付源文件"],
    premiumSteps: ["提供 2 套完整风格方案 + 设计说明"],
    risks: ["AI 生成文字容易错字，中文文字建议后期排版", "注意商用版权：确认所用模型的商业授权条款"],
  },
  video: {
    hours: 8,
    price: 600,
    tools: {
      basic: [["MoneyPrinterTurbo", "开源一键生成口播短视频"], ["FFmpeg", "剪辑、转码、加字幕批处理"], ["DeepSeek", "脚本撰写"]],
      standard: [["Kling", "图生视频/文生视频镜头"], ["ElevenLabs", "高质量配音"], ["ChatGPT", "分镜脚本"], ["FFmpeg", "合成与压制"]],
      premium: [["Kling", "高质量动态镜头"], ["MiniMax", "备选视频/语音生成"], ["ElevenLabs", "多角色配音与音色克隆"], ["Remotion", "代码化模板，批量生产与精确动效"], ["Claude", "脚本与分镜打磨"]],
    },
    workflow: ["确认时长、平台、画幅、风格参考与素材", "撰写脚本与分镜表，客户确认后再生成", "生成镜头素材（文生/图生视频）与配音", "剪辑合成：字幕、BGM、转场", "导出平台规格版本，交付成片 + 工程文件"],
    premiumSteps: ["制作 Remotion 模板，便于客户后续批量出片"],
    risks: ["视频生成积分消耗大，报价需覆盖算力成本", "镜头一致性（人物/产品）难保证，提前与客户约定预期", "BGM 与素材注意版权"],
  },
  document: {
    hours: 3,
    price: 200,
    tools: {
      basic: [["DeepSeek", "内容梳理与润色，成本低"], ["ChatGPT", "结构优化"]],
      standard: [["Claude", "长文档理解与专业润色"], ["ChatGPT", "要点提炼与改写"], ["Gemini", "资料检索补充"]],
      premium: [["Claude", "深度改写与逻辑重构"], ["ChatGPT", "配图与图表建议"], ["Midjourney", "定制配图/封面"], ["Gemini", "资料核查"]],
    },
    workflow: ["收集原始文件、目标岗位/场景与受众", "LLM 分析问题点并给出修改大纲", "逐页/逐段改写，统一风格与版式", "人工校对事实、数据与格式", "交付可编辑源文件 + PDF"],
    risks: ["简历/报告中的事实信息必须人工核对，避免 AI 编造", "注意客户隐私信息保护，不要上传到不可信平台"],
  },
  website: {
    hours: 16,
    price: 2000,
    tools: {
      basic: [["Claude", "生成页面代码"], ["DeepSeek", "文案与调试"]],
      standard: [["Claude", "架构设计与核心代码"], ["Codex", "批量实现与重构"], ["ChatGPT", "文案与 SEO"]],
      premium: [["Claude", "架构与代码评审"], ["Codex", "并行实现功能与测试"], ["Midjourney", "定制视觉素材"], ["ChatGPT", "文案与多语言"]],
    },
    workflow: ["确认页面清单、功能、域名/服务器与参考网站", "出线框/设计稿，客户确认", "用 AI 编码工具实现页面与功能", "测试：多端适配、表单、性能", "部署上线，交付源码仓库与使用说明"],
    premiumSteps: ["加入自动化测试与 CI，交付维护文档"],
    risks: ["需求范围容易蔓延，合同中写清页面数与功能清单", "域名备案/服务器由谁负责需提前约定", "交付后的维护是否收费要说清楚"],
  },
  knowledge: {
    hours: 12,
    price: 1500,
    tools: {
      basic: [["Dify", "开源可自部署的知识库问答"], ["DeepSeek", "低成本模型 API"]],
      standard: [["Dify", "知识库 + 工作流编排"], ["Claude", "文档清洗与 Prompt 设计"], ["DeepSeek", "性价比模型"]],
      premium: [["Dify", "私有化部署与权限管理"], ["Claude", "高质量回答模型"], ["Gemini", "长上下文文档处理"], ["Coze", "需要接入微信/飞书时使用"]],
    },
    workflow: ["梳理知识范围、文档格式与使用场景", "文档清洗、分段与元数据整理", "搭建知识库并调优检索参数与 Prompt", "准备 20–50 个测试问题评估回答质量", "部署与接入渠道，交付使用与维护文档"],
    risks: ["文档质量决定效果，提前确认资料是否完整", "模型 API 费用由谁承担需写明", "涉及内部资料时注意数据安全与部署位置"],
  },
  agent: {
    hours: 16,
    price: 2500,
    tools: {
      basic: [["Coze", "零代码快速搭建 Bot"], ["DeepSeek", "低成本模型"]],
      standard: [["Dify", "Agent + 工具调用编排"], ["Claude", "复杂推理与工具调用"], ["Coze", "多渠道发布"]],
      premium: [["Claude", "核心 Agent 模型"], ["Codex", "自定义工具/插件开发"], ["Dify", "私有化编排"], ["ChatGPT", "备用模型与评估"]],
    },
    workflow: ["明确 Agent 目标、输入输出与可调用的工具/系统", "设计 Prompt、工具清单与异常处理", "搭建并联调工具调用", "用真实案例测试，记录失败用例并迭代", "部署、交付配置说明与成本估算"],
    risks: ["Agent 效果不稳定，验收标准要量化（成功率/用例）", "第三方 API 变动风险", "持续运行成本需要客户确认"],
  },
  workflow: {
    hours: 8,
    price: 1000,
    tools: {
      basic: [["Coze", "内置工作流，免费额度"], ["DeepSeek", "低成本 LLM 节点"]],
      standard: [["Dify", "工作流编排，可自部署"], ["ChatGPT", "LLM 节点"], ["Claude", "脚本编写"]],
      premium: [["Dify", "复杂编排与私有化"], ["Claude", "定制脚本与异常处理"], ["Codex", "对接客户系统的代码"]],
    },
    workflow: ["画出现有流程，找到可自动化的节点", "确认触发方式、数据来源与输出位置", "搭建工作流并处理异常分支", "用真实数据跑通并对比人工结果", "交付流程图、操作手册与维护说明"],
    risks: ["依赖的账号/API 权限需客户提供", "平台限流与费用", "流程变动后的维护责任"],
  },
  report: {
    hours: 10,
    price: 800,
    tools: {
      basic: [["DeepSeek", "资料整理与撰写"], ["Gemini", "检索与资料汇总"]],
      standard: [["Gemini", "深度研究与资料检索"], ["Claude", "结构化撰写与分析"], ["ChatGPT", "图表与摘要"]],
      premium: [["Gemini", "多来源深度研究"], ["Claude", "专业分析与长报告撰写"], ["ChatGPT", "数据分析与可视化"], ["Midjourney", "封面与配图"]],
    },
    workflow: ["确认报告主题、读者、篇幅与交付格式", "列提纲并与客户确认", "AI 辅助检索资料，人工筛选可信来源", "撰写分析、制作图表", "事实核查、引用标注、排版交付"],
    premiumSteps: ["附上数据来源表与可编辑图表"],
    risks: ["AI 可能编造数据/来源，所有数据必须人工核实并标注出处", "时效性：注明数据截止时间"],
  },
  operation: {
    hours: 20,
    price: 3000,
    tools: {
      basic: [["DeepSeek", "批量文案"], ["Flux", "批量配图"]],
      standard: [["ChatGPT", "选题与文案"], ["Midjourney", "配图"], ["Kling", "短视频素材"]],
      premium: [["Claude", "账号定位与内容策略"], ["Midjourney", "统一视觉风格"], ["Kling", "短视频"], ["ElevenLabs", "配音"], ["Remotion", "视频模板化生产"]],
    },
    workflow: ["账号诊断与定位，确认内容方向与 KPI", "制定月度选题日历", "批量生产内容（文案+图片/视频）", "按排期发布并记录数据", "每周复盘，调整选题与形式"],
    risks: ["代运营按月结算，明确 KPI 与内容数量", "账号安全：避免违规内容与频繁异地登录", "平台对 AI 内容的标注要求"],
  },
  devenv: {
    hours: 2,
    price: 200,
    tools: {
      basic: [["ChatGPT", "排查报错"], ["DeepSeek", "命令与脚本"]],
      standard: [["Claude", "排查复杂环境问题"], ["Codex", "自动化安装脚本"], ["ChatGPT", "文档"]],
      premium: [["Claude", "环境方案设计"], ["Codex", "一键安装脚本与验证"], ["Gemini", "资料检索"]],
    },
    workflow: ["确认操作系统、硬件（显卡/内存）与目标工具", "远程连接前确认权限与数据备份", "安装与配置，记录每一步", "跑通示例验证", "交付操作文档与常见问题"],
    risks: ["远程操作客户电脑前务必约定责任与备份", "显卡/系统不满足要求时提前告知，避免白做", "网络环境导致下载失败的时间成本"],
  },
  consulting: {
    hours: 4,
    price: 500,
    tools: {
      basic: [["ChatGPT", "资料整理"], ["Claude", "代码/方案审阅"]],
      standard: [["Claude", "代码审查与问题定位"], ["Codex", "测试用例与复现"], ["Gemini", "资料核查"]],
      premium: [["Claude", "全面审查与报告"], ["Codex", "自动化测试"], ["ChatGPT", "交叉验证"]],
    },
    workflow: ["确认验收范围、标准与交付物清单", "逐项检查功能、代码与文档", "记录问题并按严重程度分级", "出具验收报告与修改建议", "复验修复结果"],
    risks: ["验收标准不清晰容易产生纠纷，先书面确认", "保密：签署保密协议"],
  },
};

const QUALITY_HOURS: Record<QualityLevel, number> = { basic: 0.75, standard: 1, premium: 1.6 };
const QUALITY_PRICE: Record<QualityLevel, number> = { basic: 0.8, standard: 1, premium: 1.8 };
/** 副业每天可投入的有效工时 */
export const HOURS_PER_DAY = 4;

/** 按名称匹配工具库，兼容 "Kling 可灵" 这类带中文别名的名称 */
export function findToolByName(tools: Tool[], name: string): Tool | undefined {
  const n = name.trim().toLowerCase();
  return tools.find((t) => {
    const tn = t.name.trim().toLowerCase();
    return tn === n || tn.startsWith(`${n} `);
  });
}

export function recommend(input: RecommendInput, tools: Tool[] = []): Recommendation {
  const rule = RULES[input.category] ?? RULES.consulting;
  const findTool = (name: string) => findToolByName(tools, name);

  const lowBudget = input.basePrice !== undefined && input.budget !== undefined && input.budget < input.basePrice * 0.7;
  // 低预算时自动降一档工具，避免算力成本吃掉利润
  const toolLevel: QualityLevel = lowBudget && input.quality !== "basic" ? (input.quality === "premium" ? "standard" : "basic") : input.quality;

  const picks: ToolPick[] = rule.tools[toolLevel].map(([name, reason]) => ({ name, reason, tool: findTool(name) }));

  const baseHours = input.baseHours && input.baseHours > 0 ? input.baseHours : rule.hours;
  const estimatedHours = round2(baseHours * QUALITY_HOURS[input.quality]);
  const estimatedDays = Math.max(1, Math.ceil(estimatedHours / HOURS_PER_DAY));
  const basePrice = input.basePrice && input.basePrice > 0 ? input.basePrice : rule.price;
  const suggestedPrice = Math.round((basePrice * QUALITY_PRICE[input.quality]) / 10) * 10;

  const workflow = [...rule.workflow];
  if (input.quality === "premium" && rule.premiumSteps) workflow.splice(workflow.length - 1, 0, ...rule.premiumSteps);

  const risks: Risk[] = [];
  if (input.daysAvailable !== undefined) {
    if (input.daysAvailable < 0) risks.push({ level: "high", text: "截止日期已过，请先和客户确认新的交付时间" });
    else if (input.daysAvailable < estimatedDays)
      risks.push({ level: "high", text: `时间不足：预计需要 ${estimatedDays} 天，只剩 ${input.daysAvailable} 天。建议收加急费或调整范围` });
    else if (input.daysAvailable < estimatedDays + 1)
      risks.push({ level: "medium", text: "时间偏紧，没有留出修改缓冲，建议预留 1 天给客户审核" });
  }
  if (input.budget !== undefined && input.budget > 0) {
    if (input.budget < suggestedPrice * 0.6)
      risks.push({ level: "high", text: `预算 ¥${input.budget} 明显低于建议价 ¥${suggestedPrice}，建议缩减范围或降低质量档位` });
    else if (input.budget < suggestedPrice)
      risks.push({ level: "medium", text: `预算略低于建议价 ¥${suggestedPrice}，注意控制修改次数` });
  } else {
    risks.push({ level: "low", text: "客户未给预算，先给出阶梯报价（基础/标准/精品）便于成交" });
  }
  if (lowBudget) risks.push({ level: "medium", text: "预算偏低，已自动推荐成本更低的工具组合" });
  if (input.quality === "premium") risks.push({ level: "low", text: "精品档客户期望高，开工前确认参考案例与验收标准" });
  for (const r of rule.risks) risks.push({ level: "low", text: r });

  const order = { high: 0, medium: 1, low: 2 };
  risks.sort((a, b) => order[a.level] - order[b.level]);

  return { tools: picks, workflow, estimatedHours, estimatedDays, suggestedPrice, risks };
}
