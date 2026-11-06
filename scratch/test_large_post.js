async function testLargePost() {
  const largePayload = {
    projectNo: "MI26005P0",
    projectName: "Hinge Lower Protective Shell",
    productName: "Door Armrest Base",
    customerName: "55555555555555555555555555555555555555555555555 - 현대자동차 (1차사)",
    vendorName: "우성정공(주)",
    assignedVendors: ["우성정공(주)"],
    productionType: "OUTSOURCING",
    machineTypeTonnage: "유압식 450T",
    coreStructure: "원판일체형",
    moldMaterial: "NAK80",
    cavity: "1*2 Cavity",
    gateType: "HRS+EDGE",
    moldSteel: "NAK80",
    targetT1Date: "2026-11-05",
    moldDeliveryDate: "",
    targetMfgDays: 40,
    targetCycleTime: 42,
    quoteAmountWon: 0,
    targetBudgetWon: 85000000,
    quotationFileName: "",
    quotationFileSize: "",
    quotationFileDate: "",
    status: "견적요청",
    submittedDate: "",
    notes: "우성정공 금형 신규 견적 의뢰 " + "A".repeat(800), // > 1000 chars!
    vendorQuotes: [],
    specDocuments: [
      {
        id: "sd-1",
        category: "3D_MODEL",
        categoryName: "3D 제품모델 (CATIA/STEP)",
        fileName: "part_3d_model_final_v1.stp",
        fileSize: "14.2 MB",
        uploadedAt: "2026-11-05",
        author: "MPSI 금형개발팀",
        memo: "양산 금형 설계를 위한 최종 3D 파트 모델입니다. 수축율 15/1000 적용 필수.",
        version: 1,
        history: []
      },
      {
        id: "sd-2",
        category: "2D_DRAWING",
        categoryName: "2D 제품도면 (CAD/PDF)",
        fileName: "part_2d_drawing_dwg.pdf",
        fileSize: "3.5 MB",
        uploadedAt: "2026-11-05",
        author: "MPSI 금형개발팀",
        memo: "중요 치수 관리 포인트 및 기하공차 규정 도면입니다.",
        version: 1,
        history: []
      }
    ],
    memos: [],
    estimateNo: "M-EST-2026-009"
  };

  try {
    const res = await fetch("http://localhost:3005/api/v1/mold-dev/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(largePayload),
    });
    const json = await res.json();
    console.log("STATUS:", res.status);
    console.log("RESPONSE SUCCESS:", json.success);
    console.log("RETURNED ID:", json.data?.id, "ESTIMATE NO:", json.data?.estimateNo);
  } catch (err) {
    console.error("ERROR:", err);
  }
}

testLargePost();

