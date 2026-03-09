export type ProjectStatus = "draft" | "generating" | "completed" | "archived";
export type TaskStatus = "queued" | "in_progress" | "completed" | "failed";
export type MediaType = "image" | "video";

export type ProjectPreset = {
  key: string;
  label: string;
  description: string;
  styleTags: string[];
  defaultImageModel: string;
  defaultVideoModel: string;
};

export type PromptVariant = {
  id: string;
  imagePrompt: string;
  videoPrompt: string;
  negativePrompt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Asset = {
  id: string;
  shotId: string;
  sourceUrl: string;
  storageUrl?: string;
  mimeType: string;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GenerationTask = {
  id: string;
  shotId: string;
  provider: "toapis" | "mock";
  providerTaskId: string;
  mediaType: MediaType;
  model: string;
  requestPayload: Record<string, unknown>;
  status: TaskStatus;
  errorMessage?: string;
  sourceUrl?: string;
  storageUrl?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Shot = {
  id: string;
  projectId: string;
  sequence: number;
  title: string;
  narration: string;
  sceneDescription: string;
  emotion: string;
  shotType: string;
  durationSeconds: number;
  generationType: MediaType;
  model?: string;
  aspectRatio?: string;
  modelConfig: Record<string, unknown>;
  promptVariants: PromptVariant[];
  tasks: GenerationTask[];
  assets: Asset[];
  createdAt: string;
  updatedAt: string;
};

export type ScriptVersion = {
  id: string;
  projectId: string;
  content: string;
  version: number;
  createdAt: string;
};

export type ExportJob = {
  id: string;
  projectId: string;
  format: "zip" | "csv" | "txt";
  downloadUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  title: string;
  topic: string;
  targetDuration: string;
  language: string;
  platform: string;
  presetKey: string;
  styleTags: string[];
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  scriptVersions: ScriptVersion[];
  shots: Shot[];
  exports: ExportJob[];
};

export type StoryForgeData = {
  projects: Project[];
};

export type CreateProjectInput = {
  title: string;
  topic: string;
  targetDuration: string;
  language: string;
  platform: string;
  presetKey: string;
  styleTags: string[];
};

export type SubmitTaskInput = {
  shotId: string;
  mediaType: MediaType;
  model: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  duration?: number;
  modelConfig?: Record<string, unknown>;
};
