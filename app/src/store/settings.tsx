import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface VoiceOption {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  cloned?: boolean;
  provider?: string;
}

export const DEFAULT_VOICES: VoiceOption[] = [
  {
    id: "system-default",
    name: "系统教练",
    desc: "使用设备本地语音做兜底播报",
    emoji: "🎙️",
  },
  {
    id: "system-energetic",
    name: "活力教练",
    desc: "适合高强度训练时的快节奏提示",
    emoji: "🔥",
  },
  {
    id: "system-calm",
    name: "稳态教练",
    desc: "适合控制节奏和动作质量训练",
    emoji: "🫶",
  },
];

export type Gender = "male" | "female" | "unset";

export interface UserProfile {
  userId: string;
  name: string;
  gender: Gender;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
}

export const DEFAULT_PROFILE: UserProfile = {
  userId: "7d0bde8f-5afd-4ee4-93a1-c3d56e5ef001",
  name: "练了吗用户",
  gender: "unset",
  age: null,
  heightCm: null,
  weightKg: null,
};

export const GENDER_LABEL: Record<Gender, string> = {
  male: "男",
  female: "女",
  unset: "未设置",
};

export function calcBmi(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null;
  const meters = heightCm / 100;
  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

export function bmiLevel(bmi: number | null): string {
  if (bmi === null) return "—";
  if (bmi < 18.5) return "偏轻";
  if (bmi < 24) return "正常";
  if (bmi < 28) return "偏高";
  return "较高";
}

interface SettingsState {
  voiceId: string;
  setVoiceId: (id: string) => void;
  voice: VoiceOption;
  voiceOptions: VoiceOption[];
  setVoiceOptions: (items: VoiceOption[]) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (value: boolean) => void;
  repAnnouncementsEnabled: boolean;
  setRepAnnouncementsEnabled: (value: boolean) => void;
  encouragementEnabled: boolean;
  setEncouragementEnabled: (value: boolean) => void;
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [voiceId, setVoiceId] = useState(DEFAULT_VOICES[0]!.id);
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>(DEFAULT_VOICES);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [repAnnouncementsEnabled, setRepAnnouncementsEnabled] = useState(true);
  const [encouragementEnabled, setEncouragementEnabled] = useState(true);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  useEffect(() => {
    if (voiceOptions.some((item) => item.id === voiceId)) {
      return;
    }
    if (voiceOptions[0]) {
      setVoiceId(voiceOptions[0].id);
    }
  }, [voiceId, voiceOptions]);

  const value = useMemo<SettingsState>(() => {
    const voice = voiceOptions.find((item) => item.id === voiceId) ?? voiceOptions[0]!;
    return {
      voiceId,
      setVoiceId,
      voice,
      voiceOptions,
      setVoiceOptions,
      voiceEnabled,
      setVoiceEnabled,
      repAnnouncementsEnabled,
      setRepAnnouncementsEnabled,
      encouragementEnabled,
      setEncouragementEnabled,
      profile,
      setProfile,
    };
  }, [
    encouragementEnabled,
    profile,
    repAnnouncementsEnabled,
    voiceEnabled,
    voiceId,
    voiceOptions,
  ]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
