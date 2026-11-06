async function testPost() {
  const payload = {
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
    notes: "",
    vendorQuotes: [],
    specDocuments: [],
    memos: [],
    estimateNo: "M-EST-2026-008"
  };

  try {
    const res = await fetch("http://localhost:3005/api/v1/mold-dev/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("RESPONSE:", text);
  } catch (err) {
    console.error("FETCH ERROR:", err);
  }
}

testPost();

