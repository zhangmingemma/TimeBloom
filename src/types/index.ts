export type ViewType = 'day' | 'week' | 'month' | 'stats';

export interface UserCategory {
  id: string;
  name: string;
  color: string;  // hex e.g. "#10b981"
  emoji: string;
}

export interface UserBusinessLine {
  id: string;
  name: string;
  color: string;  // hex e.g. "#3b82f6"
  emoji: string;
}

export type ActivitySource = 'manual' | 'git' | 'calendar';

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export interface UserStatus {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

export interface TodoItem {
  id: string;
  title: string;
  categoryId: string | null;
  businessLineId: string | null;
  statusId: string | null;
  priority: Priority;
  deadline: string | null; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  showInCalendar: boolean;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM (08:00–23:59)
  endTime: string;    // HH:MM
  categoryId: string | null;
  businessLineId?: string | null;
  notes?: string;
  source?: ActivitySource;
  sourceId?: string;  // dedup key: "git:<repo>:<date>"
}

export interface DetectedActivity {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  source: ActivitySource;
  sourceId: string;
  repoPath?: string;
  commitCount?: number;
  docUrl?: string;
}

export const HOUR_START = 8;
export const HOUR_END = 24;
export const TOTAL_HOURS = HOUR_END - HOUR_START; // 16

// Vivid / saturated colors for Categories — high visibility
export const CATEGORY_COLORS = [
  '#e53e3e', '#ed8936', '#d69e2e', '#38a169',
  '#319795', '#3182ce', '#667eea', '#9f7aea',
  '#ed64a6', '#e53e6e', '#00b5d8', '#48bb78',
  '#4299e1', '#805ad5', '#d53f8c', '#2c7a7b',
];

// Fresh pastoral colors for Business Lines — clear hue, no gray
export const BUSINESS_COLORS = [
  '#FFA286', // 珊瑚
  '#FCDBC8', // 蜜桃
  '#FEDDB2', // 杏橙
  '#F4B6DB', // 粉玫
  '#F5CDE7', // 浅玫粉
  '#CAAAF3', // 薰衣草
  '#BED04A', // 柠绿
  '#B8DF6A', // 嫩草
  '#D4EEA7', // 淡柠
  '#8BC98B', // 轻松绿
  '#ABF0D1', // 薄荷
  '#A5EACE', // 浅薄荷
  '#A6EBE8', // 水蓝
  '#9FEBE1', // 碧绿
  '#9BBFBE', // 明水鸭色
  '#C8D964', // 嫩芽绿
];

// Non-emoji geometric / typographic symbols for Categories
export const CATEGORY_SYMBOLS = [
  '●', '■', '▲', '◆', '★', '◉', '⬟', '⬡',
  '○', '□', '△', '◇', '☆', '◎', '⬠', '⬢',
  '✦', '✧', '✱', '✴', '❋', '✿', '❀', '✾',
  '–', '≡', '∞', '⊕', '⊗', '⊙', '◈', '◧',
];

export const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: '😊 表情',
    emojis: ['😀','😊','😎','🤩','🥰','😇','🤗','😴','🤔','😤','😭','😡','🫠','🤓','🥳','😮','😏','🫡','🫶','🙌','👏','✌️','👍','💪','🫰','🤌','🫸','👋'],
  },
  {
    label: '💼 工作',
    emojis: ['💼','📊','📈','📉','💡','🖥️','💻','📱','⌨️','🖨️','📝','📋','📌','📎','🔍','✉️','📞','📠','🗂️','📁','🖊️','🔐','🔑','⚙️','🛠️','📡','🏢','🤝'],
  },
  {
    label: '📚 学习',
    emojis: ['📚','📖','🎓','✏️','🖊️','📏','📐','🔬','🔭','🧪','🧫','🧬','💯','🏆','🎯','🧠','🗒️','📓','📔','📒','📃','🔖','✅','❓','💬','🔢','🔤','🧮'],
  },
  {
    label: '🏠 生活',
    emojis: ['🏠','🏡','🛋️','🛏️','🧹','🧺','🧴','🛁','🚿','🪴','🌱','🪟','🔌','💡','📺','🎮','🎵','🎨','🧶','🪡','🛒','🧷','🪣','🏺','🕯️','🪞','🧸','🪁'],
  },
  {
    label: '🍎 食物',
    emojis: ['🍎','🍊','🍋','🍓','🍇','🥝','🍒','🥑','🥦','🌽','🥗','🍜','🍱','🍕','🍣','🍜','☕','🧋','🥤','🍵','🥂','🍺','🥐','🍰','🧁','🍩','🍫','🥗'],
  },
  {
    label: '💪 运动',
    emojis: ['🏃','🚴','🏊','🧘','⚽','🏀','🏈','⚾','🎾','🏐','🏉','🥏','🏓','🥊','🤸','🧗','🤺','⛷️','🏄','🚣','🤽','🏋️','🤼','🤾','🏌️','🎽','🥅','🏟️'],
  },
  {
    label: '❤️ 健康',
    emojis: ['💊','🏥','🩺','🩻','💉','🩹','🧘','😴','🥗','🥤','🧃','🫁','🧬','🦷','👁️','🫀','💓','🌡️','🩴','🧖','🛁','🌿','🍵','🥦','🍏','💆','🧘','🌅'],
  },
  {
    label: '🤝 社交',
    emojis: ['🤝','👥','🥂','🎉','🎊','🎈','🎤','🎭','🍜','🍕','☕','🧋','💬','📱','📸','🎮','🎲','🎸','🎹','🥳','💃','🕺','🫂','👫','👬','👭','🎁','🌹'],
  },
  {
    label: '✈️ 旅行',
    emojis: ['✈️','🚗','🚕','🚙','🚌','🚂','🚢','⛵','🚁','🛸','🏖️','🏔️','🗺️','🧳','🎒','🏕️','🌍','🗼','🏰','🗽','🎡','🚡','⛽','🛣️','🌉','🌁','🗾','🏜️'],
  },
  {
    label: '🌿 自然',
    emojis: ['🌸','🌺','🌻','🌹','🌷','🍀','🌿','🌱','🌳','🌴','🌵','🍂','🍁','🍄','🌾','🌊','🔥','❄️','⛅','🌈','🌙','☀️','⭐','🌟','💫','☄️','🦋','🐝'],
  },
  {
    label: '🐾 动物',
    emojis: ['🐱','🐶','🐰','🐻','🐼','🐨','🦁','🐯','🦊','🐺','🐗','🦝','🐮','🐷','🐸','🐙','🦋','🐝','🦜','🐧','🦩','🦚','🐬','🦈','🐳','🦋','🐞','🦌'],
  },
  {
    label: '🎨 创意',
    emojis: ['🎨','🖌️','✏️','🖊️','📸','📷','🎬','🎥','🎭','🎪','🎤','🎧','🎵','🎶','🎸','🎹','🎺','🥁','🎻','🪕','🎲','♟️','🎯','🪄','🎠','🎡','🎢','🎟️'],
  },
  {
    label: '🎉 节日',
    emojis: ['🎉','🎊','🎈','🎁','🎀','🎂','🎆','🎇','🧨','✨','🪅','🎏','🎐','🎑','🧧','🎍','🎋','🎄','🎃','🪔','🕯️','🫧','🥳','🍾','🥂','💝','💖','🌠'],
  },
  {
    label: '💡 物品',
    emojis: ['💡','🔦','🕯️','🔋','🔌','📡','📻','📺','📷','🖥️','⌚','📱','💻','🎙️','📢','🔑','🔒','🛡️','🔧','🪛','🔨','⚗️','🧲','🔭','🔬','💈','🪬','🧿'],
  },
  {
    label: '⭐ 符号',
    emojis: ['⭐','🌟','💫','✨','🔥','❤️','💚','💙','💜','🧡','💛','🤍','🖤','💗','💓','💞','💝','🫶','♾️','☯️','☮️','💯','✅','❎','🎯','💎','🏅','🥇'],
  },
];
