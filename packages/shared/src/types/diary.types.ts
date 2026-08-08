/** 브리스톨 대변 형태 척도 (1~7) */
export type BristolType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const BRISTOL_LABELS: Record<BristolType, string> = {
  1: "딱딱한 덩어리 (심한 변비)",
  2: "소시지형 (변비)",
  3: "표면 갈라진 소시지형 (정상)",
  4: "부드러운 소시지형 (이상적)",
  5: "부드러운 덩어리 (약한 설사)",
  6: "흐물흐물한 형태 (설사)",
  7: "물처럼 완전한 액체 (심한 설사)",
};

/** 대변 색상 */
export type StoolColor =
  | "brown"
  | "dark-brown"
  | "yellow"
  | "green"
  | "red"
  | "black"
  | "white";

export const STOOL_COLOR_LABELS: Record<StoolColor, string> = {
  brown: "갈색 (정상)",
  "dark-brown": "진한 갈색",
  yellow: "노란색",
  green: "녹색",
  red: "붉은색",
  black: "검은색",
  white: "흰색/회색",
};

/** 식품 태그 */
export type FoodTag =
  | "meat"
  | "fish"
  | "dairy"
  | "vegetables"
  | "fruits"
  | "rice"
  | "bread"
  | "noodles"
  | "spicy"
  | "fatty"
  | "caffeine"
  | "alcohol"
  | "processed"
  | "water";

export const FOOD_TAG_META: Record<FoodTag, { label: string; emoji: string }> =
  {
    meat: { label: "육류", emoji: "🥩" },
    fish: { label: "생선/해산물", emoji: "🐟" },
    dairy: { label: "유제품", emoji: "🥛" },
    vegetables: { label: "채소", emoji: "🥗" },
    fruits: { label: "과일", emoji: "🍎" },
    rice: { label: "쌀/잡곡", emoji: "🍚" },
    bread: { label: "밀가루/빵", emoji: "🍞" },
    noodles: { label: "면류", emoji: "🍜" },
    spicy: { label: "매운 음식", emoji: "🌶️" },
    fatty: { label: "기름진 음식", emoji: "🍖" },
    caffeine: { label: "카페인", emoji: "☕" },
    alcohol: { label: "알코올", emoji: "🍺" },
    processed: { label: "가공/패스트푸드", emoji: "🍟" },
    water: { label: "충분한 수분", emoji: "💧" },
  };

/** 배변 일지 항목 */
export interface DiaryEntry {
  id: string;
  bristolType: BristolType;
  color: StoolColor;
  hasPain: boolean;
  painLevel?: number; // 1~5
  foods: FoodTag[];
  memo?: string;
  recordedAt: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}

/** 배변 일지 생성 DTO */
export interface CreateDiaryDto {
  bristolType: BristolType;
  color: StoolColor;
  hasPain: boolean;
  painLevel?: number;
  foods?: FoodTag[];
  memo?: string;
  recordedAt?: string;
}

/** 배변 일지 수정 DTO */
export interface UpdateDiaryDto extends Partial<CreateDiaryDto> {}

/** 식품별 배변 상관관계 통계 */
export interface FoodCorrelation {
  food: FoodTag;
  count: number; // 해당 식품을 먹은 기록 수
  avgBristolType: number; // 평균 브리스톨 유형
  painRate: number; // 통증 발생률 (0~1)
}

/** 주간 통계 */
export interface WeeklyStats {
  week: string; // YYYY-WW
  totalCount: number;
  avgBristolType: number;
  mostFrequentColor: StoolColor;
  painCount: number;
}
