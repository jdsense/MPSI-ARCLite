"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, Search, Send, RefreshCw, 
  Bot, Clock, Building2, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNotificationStore } from "@/lib/notification-store";

// 1. 순수 텍스트 메시지 인터페이스
interface ArcTalkMessage {
  id: string;
  projectNo: string;        // 프로젝트 관리번호 (NT5, A2XT 등)
  senderCompany: "MPSI" | "우성정공" | "뉴몰드" | "SYSTEM";
  senderName: string;       // 작성자 (예: 김태훈 실장, 배희섭 이사, 김부곤 상무)
  senderRole: string;       // 직무 (개발, 설계, 품질, 생산)
  content: string;          // 텍스트 본문
  messageType: "CHAT" | "SYSTEM_EVENT";
  createdAt: string;
}

// 2. 프로젝트 채널 목록 인터페이스
interface ProjectChannel {
  id: number;
  projectNo: string;        // 관리번호
  projectName: string;      // 차종 / 프로젝트명
  productName: string;      // 제품명
  moldVendor: string;       // 우성정공
  massVendor: string;       // 뉴몰드
  lastMessage: string;
  lastMessageTime: string;
}

// 초기 프로젝트 채널 목록
const initialChannels: ProjectChannel[] = [
  {
    id: 1,
    projectNo: "NT5-2026-A",
    projectName: "현대 NT5 도어 트림 모듈",
    productName: "Front Door Upper Cover LH/RH",
    moldVendor: "우성정공(주)",
    massVendor: "(주)뉴몰드",
    lastMessage: "[우성정공(주)] T2 시사출 코어 수정 완료 및 T3 일정 공유드립니다.",
    lastMessageTime: "16:45",
  },
  {
    id: 2,
    projectNo: "A2XT-M01",
    projectName: "기아 A2XT 센터페시아 콘솔",
    productName: "Center Console Main Bracket",
    moldVendor: "대한금형(주)",
    massVendor: "(주)한국정밀사출",
    lastMessage: "[대한금형(주)] 코어 강재 황삭 밀링 및 건드릴 가공이 완료되었습니다.",
    lastMessageTime: "14:10",
  },
  {
    id: 3,
    projectNo: "SPX-EV-09",
    projectName: "SPX 전기차 배터리 모듈 하우징",
    productName: "BMS Battery Case Module",
    moldVendor: "MPSI 자체제작팀",
    massVendor: "MPSI 자체생산라인",
    lastMessage: "[MPSI 자체생산] 금일 초도 양산 5,000EA 출하 준비 완료되었습니다.",
    lastMessageTime: "어제",
  },
  {
    id: 4,
    projectNo: "K7-RAD-04",
    projectName: "기아 K7 라디에이터 그릴 로어",
    productName: "Radiator Lower Grille",
    moldVendor: "우성정공(주)",
    massVendor: "(주)뉴몰드",
    lastMessage: "[MPSI] CAE 해석 결과에 따른 리브 살두께 수정 협의 필요합니다.",
    lastMessageTime: "09:30",
  },
];

// 초기 텍스트 대화 데이터
const initialMessages: Record<string, ArcTalkMessage[]> = {
  "NT5-2026-A": [
    {
      id: "m-1",
      projectNo: "NT5-2026-A",
      senderCompany: "SYSTEM",
      senderName: "SCM 시스템",
      senderRole: "알림",
      content: "프로젝트 [NT5-2026-A] 채널이 생성되었습니다. (MPSI - 우성정공 - 뉴몰드)",
      messageType: "SYSTEM_EVENT",
      createdAt: "2026-08-01 09:00",
    },
    {
      id: "m-2",
      projectNo: "NT5-2026-A",
      senderCompany: "MPSI",
      senderName: "김태훈 실장",
      senderRole: "개발총괄",
      content: "우성정공 배희섭 이사님, 현대 1차사에서 접수된 3D CAD 검토 후 성형성 CAE 유동해석 피드백 부탁드립니다.",
      messageType: "CHAT",
      createdAt: "2026-08-01 10:15",
    },
    {
      id: "m-3",
      projectNo: "NT5-2026-A",
      senderCompany: "우성정공",
      senderName: "배희섭 이사",
      senderRole: "설계/기술",
      content: "CAE 검토 완료했습니다. 게이트 주변 웰드라인 회피를 위해 밸브게이트 위치를 상단 15mm 이동하는 것을 제안합니다.",
      messageType: "CHAT",
      createdAt: "2026-08-03 15:30",
    },
    {
      id: "m-4",
      projectNo: "NT5-2026-A",
      senderCompany: "MPSI",
      senderName: "김태훈 실장",
      senderRole: "품질/검사",
      content: "T2 시사출 샘플 검사 결과, 체결 보스 높이는 합격이나 외관 버(Burr)가 다소 발생했습니다. 하측 코어 정밀방전 보정 요청드립니다.",
      messageType: "CHAT",
      createdAt: "2026-08-18 16:20",
    },
    {
      id: "m-5",
      projectNo: "NT5-2026-A",
      senderCompany: "우성정공",
      senderName: "정유성 부장",
      senderRole: "가공/현장",
      content: "확인했습니다. 하측 코어 래핑 보정 및 가스벤트 추가 작업 진행 중이며, 내일(8/20) 오후 2시에 T3 재시사출 진행하겠습니다.",
      messageType: "CHAT",
      createdAt: "2026-08-19 11:30",
    },
    {
      id: "m-6",
      projectNo: "NT5-2026-A",
      senderCompany: "뉴몰드",
      senderName: "김부곤 상무",
      senderRole: "양산/생산",
      content: "뉴몰드 사출 3호기(450T) 8/22부터 12시간 연속 사출 대기 준비하겠습니다. T3 승인 후 금형 이관 바랍니다.",
      messageType: "CHAT",
      createdAt: "2026-08-19 16:45",
    }
  ],
  "A2XT-M01": [
    {
      id: "m-7",
      projectNo: "A2XT-M01",
      senderCompany: "SYSTEM",
      senderName: "SCM 시스템",
      senderRole: "알림",
      content: "코어 강재 황삭 밀링 및 건드릴 가공이 완료되었습니다. CNC 정밀 가공에 착수합니다.",
      messageType: "SYSTEM_EVENT",
      createdAt: "2026-08-19 14:10",
    }
  ]
};

