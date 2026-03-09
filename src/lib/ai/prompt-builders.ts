type ScriptArgs = {
  topic: string;
  targetDuration: string;
  language: string;
  styleTags: string[];
  platform: string;
};

export function buildScriptSystemPrompt(args: ScriptArgs) {
  return `你是一位专业的 Faceless YouTube 脚本写手。
根据主题产出适合 ${args.platform} 的旁白脚本。

要求：
1. 前 3 秒有钩子。
2. 目标时长：${args.targetDuration}。
3. 输出语言：${args.language}。
4. 风格：${args.styleTags.join(", ")}。
5. 用 [00:00-00:05] 形式标时间段。
6. 最后给一个 CTA。
7. 不要输出任何解释，只输出脚本正文。`;
}

export function buildStoryboardPrompt(script: string) {
  return `根据下面脚本拆成 6-10 个镜头，输出 JSON 对象，格式为：
{"shots":[{"sequence":1,"duration":8,"narration":"","scene_description":"","emotion":"","shot_type":""}]}
每个对象必须包含 sequence, duration, narration, scene_description, emotion, shot_type。
脚本如下：
${script}`;
}

export function buildPromptPrompt(scene: {
  sceneDescription: string;
  emotion: string;
  shotType: string;
  styleTags: string[];
}) {
  return `根据以下信息生成 JSON：
{
  "image_prompt": "...",
  "video_prompt": "...",
  "negative_prompt": "..."
}

要求：
- 英文输出
- 强调 faceless、cinematic、editorial consistency
- 避免面部特写、文字水印、畸形手部、低清晰度

scene_description: ${scene.sceneDescription}
emotion: ${scene.emotion}
shot_type: ${scene.shotType}
style_tags: ${scene.styleTags.join(", ")}`;
}

export function buildMockScript(args: ScriptArgs) {
  return [
    "[00:00-00:08] Most people think understanding happens all at once. It doesn't. It arrives in fragments, usually after something breaks.",
    `[00:08-00:20] In this piece, we explore "${args.topic}" through quiet, symbolic scenes that feel more like memory than explanation.`,
    "[00:20-00:35] We begin with tension: an ordinary setting that already feels slightly wrong, as if the answer has been sitting in the room the whole time.",
    "[00:35-00:50] Then the idea widens. Everyday objects become metaphors, motion slows down, and the audience starts connecting meaning without being told what to feel.",
    "[00:50-01:00] By the end, the insight should feel earned, almost uncomfortable, but clear enough to stay with the viewer after the video ends.",
  ].join("\n\n");
}

export function buildMockStoryboard(script: string) {
  const lines = script
    .split("\n")
    .filter(Boolean)
    .slice(0, 6);

  return lines.map((line, index) => ({
    sequence: index + 1,
    duration: index === 0 ? 8 : 10,
    narration: line.replace(/^\[[^\]]+\]\s*/, ""),
    scene_description:
      [
        "A dim apartment with morning light cutting across dust in the air",
        "Close shot of a notebook, coffee, and a hand pausing before writing",
        "An empty hallway with slow camera drift and muted blue shadows",
        "Abstract objects suspended in water, moving almost imperceptibly",
        "City reflections on wet glass at night, cinematic and quiet",
        "A final sunrise frame that suggests clarity without showing a face",
      ][index] ?? "A symbolic cinematic scene without visible faces",
    emotion:
      ["curious", "restless", "tense", "reflective", "melancholic", "resolved"][index] ??
      "reflective",
    shot_type:
      ["wide", "close-up", "tracking", "macro", "medium", "wide"][index] ?? "wide",
  }));
}

export function buildMockPrompts(scene: {
  sceneDescription: string;
  emotion: string;
  shotType: string;
  styleTags: string[];
}) {
  const baseStyle = [...scene.styleTags, "faceless", "cinematic", "editorial", "high detail"].join(
    ", ",
  );

  return {
    image_prompt: `${scene.sceneDescription}, ${scene.shotType} shot, ${scene.emotion} mood, ${baseStyle}, volumetric lighting, subtle film grain, no visible face`,
    video_prompt: `${scene.sceneDescription}, slow cinematic motion, ${scene.shotType} framing, ${scene.emotion} mood, ${baseStyle}, gentle camera drift, atmospheric movement, no face close-up`,
    negative_prompt: "text, subtitles, watermark, logo, deformed hands, low quality, visible face close-up",
  };
}
