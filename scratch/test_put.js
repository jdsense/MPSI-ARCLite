async function testPut() {
  const updatePayload = {
    estimateNo: "M-EST-2026-007",
    quoteAmountWon: 85000000,
    materialCostWon: 25000000,
    processingCostWon: 35000000,
    overheadProfitWon: 15000000,
    specialSpecWon: 10000000,
    availableMfgDays: 42,
    machineTypeTonnage: "유압식 450T",
    coreStructure: "원판일체형",
    moldMaterial: "SKD61",
    cavity: "1*2 Cavity",
    gateType: "HRS+EDGE",
    quotationFileName: "woosung_quote_v1.xlsx",
    quotationFileSize: "2.4 MB",
    vendorNotes: "우성정공 견적 제출 완료 - 강재 및 HRS 적용",
    status: "외주견적제출",
    vendorQuotes: [
      {
        id: "vq-test-1",
        vendorName: "우성정공(주)",
        submittedDate: "2026-11-05",
        availableMfgDays: 42,
        materialCostWon: 25000000,
        processingCostWon: 35000000,
        overheadProfitWon: 15000000,
        specialSpecWon: 10000000,
        totalAmountWon: 85000000,
        quotationFileName: "woosung_quote_v1.xlsx",
        quotationFileSize: "2.4 MB",
        vendorNotes: "우성정공 견적 제출 완료 - 강재 및 HRS 적용",
        mpsiReplies: [],
        status: "제출완료"
      }
    ]
  };

  try {
    const res = await fetch("http://localhost:3005/api/v1/mold-dev/quotations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload),
    });
    const json = await res.json();
    console.log("STATUS:", res.status);
    console.log("RESPONSE SUCCESS:", json.success);
    console.log("UPDATED ROW:", json.data?.estimateNo, json.data?.status, json.data?.quoteAmountWon, json.data?.materialCostWon);
  } catch (err) {
    console.error("PUT ERROR:", err);
  }
}

testPut();