export default function ArcTalkPage() {
  const { addNotification } = useNotificationStore();
  const [channels, setChannels] = useState<ProjectChannel[]>(initialChannels);
  const [selectedProjectNo, setSelectedProjectNo] = useState<string>("NT5-2026-A");
  const [messages, setMessages] = useState<Record<string, ArcTalkMessage[]>>(initialMessages);
  
  // 검색 필터
  const [searchKeyword, setSearchKeyword] = useState("");

  // 메시지 입력 상태
  const [inputMessage, setInputMessage] = useState("");
  const [currentCompany, setCurrentCompany] = useState<"MPSI" | "우성정공" | "뉴몰드">("MPSI");
  const [currentSenderName, setCurrentSenderName] = useState("김태훈 실장");

  // 채팅 스크롤 제어
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, selectedProjectNo]);

  // 현재 선택된 채널 및 메시지 목록
  const activeChannel = channels.find((c) => c.projectNo === selectedProjectNo) || channels[0];
  const activeMessages = messages[selectedProjectNo] || [];

  // 메시지 전송 핸들러
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${timeStr}`;

    const newMsg: ArcTalkMessage = {
      id: `msg-${Date.now()}`,
      projectNo: selectedProjectNo,
      senderCompany: currentCompany,
      senderName: currentSenderName,
      senderRole: currentCompany === "MPSI" ? "개발총괄" : currentCompany === "우성정공" ? "금형설계" : "사출생산",
      content: inputMessage.trim(),
      messageType: "CHAT",
      createdAt: dateStr,
    };

    setMessages((prev) => ({
      ...prev,
      [selectedProjectNo]: [...(prev[selectedProjectNo] || []), newMsg],
    }));

    // 채널 목록의 마지막 메시지 갱신
    setChannels((prev) =>
      prev.map((c) =>
        c.projectNo === selectedProjectNo
          ? {
              ...c,
              lastMessage: `[${currentCompany}] ${inputMessage.trim()}`,
              lastMessageTime: timeStr,
            }
          : c
      )
    );

    // [공통 알림 발송]
    const targetRole = currentCompany === "MPSI" ? "ALL" : "MPSI";
    addNotification({
      menuName: "프로젝트 관리 - ArcTalk",
      menuPath: "/portal/project/arctalk",
      senderCompany: currentCompany === "MPSI" ? "MPSI 본사" : currentCompany === "우성정공" ? "우성정공(주)" : "(주)뉴몰드",
      senderName: currentSenderName,
      content: `[${selectedProjectNo}] ${inputMessage.trim()}`,
      projectNo: selectedProjectNo,
      targetRole: targetRole,
    });

    setInputMessage("");
  };

  // 기업별 말풍선 뱃지 스타일
  const getCompanyBadge = (company: ArcTalkMessage["senderCompany"]) => {
    switch (company) {
      case "MPSI":
        return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300";
      case "우성정공":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300";
      case "뉴몰드":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  // 채널 검색 필터
  const filteredChannels = channels.filter((c) => {
    const matchKey = searchKeyword
      ? c.projectNo.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.productName.includes(searchKeyword) ||
        c.projectName.includes(searchKeyword)
      : true;
    return matchKey;
  });

  return (
    <div className="flex flex-col gap-3 text-xs h-[calc(100vh-140px)]">
      {/* 1. 상단 컨트롤 바 */}
      <div className="bg-white dark:bg-zinc-900 border rounded-md p-3 shadow-xs flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-sky-600" />
          <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100">아크톡 (ArcTalk)</span>
          <span className="text-[11px] text-zinc-500 font-normal">
            - MPSI ↔ 외주/자체 협력사 프로젝트 협업 채널
          </span>
        </div>

        {/* 작성자 회사 시뮬레이션 토글 */}
        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 p-1 rounded-md border text-[11px]">
          <span className="text-zinc-500 font-medium pl-1">접속 계정 전환:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setCurrentCompany("MPSI"); setCurrentSenderName("김태훈 실장"); }}
              className={`px-2 py-0.5 rounded font-bold transition-all ${currentCompany === "MPSI" ? "bg-sky-600 text-white" : "text-zinc-600 hover:bg-zinc-200"}`}
            >
              MPSI
            </button>
            {/* <button
              onClick={() => { setCurrentCompany("우성정공"); setCurrentSenderName("배희섭 이사"); }}
              className={`px-2 py-0.5 rounded font-bold transition-all ${currentCompany === "우성정공" ? "bg-blue-600 text-white" : "text-zinc-600 hover:bg-zinc-200"}`}
            >
              우성정공
            </button>
            <button
              onClick={() => { setCurrentCompany("뉴몰드"); setCurrentSenderName("김부곤 상무"); }}
              className={`px-2 py-0.5 rounded font-bold transition-all ${currentCompany === "뉴몰드" ? "bg-emerald-600 text-white" : "text-zinc-600 hover:bg-zinc-200"}`}
            >
              뉴몰드
            </button> */}
          </div>
        </div>
      </div>

      {/* 2. 메인 2단 채팅 레이아웃 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 flex-1 min-h-0">
        {/* 좌측: 프로젝트ID 채널 목록 */}
        <div className="bg-white dark:bg-zinc-900 border rounded-md shadow-xs flex flex-col overflow-hidden">
          {/* 채널 검색 */}
          <div className="p-2.5 border-b bg-zinc-50 dark:bg-zinc-800/60 flex flex-col gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-zinc-400" />
              <Input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="관리번호 / 제품명 검색"
                className="h-7 text-xs pl-8 bg-white"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>프로젝트 채널 ({filteredChannels.length})</span>
              <span className="text-sky-600 font-mono font-bold">연동중</span>
            </div>
          </div>

          {/* 채널 리스트 */}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 overflow-y-auto flex-1">
            {filteredChannels.map((ch) => {
              const isSelected = ch.projectNo === selectedProjectNo;

              return (
                <div
                  key={ch.id}
                  onClick={() => setSelectedProjectNo(ch.projectNo)}
                  className={`p-3 cursor-pointer transition-colors flex flex-col gap-1 ${
                    isSelected
                      ? "bg-sky-50/80 dark:bg-sky-950/40 border-l-4 border-l-sky-600"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sky-600">{ch.projectNo}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{ch.lastMessageTime}</span>
                  </div>

                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-xs">
                    {ch.productName}
                  </div>

                  <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                    {ch.lastMessage}
                  </div>

                  <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-400 font-mono">
                    <span>{ch.moldVendor}</span>
                    <span>↔</span>
                    <span>{ch.massVendor}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 우측: 순수 텍스트 대화창 영역 */}
        <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-zinc-900 border rounded-md shadow-xs flex flex-col overflow-hidden">
          {/* 채널 헤더 바 */}
          <div className="p-3 border-b bg-zinc-50 dark:bg-zinc-800/60 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sky-600 text-sm">{activeChannel.projectNo}</span>
                <span className="text-zinc-400">|</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-100 text-xs">{activeChannel.productName}</span>
              </div>
              <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                <span>차종: {activeChannel.projectName}</span>
                <span>•</span>
                <span>금형처: <b className="text-blue-600">{activeChannel.moldVendor}</b></span>
                <span>•</span>
                <span>양산처: <b className="text-emerald-600">{activeChannel.massVendor}</b></span>
              </div>
            </div>
          </div>

          {/* 메시지 히스토리 스크롤 뷰 */}
          <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto flex flex-col gap-3.5 bg-zinc-50/40 dark:bg-zinc-950/20">
            {activeMessages.map((msg) => {
              const isSystem = msg.senderCompany === "SYSTEM";

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex items-center justify-center my-1">
                    <div className="bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Bot className="h-3 w-3 text-sky-600" />
                      <span>{msg.content}</span>
                      <span className="font-mono text-zinc-400 ml-1">{msg.createdAt.slice(11)}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex flex-col gap-1 max-w-[85%]">
                  {/* 발신자 정보 */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getCompanyBadge(msg.senderCompany)}`}>
                      {msg.senderCompany}
                    </span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">{msg.senderName}</span>
                    <span className="text-[10px] text-zinc-400">({msg.senderRole})</span>
                    <span className="text-[10px] text-zinc-400 font-mono ml-auto">{msg.createdAt}</span>
                  </div>

                  {/* 텍스트 말풍선 */}
                  <div className="p-3 rounded-lg border text-xs leading-relaxed bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-2xs">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 하단 텍스트 입력 영역 */}
          <div className="p-3 border-t bg-white dark:bg-zinc-900 shrink-0">
            <div className="flex items-center gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`[${currentCompany} - ${currentSenderName}] 메시지를 입력하세요... (Enter로 전송)`}
                className="h-8 text-xs bg-zinc-50 dark:bg-zinc-800 flex-1"
              />
              <Button
                onClick={handleSendMessage}
                className="h-8 px-4 bg-sky-600 hover:bg-sky-700 text-white gap-1 text-xs shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                전송
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}