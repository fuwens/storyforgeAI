export type ProjectTemplate = {
  key: string;
  label: string;
  emoji: string;
  topic: string;
  targetDuration: string;
  language: string;
  platform: string;
  styleTags: string[];
};

export const projectTemplates: ProjectTemplate[] = [
  {
    key: "science",
    label: "科普知识",
    emoji: "🔬",
    topic: "前沿科技知识科普",
    targetDuration: "3min",
    language: "中文",
    platform: "YouTube",
    styleTags: ["科普", "教育", "简洁"],
  },
  {
    key: "product",
    label: "产品介绍",
    emoji: "📦",
    topic: "产品功能亮点展示",
    targetDuration: "60s",
    language: "中文",
    platform: "YouTube",
    styleTags: ["商业", "简洁", "专业"],
  },
  {
    key: "vlog",
    label: "Vlog 日记",
    emoji: "🎬",
    topic: "日常生活记录分享",
    targetDuration: "90s",
    language: "中文",
    platform: "YouTube",
    styleTags: ["生活", "随意", "温暖"],
  },
  {
    key: "tech",
    label: "技术教程",
    emoji: "💻",
    topic: "编程技术教学",
    targetDuration: "3min",
    language: "中文",
    platform: "YouTube",
    styleTags: ["技术", "教程", "清晰"],
  },
];
