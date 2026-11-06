/**
 * ARC-WIZARD 채팅 명령 파서 (LLM 없이 동작하는 규칙 기반)
 */
export type ParsedCommand =
  | { type: "rename"; from: string; to: string }
  | { type: "hide"; column: string }
  | { type: "show"; column: string }
  | { type: "createPage"; parentMenu: string; pageTitle: string }
  | { type: "undo" }
  | { type: "history" }
  | { type: "listHidden" }
  | { type: "help" }
  | { type: "unknown" };

const stripQuotes = (s: string) => s.trim().replace(/^["']+|["']+$/g, "").trim();

/** 둥근 따옴표·꺾쇠 따옴표 등을 일반 따옴표로 통일 */
export const normalizeQuotes = (s: string) =>
  s.replace(/[“”„‟″「」『』《》〈〉]/g, '"').replace(/[‘’‚‛′`]/g, "'");

/** "/portal/xxx 페이지에" 또는 "xxx/page.tsx 페이지에서" 같은 화면 지정 수식어 제거 */
const stripContext = (s: string) =>
  s
    .replace(/(?:src\/app)?\/?(?:portal\/)?[\w\-\/]+(?:\.tsx|\.ts)?\s*(?:페이지|화면|파일)?(?:에서|에|의)?/gi, " ")
    .replace(/^\s*(?:이\s*|현재\s*)?(?:페이지|화면|메뉴)(?:에서|에|의)?\s*/, "")
    .trim();

const RENAME_KW = /(바꿔|바꾸|변경|수정|교체|고쳐|rename)/i;

export function parseCommand(raw: string): ParsedCommand {
  const s = stripContext(normalizeQuotes(raw));
  if (!s) return { type: "unknown" };

  if (/^(도움말|help|사용법|\?|명령어)$/i.test(s)) return { type: "help" };
  if (/(되돌려|되돌리|실행\s*취소|undo|원복|롤백)/i.test(s)) return { type: "undo" };
  if (/(변경\s*이력|수정\s*이력|히스토리|history)/i.test(s)) return { type: "history" };
  if (/(숨김|숨긴|숨겨진|가린)\s*(컬럼|열|칼럼)?\s*(목록|리스트|보여|확인)/.test(s)) return { type: "listHidden" };

  const quoted = Array.from(s.matchAll(/"([^"]+)"|'([^']+)'/g)).map((m) => (m[1] ?? m[2]).trim());

  // 신규 페이지 및 좌측 메뉴(사이드바) 생성 지시 감지
  // 주의: "버튼 추가", "컬럼 추가", "필터 추가", "항목 추가" 등 페이지 내부 UI 요소 추가 지시는 제외하고,
  // 명확히 "(새/빈) 페이지/메뉴를 만들/생성/추가"하거나 "좌측메뉴/시스템관리 아래에 ... 페이지 만들"라고 지시한 경우만 매칭
  const isUiElementAdd = /(버튼|컬럼|열|칼럼|필터|항목|필드|입력창|탭|배지|아이콘|옵션|영역|기능)\s*(?:을|를|이|가)?\s*(?:하나\s*|옆에\s*|뒤에\s*|앞에\s*)?(?:만들|생성|추가|넣어)/.test(s);
  const isExplicitCreatePage =
    !isUiElementAdd &&
    (/(?:새\s*|빈\s*|신규\s*|하위\s*)?(?:페이지|메뉴)(?:를|을|가|이)?\s*(?:하나\s*|새로\s*)?(?:만들|생성|추가|신설)/.test(s) ||
      /(?:왼쪽\s*메뉴|좌측\s*메뉴|사이드바).*(?:아래에|하위에|밑에).*(?:만들|생성|추가)/.test(s));

  if (isExplicitCreatePage) {
    let parentMenu = "시스템관리";
    if (/기초\s*정보/.test(s)) parentMenu = "기초정보";
    else if (/프로젝트\s*관리/.test(s)) parentMenu = "프로젝트 관리";
    else if (/금형.*견적|원청사/.test(s)) parentMenu = "금형-견적관리";
    else if (/금형.*개발/.test(s)) parentMenu = "금형-개발 관리(자체/외주)";
    else if (/금형.*양산/.test(s)) parentMenu = "금형-양산 관리(자체/외주)";
    else if (/시스템\s*관리/.test(s)) parentMenu = "시스템관리";

    let pageTitle = quoted[0] || "";
    if (!pageTitle) {
      const m = s.match(/(?:아래에|하위에|밑에|에서)\s*([가-힣A-Za-z0-9_\s]{1,20}?)\s*(?:페이지|화면|메뉴)(?:를|을)?\s*(?:만들|생성|추가)/);
      if (m) {
        const candidate = m[1].trim();
        pageTitle = candidate === "빈" ? "빈 페이지" : candidate;
      }
    }
    if (!pageTitle) pageTitle = "빈 페이지";
    return { type: "createPage", parentMenu, pageTitle };
  }

  // 컬럼 숨김/표시
  const hideMatch =
    s.match(/^"?(.+?)"?\s*(?:컬럼|열|칼럼)\s*(?:을|를)?\s*(?:숨겨|숨기|숨김|가려|가리|감춰|안\s*보이게)/) ||
    s.match(/^"(.+?)"\s*(?:을|를)?\s*(?:숨겨|숨기|가려|가리|감춰)/);
  if (hideMatch) return { type: "hide", column: stripQuotes(hideMatch[1]) };
  const showMatch =
    s.match(/^"?(.+?)"?\s*(?:컬럼|열|칼럼)\s*(?:을|를)?\s*(?:다시\s*)?(?:보여|보이게|표시|복원|노출)/) ||
    s.match(/^"(.+?)"\s*(?:을|를)?\s*(?:다시\s*)?(?:보여|보이게|표시|복원|노출)/);
  if (showMatch) return { type: "show", column: stripQuotes(showMatch[1]) };

  // 문구 변경
  const arrow = s.match(/^(.+?)\s*(?:->|→|➔|=>)\s*(.+?)\s*(?:으로|로)?\s*(?:바꿔|변경|수정|교체)?\s*(?:줘|주세요)?\.?$/);
  if (quoted.length >= 2 && (RENAME_KW.test(s) || arrow)) return { type: "rename", from: quoted[0], to: quoted[1] };
  if (arrow) return { type: "rename", from: stripQuotes(arrow[1]), to: stripQuotes(arrow[2]) };

  const plain = s.match(
    /^(.+?)(?:\s*(?:이름|문구|라벨|텍스트|명칭|글자|컬럼명|버튼명|제목))?\s*(?:을|를)\s+(.+?)\s*(?:으로|로)\s*(?:줄여서?\s*|짧게\s*)?(?:바꿔|바꾸|변경|수정|교체|고쳐)/
  );
  if (plain) {
    const from = stripQuotes(plain[1]);
    const to = stripQuotes(plain[2]);
    if (from && to) return { type: "rename", from, to };
  }
  if (quoted.length === 1 && RENAME_KW.test(s)) return { type: "rename", from: quoted[0], to: "" };

  return { type: "unknown" };
}

