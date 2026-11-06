--
-- PostgreSQL database dump
--

\restrict ofynpFugyB9nzNTQFl2H1vXd5lapF6Y8Xpl3KiHBIk2BophBdmiurYprnc8w42U

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: AfterSalesServiceRequest; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public."AfterSalesServiceRequest" DISABLE TRIGGER ALL;

COPY public."AfterSalesServiceRequest" ("AfterSalesServiceRequestSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ItemID", "ItemName", "RequestNumber", "TransferSequence", "BasicAcceptProcessCode", "PromisedVisitDateTime", "TransferRegistrationCode", "SerialNumber") FROM stdin;
\.


ALTER TABLE public."AfterSalesServiceRequest" ENABLE TRIGGER ALL;

--
-- Data for Name: AfterSalesServiceRequestResult; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."AfterSalesServiceRequestResult" DISABLE TRIGGER ALL;

COPY public."AfterSalesServiceRequestResult" ("AfterSalesServiceRequestResultSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ItemID", "ItemName", "RequestNumber", "TransferSequence", "RegisterSequence", "RepairSequence", "SerialNumber", "FaultLargeClass", "FaultSmallClass", "ErrorCode", "InstallationDate", "ProcessingDate", "EndIndicator", "WorkType", "ChildItemID", "ChildItemName", "ItemSpecification", "RepairType") FROM stdin;
\.


ALTER TABLE public."AfterSalesServiceRequestResult" ENABLE TRIGGER ALL;

--
-- Data for Name: Alarm; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Alarm" DISABLE TRIGGER ALL;

COPY public."Alarm" ("AlarmSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "AlarmID", "EquipmentID", "AlarmState", "ErrorCode", "ErrorMessage", "EventDateTime", "CurrentLocation") FROM stdin;
\.


ALTER TABLE public."Alarm" ENABLE TRIGGER ALL;

--
-- Data for Name: AvailableInventory; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."AvailableInventory" DISABLE TRIGGER ALL;

COPY public."AvailableInventory" ("AvailableInventorySequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "AvailableInventoryID", "ItemID", "ItemName", "AvailableInventoryQuantity", "ItemUOMCode", "DemandPriority", "PriorDemandQuantity", "ExpectedDeliveryDate") FROM stdin;
\.


ALTER TABLE public."AvailableInventory" ENABLE TRIGGER ALL;

--
-- Data for Name: BOMHeader; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."BOMHeader" DISABLE TRIGGER ALL;

COPY public."BOMHeader" ("BOMHeaderSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "BOMID", "BOMRevisionNumber", "BOMType", "ItemID", "BOMQuantity", "ItemUOMCode", "RoutingID") FROM stdin;
\.


ALTER TABLE public."BOMHeader" ENABLE TRIGGER ALL;

--
-- Data for Name: BOMLine; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."BOMLine" DISABLE TRIGGER ALL;

COPY public."BOMLine" ("BOMLineSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "BOMID", "BOMRevisionNumber", "BOMLineSequence", "ChildItemID", "ChildItemUOMCode", "ActualRequirementQuantity", "OperationSequence", "BackFlushedIndicator", "ValidStartDateTime", "ValidEndDateTime") FROM stdin;
\.


ALTER TABLE public."BOMLine" ENABLE TRIGGER ALL;

--
-- Data for Name: BasePrice; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."BasePrice" DISABLE TRIGGER ALL;

COPY public."BasePrice" ("BasePriceSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ItemID", "CurrencyCode", "UnitPrice", "PaymentTermsCode", "UseIndicator") FROM stdin;
\.


ALTER TABLE public."BasePrice" ENABLE TRIGGER ALL;

--
-- Data for Name: Batch; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Batch" DISABLE TRIGGER ALL;

COPY public."Batch" ("BatchSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "BatchID", "BatchName", "BatchDescription", "BatchType", "ParentBatchID", "ItemID", "LotID", "ProductionOrderID", "ProductionOrderSequence", "BOMID", "BOMRevisionNumber", "RecipeID", "RecipeVersion", "OperationID", "EquipmentID", "BatchState", "HoldIndicator", "ReworkIndicator", "QualityDispositionCode", "BatchPlannedQuantity", "ProducedQuantity", "DefectQuantity", "ItemUOMCode", "ScheduleStartDateTime", "ScheduleEndDateTime", "BatchStartDateTime", "BatchEndDateTime", "ManufactureDate", "ValidEndDate", "PersonnelID") FROM stdin;
\.


ALTER TABLE public."Batch" ENABLE TRIGGER ALL;

--
-- Data for Name: Carrier; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Carrier" DISABLE TRIGGER ALL;

COPY public."Carrier" ("CarrierSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "CarrierID", "CarrierType", "ItemType", "LoadState", "CarrierState", "CurrentQuantity") FROM stdin;
\.


ALTER TABLE public."Carrier" ENABLE TRIGGER ALL;

--
-- Data for Name: CommonCodeMaster; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."CommonCodeMaster" DISABLE TRIGGER ALL;

COPY public."CommonCodeMaster" ("CommonCodeMasterSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "CommonCodeID", "CommonCodeName", "CommonCodeGroup", "ParentCommonCodeGroup", "ParentCommonCodeID", "CommonCodeSequence", "UseIndicator") FROM stdin;
\.


ALTER TABLE public."CommonCodeMaster" ENABLE TRIGGER ALL;

--
-- Data for Name: CorrectiveActionPlan; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."CorrectiveActionPlan" DISABLE TRIGGER ALL;

COPY public."CorrectiveActionPlan" ("CorrectiveActionPlanSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "VendorID", "ItemID", "ItemName", "LotID", "BatchID", "CorrectiveActionRequestID", "CorrectiveActionPlanID", "PersonInChargeID", "PersonInChargeEmail", "PersonInChargeDialNumber", "ExpectedCorrectiveActionDate", "CorrectiveActionRequestDocumentReference", "CorrectiveActionApprovalIndicator", "CorrectiveActionStatusCode", "ReasonForRejection") FROM stdin;
\.


ALTER TABLE public."CorrectiveActionPlan" ENABLE TRIGGER ALL;

--
-- Data for Name: CorrectiveActionRequest; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."CorrectiveActionRequest" DISABLE TRIGGER ALL;

COPY public."CorrectiveActionRequest" ("CorrectiveActionRequestSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "VendorID", "ItemID", "ItemName", "LotID", "BatchID", "InspectionApplicationID", "CorrectiveActionRequestID", "CorrectiveActionRequestIssuerID", "CorrectiveActionRequestRecipientID", "CorrectiveActionRequestLocation", "CorrectiveActionRequestDocumentReference") FROM stdin;
\.


ALTER TABLE public."CorrectiveActionRequest" ENABLE TRIGGER ALL;

--
-- Data for Name: CorrectiveActionResult; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."CorrectiveActionResult" DISABLE TRIGGER ALL;

COPY public."CorrectiveActionResult" ("CorrectiveActionResultSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "VendorID", "ItemID", "ItemName", "LotID", "BatchID", "CorrectiveActionRequestID", "CorrectiveActionPlanID", "CorrectiveActionResultID", "PersonInChargeID", "PersonInChargeEmail", "PersonInChargeDialNumber", "CorrectiveActionConfirmorID", "CorrectiveActionConfirmorEmail", "CorrectiveActionConfirmorDialNumber", "CorrectiveActionDateTime", "CorrectiveActionResultDescription", "CorrectiveActionStatusCode", "ReasonForRejection") FROM stdin;
\.


ALTER TABLE public."CorrectiveActionResult" ENABLE TRIGGER ALL;

--
-- Data for Name: CustomerPartyMaster; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."CustomerPartyMaster" DISABLE TRIGGER ALL;

COPY public."CustomerPartyMaster" ("CustomerPartyMasterSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "CustomerID", "CustomerName", "BusinessRegistrationNumber", "RepresentativeName", "CountryID", "PostalCode", "BaseAddress", "DetailAddress", "DialNumber", "FaxNumber", "UseIndicator", "PersonInChargeName", "PersonInChargeEmail", "PersonInChargeDialNumber") FROM stdin;
16	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 02:40:17.405916	\N	\N	\N	CUST-016	1	1	1	KR	1	1	1	1	1	t			
15	MPSI_HQ	SITE_01	PLANT_01	\N	2025-12-01 09:00:00	\N	2026-11-05 02:40:17.437127	\N	CUST-001	(주)테크솔루션	120-81-1234	김철수	KR	06159	서울특별시 강남구	7층 701호	02-555-1000	02-555-1001	t	이지혜	jh.lee@techsol.co.kr	010-1111-2222
14	MPSI_HQ	SITE_01	PLANT_01	\N	2025-12-15 09:00:00	\N	2026-11-05 02:40:17.447595	\N	CUST-002	미래네트워크	214-86-5432	이영희	KR	04524	서울특별시 중구	비즈니스센터 3층	02-777-2000	02-777-2002	t	박지민	jm.park@miraenet.co.kr	010-2222-3333
13	MPSI_HQ	SITE_01	PLANT_01	\N	2025-12-20 09:00:00	\N	2026-11-05 02:40:17.4564	\N	CUST-003	한빛물산	107-85-9876	박준영	KR	48058	부산광역시 해운대구	한빛빌딩 12층	051-999-3000	051-999-3003	t	최유진	yj.choi@hanbit.co.kr	010-3333-4444
12	MPSI_HQ	SITE_01	PLANT_01	\N	2025-12-28 09:00:00	\N	2026-11-05 02:40:17.463508	\N	CUST-004	(주)글로벌트레이드	305-81-1122	정민호	KR	34111	대전광역시 유성구	창업보육센터 204호	042-444-4000	042-444-4004	t	강동현	dh.kang@globaltrade.kr	010-4444-5555
11	MPSI_HQ	SITE_01	PLANT_01	\N	2026-01-05 09:00:00	\N	2026-11-05 02:40:17.479228	\N	CUST-005	에코시스템즈	410-82-3344	최지우	KR	16501	경기도 수원시 영통구	광교비즈니스센터 8층	031-222-5000	031-222-5005	t	윤미래	mr.yoon@eco.co.kr	010-5555-6666
10	MPSI_HQ	SITE_01	PLANT_01	\N	2026-01-10 09:00:00	\N	2026-11-05 02:40:17.486775	\N	CUST-006	스마트로지스	113-81-5566	윤도현	KR	21558	인천광역시 남동구	물류센터 A동	032-888-6000	032-888-6006	f	김나영	ny.kim@smartlogis.com	010-6666-7777
9	MPSI_HQ	SITE_01	PLANT_01	\N	2026-01-15 09:00:00	\N	2026-11-05 02:40:17.496314	\N	CUST-007	(주)제이앤비	502-81-7788	장서준	KR	61928	광주광역시 서구	오피스타워 502호	062-333-7000	062-333-7007	t	임채원	cw.lim@jbcorp.co.kr	010-7777-8888
8	MPSI_HQ	SITE_01	PLANT_01	\N	2026-01-20 09:00:00	\N	2026-11-05 02:40:17.501451	\N	CUST-008	대영소프트	128-86-9900	송중기	KR	13487	경기도 성남시 분당구	판교테크노밸리 B동	031-777-8000	031-777-8008	t	조상욱	sw.cho@daeyoung.co.kr	010-8888-9999
7	MPSI_HQ	SITE_01	PLANT_01	\N	2026-01-25 09:00:00	\N	2026-11-05 02:40:17.508251	\N	CUST-009	그린에너지	603-81-1212	홍길동	KR	44730	울산광역시 남구	그린타워 10층	052-222-9000	052-222-9009	t	백상훈	sh.baek@greenenergy.com	010-9999-0000
6	MPSI_HQ	SITE_01	PLANT_01	\N	2026-02-01 09:00:00	\N	2026-11-05 02:40:17.515578	\N	CUST-010	(주)아이티월드	201-81-3434	한예슬	KR	08501	서울특별시 금천구	IT단지 1501호	02-333-1111	02-333-1112	t	서준호	jh.seo@itworld.co.kr	010-1111-3333
5	MPSI_HQ	SITE_01	PLANT_01	\N	2026-02-10 09:00:00	\N	2026-11-05 02:40:17.521842	\N	CUST-011	비전기획	105-82-5656	권나라	KR	03186	서울특별시 종로구	비전빌딩 4층	02-444-2222	02-444-2223	t	유재석	js.yoo@vision.co.kr	010-2222-4444
4	MPSI_HQ	SITE_01	PLANT_01	\N	2026-02-15 09:00:00	\N	2026-11-05 02:40:17.527922	\N	CUST-012	에이플러스	408-81-7878	남궁민	KR	10408	경기도 고양시 일산동구	메트로폴리스 5층	031-555-3333	031-555-3334	t	정해인	hi.jung@aplus.kr	010-3333-5555
3	MPSI_HQ	SITE_01	PLANT_01	\N	2026-02-20 09:00:00	\N	2026-11-05 02:40:17.534397	\N	CUST-013	케이씨산업	505-81-9090	공유	KR	38111	경상북도 경주시	경주공장 사무동	054-666-4444	054-666-4445	t	김고은	ge.kim@kcind.co.kr	010-4444-6666
2	MPSI_HQ	SITE_01	PLANT_01	\N	2026-02-28 09:00:00	\N	2026-11-05 02:40:17.546289	\N	CUST-014	(주)넥스트레벨	220-81-1357	현빈	KR	06000	서울특별시 강남구	넥스트타워	02-777-5555	02-777-5556	t	손예진	yj.son@nextlevel.co.kr	010-5555-7777
1	MPSI_HQ	SITE_01	PLANT_01	\N	2026-03-01 09:00:00	\N	2026-11-05 02:40:17.555403	\N	CUST-015	퍼스트클래스	110-81-2468	송혜교	KR	04323	서울특별시 용산구	용산타워 20층	02-888-6666	02-888-6667	t	박보검	bg.park@firstclass.co.kr	010-6666-8888
\.


ALTER TABLE public."CustomerPartyMaster" ENABLE TRIGGER ALL;

--
-- Data for Name: DeliveryHeader; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."DeliveryHeader" DISABLE TRIGGER ALL;

COPY public."DeliveryHeader" ("DeliveryHeaderSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "DeliveryID", "DeliveryDateTime", "CustomerID", "PackingList", "PackingType", "TransportationMethodCode", "DepartmentInChargeID", "DepartmentInChargeName", "PersonInChargeID", "PersonInChargeName", "PersonInChargeDialNumber", "TransportationCompany", "PersonInChargeNameOfTransportation", "PersonInChargeDialNumberOfTransportation", "Recipient", "RecipientDialNumber", "RecipientEmail", "ShippingPoint", "ShipToAddress", "PreferredReceiptDate", "DeliveryNote", "DeliveryConfirmationDocument") FROM stdin;
\.


ALTER TABLE public."DeliveryHeader" ENABLE TRIGGER ALL;

--
-- Data for Name: DeliveryLine; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."DeliveryLine" DISABLE TRIGGER ALL;

COPY public."DeliveryLine" ("DeliveryLineSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "DeliveryID", "DeliveryLineSequence", "ProductReleaseID", "ProductReleaseSequence", "SalesDocumentNumber", "SalesDocumentSequence", "ItemID", "ItemName", "InvoiceNumber", "LotID", "ItemUOMCode", "ItemUnitQuantity", "OrderUOMCode", "OrderQuantity", "ProductDeliveryUOMCode", "ProductDeliveryQuantity", "RequestedDeliveryDate") FROM stdin;
\.


ALTER TABLE public."DeliveryLine" ENABLE TRIGGER ALL;

--
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Department" DISABLE TRIGGER ALL;

COPY public."Department" ("DepartmentSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "DepartmentID", "DepartmentName", "ParentDepartmentID") FROM stdin;
\.


ALTER TABLE public."Department" ENABLE TRIGGER ALL;

--
-- Data for Name: EngineeringChangeOrder; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."EngineeringChangeOrder" DISABLE TRIGGER ALL;

COPY public."EngineeringChangeOrder" ("EngineeringChangeOrderSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "EngineeringChangeOrderID", "ItemID", "ValidStartDate", "ValidEndDate", "ExpectedExecutionDate", "ExecutionDate", "BOMType", "BOMID", "BOMRevisionNumber", "ChildItemID", "ItemUOMCode", "ActualRequirementQuantity") FROM stdin;
\.


ALTER TABLE public."EngineeringChangeOrder" ENABLE TRIGGER ALL;

--
-- Data for Name: Enterprise; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Enterprise" DISABLE TRIGGER ALL;

COPY public."Enterprise" ("EnterpriseSequenceNo", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "EnterpriseID", "EnterpriseName", "BusinessRegistrationNumber", "CorporateRegistrationNumber", "RepresentativeName", "ParentEnterpriseID", "CountryID", "BaseCurrencyCode", "DialNumber", "FaxNumber", "PostalCode", "BaseAddress", "DetailAddress", "UseIndicator") FROM stdin;
\.


ALTER TABLE public."Enterprise" ENABLE TRIGGER ALL;

--
-- Data for Name: Equipment; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Equipment" DISABLE TRIGGER ALL;

COPY public."Equipment" ("EquipmentSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "EquipmentID", "EquipmentName", "ParentEquipmentID", "EquipmentType", "EquipmentLargeClass", "EquipmentMediumClass", "EquipmentSmallClass", "DepartmentInChargeID", "PersonInChargeID", "OperationID", "UseIndicator", "DAQDevice", "FixedAssetID", "ModelNumber", "SerialNumber", "CountryOfOrigin", "Manufacturer", "AcquisitionDate", "Location") FROM stdin;
\.


ALTER TABLE public."Equipment" ENABLE TRIGGER ALL;

--
-- Data for Name: EquipmentParameter; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."EquipmentParameter" DISABLE TRIGGER ALL;

COPY public."EquipmentParameter" ("EquipmentParameterSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ParameterID", "ParameterName", "ParameterType", "ParameterGrade", "ParameterUOMCode", "EquipmentID", "LSL", "USL", "PeriodicDataCollectionIndicator", "DataCollectionPeriod") FROM stdin;
\.


ALTER TABLE public."EquipmentParameter" ENABLE TRIGGER ALL;

--
-- Data for Name: EquipmentState; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."EquipmentState" DISABLE TRIGGER ALL;

COPY public."EquipmentState" ("EquipmentStateSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "EquipmentStateID", "EquipmentID", "EquipmentState", "EquipmentControlMode", "EquipmentOperationMode", "ProcessedLotQuantity", "LastProcessedLotID", "LastProcessedOperationID", "ErrorCode", "ErrorMessage") FROM stdin;
\.


ALTER TABLE public."EquipmentState" ENABLE TRIGGER ALL;

--
-- Data for Name: GoodsIssue; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."GoodsIssue" DISABLE TRIGGER ALL;

COPY public."GoodsIssue" ("GoodsIssueSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "GoodsIssueID", "InventoryTransactionDocumentNumber", "InventoryTransactionDocumentSequence", "ItemID", "InventoryTransactionTypeCode", "InventoryTransferType", "InventoryVariationType", "InventoryTransactionType", "LotID", "SerialUseIndicator", "VendorID", "WarehouseID", "ItemUOMCode", "ItemUnitQuantity", "OrderUOMCode", "OrderQuantity") FROM stdin;
\.


ALTER TABLE public."GoodsIssue" ENABLE TRIGGER ALL;

--
-- Data for Name: GoodsReceipt; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."GoodsReceipt" DISABLE TRIGGER ALL;

COPY public."GoodsReceipt" ("GoodsReceiptSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "GoodsReceiptID", "WarehouseID", "PersonnelID", "GoodsReceiptSequence", "GoodsReceiptType", "GoodsReceiptReturnType", "GoodsReceiptDate", "ItemID", "ItemName", "InventoryTransactionDocumentNumber", "InventoryTransactionDocumentSequence", "InventoryTransactionTypeCode", "InvoiceNumber", "InvoiceSequence", "InvoiceProcessingIndicator", "IncomingInspectionIndicator", "VendorID", "PurchaseOrderUOMCode", "ItemUnitQuantity", "GoodsReceiptQuantity", "IncomingInspectionAcceptedQuantity", "IncomingInspectionRejectedQuantity", "PurchaseGroupCode", "ItemUOMCode") FROM stdin;
\.


ALTER TABLE public."GoodsReceipt" ENABLE TRIGGER ALL;

--
-- Data for Name: InTransitLocation; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."InTransitLocation" DISABLE TRIGGER ALL;

COPY public."InTransitLocation" ("InTransitLocationSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "InTransitLocationID", "TransferCommandID", "LotID", "LotName", "LotDescription", "CarrierID", "CurrentLocation") FROM stdin;
\.


ALTER TABLE public."InTransitLocation" ENABLE TRIGGER ALL;

--
-- Data for Name: Inventory; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Inventory" DISABLE TRIGGER ALL;

COPY public."Inventory" ("InventorySequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "WarehouseID", "ItemID", "InventoryQuantity", "ItemUOMCode") FROM stdin;
\.


ALTER TABLE public."Inventory" ENABLE TRIGGER ALL;

--
-- Data for Name: InventoryCount; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."InventoryCount" DISABLE TRIGGER ALL;

COPY public."InventoryCount" ("InventoryCountSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "InventoryCountDocumentNumber", "InventoryCountDateTime", "WarehouseID", "ItemID", "InventoryQuantity", "InventoryCountQuantity", "ItemUOMCode") FROM stdin;
\.


ALTER TABLE public."InventoryCount" ENABLE TRIGGER ALL;

--
-- Data for Name: ItemMaster; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ItemMaster" DISABLE TRIGGER ALL;

COPY public."ItemMaster" ("ItemMasterSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ItemID", "ItemName", "ItemType", "PhantomIndicator", "ItemLargeClass", "ItemMediumClass", "ItemSmallClass", "ModelName", "ItemSpecification", "ItemDetailSpecification", "UseIndicator", "CountryOfOrigin", "PlaceOfOrigin", "ItemUOMCode", "Weight", "NetWeight", "WeightUOMCode", "Volume", "VolumeUOMCode", "Length", "Width", "Height", "DimensionUOMCode", "ValidEndDate", "DrawingNumber", "LotControlIndicator", "PurchaseLeadTime", "ProductionLeadTime", "LotSize", "MainCustomerID", "MainVendorID", "SafetyStock", "MaximumStockLevel", "ReceiptWarehouseID", "IssueWarehouseID", "ABCClass", "ReplacementItemID", "IncomingInspectionIndicator", "FinalInspectionIndicator", "OutgoingInspectionIndicator") FROM stdin;
1	MPSI_HQ	SITE_01	PLANT_01	\N	2026-10-31 09:00:00	\N	\N	SPX 전기차 배터리 모듈 하우징 반제품	37510-SPX00-BM	BMS Battery Case Module	\N	\N	판매반제품	\N	\N	\N	SKD61 / PBT-GF30 난연, 1*4 Cavity	\N	t	\N	\N	EA	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	DWG-SPX-BM375-01	f	\N	\N	\N	\N	\N	24500.000000	\N	D구역 (판매반제품)	D구역 (판매반제품)	\N	\N	\N	\N	\N
2	MPSI_HQ	SITE_01	PLANT_01	\N	2026-10-31 09:00:00	\N	\N	아반떼 CN7 도어 암레스트 베이스 성형품	82710-AA000	Door Armrest Base	\N	\N	판매반제품	\N	\N	\N	PP 컴파운드 사출물, 1*2 Cavity	\N	t	\N	\N	EA	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	DWG-CN7-ARM-8271	f	\N	\N	\N	\N	\N	11200.000000	\N	D구역 (판매반제품)	D구역 (판매반제품)	\N	\N	\N	\N	\N
3	MPSI_HQ	SITE_01	PLANT_01	\N	2026-10-31 09:00:00	\N	\N	현대 NT5 도어 트림 상단 커버 1차 사출품	84710-NT500-LH	Front Door Upper Cover LH/RH	\N	\N	판매반제품	\N	\N	\N	NAK80 / PP-EPDM, 1*2 Cavity (LH/RH)	\N	t	\N	\N	EA	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	DWG-NT5-FDUC-8471	f	\N	\N	\N	\N	\N	18500.000000	\N	D구역 (판매반제품)	D구역 (판매반제품)	\N	\N	\N	\N	\N
4	MPSI_HQ	SITE_01	PLANT_01	\N	2026-10-31 09:00:00	\N	\N	기아 A2XT 센터 콘솔 메인 브라켓	84740-A2XT0-MB	Center Console Main Bracket	\N	\N	판매반제품	\N	\N	\N	SKD61 / ABS HI-121, 1*1 Cavity	\N	t	\N	\N	EA	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	DWG-A2XT-MB-8474	f	\N	\N	\N	\N	\N	15400.000000	\N	D구역 (판매반제품)	D구역 (판매반제품)	\N	\N	\N	\N	\N
5	MPSI_HQ	SITE_01	PLANT_01	\N	2026-10-31 09:00:00	\N	\N	기아 K7 라디에이터 그릴 로어 사출물	86350-K7000	Radiator Lower Grille	\N	\N	판매반제품	\N	\N	\N	KP4M / PC+ABS, 1*1 Cavity	\N	t	\N	\N	EA	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	DWG-K7-RLG-8635	f	\N	\N	\N	\N	\N	22000.000000	\N	D구역 (판매반제품)	D구역 (판매반제품)	\N	\N	\N	\N	\N
\.


ALTER TABLE public."ItemMaster" ENABLE TRIGGER ALL;

--
-- Data for Name: Line; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Line" DISABLE TRIGGER ALL;

COPY public."Line" ("LineSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "LineID", "LineName", "LineDescription", "LineType", "ProductionMethodType", "ParentLineID", "DepartmentInChargeID", "PersonInChargeID", "CalendarID", "IssueWarehouseID", "ReceiptWarehouseID", "StandardCapacity", "CapacityUOMCode", "StandardCycleTime", "ShiftCount", "StandardHeadcount", "Location", "UseIndicator", "ValidStartDate", "ValidEndDate") FROM stdin;
\.


ALTER TABLE public."Line" ENABLE TRIGGER ALL;

--
-- Data for Name: Lot; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Lot" DISABLE TRIGGER ALL;

COPY public."Lot" ("LotSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "LotID", "LotName", "LotDescription", "ParentLotID", "ChildLotID", "LotType", "ItemID", "CarrierID", "ProductionOrderID", "ProductionOrderSequence", "ScheduledDueDate", "LotPriority", "CurrentOperationID", "NextOperationID", "LotState", "HoldIndicator", "HotIndicator", "ReworkIndicator", "LotCreatedQuantity", "ProducedQuantity", "DefectQuantity", "ReworkQuantity", "ReworkCount", "TotalReworkCount", "LotStartedDateTime", "PersonnelID") FROM stdin;
\.


ALTER TABLE public."Lot" ENABLE TRIGGER ALL;

--
-- Data for Name: MaterialArrival; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MaterialArrival" DISABLE TRIGGER ALL;

COPY public."MaterialArrival" ("MaterialArrivalSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "PurchaseDocumentNumber", "PurchaseDocumentSequence", "ItemID", "PurchaseGoodsReceiptQuantity", "ReceiptWarehouseID", "GoodsReceiptDate", "LotID", "ItemQuantity", "VendorID") FROM stdin;
\.


ALTER TABLE public."MaterialArrival" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiArcTalkMessage; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiArcTalkMessage" DISABLE TRIGGER ALL;

COPY public."MpsiArcTalkMessage" ("MessageSequenceNo", "MessageID", "ProjectID", "SenderID", "SenderName", "SenderCompany", "Content", "AttachmentFileName", "CreationDateTime") FROM stdin;
\.


ALTER TABLE public."MpsiArcTalkMessage" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiDeliveryStep; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiDeliveryStep" DISABLE TRIGGER ALL;

COPY public."MpsiDeliveryStep" ("StepSequenceNo", "StepID", "TrackingID", "StepTitle", "LocationName", "OccurredDateTime") FROM stdin;
\.


ALTER TABLE public."MpsiDeliveryStep" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiDeliveryTracking; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiDeliveryTracking" DISABLE TRIGGER ALL;

COPY public."MpsiDeliveryTracking" ("TrackingSequenceNo", "TrackingID", "ProjectID", "InvoiceNumber", "CarrierName", "DispatchDate", "DeliveryStatus") FROM stdin;
\.


ALTER TABLE public."MpsiDeliveryTracking" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiInspectionReport; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiInspectionReport" DISABLE TRIGGER ALL;

COPY public."MpsiInspectionReport" ("InspectionSequenceNo", "InspectionID", "TrialID", "ProjectID", "InspectionType", "TotalInspectionPoints", "PassedPoints", "FailedPoints", "InspectionResult", "InspectorName", "InspectionDate", "ReportFileName") FROM stdin;
\.


ALTER TABLE public."MpsiInspectionReport" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiMassPpap; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiMassPpap" DISABLE TRIGGER ALL;

COPY public."MpsiMassPpap" ("PpapSequenceNo", "PpapID", "ProjectID", "MassVendorID", "PpapStatus", "CurrentStep", "CompletionRate", "TargetApprovalDate", "CreatorID", "CreationDateTime", "ModificationDateTime", "Note") FROM stdin;
1	PPAP-MI26005P0	MI26005P0	(주)뉴몰드 김재열 차장	승인완료	13	100	2026-12-20	MPSI_HQ	2026-11-05 14:23:19.878994	2026-11-05 14:54:34.095266	{"id":1,"ppapNo":"PPAP-MI26005P0","projectNo":"MI26005P0","partNo":"84710-MI260-01","projectName":"Door Armrest Base","productName":"Main Part","moldVendor":"우성정공(주)","massVendor":"(주)뉴몰드 김재열 차장","moldNo":"MI26005P0M","machineNo":"650T","packageSubmissions":[{"round":1,"fileName":"챗봇 보안성검토 (1) (1).zip","fileSize":"105 KB","fileUrl":"/uploads/1793888892973_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(1).zip","submittedAt":"2026.11.05. 23:28 입력","authorName":"(주)뉴몰드 김재열 차장","memo":"261105_양산승인서류 1차 등록","reviewStatus":"승인","reviewComment":"111","reviewedAt":"2026-11-05 23:54"}],"ppapStatus":"승인완료","continuousHours":12,"totalShotCount":1300,"totalProduced":2600,"defectRate":0.58,"measuredCpk":1.45,"oqcResult":"OK","vendorOpinion":"","vendorSubmittedDate":"2026.11.05. 23:28","completionRate":100,"mpsiOpinion":"111","rejectReason":"","partPoNo":"PO-2026-1105-01","partPoDate":"2026.11.05.","approvalOfficer":"MPSI","currentStep":13,"updatedAt":"2026-11-05 23:54"}
\.


ALTER TABLE public."MpsiMassPpap" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiMassProductionValidation; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiMassProductionValidation" DISABLE TRIGGER ALL;

COPY public."MpsiMassProductionValidation" ("ValidationSequenceNo", "ValidationID", "ProjectID", "MassVendorID", "ContinuousHours", "TotalShotCount", "TotalProducedQuantity", "DefectQuantity", "DefectRate", "MeasuredCpk", "CpkPassed", "ValidationStatus", "ValidationReportFile", "CreatorID", "CreationDateTime") FROM stdin;
\.


ALTER TABLE public."MpsiMassProductionValidation" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiMassQuotation; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiMassQuotation" DISABLE TRIGGER ALL;

COPY public."MpsiMassQuotation" ("MassQuotationSequenceNo", "MassQuotationID", "ProjectID", "EstimateNumber", "MassVendorID", "ProductionType", "UnitPrice", "MaterialCost", "ProcessingCost", "PackagingCost", "LogisticsCost", "TargetCycleTime", "QuotationStatus", "RequestDate", "SubmissionDate", "CreatorID", "CreationDateTime", "ModificationDateTime", "Note") FROM stdin;
1	MI26005P0사출견적	MI26005P0	MI26005P0사출견적	(주)뉴몰드 김재열 차장	OUTSOURCING	100008500.00	5000.00	500.00	3000.00	100000000.00	35.00	단가합의완료	2026-11-05	2026-10-30	MPSI_HQ	2026-11-05 13:17:02.226175	2026-11-05 13:45:22.766293	{"id":1,"estimateNo":"MI26005P0사출견적","projectNo":"MI26005P0","officialProjectNo":"MI26005P0","projectName":"Door Armrest Base","productName":"Main Part","customerName":"현대자동차 (1차사)","vendorName":"(주)뉴몰드 김재열 차장","selectedVendorName":"(주)뉴몰드 김재열 차장","assignedVendors":["(주)뉴몰드"],"productionType":"OUTSOURCING","resinSpec":"PP 컴파운드 사출물","resinPricePerKg":2850,"partWeightGram":420,"runnerWeightGram":35,"cavity":"1*2 Cavity","machineTonnage":"650T","targetCycleTime":35,"targetMassApprovalDate":"2026-12-20","massStartDate":"2026-12-25","sph":102,"monthlyVolume":50000,"materialCost":5000,"processingCost":500,"overheadCost":60,"profitCost":40,"packagingCost":3000,"logisticsCost":100000000,"finalUnitPrice":100008500,"estimateFileName":"예시자료-금형제작협의록 (1) (3) (1)(1)(1) (5).xlsx","estimateFileSize":"7.27 MB","estimateFileDate":"2026-11-05","status":"단가합의완료","requestDate":"2026-11-04","submittedDate":"2026-10-30","notes":"[금형 이관 완료 자동 연계] 금형제작처(우성정공(주))에서 5대 서류 승인 및 금형 이관 완료에 따라 사출양산처((주)뉴몰드)에 사출 양산 견적 건이 자동 등재되었습니다.","vendorNotes":"","comments":[{"id":"c-init-1793884622223","author":"MPSI 시스템","authorRole":"MPSI","content":"금형 이관 완료에 따라 지정된 사출 양산처 [(주)뉴몰드]에 양산 견적 요청이 자동 생성되었습니다.","createdAt":"2026-11-05"},{"id":"comment-1793885061774","author":"(주)뉴몰드 김재열 차장","authorRole":"VENDOR","content":"업무 이력 메모 1","createdAt":"2026-11-05 22:24:21"},{"id":"comment-1793885117517","author":"MPSI 양산팀","authorRole":"MPSI","content":"ㄴㄴㄴㄴ","createdAt":"2026-11-05 22:25"},{"id":"comment-1793885565336","author":"(주)뉴몰드 영업부","authorRole":"VENDOR","content":"eeee","createdAt":"2026-11-05 22:32"},{"id":"comment-1793886322739","author":"(주)뉴몰드 영업부","authorRole":"VENDOR","content":"123123123","createdAt":"2026-11-05 22:45"}],"submissionHistory":[{"id":"hist-1793885061774","submissionType":"최초 제출","revisionNo":1,"memo":"업무 이력 메모 1","fileName":"예시자료-금형제작협의록 (1) (3) (1)(1)(1) (5).xlsx","fileSize":"7.27 MB","fileUrl":"/uploads/1793885053722_%EC%98%88%EC%8B%9C%EC%9E%90%EB%A3%8C-%EA%B8%88%ED%98%95%EC%A0%9C%EC%9E%91%ED%98%91%EC%9D%98%EB%A1%9D%20(1)%20(3)%20(1)(1)(1)%20(5).xlsx","finalUnitPrice":100008500,"targetCycleTime":35,"targetMassApprovalDate":"2026-12-20","massStartDate":"2026-12-25","submittedAt":"2026-11-05 22:24:21","author":"(주)뉴몰드 김재열 차장"}],"vendorQuotes":[{"id":"vq-1793885061774","vendorName":"(주)뉴몰드 김재열 차장","submittedDate":"2026-11-05","materialCost":5000,"processingCost":500,"overheadCost":60,"profitCost":40,"packagingCost":3000,"logisticsCost":100000000,"unitPrice":100008500,"targetCycleTime":35,"quotationFileName":"예시자료-금형제작협의록 (1) (3) (1)(1)(1) (5).xlsx","quotationFileSize":"7.27 MB","quotationFileUrl":"/uploads/1793885053722_%EC%98%88%EC%8B%9C%EC%9E%90%EB%A3%8C-%EA%B8%88%ED%98%95%EC%A0%9C%EC%9E%91%ED%98%91%EC%9D%98%EB%A1%9D%20(1)%20(3)%20(1)(1)(1)%20(5).xlsx","vendorNotes":"업무 이력 메모 1","mpsiReplies":[{"id":"r-1793885079808","author":"MPSI 양산관리팀","content":"ㅇㅋ","createdAt":"2026-11-05 22:24"},{"id":"r-1793885187057","author":"MPSI 양산관리팀","content":"다시주세요","createdAt":"2026-11-05 22:26"}],"status":"수주확정"}]}
\.


ALTER TABLE public."MpsiMassQuotation" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiMassSettlement; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiMassSettlement" DISABLE TRIGGER ALL;

COPY public."MpsiMassSettlement" ("SettlementSequenceNo", "SettlementID", "ProjectID", "MassVendorID", "SettlementMonth", "DeliveredQuantity", "UnitPrice", "TotalSettlementAmount", "SettlementStatus", "CreationDateTime") FROM stdin;
\.


ALTER TABLE public."MpsiMassSettlement" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiMassValidation; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiMassValidation" DISABLE TRIGGER ALL;

COPY public."MpsiMassValidation" ("ValidationSequenceNo", "ValidationID", "ProjectID", "MassVendorID", "CurrentTrial", "OverallStatus", "CurrentStep", "ReportCount", "TargetMassApprovalDate", "CreatorID", "CreationDateTime", "ModificationDateTime", "Note") FROM stdin;
1	VAL-MI26005P0	MI26005P0	(주)뉴몰드 김재열 차장	T2	검증완료	11	7	2026-12-20	MPSI_HQ	2026-11-05 13:50:51.255455	2026-11-05 14:16:43.359918	{"id":1,"projectNo":"MI26005P0","officialProjectNo":"MI26005P0","projectName":"Door Armrest Base","productName":"Main Part","customerName":"현대자동차 (1차사)","moldVendor":"우성정공(주)","massVendor":"(주)뉴몰드 김재열 차장","currentTrial":"T2","moldTransferDate":"2026-12-25","targetMassApprovalDate":"2026-12-20","overallStatus":"검증완료","currentStep":11,"moldTransferConfirmed":true,"mpsiWitnessInspector":"이인배 품질차장 (MPSI 기술품질팀)","trials":[{"trialDegree":"T1","testDate":"2026-11-05","machineNo":"650T","continuousHours":12,"totalShotCount":0,"totalProduced":0,"defectCount":0,"defectRate":0,"targetDefectRate":1,"measuredCpk":0,"targetCpk":1.33,"measuredCycleTime":0,"targetCycleTime":35,"dailyCapa":0,"targetDailyCapa":4500,"completionRate":83,"status":"보완요청(금형수정)","checklist":[{"id":"v1","category":"치수검토보고서","description":"CTQ 주요 치수 5개 포인트 전수 측정 및 3차원 CMM 성적서","targetSpec":"±0.05mm","actualValue":"","isResolved":true,"attachedReport":"예시자료-금형제작협의록 (1) (3) (1)(1)(1) (5).xlsx","attachedReportSize":"7.3 MB","attachedReportUrl":"/uploads/1793887184079_%EC%98%88%EC%8B%9C%EC%9E%90%EB%A3%8C-%EA%B8%88%ED%98%95%EC%A0%9C%EC%9E%91%ED%98%91%EC%9D%98%EB%A1%9D%20(1)%20(3)%20(1)(1)(1)%20(5).xlsx","uploadMemo":"치수검토보고서 검토 완료 및 성1111적서 등록","uploadAuthor":"(주)뉴몰드 김재열 차장","uploadedAt":"2026.11.05 22:59"},{"id":"v2","category":"외관검토보고서","description":"12시간 연속 사출 시 미성형, 가스그을림, 웰드라인 점검","targetSpec":"한도견본 일치 (외관 결함 무)","actualValue":"","isResolved":true},{"id":"v3","category":"금형검사보고서","description":"지정 사출기 취부 및 슬라이드 코어 유압 연동, 핫러너 밸런스","targetSpec":"작동 이상 무 (온도 ±2℃ 유지)","actualValue":"","isResolved":true},{"id":"v4","category":"시사출 보고서(사출조건표 포함)","description":"연속 사출 평균 C/T 검증 및 표준 사출 성형 조건표 (온도/압력/속도)","targetSpec":"35.0s 이하 달성","actualValue":"","isResolved":true},{"id":"v5","category":"공정능력 검사 보고서","description":"연속 생산 30개 샘플 치수 공정능력지수(Cpk) 산출","targetSpec":"Cpk ≥ 1.33","actualValue":"","isResolved":true},{"id":"v6","category":"CAPA 검토 보고서","description":"일일 3교대 연속 생산 기준 공급 캐파 검증 (Run @ Rate 실사)","targetSpec":"4,500 EA/일 이상","actualValue":"","isResolved":false}],"opinion":"[사출 수주확정 연계] 양산 견적 체결((주)뉴몰드 김재열 차장)에 따라 12~24H 연속 사출 양산성 검증(Step 11)이 자동 등재되었습니다.11","uploadHistory":[{"id":"1793887191584","category":"치수검토보고서","fileName":"예시자료-금형제작협의록 (1) (3) (1)(1)(1) (5).xlsx","fileSize":"7.3 MB","fileUrl":"/uploads/1793887184079_%EC%98%88%EC%8B%9C%EC%9E%90%EB%A3%8C-%EA%B8%88%ED%98%95%EC%A0%9C%EC%9E%91%ED%98%91%EC%9D%98%EB%A1%9D%20(1)%20(3)%20(1)(1)(1)%20(5).xlsx","memo":"치수검토보고서 검토 완료 및 성1111적서 등록","author":"(주)뉴몰드 김재열 차장","uploadedAt":"2026.11.05 22:59"}]},{"trialDegree":"T2","testDate":"2026-11-05","machineNo":"650T","continuousHours":12,"totalShotCount":1300,"totalProduced":2600,"defectCount":15,"defectRate":0.58,"targetDefectRate":1,"measuredCpk":1.45,"targetCpk":1.33,"measuredCycleTime":35,"targetCycleTime":35,"dailyCapa":4500,"targetDailyCapa":4500,"completionRate":0,"status":"양산승인(내부)","checklist":[{"id":"v1_T2","category":"치수검토보고서","description":"CTQ 주요 치수 5개 포인트 전수 측정 및 3차원 CMM 성적서","targetSpec":"±0.05mm","actualValue":"","isResolved":false,"attachedReport":"예시자료-금형제작협의록 (1) (3) (1)(1)(1) (5).xlsx","attachedReportSize":"7.3 MB","attachedReportUrl":"/uploads/1793887184079_%EC%98%88%EC%8B%9C%EC%9E%90%EB%A3%8C-%EA%B8%88%ED%98%95%EC%A0%9C%EC%9E%91%ED%98%91%EC%9D%98%EB%A1%9D%20(1)%20(3)%20(1)(1)(1)%20(5).xlsx","uploadMemo":"치수검토보고서 검토 완료 및 성1111적서 등록","uploadAuthor":"(주)뉴몰드 김재열 차장","uploadedAt":"2026.11.05 22:59"},{"id":"v2_T2","category":"외관검토보고서","description":"12시간 연속 사출 시 미성형, 가스그을림, 웰드라인 점검","targetSpec":"한도견본 일치 (외관 결함 무)","actualValue":"","isResolved":false,"attachedReport":"금형 제작 진척 관리대장_20261104215553.xlsx","attachedReportSize":"18.6 KB","attachedReportUrl":"/uploads/1793887495490_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553.xlsx","uploadMemo":"외관검토보고서 검토 완료 및 성적서 등록","uploadAuthor":"(주)뉴몰드 김재열 차장","uploadedAt":"2026.11.05 23:04"},{"id":"v3_T2","category":"금형검사보고서","description":"지정 사출기 취부 및 슬라이드 코어 유압 연동, 핫러너 밸런스","targetSpec":"작동 이상 무 (온도 ±2℃ 유지)","actualValue":"","isResolved":false,"attachedReport":"금형 제작 진척 관리대장_20261104215553 (1).xlsx","attachedReportSize":"18.6 KB","attachedReportUrl":"/uploads/1793887516661_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553%20(1).xlsx","uploadMemo":"금형검사보고서 검토 완료 및 성적서 등록","uploadAuthor":"(주)뉴몰드 김재열 차장","uploadedAt":"2026.11.05 23:05"},{"id":"v4_T2","category":"시사출 보고서(사출조건표 포함)","description":"연속 사출 평균 C/T 검증 및 표준 사출 성형 조건표 (온도/압력/속도)","targetSpec":"35.0s 이하 달성","actualValue":"","isResolved":false,"attachedReport":"금형 제작 진척 관리대장_20261104215553 (1).xlsx","attachedReportSize":"18.6 KB","attachedReportUrl":"/uploads/1793887534402_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553%20(1).xlsx","uploadMemo":"시사출 보고서(사출조건표 포함) 검토 완료 및 성적서 등록","uploadAuthor":"(주)뉴몰드 김재열 차장","uploadedAt":"2026.11.05 23:05"},{"id":"v5_T2","category":"공정능력 검사 보고서","description":"연속 생산 30개 샘플 치수 공정능력지수(Cpk) 산출","targetSpec":"Cpk ≥ 1.33","actualValue":"","isResolved":false,"attachedReport":"금형 제작 진척 관리대장_20261104215553.xlsx","attachedReportSize":"18.6 KB","attachedReportUrl":"/uploads/1793887569521_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553.xlsx","uploadMemo":"공정능력 검사 보고서 검토 완료 및 성적서 등록","uploadAuthor":"(주)뉴몰드 김재열 차장","uploadedAt":"2026.11.05 23:06"},{"id":"v6_T2","category":"CAPA 검토 보고서","description":"일일 3교대 연속 생산 기준 공급 캐파 검증 (Run @ Rate 실사)","targetSpec":"4,500 EA/일 이상","actualValue":"","isResolved":false,"attachedReport":"20261015.SCM 양산처 메뉴 검토_설계변경 및 양산 PM 추가검토 (2) (1).xlsx","attachedReportSize":"1.7 MB","attachedReportUrl":"/uploads/1793887594675_20261015.SCM%20%EC%96%91%EC%82%B0%EC%B2%98%20%EB%A9%94%EB%89%B4%20%EA%B2%80%ED%86%A0_%EC%84%A4%EA%B3%84%EB%B3%80%EA%B2%BD%20%EB%B0%8F%20%EC%96%91%EC%82%B0%20PM%20%EC%B6%94%EA%B0%80%EA%B2%80%ED%86%A0%20(2)%20(1).xlsx","uploadMemo":"CAPA 검토 보고서 검토 완료 및 성적서 등록","uploadAuthor":"(주)뉴몰드 김재열 차장","uploadedAt":"2026.11.05 23:06"}],"opinion":"T2 12시간 연속 사출 가동 및 Cpk 안정화 검증 진행","uploadHistory":[{"id":"1793887597681","category":"CAPA 검토 보고서","fileName":"20261015.SCM 양산처 메뉴 검토_설계변경 및 양산 PM 추가검토 (2) (1).xlsx","fileSize":"1.7 MB","fileUrl":"/uploads/1793887594675_20261015.SCM%20%EC%96%91%EC%82%B0%EC%B2%98%20%EB%A9%94%EB%89%B4%20%EA%B2%80%ED%86%A0_%EC%84%A4%EA%B3%84%EB%B3%80%EA%B2%BD%20%EB%B0%8F%20%EC%96%91%EC%82%B0%20PM%20%EC%B6%94%EA%B0%80%EA%B2%80%ED%86%A0%20(2)%20(1).xlsx","memo":"CAPA 검토 보고서 검토 완료 및 성적서 등록","author":"(주)뉴몰드 김재열 차장","uploadedAt":"2026.11.05 23:06"},{"id":"1793887571333","category":"공정능력 검사 보고서","fileName":"금형 제작 진척 관리대장_20261104215553.xlsx","fileSize":"18.6 KB","fileUrl":"/uploads/1793887569521_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553.xlsx","memo":"공정능력 검사 보고서 검토 완료 및 성적서 등록","author":"(주)뉴몰드 김재열 차장","uploadedAt":"2026.11.05 23:06"},{"id":"1793887540010","category":"시사출 보고서(사출조건표 포함)","fileName":"금형 제작 진척 관리대장_20261104215553 (1).xlsx","fileSize":"18.6 KB","fileUrl":"/uploads/1793887534402_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553%20(1).xlsx","memo":"시사출 보고서(사출조건표 포함) 검토 완료 및 성적서 등록","author":"(주)뉴몰드 김재열 차장","uploadedAt":"2026.11.05 23:05"},{"id":"1793887517609","category":"금형검사보고서","fileName":"금형 제작 진척 관리대장_20261104215553 (1).xlsx","fileSize":"18.6 KB","fileUrl":"/uploads/1793887516661_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553%20(1).xlsx","memo":"금형검사보고서 검토 완료 및 성적서 등록","author":"(주)뉴몰드 김재열 차장","uploadedAt":"2026.11.05 23:05"},{"id":"1793887496465","category":"외관검토보고서","fileName":"금형 제작 진척 관리대장_20261104215553.xlsx","fileSize":"18.6 KB","fileUrl":"/uploads/1793887495490_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553.xlsx","memo":"외관검토보고서 검토 완료 및 성적서 등록","author":"(주)뉴몰드 김재열 차장","uploadedAt":"2026.11.05 23:04"}]}],"updatedAt":"2026-11-05 23:16"}
\.


ALTER TABLE public."MpsiMassValidation" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiMoldApproval; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiMoldApproval" DISABLE TRIGGER ALL;

COPY public."MpsiMoldApproval" ("ApprovalSequenceNo", "ApprovalID", "ProjectID", "ApprovalCertificateNo", "FinalSamplePictureFile", "MoldAssemblyPictureFile", "MoldNameplateFile", "ApprovedBy", "ApprovalDate", "IsApproved") FROM stdin;
\.


ALTER TABLE public."MpsiMoldApproval" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiMoldDesign; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiMoldDesign" DISABLE TRIGGER ALL;

COPY public."MpsiMoldDesign" ("DesignSequenceNo", "DesignID", "ProjectID", "CadRevision", "Product3DModelFile", "Mold3DModelFile", "DfmReportFile", "CaeAnalysisFile", "DesignReviewStatus", "DesignApprovalStatus", "ApprovedDateTime", "CreatorID", "CreationDateTime", "Note") FROM stdin;
1	MI26005P0	MI26005P0	REV.01	/uploads/1793877271155_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1).zip	\N	\N	/uploads/1793878604193_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(1).zip	최종검토완료	검토완료	2026-11-05 11:40:11.73145	MPSI_HQ	2026-11-05 10:00:09.313805	{"moldNo":"MI26005P0M","moldDegree":"M1","changeType":"N001","projectName":"5555555555","productName":"Door Armrest Base","customerName":"현대자동차 (1차사)","moldVendor":"우성정공(주)","targetT1Date":"2026-11-06","targetMfgDays":95,"currentStep":6,"drStatus":"최종검토완료","moldDesignStatus":"검토완료","product3DFile":"/uploads/1793877271155_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1).zip","product3DNote":"11","workLogs":[{"id":"log-1793878811686","authorId":"mpsi_user","authorName":"홍길동 책임 (MPSI 개발실)","authorRole":"MPSI","content":"[소재 발주 승인] 메인 몰드베이스 및 코어 강재 규격 사전 발주 승인 완료.","timestamp":"2026-11-05 20:40"},{"id":"log-1793878805456","authorId":"mpsi_user","authorName":"MPSI 김양훈 부장","authorRole":"MPSI","content":"[금형 3D data 검토 완료] MPSI 담당자가 금형 3D 설계를 최종 검토 승인하였습니다. (가공 및 조립 착수)","timestamp":"2026-11-05 20:40"},{"id":"log-1793878790232","authorId":"mpsi_user","authorName":"우성정공(주) 설계팀","authorRole":"MPSI","content":"[금형 3D 설계 승인 요청] 3D CAD 설계 완료에 따른 MPSI 최종 컨펌 요청.","timestamp":"2026-11-05 20:39"},{"id":"log-1793878754212","authorId":"mpsi_user","authorName":"MPSI 구매개발실","authorRole":"MPSI","content":"[금형 발주서 발송 승인] 금형 제작처(우성정공(주))로 금형제작 발주서(PO: MOLD-PO-MI26005P0)가 발송 승인되었습니다.","timestamp":"2026-11-05 20:39"},{"id":"log-1793878741125","authorId":"mpsi_user","authorName":"MPSI 기술팀장","authorRole":"MPSI","content":"[최종검토완료] 원청 고객사 승인 최종 3D 제품데이터 확정 완료","timestamp":"2026-11-05 20:39"},{"id":"log-1793878725983","authorId":"mpsi_user","authorName":"MPSI 구매개발실","authorRole":"MPSI","content":"[금형 발주서 발송 승인] 금형 제작처(우성정공(주))로 금형제작 발주서(PO: MOLD-PO-MI26005P0)가 발송 승인되었습니다.","timestamp":"2026-11-05 20:38"},{"id":"log-1793878718817","authorId":"mpsi_user","authorName":"MPSI 기술팀장","authorRole":"MPSI","content":"[최종검토완료] 원청 고객사 승인 최종 3D 제품데이터 확정 완료","timestamp":"2026-11-05 20:38"},{"id":"log-1793878619935","authorId":"mpsi_user","authorName":"우성정공(주) 한승호 부장","authorRole":"MPSI","content":"[금형제작협의록 및 CAE 제출] MPSI 본사 승인 요청 접수 완료.","timestamp":"2026-11-05 20:36"},{"id":"log-1793878604358","authorId":"vendor_user","authorName":"우성정공(주) 한승호 부장","authorRole":"VENDOR","fileName":"/uploads/1793878604193_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(1).zip","content":"[CAE 해석 보고서 업로드] 12","timestamp":"2026-11-05 20:36"},{"id":"log-1793878527108","authorId":"mpsi_user","authorName":"MPSI 구매개발실","authorRole":"MPSI","content":"[금형 발주서 발송 승인] 금형 제작처(우성정공(주))로 금형제작 발주서(PO: MOLD-PO-MI26005P0)가 발송 승인되었습니다.","timestamp":"2026-11-05 20:35"},{"id":"log-1793878521619","authorId":"mpsi_user","authorName":"MPSI 기술팀장","authorRole":"MPSI","content":"[최종검토완료] 원청 고객사 승인 최종 3D 제품데이터 확정 완료","timestamp":"2026-11-05 20:35"},{"id":"log-1793878516972","authorId":"mpsi_user","authorName":"MPSI 김양훈 부장","authorRole":"MPSI","content":"[제품 모델링 검토 완료] MPSI 담당자가 제품 모델링 성형성 및 DR 검토를 완료하였습니다. (금형 발주 진행 가능)","timestamp":"2026-11-05 20:35"},{"id":"log-1793878505544","authorId":"mpsi_user","authorName":"우성정공(주) 한승호 부장","authorRole":"MPSI","content":"[금형제작협의록 및 CAE 제출] MPSI 본사 승인 요청 접수 완료.","timestamp":"2026-11-05 20:35"},{"id":"log-1793878496630","authorId":"mpsi_user","authorName":"우성정공(주) 한승호 부장","authorRole":"MPSI","content":"[금형제작협의록 및 CAE 제출] MPSI 본사 승인 요청 접수 완료.","timestamp":"2026-11-05 20:34"},{"id":"log-1793878493536","authorId":"mpsi_user","authorName":"우성정공(주) 한승호 부장","authorRole":"MPSI","content":"[금형제작협의록 및 CAE 제출] MPSI 본사 승인 요청 접수 완료.","timestamp":"2026-11-05 20:34"},{"id":"log-1793878472681","authorId":"mpsi_user","authorName":"MPSI 김양훈 부장","authorRole":"MPSI","content":"[제품 모델링 검토 완료] MPSI 담당자가 제품 모델링 성형성 및 DR 검토를 완료하였습니다. (금형 발주 진행 가능)","timestamp":"2026-11-05 20:34"},{"id":"log-1793877290900","authorId":"mpsi_user","authorName":"MPSI 구매개발실","authorRole":"MPSI","content":"[금형 발주서 발송 승인] 금형 제작처(우성정공(주))로 금형제작 발주서(PO: 신규)가 발송 승인되었습니다.","timestamp":"2026-11-05 20:14"},{"id":"log-1793877271162","authorId":"mpsi_user","authorName":"MPSI 김양훈 부장","authorRole":"MPSI","fileName":"/uploads/1793877271155_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1).zip","content":"[3D 제품 data 업로드] 11","timestamp":"2026-11-05 20:14"},{"id":"log-1793876672351","authorId":"mpsi_user","authorName":"MPSI 구매개발실","authorRole":"MPSI","content":"[금형 발주서 발송 승인] 금형 제작처(우성정공(주))로 금형제작 발주서(PO: 신규)가 발송 승인되었습니다.","timestamp":"2026-11-05 20:04"},{"id":"log-1793876615213","authorId":"mpsi_user","authorName":"MPSI 김양훈 부장","authorRole":"MPSI","fileName":"/uploads/1793876615206_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(2).zip","content":"[3D 제품 data 업로드] 123","timestamp":"2026-11-05 20:03"},{"id":"log-init-1793872809312","authorId":"MPSI_HQ","authorName":"MPSI 시스템","authorRole":"MPSI","content":"[수주확정 자동 연동] 금형 견적(M-EST-2026-001) 수주확정으로 제품검토 및 금형설계 관리대장에 신규 등재되었습니다. (제작처: 우성정공(주))","timestamp":"2026-11-05 10:00"}],"id":1,"projectNo":"MI26005P0","updatedAt":"2026-11-05 11:40","moldMeetingReportFile":"","moldMeetingReportNote":"","caeReportFile":"/uploads/1793878604193_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(1).zip","caeReportNote":"12","mold3DDataFile":"","mold3DDataNote":"","materialOrderStatus":"승인완료","moldPoApproved":true,"moldPoApprovedDate":"2026-11-05 20:39","moldPoAttached":true,"moldPoAmount":1000299,"moldPoDays":95,"moldPoShot":0,"moldPoNo":"MOLD-PO-MI26005P0","materialOrderApprover":"홍길동 책임 (MPSI 개발실)","materialOrderApprovedDate":"2026-11-05 20:40","materialOrderNote":"메인 몰드베이스 및 코어 강재 규격 사전 발주 승인 완료."}
\.


ALTER TABLE public."MpsiMoldDesign" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiMoldManufacture; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiMoldManufacture" DISABLE TRIGGER ALL;

COPY public."MpsiMoldManufacture" ("ManufactureSequenceNo", "ManufactureID", "ProjectID", "MoldPoNo", "OrderAmount", "OrderDate", "TargetT1Date", "MoldDeliveryDate", "OverallProgressRate", "GunDrillProgress", "MillingProgress", "HeatTreatmentProgress", "CncMachiningProgress", "EdmProgress", "PolishingProgress", "AssemblyProgress", "ManufactureStatus", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note") FROM stdin;
1	MFG-MI26005P0	MI26005P0	MOLD-PO-MI26005P0	1000299.00	2026-11-05	2026-11-06	2026-12-15	100.00	100.00	100.00	100.00	100.00	100.00	100.00	100.00	금형 육성 중	MPSI_HQ	2026-11-05 11:50:27.087521	SYSTEM_USER	2026-11-05 12:11:00.57396	{"id":1,"projectNo":"MI26005P0","moldNo":"MI26005P0M","moldDegree":"M1","changeType":"N001","projectName":"5555555555","productName":"Door Armrest Base","customerName":"현대자동차 (1차사)","moldVendor":"우성정공(주)","cavity":"1*2 Cavity","material":"NAK80 / KP4M","targetT1Date":"2026-11-05","moldDeliveryDate":"2026-12-14","moldPoNo":"MOLD-PO-MI26005P0","orderDate":"2026-11-05","orderAmount":1000299,"manufactureStatus":"금형 육성 중","scheduleFile":{"fileName":"GS 시험성적서 및 결과서 온라인 발급 방법.pdf","fileSize":"12927.8KB","uploadedAt":"2026- 11- 5- 21시","uploadedBy":"우성정공(주) 한승호부장","fileUrl":"/uploads/1793880561484_GS%20%EC%8B%9C%ED%97%98%EC%84%B1%EC%A0%81%EC%84%9C%20%EB%B0%8F%20%EA%B2%B0%EA%B3%BC%EC%84%9C%20%EC%98%A8%EB%9D%BC%EC%9D%B8%20%EB%B0%9C%EA%B8%89%20%EB%B0%A9%EB%B2%95.pdf"},"memoLogs":[{"id":"memo-1793880561732","authorId":"ws-hsh","authorName":"우성정공(주) 한승호부장","company":"우성정공(주)","tag":"GS 시험성.제작일정표","content":"[일정표 엑셀 업로드] GS 시험성적서 및 결과서 온라인 발급 방법.pdf 신규 등록 완료","createdAt":"2026.11.05 21:09","attachedFileName":"GS 시험성적서 및 결과서 온라인 발급 방법.pdf","attachedFileUrl":"/uploads/1793880561484_GS%20%EC%8B%9C%ED%97%98%EC%84%B1%EC%A0%81%EC%84%9C%20%EB%B0%8F%20%EA%B2%B0%EA%B3%BC%EC%84%9C%20%EC%98%A8%EB%9D%BC%EC%9D%B8%20%EB%B0%9C%EA%B8%89%20%EB%B0%A9%EB%B2%95.pdf"},{"id":"memo-1793880364499","authorId":"ws-hsh","authorName":"우성정공(주) 한승호부장","company":"우성정공(주)","tag":"261010.제작일정표","content":"11111112222222222","createdAt":"2026- 11- 5- 21시"},{"id":"memo-1793880318663","authorId":"mpsi-dev","authorName":"MPSI 금형개발팀","company":"MPSI 본사","tag":"본사 피드백","content":"123123123","createdAt":"2026- 11- 5- 21시"},{"id":"memo-1793879922008","authorId":"mpsi-dev","authorName":"MPSI 금형개발팀","company":"MPSI 본사","tag":"일정 확인","content":"MPSI 본사 피드백 및 관리 메MPSI 본사 피드백 및 관리 메","createdAt":"2026- 11- 5- 20시"},{"id":"memo-1793879775557","authorId":"ws-hsh","authorName":"우성정공(주) 한승호부장","company":"우성정공(주)","tag":"261010.제작일정표","content":"6767676767","createdAt":"2026- 11- 5- 20시"},{"id":"memo-1793879743733","authorId":"ws-hsh","authorName":"우성정공(주) 한승호부장","company":"우성정공(주)","tag":"예시자료-금.제작일정표","content":"[일정표 엑셀 업로드] 예시자료-금형제작협의록 (1) (3) (1)(1)(1).xlsx 신규 등록 완료","createdAt":"2026.11.05 20:55","attachedFileName":"예시자료-금형제작협의록 (1) (3) (1)(1)(1).xlsx"},{"id":"memo-init-1","authorId":"MPSI_HQ","authorName":"MPSI 구매개발실","company":"MPSI 본사","tag":"금형발주완료","content":"[금형제작 착수 연동] 금형발주(PO: MOLD-PO-MI26005P0) 및 소재 선발주가 승인되어 금형제작 일정 관제 대장에 정식 등재되었습니다.","createdAt":"2026-11-05 20:40"}],"processes":[{"code":"GUN","name":"건드릴(냉각홀)","planDate":"11-08","actualDate":"11-05","progress":100,"status":"완료"},{"code":"ML","name":"황삭 밀링","planDate":"11-12","actualDate":"11-05","progress":100,"status":"완료"},{"code":"HT","name":"코어 열처리","planDate":"11-16","actualDate":"11-05","progress":100,"status":"완료"},{"code":"CNC","name":"CNC 정밀가공","planDate":"11-22","actualDate":"11-05","progress":100,"status":"완료"},{"code":"PL","name":"방전(EDM)","planDate":"11-27","actualDate":"11-05","progress":100,"status":"완료"},{"code":"WR","name":"와이어컷","planDate":"12-02","actualDate":"11-05","progress":100,"status":"완료"},{"code":"ASSY","name":"금형 조립/래핑","planDate":"12-08","actualDate":"11-05","progress":100,"status":"완료"}],"overallProgress":100,"coreStatus":"대기","coreProgress":0,"assyStatus":"대기","assyProgress":0,"scheduleStatus":"정상","currentStep":6,"updatedAt":"2026- 11- 5- 21시","notes":"MPSI 발주 승인 완료, 금형 제작 일정표 엑셀 업로드 대기"}
\.


ALTER TABLE public."MpsiMoldManufacture" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiMoldQuotation; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiMoldQuotation" DISABLE TRIGGER ALL;

COPY public."MpsiMoldQuotation" ("QuotationSequenceNo", "QuotationID", "ProjectID", "EstimateNumber", "MoldVendorID", "MaterialCost", "MachiningCost", "DesignCost", "ManagementCost", "TotalQuotationAmount", "FinalNegotiatedAmount", "TargetMoldDays", "QuotationStatus", "SubmissionDate", "ConfirmedDate", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note") FROM stdin;
12	M-EST-2026-001	MI26005P0	M-EST-2026-001	우성정공(주)	100.00	100.00	100.00	999999.00	1000299.00	5555555551.00	95	수주확정	2026-11-05	2026-11-05	MPSI_HQ	2026-11-05 09:15:10.524899	MPSI_USER	2026-11-05 09:17:02.292421	{"officialProjectNo":"MI26005P0","moldNo":"","moldDegree":"M1","changeType":"N001","projectName":"5555555555","productName":"Door Armrest Base","customerName":"현대자동차 (1차사)","vendorName":"우성정공(주)","assignedVendors":["우성정공(주)"],"productionType":"OUTSOURCING","machineTypeTonnage":"111","coreStructure":"원판일체형","moldMaterial":"상하원판: S55C / 메인코어: PP 컴파운드 사출물, 1*2 Cavity","cavity":"1*2 Cavity","gateType":"밸브게이트 2-Drop","moldSteel":"PP 컴파운드 사출물, 1*2 Cavity","resin":"","targetT1Date":"2026-11-06","moldDeliveryDate":"","targetMfgDays":95,"targetCycleTime":33,"targetBudgetWon":5555555551,"quotationFileName":"금형 제작 진척 관리대장_20261104215553.xlsx","quotationFileSize":"18.6 KB","quotationFileDate":"2026-11-05","quotationFileUrl":"/uploads/1793870157454_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553.xlsx","downloadUrl":"/api/v1/files/download?file=1793870157454_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553.xlsx&name=%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553.xlsx","vendorQuotes":[{"id":"vq-1793870166052","vendorName":"우성정공(주)","submittedDate":"2026-11-05","availableMfgDays":95,"materialCostWon":100,"processingCostWon":100,"overheadProfitWon":100,"specialSpecWon":999999,"totalAmountWon":1000299,"quotationFileName":"금형 제작 진척 관리대장_20261104215553.xlsx","quotationFileSize":"18.6 KB","quotationFileUrl":"/uploads/1793870157454_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553.xlsx","downloadUrl":"/api/v1/files/download?file=1793870157454_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553.xlsx&name=%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553.xlsx","vendorNotes":"1","mpsiReplies":[],"status":"수주확정"}],"specDocuments":[{"id":"sd-new-1793870110484-0","category":"3D_MODEL","categoryName":"3D 제품모델 (CATIA/STEP)","fileName":"예시자료-금형제작협의록 (1) (3) (1)(1).xlsx","fileSize":"7.27 MB","uploadedAt":"2026-11-05","author":"MPSI 금형개발팀","memo":"1","version":1,"fileUrl":"/uploads/1793870093793_%EC%98%88%EC%8B%9C%EC%9E%90%EB%A3%8C-%EA%B8%88%ED%98%95%EC%A0%9C%EC%9E%91%ED%98%91%EC%9D%98%EB%A1%9D%20(1)%20(3)%20(1)(1).xlsx","downloadUrl":"/api/v1/files/download?file=1793870093793_%EC%98%88%EC%8B%9C%EC%9E%90%EB%A3%8C-%EA%B8%88%ED%98%95%EC%A0%9C%EC%9E%91%ED%98%91%EC%9D%98%EB%A1%9D%20(1)%20(3)%20(1)(1).xlsx&name=%EC%98%88%EC%8B%9C%EC%9E%90%EB%A3%8C-%EA%B8%88%ED%98%95%EC%A0%9C%EC%9E%91%ED%98%91%EC%9D%98%EB%A1%9D%20(1)%20(3)%20(1)(1).xlsx","history":[]}],"submissionHistory":[{"id":"hist-1793870166052","submissionType":"최초 제출","revisionNo":1,"memo":"[최초 제출] 우성정공(주) 금형 제작 견적서 제출 (견적총액: 1,000,299원)","fileName":"금형 제작 진척 관리대장_20261104215553.xlsx","fileSize":"18.6 KB","fileUrl":"/uploads/1793870157454_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553.xlsx","downloadUrl":"/api/v1/files/download?file=1793870157454_%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553.xlsx&name=%EA%B8%88%ED%98%95%20%EC%A0%9C%EC%9E%91%20%EC%A7%84%EC%B2%99%20%EA%B4%80%EB%A6%AC%EB%8C%80%EC%9E%A5_20261104215553.xlsx","amountWon":1000299,"availableMfgDays":95,"submittedAt":"2026-11-05 18:16:06","author":"우성정공(주) 견적제출"}],"requestDate":"2026-11-05","submittedDate":"2026-11-05","notes":"테스트","vendorNotes":"1","memos":[{"id":"memo-1793870166052","author":"우성정공(주) 견적제출","content":"[최초 제출] 우성정공(주) 금형 제작 견적서 제출 (견적총액: 1,000,299원)","createdAt":"2026-11-05 18:16:06"},{"id":"memo-1793870222264","author":"MPSI 금형개발팀","content":"111","createdAt":"2026-11-05 18:17"}],"id":12,"estimateNo":"M-EST-2026-001","projectNo":"MI26005P0","materialCostWon":100,"processingCostWon":100,"overheadProfitWon":100,"specialSpecWon":999999,"quoteAmountWon":1000299,"availableMfgDays":95,"status":"수주확정","selectedVendorName":"우성정공(주)"}
\.


ALTER TABLE public."MpsiMoldQuotation" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiMoldTransfer; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiMoldTransfer" DISABLE TRIGGER ALL;

COPY public."MpsiMoldTransfer" ("TransferSequenceNo", "TransferID", "ProjectID", "DispatchVendorID", "ReceiveVendorID", "TransferPlanDate", "TransferActualDate", "HandoverCertificateFile", "TransferStatus", "ConfirmedBy") FROM stdin;
\.


ALTER TABLE public."MpsiMoldTransfer" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiMoldTrial; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiMoldTrial" DISABLE TRIGGER ALL;

COPY public."MpsiMoldTrial" ("TrialSequenceNo", "TrialID", "ProjectID", "TrialDegree", "TrialDate", "TrialLocation", "MachineTonnage", "ClampingForceTon", "CycleTimeSeconds", "TrialStatus", "MpsiDecision", "TrialReportFile", "DimensionReportFile", "CreatorID", "CreationDateTime", "Note") FROM stdin;
1	TRIAL-MI26005P0-T1	MI26005P0	금형 승인	2026-11-06	\N	\N	\N	\N	양산승인완료	검토중	\N	\N	MPSI_HQ	2026-11-05 13:06:19.949677	{"id":1,"projectNo":"MI26005P0","moldNo":"MI26005P0M","moldDegree":"M1","changeType":"N001","projectName":"Door Armrest Base","productName":"Main Part","customerName":"현대자동차 (1차사)","moldVendor":"우성정공(주)","massVendor":"(주)뉴몰드","cavity":"1*2 Cavity","material":"NAK80 / KP4M","targetT1Date":"2026-11-06","currentTrial":"금형 승인","isMoldApproved":true,"transferPlanDate":"2026-12-20","transferActualDate":"2026-12-25","currentStep":8,"trials":[{"trialDegree":"T1","planDate":"2026-11-06","trialDate":"2026-11-05","inspector":"담당자","dimResult":"OK","appResult":"OK","specResult":"OK","cycleTime":30,"targetCycleTime":35,"status":"육성 진행중","mpsiDecision":"미승인(수정요청)","checklist":[{"id":"chk_1793882289122","category":"치수 만족도","description":"만족도1","isResolved":true}],"opinion":"금형 제작/습합 완료에 따른 T1 시사출 착수 대기","dimReport":{"fileName":"챗봇 보안성검토 (1) (1) (1).zip","fileSize":"104.8 KB","uploadedAt":"2026-11-05","uploadedBy":"우성정공(주) 품질팀","fileUrl":"/uploads/1793882219233_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(1)%20(1).zip"},"appReport":{"fileName":"챗봇 보안성검토 (1) (2).zip","fileSize":"104.8 KB","uploadedAt":"2026-11-05","uploadedBy":"우성정공(주) 품질팀","fileUrl":"/uploads/1793882230396_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(2).zip"},"specReport":{"fileName":"GS 시험성적서 및 결과서 온라인 발급 방법 (3).pdf","fileSize":"12.62 MB","uploadedAt":"2026-11-05","uploadedBy":"우성정공(주) 품질팀","fileUrl":"/uploads/1793882247286_GS%20%EC%8B%9C%ED%97%98%EC%84%B1%EC%A0%81%EC%84%9C%20%EB%B0%8F%20%EA%B2%B0%EA%B3%BC%EC%84%9C%20%EC%98%A8%EB%9D%BC%EC%9D%B8%20%EB%B0%9C%EA%B8%89%20%EB%B0%A9%EB%B2%95%20(3).pdf"},"condReport":{"fileName":"예시자료-금형제작협의록 (1) (3) (1)(1).xlsx","fileSize":"7.27 MB","uploadedAt":"2026-11-05","uploadedBy":"우성정공(주) 품질팀","fileUrl":"/uploads/1793882263243_%EC%98%88%EC%8B%9C%EC%9E%90%EB%A3%8C-%EA%B8%88%ED%98%95%EC%A0%9C%EC%9E%91%ED%98%91%EC%9D%98%EB%A1%9D%20(1)%20(3)%20(1)(1).xlsx"}},{"trialDegree":"T2","trialDate":"2026-11-05","inspector":"우성정공(주) 기술팀","dimResult":"OK","appResult":"OK","specResult":"OK","cycleTime":35,"targetCycleTime":35,"status":"육성 진행중","checklist":[{"id":"chk_1793882505927_1","category":"치수 만족도","description":"T2 성형품 CMM 3차원 정밀 계측 및 핵심공차 검증","isResolved":true},{"id":"chk_1793882505927_2","category":"외관 만족도","description":"외관 웰드라인, 싱크마크, 가스버닝 표면 품질 점검","isResolved":true}],"opinion":"123123"}],"finalDocuments":[{"key":"approvalCertificate","label":"금형승인원 (금형 및 최종샘플사진)","description":"금형 실물 전체 조립 사진, 명판 및 최종 초물 승인 제품 샘플 전수 촬영본 첨부","isVerified":true,"isRejected":false,"fileName":"챗봇 보안성검토 (1) (1) (1)(1).zip","fileSize":"104.8 KB","uploadedAt":"2026-11-05","uploadedBy":"우성정공(주) 기술팀","fileUrl":"/uploads/1793882859534_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(1)%20(1)(1).zip","verifiedBy":"MPSI 개발팀","verifiedAt":"2026.11.05 22:06"},{"key":"caeReport","label":"CAE 보고서","description":"유동/보압 해석, 변형 예측 및 웰드라인 검증 최종 성형해석 완료 보고서","isVerified":true,"isRejected":false,"fileName":"챗봇 보안성검토 (1) (2).zip","fileSize":"104.8 KB","uploadedAt":"2026-11-05","uploadedBy":"우성정공(주) 기술팀","fileUrl":"/uploads/1793882883256_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(2).zip","verifiedBy":"MPSI 개발팀","verifiedAt":"2026.11.05 22:06"},{"key":"trialReportWithCond","label":"시사출 완료 보고서 (사출조건표 포함)","description":"최종 차수 시사출 성적서 및 기계 조건표(사출압, 형체력, 수지온도, 실측 C/T)","isVerified":true,"isRejected":false,"fileName":"예시자료-금형제작협의록 (3).xlsx","fileSize":"7.27 MB","uploadedAt":"2026-11-05","uploadedBy":"우성정공(주) 기술팀","fileUrl":"/uploads/1793882913705_%EC%98%88%EC%8B%9C%EC%9E%90%EB%A3%8C-%EA%B8%88%ED%98%95%EC%A0%9C%EC%9E%91%ED%98%91%EC%9D%98%EB%A1%9D%20(3).xlsx","verifiedBy":"MPSI 개발팀","verifiedAt":"2026.11.05 22:06"},{"key":"moldSpecification","label":"금형 제작 사양서","description":"금형 규격, 캐비티 배열, 핫러너 및 냉각 채널 설계 최종 확정 사양서","isVerified":true,"isRejected":false,"fileName":"챗봇 보안성검토 (1) (1) (1) (1).zip","fileSize":"104.8 KB","uploadedAt":"2026-11-05","uploadedBy":"우성정공(주) 기술팀","fileUrl":"/uploads/1793882933113_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(1)%20(1)%20(1).zip","verifiedBy":"MPSI 개발팀","verifiedAt":"2026.11.05 22:06"},{"key":"moldChecklist","label":"금형 검사 체크리스트","description":"부품 가공 조립 내역, 슬라이드/경사이젝터 간섭, 건드릴 냉각 채널 통수 검사서","isVerified":true,"isRejected":false,"fileName":"챗봇 보안성검토 (1) (2).zip","fileSize":"104.8 KB","uploadedAt":"2026-11-05","uploadedBy":"우성정공(주) 기술팀","fileUrl":"/uploads/1793882952882_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(2).zip","verifiedBy":"MPSI 개발팀","verifiedAt":"2026.11.05 22:06"}],"memoLogs":[{"id":"trial-memo-1793883979565","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"서류승인","content":"5대 서류 [금형 검사 체크리스트] 승인 완료","createdAt":"2026.11.05 22:06"},{"id":"trial-memo-1793883978141","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"서류승인","content":"5대 서류 [금형 제작 사양서] 승인 완료","createdAt":"2026.11.05 22:06"},{"id":"trial-memo-1793883976423","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"서류승인","content":"5대 서류 [시사출 완료 보고서 (사출조건표 포함)] 승인 완료","createdAt":"2026.11.05 22:06"},{"id":"trial-memo-1793883969518","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"서류승인","content":"5대 서류 [시사출 완료 보고서 (사출조건표 포함)] 승인 완료","createdAt":"2026.11.05 22:06"},{"id":"trial-memo-1793883967980","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"서류승인","content":"5대 서류 [CAE 보고서] 승인 완료","createdAt":"2026.11.05 22:06"},{"id":"trial-memo-1793883966406","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"서류승인","content":"5대 서류 [금형승인원 (금형 및 최종샘플사진)] 승인 완료","createdAt":"2026.11.05 22:06"},{"id":"trial-memo-1793883146586","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"finalDocs.실적저장","content":"[금형 승인 시사출] 실측 C/T: 35초, 판정: 육성 진행중, 소견: 123123","createdAt":"2026.11.05 21:52"},{"id":"trial-memo-1793883039388","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"서류승인","content":"5대 서류 [금형승인원 (금형 및 최종샘플사진)] 승인 완료","createdAt":"2026.11.05 21:50"},{"id":"trial-memo-1793883034664","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"서류반려","content":"5대 서류 [금형승인원 (금형 및 최종샘플사진)] 반려(보완요청): 측정 데이터 보완 및 사진 재촬영 요망","createdAt":"2026.11.05 21:50"},{"id":"trial-memo-1793883010193","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"이관일정등록","content":"금형 이관 일정 갱신 (계획일: 2026-12-20, 완료실적일: 2026-12-25)","createdAt":"2026.11.05 21:50"},{"id":"trial-memo-1793883001779","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"서류승인","content":"5대 서류 [금형 검사 체크리스트] 승인 완료","createdAt":"2026.11.05 21:50"},{"id":"trial-memo-1793883000616","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"서류승인","content":"5대 서류 [금형 제작 사양서] 승인 완료","createdAt":"2026.11.05 21:50"},{"id":"trial-memo-1793882999288","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"서류승인","content":"5대 서류 [시사출 완료 보고서 (사출조건표 포함)] 승인 완료","createdAt":"2026.11.05 21:49"},{"id":"trial-memo-1793882997575","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"서류승인","content":"5대 서류 [CAE 보고서] 승인 완료","createdAt":"2026.11.05 21:49"},{"id":"trial-memo-1793882994196","authorId":"mpsi-dev","authorName":"MPSI 개발팀","company":"MPSI 본사","tag":"서류승인","content":"5대 서류 [금형승인원 (금형 및 최종샘플사진)] 승인 완료","createdAt":"2026.11.05 21:49"},{"id":"trial-memo-1793882969533","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"finalDocs.실적저장","content":"[T2 시사출] 실측 C/T: 35초, 판정: 육성 진행중, 소견: 123123","createdAt":"2026.11.05 21:49"},{"id":"trial-memo-1793882953074","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"서류제출","content":"5대 승인 서류 [금형 검사 체크리스트] 파일 업로드 (챗봇 보안성검토 (1) (2).zip) - MPSI 본사 승인 검토 요청","createdAt":"2026.11.05 21:49","attachedFileName":"챗봇 보안성검토 (1) (2).zip","attachedFileUrl":"/uploads/1793882952882_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(2).zip"},{"id":"trial-memo-1793882933287","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"서류제출","content":"5대 승인 서류 [금형 제작 사양서] 파일 업로드 (챗봇 보안성검토 (1) (1) (1) (1).zip) - MPSI 본사 승인 검토 요청","createdAt":"2026.11.05 21:48","attachedFileName":"챗봇 보안성검토 (1) (1) (1) (1).zip","attachedFileUrl":"/uploads/1793882933113_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(1)%20(1)%20(1).zip"},{"id":"trial-memo-1793882914127","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"서류제출","content":"5대 승인 서류 [시사출 완료 보고서 (사출조건표 포함)] 파일 업로드 (예시자료-금형제작협의록 (3).xlsx) - MPSI 본사 승인 검토 요청","createdAt":"2026.11.05 21:48","attachedFileName":"예시자료-금형제작협의록 (3).xlsx","attachedFileUrl":"/uploads/1793882913705_%EC%98%88%EC%8B%9C%EC%9E%90%EB%A3%8C-%EA%B8%88%ED%98%95%EC%A0%9C%EC%9E%91%ED%98%91%EC%9D%98%EB%A1%9D%20(3).xlsx"},{"id":"trial-memo-1793882883462","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"서류제출","content":"5대 승인 서류 [CAE 보고서] 파일 업로드 (챗봇 보안성검토 (1) (2).zip) - MPSI 본사 승인 검토 요청","createdAt":"2026.11.05 21:48","attachedFileName":"챗봇 보안성검토 (1) (2).zip","attachedFileUrl":"/uploads/1793882883256_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(2).zip"},{"id":"trial-memo-1793882859575","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"서류제출","content":"5대 승인 서류 [금형승인원 (금형 및 최종샘플사진)] 파일 업로드 (챗봇 보안성검토 (1) (1) (1)(1).zip) - MPSI 본사 승인 검토 요청","createdAt":"2026.11.05 21:47","attachedFileName":"챗봇 보안성검토 (1) (1) (1)(1).zip","attachedFileUrl":"/uploads/1793882859534_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(1)%20(1)(1).zip"},{"id":"trial-memo-1793882771260","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"서류제출","content":"5대 승인 서류 [금형승인원 (금형 및 최종샘플사진)] 파일 업로드 (챗봇 보안성검토 (1) (1) (1)(1).zip) - MPSI 본사 승인 검토 요청","createdAt":"2026.11.05 21:46","attachedFileName":"챗봇 보안성검토 (1) (1) (1)(1).zip","attachedFileUrl":"/uploads/1793882771207_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(1)%20(1)(1).zip"},{"id":"trial-memo-1793882730615","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"T2.실적저장","content":"[T2 시사출] 실측 C/T: 35초, 판정: 육성 진행중, 소견: 123123","createdAt":"2026.11.05 21:45"},{"id":"trial-memo-1793882539089","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"T2.실적저장","content":"[T2 시사출] 실측 C/T: 35초, 판정: 육성 진행중, 소견: 123123","createdAt":"2026.11.05 21:42"},{"id":"trial-memo-1793882505928","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"T2결과등록","content":"T2 시사출 결과 등록 완료 (치수:OK, 외관:OK, 사양:OK, C/T:35초)","createdAt":"2026.11.05 21:41"},{"id":"trial-memo-1793882482735","authorId":"mpsi-mgr","authorName":"MPSI 개발총괄","company":"MPSI 본사","tag":"시사출_미승인(수정요청)","content":"[T1 시사출] 미승인(수정요청) 처리 완료: 금형 제작/습합 완료에 따른 T1 시사출 착수 대기","createdAt":"2026.11.05 21:41"},{"id":"trial-memo-1793882469666","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"T1.실적저장","content":"[T1 시사출] 실측 C/T: 30초, 판정: 육성 진행중, 소견: 금형 제작/습합 완료에 따른 T1 시사출 착수 대기","createdAt":"2026.11.05 21:41"},{"id":"trial-memo-1793882452447","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"T1.실적저장","content":"[T1 시사출] 실측 C/T: 45초, 판정: 육성 진행중, 소견: 금형 제작/습합 완료에 따른 T1 시사출 착수 대기","createdAt":"2026.11.05 21:40"},{"id":"trial-memo-1793882427796","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"시사출실적등록","content":"1111111","createdAt":"2026.11.05 21:40"},{"id":"trial-memo-1793882394556","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"시사출실적등록","content":"123123123123","createdAt":"2026.11.05 21:39"},{"id":"trial-memo-1793882302815","authorId":"vendor-dev","authorName":"우성정공(주) 기술팀","company":"우성정공(주)","tag":"T1.실적저장","content":"[T1 시사출] 실측 C/T: 45초, 판정: 육성 진행중, 소견: 금형 제작/습합 완료에 따른 T1 시사출 착수 대기","createdAt":"2026.11.05 21:38"},{"id":"trial-memo-1793882263455","authorId":"vendor-qc","authorName":"우성정공(주) 품질팀","company":"우성정공(주)","tag":"T1.사출성형 조건표","content":"사출성형 조건표 파일 업로드 완료 (예시자료-금형제작협의록 (1) (3) (1)(1).xlsx)","createdAt":"2026.11.05 21:37","attachedFileName":"예시자료-금형제작협의록 (1) (3) (1)(1).xlsx","attachedFileUrl":"/uploads/1793882263243_%EC%98%88%EC%8B%9C%EC%9E%90%EB%A3%8C-%EA%B8%88%ED%98%95%EC%A0%9C%EC%9E%91%ED%98%91%EC%9D%98%EB%A1%9D%20(1)%20(3)%20(1)(1).xlsx"},{"id":"trial-memo-1793882247436","authorId":"vendor-qc","authorName":"우성정공(주) 품질팀","company":"우성정공(주)","tag":"T1.금형검사보고서","content":"금형검사보고서 파일 업로드 완료 (GS 시험성적서 및 결과서 온라인 발급 방법 (3).pdf)","createdAt":"2026.11.05 21:37","attachedFileName":"GS 시험성적서 및 결과서 온라인 발급 방법 (3).pdf","attachedFileUrl":"/uploads/1793882247286_GS%20%EC%8B%9C%ED%97%98%EC%84%B1%EC%A0%81%EC%84%9C%20%EB%B0%8F%20%EA%B2%B0%EA%B3%BC%EC%84%9C%20%EC%98%A8%EB%9D%BC%EC%9D%B8%20%EB%B0%9C%EA%B8%89%20%EB%B0%A9%EB%B2%95%20(3).pdf"},{"id":"trial-memo-1793882230404","authorId":"vendor-qc","authorName":"우성정공(주) 품질팀","company":"우성정공(주)","tag":"T1.외관검토보고서","content":"외관검토보고서 파일 업로드 완료 (챗봇 보안성검토 (1) (2).zip)","createdAt":"2026.11.05 21:37","attachedFileName":"챗봇 보안성검토 (1) (2).zip","attachedFileUrl":"/uploads/1793882230396_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(2).zip"},{"id":"trial-memo-1793882219301","authorId":"vendor-qc","authorName":"우성정공(주) 품질팀","company":"우성정공(주)","tag":"T1.치수검토보고서","content":"치수검토보고서 파일 업로드 완료 (챗봇 보안성검토 (1) (1) (1).zip)","createdAt":"2026.11.05 21:36","attachedFileName":"챗봇 보안성검토 (1) (1) (1).zip","attachedFileUrl":"/uploads/1793882219233_%EC%B1%97%EB%B4%87%20%EB%B3%B4%EC%95%88%EC%84%B1%EA%B2%80%ED%86%A0%20(1)%20(1)%20(1).zip"},{"id":"trial-memo-1793881471379","authorId":"vendor-qc","authorName":"우성정공(주) 품질팀","company":"우성정공(주)","tag":"T1.치수검토보고서","content":"치수검토보고서 파일 업로드 완료 (MI26005P0_T1_치수검토보고서.pdf)","createdAt":"2026.11.05 21:24"},{"id":"trial-memo-1793881467762","authorId":"vendor-qc","authorName":"우성정공(주) 품질팀","company":"우성정공(주)","tag":"T1.치수검토보고서","content":"치수검토보고서 파일 업로드 완료 (MI26005P0_T1_치수검토보고서.pdf)","createdAt":"2026.11.05 21:24"}],"updatedAt":"2026- 11- 5- 22시"}
\.


ALTER TABLE public."MpsiMoldTrial" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiNotification; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiNotification" DISABLE TRIGGER ALL;

COPY public."MpsiNotification" ("NotificationSequenceNo", "NotificationID", "TargetRole", "TargetVendorName", "Title", "Message", "LinkUrl", "IsConfirmed", "CreationDateTime") FROM stdin;
\.


ALTER TABLE public."MpsiNotification" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiNotifications; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiNotifications" DISABLE TRIGGER ALL;

COPY public."MpsiNotifications" ("NotificationID", "MenuName", "MenuPath", "SenderCompany", "Content", "ProjectID", "TargetRole", "TargetVendorName", "IsConfirmed", "CreationDateTime", "ConfirmedDateTime") FROM stdin;
noti-init-1	양산외주 - 양산견적관리	/portal/vendor-portal/mass/quotation	MPSI	[MI26005P0] Door Armrest Base 사출 양산 견적 요청 및 단가 산출 검토가 전달되었습니다.	MI26005P0	VENDOR_MASS	(주)뉴몰드	f	2026-11-05 14:00:00	\N
noti-init-2	금형외주 - 시사출/육성	/portal/vendor-portal/mold/trial	MPSI	[MI26005P0] 금형 이관 5대 필수 서류 최종 승인이 완료되었습니다. 양산처 이관 일정 확인 바랍니다.	MI26005P0	VENDOR_MOLD	우성정공(주)	f	2026-11-05 15:30:00	\N
noti-init-3	양산성 검증/시양산	/portal/mass-prod/validation	(주)뉴몰드	[MI26005P0] Door Armrest Base 12H 연속 사출 및 6대 성적서 등록이 완료되어 MPSI 승인 검토 요청드립니다.	MI26005P0	MPSI	\N	f	2026-11-05 16:15:00	\N
noti-1793890447882-08on	양산외주 - 양산승인 (PPAP)	/portal/vendor-portal/mass/ppap	MPSI	[MI26005P0] 1회차 서류 패키지 [승인] 판정: MPSI 품질본부 서류 패키지 접수 완료. 정밀 심사진행 중입니다.	MI26005P0	VENDOR_MASS	(주)뉴몰드 김재열 차장	t	2026-11-05 14:54:07.883705	2026-11-05 14:54:19.282982
noti-1793890474493-sf49	양산외주 - 양산승인 (PPAP)	/portal/vendor-portal/mass/ppap	MPSI	[MI26005P0] PPAP 최종 양산 승인(Pass) 확정! 완제품 구매발주서 [PO-2026-1105-1] 발행 완료	MI26005P0	VENDOR_MASS	(주)뉴몰드 김재열 차장	f	2026-11-05 14:54:34.495565	\N
\.


ALTER TABLE public."MpsiNotifications" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiPmRevisionMaster; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiPmRevisionMaster" DISABLE TRIGGER ALL;

COPY public."MpsiPmRevisionMaster" ("PmSequenceNo", "PmMasterID", "ProjectID", "CumulativeShotCount", "PmTargetShotInterval", "NextPmScheduledDate", "ActiveRevisionCode", "CreationDateTime") FROM stdin;
\.


ALTER TABLE public."MpsiPmRevisionMaster" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiPmRound; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiPmRound" DISABLE TRIGGER ALL;

COPY public."MpsiPmRound" ("PmRoundSequenceNo", "RoundID", "PmMasterID", "RoundNumber", "InspectionDate", "InspectorName", "PmChecklistFile", "PmStatus") FROM stdin;
\.


ALTER TABLE public."MpsiPmRound" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiPpapDocument; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiPpapDocument" DISABLE TRIGGER ALL;

COPY public."MpsiPpapDocument" ("PpapSequenceNo", "PpapID", "ProjectID", "SubmissionRound", "DocumentPackageFile", "PswApprovalStatus", "PartPoNo", "PartPoDate", "ApprovalOfficer", "ApprovalDateTime", "CreatorID", "CreationDateTime") FROM stdin;
\.


ALTER TABLE public."MpsiPpapDocument" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiProjectStage; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiProjectStage" DISABLE TRIGGER ALL;

COPY public."MpsiProjectStage" ("StageSequenceNo", "ProjectID", "StepNumber", "StepName", "StepStatus", "ResponsibleOrgType", "PlannedStartDate", "PlannedEndDate", "ActualStartDate", "ActualEndDate", "CompletionRate", "ApprovalStatus", "ApproverID", "ApprovalDateTime", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note") FROM stdin;
\.


ALTER TABLE public."MpsiProjectStage" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiProjectStepAttachment; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiProjectStepAttachment" DISABLE TRIGGER ALL;

COPY public."MpsiProjectStepAttachment" ("AttachmentSequenceNo", "AttachmentID", "ProjectID", "StepNumber", "FileName", "FileSize", "FileUrl", "UploaderName", "UploadDateTime") FROM stdin;
\.


ALTER TABLE public."MpsiProjectStepAttachment" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiProjectStepMemo; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiProjectStepMemo" DISABLE TRIGGER ALL;

COPY public."MpsiProjectStepMemo" ("MemoSequenceNo", "MemoID", "ProjectID", "StepNumber", "AuthorName", "AuthorCompany", "Content", "CreationDateTime") FROM stdin;
\.


ALTER TABLE public."MpsiProjectStepMemo" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiRevisionHistory; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiRevisionHistory" DISABLE TRIGGER ALL;

COPY public."MpsiRevisionHistory" ("RevisionSequenceNo", "RevisionID", "ProjectID", "RevisionCode", "ChangeReason", "ChangeAmount", "ApprovalStatus", "AppliedDate", "EcoDocumentFile") FROM stdin;
\.


ALTER TABLE public."MpsiRevisionHistory" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiSyncInbox; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiSyncInbox" DISABLE TRIGGER ALL;

COPY public."MpsiSyncInbox" ("InboxSequenceNo", "InboxID", "SourceNodeID", "EventType", "IdempotencyKey", "PayloadJson", "Status", "ReceivedDateTime") FROM stdin;
\.


ALTER TABLE public."MpsiSyncInbox" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiSyncNodeRegistry; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiSyncNodeRegistry" DISABLE TRIGGER ALL;

COPY public."MpsiSyncNodeRegistry" ("NodeSequenceNo", "NodeID", "NodeName", "NodeType", "EndpointUrl", "ApiKey", "IsActive", "LastHeartbeatDateTime", "CreationDateTime") FROM stdin;
1	MPSI_HQ	MPSI 본사	HQ	https://mpsi-hub.a2lab.co.kr/api/v1/sync/inbound	node_key_mpsi_hq_2026	t	\N	2026-11-05 02:03:00.946428
2	WOOSUNG_MOLD	우성정공(주)	VENDOR_MOLD	https://woosung.mpsi-net.kr/api/v1/sync/inbound	node_key_woosung_2026	t	\N	2026-11-05 02:03:00.946428
3	NEWMOLD_MASS	(주)뉴몰드	VENDOR_MASS	https://newmold.mpsi-net.kr/api/v1/sync/inbound	node_key_newmold_2026	t	\N	2026-11-05 02:03:00.946428
\.


ALTER TABLE public."MpsiSyncNodeRegistry" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiSyncOutbox; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiSyncOutbox" DISABLE TRIGGER ALL;

COPY public."MpsiSyncOutbox" ("OutboxSequenceNo", "OutboxID", "EventType", "SourceNodeID", "TargetNodeID", "EntityName", "EntityID", "PayloadJson", "IdempotencyKey", "Status", "RetryCount", "LastError", "CreationDateTime", "SentDateTime") FROM stdin;
\.


ALTER TABLE public."MpsiSyncOutbox" ENABLE TRIGGER ALL;

--
-- Data for Name: MpsiUserAccount; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."MpsiUserAccount" DISABLE TRIGGER ALL;

COPY public."MpsiUserAccount" (id, "EnterpriseID", "userId", "userName", "passwordHash", "roleId", "roleName", "vendorCode", "vendorName", department, email, tel, "isUsed", "lastLogin", "createdAt", "updatedAt") FROM stdin;
2	MPSI_HQ	woosung	배희섭 금형팀장	477f4a2c6f3ee0d41a95d634db02b62408ad17ada402c9e88b8cfd5cc2160e81	VENDOR_MOLD	금형 협력사	WOOSUNG	우성정공(주)	금형기술개발팀	hs.bae@woosung.co.kr	031-492-1234	t	2026-11-05 13:40	2026-11-05 16:16:44.73683	2026-11-05 16:16:44.73683
3	MPSI_HQ	mpsi	관리자	477f4a2c6f3ee0d41a95d634db02b62408ad17ada402c9e88b8cfd5cc2160e81	MPSI	MPSI 본사		MPSI 본사	SCM 총괄 관제본부	minsu.kim@mpsi.co.kr	02-555-0101	t	2026-11-05 14:15	2026-11-05 16:16:44.73683	2026-11-05 16:16:44.73683
4	MPSI_HQ	admin	시스템 최고관리자	477f4a2c6f3ee0d41a95d634db02b62408ad17ada402c9e88b8cfd5cc2160e81	ADMIN	시스템관리자	1	MPSI 기술본부	SCM 시스템팀	admin@impix.co.kr	02-555-0100	t	2026-11-05 14:20	2026-11-05 16:16:44.73683	2026-11-05 16:16:44.73683
1	MPSI_HQ	newmold	뉴몰드	477f4a2c6f3ee0d41a95d634db02b62408ad17ada402c9e88b8cfd5cc2160e81	VENDOR_MASS	양산 협력사	NEWMOLD	NEWMOLD - (주)뉴몰드	사출품질팀	jh.choi@newmold.co.kr	031-498-8888	t	2026-11-05 12:30	2026-11-05 16:16:44.73683	2026-11-05 07:17:33.534968
\.


ALTER TABLE public."MpsiUserAccount" ENABLE TRIGGER ALL;

--
-- Data for Name: Operation; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Operation" DISABLE TRIGGER ALL;

COPY public."Operation" ("OperationSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "OperationID", "OperationName", "OperationType", "UseIndicator", "OperationLargeClass", "OperationMediumClass", "OperationSmallClass", "BackFlushedIndicator") FROM stdin;
1	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 07:20:37.273346	\N	\N	{"actorRole":"생산관리 / 영업","methodTool":"확정 PO 접수 / MES ERP","workPlace":"사무실","inputData":"고객사 확정 발주서 (PO)","outputData":"수주 등록 및 생산계획 수립","leadTimeHours":2,"applicableCompany":"MPSI (자사)"}	0	수주	생산공정	t	0~2 (수주/계획/발주)	\N	\N	\N
2	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 07:20:37.282022	\N	\N	{"actorRole":"자재창고 / 물류","methodTool":"지게차, 바코드 스캐너","workPlace":"E구역 원자재창고","inputData":"원재료 거래명세서, COA 성적서","outputData":"입고전표, 가입고 등록","leadTimeHours":1,"applicableCompany":"공통"}	10	원자재 입고	생산공정	t	10~21 (자재입고/수입검사)	\N	\N	\N
3	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 07:20:37.28876	\N	\N	{"actorRole":"품질관리팀 (IQC)","methodTool":"MI 측정기, 수분측정기","workPlace":"IQC 수입검사실","inputData":"수입검사 기준서, 원료 샘플","outputData":"IQC 합격증, 본입고 승인","leadTimeHours":4,"applicableCompany":"공통"}	20	수입검사 (IQC)	생산공정	t	10~21 (자재입고/수입검사)	\N	\N	\N
4	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 07:20:37.29548	\N	\N	{"actorRole":"사출 생산팀 / 보전","methodTool":"크레인, 유압체결기, 온조기","workPlace":"사출성형 1공장","inputData":"금형세팅 기준서, 사출조건표","outputData":"초도품 사출 준비 완료","leadTimeHours":2,"applicableCompany":"뉴몰드 (사출)"}	50	금형 장착 및 세팅	생산공정	t	50~62 (사출성형/설비보전)	\N	\N	\N
5	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 07:20:37.301699	\N	\N	{"actorRole":"금형가공팀","methodTool":"CNC 건드릴 가공기","workPlace":"우성정공 가공 1공장","inputData":"금형 냉각홀 3D CAD 모델","outputData":"냉각라인 관통 및 수압검사","leadTimeHours":12,"applicableCompany":"우성정공 (금형)"}	GUN	건드릴 딥홀 가공 (Gun Drill)	생산공정	t	우성 금형가공(GUN/CNC/ML)	\N	\N	\N
\.


ALTER TABLE public."Operation" ENABLE TRIGGER ALL;

--
-- Data for Name: OperationEnd; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."OperationEnd" DISABLE TRIGGER ALL;

COPY public."OperationEnd" ("OperationEndSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "OperationEndID", "LotID", "LotName", "LotDescription", "LotCreatedQuantity", "OperationID", "EquipmentID", "OperationEndTime", "PersonnelID", "ProducedQuantity", "DefectQuantity", "ReworkCount") FROM stdin;
\.


ALTER TABLE public."OperationEnd" ENABLE TRIGGER ALL;

--
-- Data for Name: OperationEquipment; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."OperationEquipment" DISABLE TRIGGER ALL;

COPY public."OperationEquipment" ("OperationEquipmentSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "OperationID", "OperationName", "EquipmentID", "EquipmentName", "EquipmentSmallClass", "EquipmentQuantity") FROM stdin;
\.


ALTER TABLE public."OperationEquipment" ENABLE TRIGGER ALL;

--
-- Data for Name: OperationStart; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."OperationStart" DISABLE TRIGGER ALL;

COPY public."OperationStart" ("OperationStartSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "OperationStartID", "LotID", "LotName", "LotDescription", "LotCreatedQuantity", "OperationID", "EquipmentID", "OperationStartTime", "PersonnelID") FROM stdin;
\.


ALTER TABLE public."OperationStart" ENABLE TRIGGER ALL;

--
-- Data for Name: Personnel; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Personnel" DISABLE TRIGGER ALL;

COPY public."Personnel" ("PersonnelSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "PersonnelID", "PersonnelName", "DepartmentID", "EmploymentStatusType", "PersonInChargeEmail", "PersonInChargeDialNumber") FROM stdin;
1	MPSI_HQ	SITE_01	PLANT_01	\N	2026-08-19 09:00:00	\N	\N	{"category":"자사","companyName":"MPSI (원청)","taskRole":"금형/사출 개발 총괄 및 DR 검토","relatedPjt":"NT5-2026-A, A2XT-M01","officeTel":"062-951-1234","systemRole":"ADMIN","isActive":true}	EMP-2026-001	김태훈	개발기획팀	정규직	thkim@mpsi.co.kr	010-3344-5566
2	MPSI_HQ	SITE_01	PLANT_01	\N	2026-08-18 09:00:00	\N	\N	{"category":"자사","companyName":"MPSI (원청)","taskRole":"PPAP 18대 문서 승인 및 시사출 입회","relatedPjt":"NT5-2026-A","officeTel":"062-951-1235","systemRole":"MANAGER","isActive":true}	EMP-2026-002	이수진	품질보증팀	정규직	sjlee@mpsi.co.kr	010-4455-6677
3	MPSI_HQ	SITE_01	PLANT_01	\N	2026-08-19 09:00:00	\N	\N	{"category":"공급업체","companyName":"우성정공 (금형)","taskRole":"금형 견적 제출 및 공정일정 협의","relatedPjt":"NT5-2026-A","officeTel":"032-815-5678","systemRole":"OPERATOR","isActive":true}	EMP-WS-001	배희섭	기술영업부	정규직	hsbae@woosung.co.kr	010-9988-7766
4	MPSI_HQ	SITE_01	PLANT_01	\N	2026-08-19 09:00:00	\N	\N	{"category":"공급업체","companyName":"뉴몰드 (사출)","taskRole":"사출 성형조건표 관리 및 Cpk 검증","relatedPjt":"NT5-2026-A","officeTel":"031-498-7890","systemRole":"OPERATOR","isActive":true}	EMP-NM-001	김부곤	생산기술부	정규직	bgkim@newmold.co.kr	010-8877-6655
\.


ALTER TABLE public."Personnel" ENABLE TRIGGER ALL;

--
-- Data for Name: Plant; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Plant" DISABLE TRIGGER ALL;

COPY public."Plant" ("PlantSequenceNo", "EnterpriseID", "SiteID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "PlantID", "PlantName", "DialNumber", "CountryID", "PostalCode", "BaseAddress", "DetailAddress") FROM stdin;
\.


ALTER TABLE public."Plant" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductIncoming; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProductIncoming" DISABLE TRIGGER ALL;

COPY public."ProductIncoming" ("ProductIncomingSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ProductIncomingID", "ProductIncomingSequence", "InventoryTransactionDocumentNumber", "InventoryTransactionDocumentSequence", "InventoryTransactionDate", "ItemID", "CustomerID", "WarehouseID", "InventoryTransactionTypeCode", "SerialUseIndicator", "InventoryTransferType", "InventoryVariationType", "InventoryTransactionType", "LotControlIndicator", "LotID", "ItemUOMCode", "ItemUnitQuantity", "OrderUOMCode", "OrderQuantity") FROM stdin;
\.


ALTER TABLE public."ProductIncoming" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductPacking; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProductPacking" DISABLE TRIGGER ALL;

COPY public."ProductPacking" ("ProductPackingSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "PackingType", "WarehouseID", "SerialNumber", "BoxNumber", "PalletNumber", "ItemID", "PackingSequence", "LotID") FROM stdin;
\.


ALTER TABLE public."ProductPacking" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductRelease; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProductRelease" DISABLE TRIGGER ALL;

COPY public."ProductRelease" ("ProductReleaseSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ProductReleaseID", "ProductReleaseSequence", "ProductReleaseRequestID", "SalesDocumentNumber", "SalesDocumentSequence", "InventoryTransactionDate", "LineID", "ItemID", "ItemName", "OrderUOMCode", "OrderQuantity", "SellingUOMCode", "SalesQuantity", "ReturnIndicator", "ItemUOMCode", "ItemUnitQuantity", "SalesUnitQuantity", "ReturnUnitQuantity", "CustomerID", "LotID", "SerialUseIndicator", "WarehouseID") FROM stdin;
\.


ALTER TABLE public."ProductRelease" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductReleaseRequestHeader; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProductReleaseRequestHeader" DISABLE TRIGGER ALL;

COPY public."ProductReleaseRequestHeader" ("ProductReleaseRequestHeaderSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ProductReleaseRequestID", "ProductReleaseRequestDocumentNumber", "ProductReleaseRequestType", "ProductReleaseRequestDate", "CustomerID") FROM stdin;
\.


ALTER TABLE public."ProductReleaseRequestHeader" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductReleaseRequestLine; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProductReleaseRequestLine" DISABLE TRIGGER ALL;

COPY public."ProductReleaseRequestLine" ("ProductReleaseRequestLineSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ProductReleaseRequestID", "ProductReleaseRequestSequence", "LineID", "ItemID", "ItemName", "ProductReleaseRequestQuantity", "ProductReleaseQuantity", "SalesQuantity", "ItemUOMCode", "SellingUOMCode", "ItemUnitQuantity", "ProductReleaseUnitQuantity", "SalesUnitQuantity", "WarehouseID", "RequestedDeliveryDate", "SalesDocumentNumber", "SalesDocumentSequence", "ProductReleaseDate", "DeliveryDate") FROM stdin;
\.


ALTER TABLE public."ProductReleaseRequestLine" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductTraceParameterOnCustomer; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProductTraceParameterOnCustomer" DISABLE TRIGGER ALL;

COPY public."ProductTraceParameterOnCustomer" ("ProductTraceParameterOnCustomerSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ProductTraceParameterOnCustomerID", "ItemID", "SerialNumber", "Location", "ItemType", "ParameterName", "ParameterValue", "CollectionDateTime") FROM stdin;
\.


ALTER TABLE public."ProductTraceParameterOnCustomer" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductionOrder; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProductionOrder" DISABLE TRIGGER ALL;

COPY public."ProductionOrder" ("ProductionOrderSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ProductionOrderID", "ProductionOrderSequence", "ItemID", "LineID", "RoutingID", "BOMID", "BOMRevisionNumber", "ItemUOMCode", "ProductionOrderQuantity", "ProductionDueDateTime", "ScheduleStartDateTime", "ScheduleEndDateTime", "SalesDocumentNumber", "SalesDocumentSequence") FROM stdin;
\.


ALTER TABLE public."ProductionOrder" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductionPerformance; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProductionPerformance" DISABLE TRIGGER ALL;

COPY public."ProductionPerformance" ("ProductionPerformanceSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ProductionPerformanceID", "ProductionPerformanceSequence", "ProductionOrderID", "ProductionOrderSequence", "ItemID", "ItemUOMCode", "ProducedQuantity", "DefectQuantity", "ReworkQuantity", "OperationID", "RoutingID", "OperationSequence", "PersonnelID", "ProductionPerformanceDate", "ExecutionStartDateTime", "ExecutionEndDateTime", "CancelIndicator", "CancelDateTime", "LotID", "BatchID") FROM stdin;
\.


ALTER TABLE public."ProductionPerformance" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductionPerformanceEquipment; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProductionPerformanceEquipment" DISABLE TRIGGER ALL;

COPY public."ProductionPerformanceEquipment" ("ProductionPerformanceEquipmentSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ProductionPerformanceID", "ProductionPerformanceSequence", "ProductionOrderID", "ProductionOrderSequence", "ItemUOMCode", "ProducedQuantity", "DefectQuantity", "OperationID", "RoutingID", "OperationSequence", "PersonnelID", "ExecutionStartDateTime", "ExecutionEndDateTime", "CancelIndicator", "CancelDateTime", "EquipmentID", "SetupTime", "RunTime", "InspectionFinishedIndicator") FROM stdin;
\.


ALTER TABLE public."ProductionPerformanceEquipment" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductionPerformanceItem; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProductionPerformanceItem" DISABLE TRIGGER ALL;

COPY public."ProductionPerformanceItem" ("ProductionPerformanceItemSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ProductionPerformanceID", "ProductionPerformanceSequence", "ProductionOrderID", "ProductionOrderSequence", "ItemID", "ItemUOMCode", "LineID", "OperationID", "LotID", "ReplacementChildItemID", "WarehouseID", "WarehouseSection", "RequiredQuantity", "IssuedQuantity", "IssuedIndicator") FROM stdin;
\.


ALTER TABLE public."ProductionPerformanceItem" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductionPerformancePersonnel; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProductionPerformancePersonnel" DISABLE TRIGGER ALL;

COPY public."ProductionPerformancePersonnel" ("ProductionPerformancePersonnelSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ProductionPerformanceID", "ProductionPerformanceSequence", "ProductionOrderID", "ProductionOrderSequence", "OperationID", "PersonnelID", "ExecutionStartDateTime", "ExecutionEndDateTime", "TaskGroupCode", "ActualLaborDateTime", "ActualLaborTime", "ActualLaborTimeUOMCode") FROM stdin;
\.


ALTER TABLE public."ProductionPerformancePersonnel" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductionPerformanceQuality; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProductionPerformanceQuality" DISABLE TRIGGER ALL;

COPY public."ProductionPerformanceQuality" ("ProductionPerformanceQualitySequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ProductionPerformanceID", "ProductionPerformanceSequence", "ProductionOrderID", "ProductionOrderSequence", "ItemID", "ItemUOMCode", "OperationID", "RoutingID", "OperationSequence", "ExecutionStartDateTime", "ExecutionEndDateTime", "LotID", "BatchID", "DefectTypeQuantity", "DefectTypeCode", "DefectTypeDetailCode") FROM stdin;
\.


ALTER TABLE public."ProductionPerformanceQuality" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductionPlanning; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProductionPlanning" DISABLE TRIGGER ALL;

COPY public."ProductionPlanning" ("ProductionPlanningSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ProductionPlanID", "ItemID", "ProductionPlanQuantity", "ScheduleStartDateTime", "ScheduleEndDateTime") FROM stdin;
\.


ALTER TABLE public."ProductionPlanning" ENABLE TRIGGER ALL;

--
-- Data for Name: ProjectMaster; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."ProjectMaster" DISABLE TRIGGER ALL;

COPY public."ProjectMaster" ("ProjectMasterSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ProjectID", "ProjectName", "ProjectStatusCode", "ResponsibleDepartmentID", "PersonInChargeID", "ProjectContractDate", "ExpectedStartDate", "ExpectedEndDate", "ActualStartDate", "ActualEndDate", "SalesDocumentNumber", "SalesDocumentSequence", "ItemID", "UseIndicator", "DivisionID") FROM stdin;
8	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 05:04:56.85658	\N	2026-11-05 06:07:55.857401	{"estimateNo":"Q26001-01","cavity":"1*2 Cavity","moldVendor":"우성정공(주)","massVendor":"(주)뉴몰드","currentStep":0,"stepMemos":{}}	MI26001P0	121212	IN_PROGRESS	\N	\N	\N	\N	2026-12-31	\N	\N	\N	\N	\N	f	\N
10	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 06:10:24.454883	\N	2026-11-05 06:43:59.708719	{"estimateNo":"Q26001-01","cavity":"1*2 Cavity","moldVendor":"우성정공(주)","massVendor":"(주)뉴몰드","currentStep":0,"stepMemos":{}}	MI26002P0	Radiator Lower Grille	IN_PROGRESS	\N	\N	\N	\N	2026-12-31	\N	\N	\N	\N	\N	f	\N
11	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 06:12:23.391701	\N	2026-11-05 06:44:04.265273	{"estimateNo":"Q26001-01","cavity":"1*2 Cavity","moldVendor":"우성정공(주)","massVendor":"(주)뉴몰드","currentStep":0,"stepMemos":{}}	MI26003P0	Front Door Upper Cover LH/RH	IN_PROGRESS	\N	\N	\N	\N	2026-12-31	\N	\N	\N	\N	\N	f	\N
12	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 06:21:33.431967	\N	2026-11-05 07:30:43.733382	{"projectNo":"MI26004P0","estimateNo":"Q26001-01","projectName":"77777777777777777777777","productName":"Door Armrest Base","customerName":"현대자동차 (1차사)","partNo":"82710-AA000","moldNo":"MI26004P0M","moldDegree":"M1","changeType":"N001","isContractConfirmed":true,"isQuotePending":false,"quotationStatus":"수주확정","stepNameCustom":"고객 답변 대기","moldProductionType":"OUTSOURCING","moldVendor":"우성정공(주)","massProductionType":"OUTSOURCING","massVendor":"(주)뉴몰드","cavity":"1*2 Cavity","material":"PP 컴파운드 사출물, 1*2 Cavity","partWeight":"420g","annualVolume":50000,"machineTon":"650T","hrsSpec":"밸브게이트 2-Drop","moldMaterial":"NAK80","resinSpec":"PP 컴파운드 사출물, 1*2 Cavity","warrantyShots":500000,"registeredDate":"2026-11-05","quoteSubmitDate":"2026-11-05","orderDate":"2026-11-05","kickoffDate":"2026-11-05","targetMoldDays":45,"targetT1Date":"2026-11-05","moldDeliveryDate":"","targetMassDate":"2026-11-05","massStartDate":"2026-11-05","currentStep":0,"stepStatus":"진행중","trialDegree":"T1 대기","trialCompletionRate":0,"facilityEvent":"가동대기","orderQty":0,"deliveredQty":0,"notes":"121212121212121212","updatedAt":"2026-11-05 15:21","id":12,"actualT1Date":"","stepAttachments":{},"stepMemos":{}}	MI26004P0	Door Armrest Base	진행중	OUTSOURCING	현대자동차 (1차사)	2026-11-05	2026-11-05	2026-11-05	2026-11-05	2026-11-05	Q26001-01	1	82710-AA000	t	N001
14	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 06:42:54.078158	\N	2026-11-05 07:46:40.38955	{"projectNo":"MI26006P0","estimateNo":"Q26001-01","projectName":"33333333333","productName":"BMS Battery Case Module","customerName":"현대자동차 (1차사)","partNo":"37510-SPX00-BM","moldNo":"MI26006P0M","moldDegree":"M1","changeType":"N001","isContractConfirmed":true,"isQuotePending":false,"quotationStatus":"수주확정","stepNameCustom":"고객 답변 대기","moldProductionType":"OUTSOURCING","moldVendor":"(주)삼우정밀","massProductionType":"OUTSOURCING","massVendor":"제일프라테크","cavity":"1*2 Cavity","material":"SKD61 / PBT-GF30 난연, 1*4 Cavity","partWeight":"420g","annualVolume":50000,"machineTon":"650T","hrsSpec":"밸브게이트 2-Drop","moldMaterial":"NAK80","resinSpec":"SKD61 / PBT-GF30 난연, 1*4 Cavity","warrantyShots":500000,"registeredDate":"2026-11-06","quoteSubmitDate":"2026-11-07","orderDate":"","kickoffDate":"","targetMoldDays":45,"targetT1Date":"2026-11-19","moldDeliveryDate":"","targetMassDate":"","massStartDate":"","currentStep":0,"stepStatus":"진행중","trialDegree":"T1 대기","trialCompletionRate":0,"facilityEvent":"가동대기","orderQty":0,"deliveredQty":0,"notes":"비고","updatedAt":"2026-11-05 15:42","id":14,"actualT1Date":"","stepAttachments":{},"stepMemos":{}}	MI26006P0	BMS Battery Case Module	진행중	OUTSOURCING	현대자동차 (1차사)	\N	\N	2026-11-19	\N	\N	Q26001-01	1	37510-SPX00-BM	t	N001
13	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 06:28:15.443929	\N	2026-11-05 14:54:34.478742	{"projectNo":"MI26005P0","estimateNo":"Q26001-01","projectName":"5555555555","productName":"Door Armrest Base","customerName":"현대자동차 (1차사)","partNo":"82710-AA000","moldNo":"MI26005P0M","moldDegree":"M1","changeType":"N001","isContractConfirmed":false,"isQuotePending":true,"quotationStatus":"고객 답변 대기","stepNameCustom":"고객 답변 대기","moldProductionType":"OUTSOURCING","moldVendor":"우성정공(주)","massProductionType":"OUTSOURCING","massVendor":"(주)뉴몰드","cavity":"1*2 Cavity","material":"PP 컴파운드 사출물, 1*2 Cavity","partWeight":"420g","annualVolume":50000,"machineTon":"650T","hrsSpec":"밸브게이트 2-Drop","moldMaterial":"NAK80","resinSpec":"PP 컴파운드 사출물, 1*2 Cavity","warrantyShots":500000,"registeredDate":"2026-11-05","quoteSubmitDate":"2026-11-05","orderDate":"","kickoffDate":"","targetMoldDays":45,"targetT1Date":"","moldDeliveryDate":"","targetMassDate":"","massStartDate":"","currentStep":13,"stepStatus":"완료","trialDegree":"금형 승인","trialCompletionRate":100,"facilityEvent":"가동대기","orderQty":0,"deliveredQty":0,"notes":"[MPSI] PPAP 양산승인 최종 통과(Pass). 완제품 구매발주(PO: PO-2026-1105-1) 생성 완료.","updatedAt":"2026-11-04","id":13,"actualT1Date":"","stepAttachments":{},"stepMemos":{}}	MI26005P0	Door Armrest Base	완료	우성정공(주)	현대자동차 (1차사)	\N	\N	\N	\N	\N	Q26001-01	1	82710-AA000	t	N001
\.


ALTER TABLE public."ProjectMaster" ENABLE TRIGGER ALL;

--
-- Data for Name: PurchaseOrderHeader; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."PurchaseOrderHeader" DISABLE TRIGGER ALL;

COPY public."PurchaseOrderHeader" ("PurchaseOrderHeaderSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "PurchaseDocumentNumber", "VendorID", "PaymentTermsCode", "PurchaseGroupCode", "CurrencyCode", "ExchangeRate", "PurchaseApprovalDate", "PurchaseOrderDate", "PurchaseOrderTypeCode", "PurchaseTransactionType", "PurchaseOrderStartDate", "PurchaseOrderValidDate", "PersonnelID", "PurchaseOrderClosingIndicator", "PurchaseOrderClosingDate") FROM stdin;
\.


ALTER TABLE public."PurchaseOrderHeader" ENABLE TRIGGER ALL;

--
-- Data for Name: PurchaseOrderLine; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."PurchaseOrderLine" DISABLE TRIGGER ALL;

COPY public."PurchaseOrderLine" ("PurchaseOrderLineSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "PurchaseDocumentNumber", "PurchaseDocumentSequence", "ItemPurchaseType", "ItemID", "ItemName", "PurchaseOrderLineStatusCode", "TaxCode", "ItemUOMCode", "PurchaseOrderUOMCode", "ConversionUnitQuantity", "ItemUnitQuantity", "PurchaseOrderQuantity", "PurchaseGoodsReceiptQuantity", "PurchaseTransactionUnitPrice", "PurchaseTransactionPrice", "PurchaseOrderUnitPrice", "PurchaseOrderPrice", "VATPrice", "ExpectedDeliveryDate", "IncomingInspectionIndicator", "AccountCode", "VATTransactionUnitPrice", "VATTransactionPrice", "VATCarryingAmount") FROM stdin;
\.


ALTER TABLE public."PurchaseOrderLine" ENABLE TRIGGER ALL;

--
-- Data for Name: PurchaseRequisition; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."PurchaseRequisition" DISABLE TRIGGER ALL;

COPY public."PurchaseRequisition" ("PurchaseRequisitionSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "PurchaseRequisitionID", "PurchaseRequisitionRevisionNumber", "ItemID", "ItemName", "DemandQuantity", "ItemUOMCode", "PurchaseRequisitionUnitPrice", "CurrencyCode", "VendorID", "VendorName", "RequestedDeliveryDate", "RequesterDepartmentID", "RequesterPersonnelID") FROM stdin;
\.


ALTER TABLE public."PurchaseRequisition" ENABLE TRIGGER ALL;

--
-- Data for Name: Return; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Return" DISABLE TRIGGER ALL;

COPY public."Return" ("ReturnSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "ReturnID", "ItemID", "LotID", "BatchID", "WarehouseID", "ReturnSequence", "ReturnNumber", "ProductReturnDocumentNumber", "ReturnDateTime", "CustomerID", "VendorID", "ReturnQuantity", "ReturnType") FROM stdin;
\.


ALTER TABLE public."Return" ENABLE TRIGGER ALL;

--
-- Data for Name: RoutingHeader; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."RoutingHeader" DISABLE TRIGGER ALL;

COPY public."RoutingHeader" ("RoutingHeaderSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "RoutingID", "RoutingName", "ItemID", "UseIndicator") FROM stdin;
\.


ALTER TABLE public."RoutingHeader" ENABLE TRIGGER ALL;

--
-- Data for Name: RoutingLine; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."RoutingLine" DISABLE TRIGGER ALL;

COPY public."RoutingLine" ("RoutingLineSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "RoutingID", "OperationSequence", "OperationID", "LastOperationIndicator", "SetupTime", "RunTime", "MoveTime") FROM stdin;
\.


ALTER TABLE public."RoutingLine" ENABLE TRIGGER ALL;

--
-- Data for Name: SalesOrderHeader; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."SalesOrderHeader" DISABLE TRIGGER ALL;

COPY public."SalesOrderHeader" ("SalesOrderHeaderSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "SalesDocumentNumber", "SalesOrderType", "CustomerID", "SalesDate", "SalesStatus", "ShipmentTermsCode", "SalesTransactionType", "ReturnIndicator", "ExportIndicator", "SalesAutomaticApprovalIndicator") FROM stdin;
\.


ALTER TABLE public."SalesOrderHeader" ENABLE TRIGGER ALL;

--
-- Data for Name: SalesOrderLine; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."SalesOrderLine" DISABLE TRIGGER ALL;

COPY public."SalesOrderLine" ("SalesOrderLineSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "SalesDocumentNumber", "SalesDocumentSequence", "ItemID", "ItemName", "ItemQuantity", "ItemUOMCode", "SellingUOMCode", "ConversionUnitQuantity", "ItemUnitQuantity", "RequestedDeliveryDate") FROM stdin;
\.


ALTER TABLE public."SalesOrderLine" ENABLE TRIGGER ALL;

--
-- Data for Name: SalesPlan; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."SalesPlan" DISABLE TRIGGER ALL;

COPY public."SalesPlan" ("SalesPlanSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "SalesPlanID", "ItemID", "ItemName", "SalesProjection", "ProjectionStartDate", "ProjectionEndDate") FROM stdin;
\.


ALTER TABLE public."SalesPlan" ENABLE TRIGGER ALL;

--
-- Data for Name: Site; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."Site" DISABLE TRIGGER ALL;

COPY public."Site" ("SiteSequenceNo", "EnterpriseID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "SiteID", "SiteName", "BusinessRegistrationNumber", "DialNumber", "PostalCode", "BaseAddress", "DetailAddress", "UseIndicator") FROM stdin;
\.


ALTER TABLE public."Site" ENABLE TRIGGER ALL;

--
-- Data for Name: StockTransfer; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."StockTransfer" DISABLE TRIGGER ALL;

COPY public."StockTransfer" ("StockTransferSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "StockTransferID", "InventoryTransactionDocumentNumber", "ItemID", "WarehouseID", "ReceiptWarehouseID", "StockTransferQuantity", "TransferDateTime") FROM stdin;
\.


ALTER TABLE public."StockTransfer" ENABLE TRIGGER ALL;

--
-- Data for Name: StockerInventory; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."StockerInventory" DISABLE TRIGGER ALL;

COPY public."StockerInventory" ("StockerInventorySequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "StockerID", "ZoneID", "FullCapacity", "CurrentCapacity", "LotID", "CarrierID", "AlternateStockerID") FROM stdin;
\.


ALTER TABLE public."StockerInventory" ENABLE TRIGGER ALL;

--
-- Data for Name: SupplierInspectionApplication; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."SupplierInspectionApplication" DISABLE TRIGGER ALL;

COPY public."SupplierInspectionApplication" ("SupplierInspectionApplicationSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "VendorID", "ProjectID", "ItemID", "ItemName", "ItemUOMCode", "PurchaseDocumentNumber", "PurchaseDocumentSequence", "LotID", "BatchID", "InspectionPlanID", "InspectionID", "InspectionApplicationID", "ApplicationPersonnelID", "InspectionName", "InspectionLocation", "InspectionMethod", "ExpectedInspectionDate", "InspectionDate", "InspectionTimePeriod", "InspectionQuantity", "SelfCheckInspectionResultSheet", "InspectionStatusCode", "ReasonForApplication", "InspectionCancelReason") FROM stdin;
\.


ALTER TABLE public."SupplierInspectionApplication" ENABLE TRIGGER ALL;

--
-- Data for Name: SupplierInspectionPlan; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."SupplierInspectionPlan" DISABLE TRIGGER ALL;

COPY public."SupplierInspectionPlan" ("SupplierInspectionPlanSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "VendorID", "ProjectID", "ItemID", "ItemName", "ItemUOMCode", "PurchaseDocumentNumber", "PurchaseDocumentSequence", "PurchaseOrderQuantity", "LotID", "BatchID", "ExpectedDeliveryDate", "InspectionPlanID", "InspectionID", "InspectionName", "Inspector", "InspectionLocation", "ExpectedInspectionDate", "ExpectedInspectionTimePeriod", "InspectionMethod", "InspectionPlanQuantity", "InspectionCheckSheet") FROM stdin;
\.


ALTER TABLE public."SupplierInspectionPlan" ENABLE TRIGGER ALL;

--
-- Data for Name: SupplierInspectionResult; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."SupplierInspectionResult" DISABLE TRIGGER ALL;

COPY public."SupplierInspectionResult" ("SupplierInspectionResultSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "VendorID", "ProjectID", "ItemID", "ItemName", "LotID", "BatchID", "InspectionPlanID", "InspectionID", "InspectionApplicationID", "InspectionResultID", "Inspector", "InspectionParticipant", "InspectionLocation", "InspectionDate", "InspectionQuantity", "InspectionResult", "InspectionResultSheet", "InspectionStatusCode") FROM stdin;
\.


ALTER TABLE public."SupplierInspectionResult" ENABLE TRIGGER ALL;

--
-- Data for Name: TraceParameter; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."TraceParameter" DISABLE TRIGGER ALL;

COPY public."TraceParameter" ("TraceParameterSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "TraceParameterID", "EquipmentID", "ParameterID", "EventDateTime", "ParameterUOMCode", "ParameterValue", "ValidationResultCode") FROM stdin;
\.


ALTER TABLE public."TraceParameter" ENABLE TRIGGER ALL;

--
-- Data for Name: TransferCommand; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."TransferCommand" DISABLE TRIGGER ALL;

COPY public."TransferCommand" ("TransferCommandSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "TransferCommandID", "LotID", "LotName", "LotDescription", "CarrierID", "SourceID", "SourceType", "SourceName", "DestinationID", "DestinationType", "DestinationName") FROM stdin;
\.


ALTER TABLE public."TransferCommand" ENABLE TRIGGER ALL;

--
-- Data for Name: TransferEnd; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."TransferEnd" DISABLE TRIGGER ALL;

COPY public."TransferEnd" ("TransferEndSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "TransferEndID", "TransferCommandID", "LotID", "LotName", "LotDescription", "CarrierID", "TransferEndDateTime", "DestinationID", "DestinationType", "DestinationName") FROM stdin;
\.


ALTER TABLE public."TransferEnd" ENABLE TRIGGER ALL;

--
-- Data for Name: TransferStart; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."TransferStart" DISABLE TRIGGER ALL;

COPY public."TransferStart" ("TransferStartSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "TransferStartID", "TransferCommandID", "LotID", "LotName", "LotDescription", "CarrierID", "TransferStartDateTime", "CurrentLocation", "DestinationID", "DestinationType", "DestinationName", "ErrorCode", "ErrorMessage") FROM stdin;
\.


ALTER TABLE public."TransferStart" ENABLE TRIGGER ALL;

--
-- Data for Name: UOMGroupHeader; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."UOMGroupHeader" DISABLE TRIGGER ALL;

COPY public."UOMGroupHeader" ("UOMGroupHeaderSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "UOMGroupID", "UOMGroupName") FROM stdin;
\.


ALTER TABLE public."UOMGroupHeader" ENABLE TRIGGER ALL;

--
-- Data for Name: UOMGroupLine; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."UOMGroupLine" DISABLE TRIGGER ALL;

COPY public."UOMGroupLine" ("UOMGroupLineSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "UOMGroupID", "UOMCode", "UOMCodeName", "UseIndicator") FROM stdin;
\.


ALTER TABLE public."UOMGroupLine" ENABLE TRIGGER ALL;

--
-- Data for Name: VendorPartyMaster; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."VendorPartyMaster" DISABLE TRIGGER ALL;

COPY public."VendorPartyMaster" ("VendorPartyMasterSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "VendorID", "VendorName", "BusinessRegistrationNumber", "RepresentativeName", "CountryID", "PostalCode", "BaseAddress", "DetailAddress", "DialNumber", "FaxNumber", "UseIndicator", "PersonInChargeName", "PersonInChargeEmail", "PersonInChargeDialNumber") FROM stdin;
1	MPSI_HQ	SITE_01	PLANT_01	\N	2026-08-18 09:00:00	\N	\N	자동차 및 동 부분품	C-HK-001	현대자동차(주) 광주공장	101-81-09147	정의선, 장재훈	대한민국	06797	광주광역시 광산구 삼소로 270	의장공장 구매관리부	062-950-1114	062-950-1115	t	최민희 차장	purchasing@hyundai.com	\N
2	MPSI_HQ	SITE_01	PLANT_01	\N	2026-08-15 09:00:00	\N	\N	자동차 부품 모듈	C-MOBIS-002	현대모비스(주)	201-81-22441	이규석	대한민국	06141	서울특별시 강남구 테헤란로 203	모듈사업부	02-2018-5114	02-2018-5000	t	박준영 과장	mobis_scm@mobis.co.kr	\N
3	MPSI_HQ	SITE_01	PLANT_01	\N	2026-08-19 09:00:00	\N	\N	정밀 플라스틱 사출금형, CAE 설계	S-WS-001	우성정공 (금형제작)	131-86-12345	박우성	대한민국	21697	인천광역시 남동구 남동서로 123	남동공단 45블럭 6롯트	032-815-5678	032-815-5679	t	배희섭 이사 (기술영업)	mold_sales@woosung.co.kr	\N
4	MPSI_HQ	SITE_01	PLANT_01	\N	2026-08-19 09:00:00	\N	\N	플라스틱 사출성형, 양산조립	S-NM-002	뉴몰드 (사출양산)	134-81-67890	김신호	대한민국	18525	경기도 화성시 향남읍 토성로 88	양산 1공장	031-352-8801	031-352-8802	t	김영수 부장 (품질보증)	mass_prod@newmold.co.kr	\N
5	MPSI_HQ	SITE_01	PLANT_01	\N	2026-08-20 09:00:00	\N	\N	자동차 플라스틱 사출금형, 대형 정밀금형	S-DH-003	대한금형(주) (금형제작)	128-81-99887	정대한	대한민국	18284	경기도 화성시 향남읍 발안공단로 45	대한금형 화성공장	031-352-8800	031-352-8801	t	이정우 팀장 (기술영업)	sales@daehanmold.co.kr	\N
6	MPSI_HQ	SITE_01	PLANT_01	\N	2026-08-16 09:00:00	\N	\N	정밀 플라스틱 부품 사출, 2중사출, 조립	S-KP-004	(주)한국정밀사출 (사출양산)	135-86-44332	최한국	대한민국	14562	경기도 부천시 오정구 석천로 345	부천테크노파크 3단지	032-621-3300	032-621-3301	t	강성호 부장 (품질관리)	hk_precision@koreaplas.com	\N
\.


ALTER TABLE public."VendorPartyMaster" ENABLE TRIGGER ALL;

--
-- Data for Name: WarehouseLocationHeader; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."WarehouseLocationHeader" DISABLE TRIGGER ALL;

COPY public."WarehouseLocationHeader" ("WarehouseLocationHeaderSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "WarehouseID", "WarehouseName", "WarehouseType", "UseIndicator", "NegativeInventoryIndicator") FROM stdin;
1	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 07:20:38.477403	\N	\N	MPSI 메인 물류창고	wh-1	본사 창고동 (1공장)	자재창고	t	\N
2	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 07:20:38.483317	\N	\N	사출 수지 및 레진 전용	wh-2	원재료 보관동 (2공장)	자재창고	t	\N
3	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 07:20:38.488127	\N	\N	금형제작처 금형 및 예비품	wh-3	금형/설비 보전실	자재창고	t	\N
4	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 07:20:38.492723	\N	\N	외주사출 양산품 임치	wh-4	외부 임치 창고 (외주양산)	자재창고	t	\N
\.


ALTER TABLE public."WarehouseLocationHeader" ENABLE TRIGGER ALL;

--
-- Data for Name: WarehouseLocationLine; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."WarehouseLocationLine" DISABLE TRIGGER ALL;

COPY public."WarehouseLocationLine" ("WarehouseLocationLineSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "WarehouseID", "WarehouseSection", "WarehouseSectionName") FROM stdin;
1	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 07:20:38.497583	\N	\N	{"warehouseName":"본사 창고동 (1공장)","zoneCode":"A구역","zoneName":"완제품 주출하 구역","assignedUsage":"판매완제품","targetCategory":"도어 트림 상단 커버 어셈블리","locationDesc":"Rack A-01 ~ A-10","temperatureCondition":"상온 (15~25℃)","isActive":true}	wh-1	A구역	완제품 주출하 구역
2	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 07:20:38.504437	\N	\N	{"warehouseName":"본사 창고동 (1공장)","zoneCode":"B구역","zoneName":"구매 부품/클립 보관소","assignedUsage":"부품","targetCategory":"스냅핏 클립, 체결용 볼트","locationDesc":"Bin B-01 ~ B-20","temperatureCondition":"상온 건조","isActive":true}	wh-1	B구역	구매 부품/클립 보관소
3	MPSI_HQ	SITE_01	PLANT_01	\N	2026-11-05 07:20:38.508908	\N	\N	{"warehouseName":"원재료 보관동 (2공장)","zoneCode":"E구역","zoneName":"수지 원재료 싸이로 및 백보관","assignedUsage":"원재료","targetCategory":"LG화학 ABS HF-380, PP, PA66","locationDesc":"Silo 1~3, Pallet E-01~12","temperatureCondition":"항온항습 (습도 40% 이하)","isActive":true}	wh-2	E구역	수지 원재료 싸이로 및 백보관
\.


ALTER TABLE public."WarehouseLocationLine" ENABLE TRIGGER ALL;

--
-- Data for Name: WorkCalendar; Type: TABLE DATA; Schema: public; Owner: mpsi_user
--

ALTER TABLE public."WorkCalendar" DISABLE TRIGGER ALL;

COPY public."WorkCalendar" ("WorkCalendarSequenceNo", "EnterpriseID", "SiteID", "PlantID", "CreatorID", "CreationDateTime", "ModifierID", "ModificationDateTime", "Note", "CalendarID", "CalendarType", "CalendarDate", "DayOfWeek", "WeekOfYear", "DayOfYear", "ScheduleType") FROM stdin;
\.


ALTER TABLE public."WorkCalendar" ENABLE TRIGGER ALL;

--
-- Name: AfterSalesServiceRequestResul_AfterSalesServiceRequestResul_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."AfterSalesServiceRequestResul_AfterSalesServiceRequestResul_seq"', 1, false);


--
-- Name: AfterSalesServiceRequest_AfterSalesServiceRequestSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."AfterSalesServiceRequest_AfterSalesServiceRequestSequenceNo_seq"', 1, false);


--
-- Name: Alarm_AlarmSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Alarm_AlarmSequenceNo_seq"', 1, false);


--
-- Name: AvailableInventory_AvailableInventorySequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."AvailableInventory_AvailableInventorySequenceNo_seq"', 1, false);


--
-- Name: BOMHeader_BOMHeaderSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."BOMHeader_BOMHeaderSequenceNo_seq"', 1, false);


--
-- Name: BOMLine_BOMLineSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."BOMLine_BOMLineSequenceNo_seq"', 1, false);


--
-- Name: BasePrice_BasePriceSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."BasePrice_BasePriceSequenceNo_seq"', 1, false);


--
-- Name: Batch_BatchSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Batch_BatchSequenceNo_seq"', 1, false);


--
-- Name: Carrier_CarrierSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Carrier_CarrierSequenceNo_seq"', 1, false);


--
-- Name: CommonCodeMaster_CommonCodeMasterSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."CommonCodeMaster_CommonCodeMasterSequenceNo_seq"', 1, false);


--
-- Name: CorrectiveActionPlan_CorrectiveActionPlanSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."CorrectiveActionPlan_CorrectiveActionPlanSequenceNo_seq"', 1, false);


--
-- Name: CorrectiveActionRequest_CorrectiveActionRequestSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."CorrectiveActionRequest_CorrectiveActionRequestSequenceNo_seq"', 1, false);


--
-- Name: CorrectiveActionResult_CorrectiveActionResultSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."CorrectiveActionResult_CorrectiveActionResultSequenceNo_seq"', 1, false);


--
-- Name: CustomerPartyMaster_CustomerPartyMasterSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."CustomerPartyMaster_CustomerPartyMasterSequenceNo_seq"', 16, true);


--
-- Name: DeliveryHeader_DeliveryHeaderSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."DeliveryHeader_DeliveryHeaderSequenceNo_seq"', 1, false);


--
-- Name: DeliveryLine_DeliveryLineSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."DeliveryLine_DeliveryLineSequenceNo_seq"', 1, false);


--
-- Name: Department_DepartmentSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Department_DepartmentSequenceNo_seq"', 1, false);


--
-- Name: EngineeringChangeOrder_EngineeringChangeOrderSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."EngineeringChangeOrder_EngineeringChangeOrderSequenceNo_seq"', 1, false);


--
-- Name: Enterprise_EnterpriseSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Enterprise_EnterpriseSequenceNo_seq"', 1, false);


--
-- Name: EquipmentParameter_EquipmentParameterSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."EquipmentParameter_EquipmentParameterSequenceNo_seq"', 1, false);


--
-- Name: EquipmentState_EquipmentStateSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."EquipmentState_EquipmentStateSequenceNo_seq"', 1, false);


--
-- Name: Equipment_EquipmentSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Equipment_EquipmentSequenceNo_seq"', 1, false);


--
-- Name: GoodsIssue_GoodsIssueSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."GoodsIssue_GoodsIssueSequenceNo_seq"', 1, false);


--
-- Name: GoodsReceipt_GoodsReceiptSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."GoodsReceipt_GoodsReceiptSequenceNo_seq"', 1, false);


--
-- Name: InTransitLocation_InTransitLocationSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."InTransitLocation_InTransitLocationSequenceNo_seq"', 1, false);


--
-- Name: InventoryCount_InventoryCountSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."InventoryCount_InventoryCountSequenceNo_seq"', 1, false);


--
-- Name: Inventory_InventorySequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Inventory_InventorySequenceNo_seq"', 1, false);


--
-- Name: ItemMaster_ItemMasterSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ItemMaster_ItemMasterSequenceNo_seq"', 5, true);


--
-- Name: Line_LineSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Line_LineSequenceNo_seq"', 1, false);


--
-- Name: Lot_LotSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Lot_LotSequenceNo_seq"', 1, false);


--
-- Name: MaterialArrival_MaterialArrivalSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MaterialArrival_MaterialArrivalSequenceNo_seq"', 1, false);


--
-- Name: MpsiArcTalkMessage_MessageSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiArcTalkMessage_MessageSequenceNo_seq"', 1, false);


--
-- Name: MpsiDeliveryStep_StepSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiDeliveryStep_StepSequenceNo_seq"', 1, false);


--
-- Name: MpsiDeliveryTracking_TrackingSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiDeliveryTracking_TrackingSequenceNo_seq"', 1, false);


--
-- Name: MpsiInspectionReport_InspectionSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiInspectionReport_InspectionSequenceNo_seq"', 1, false);


--
-- Name: MpsiMassPpap_PpapSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiMassPpap_PpapSequenceNo_seq"', 4, true);


--
-- Name: MpsiMassProductionValidation_ValidationSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiMassProductionValidation_ValidationSequenceNo_seq"', 1, false);


--
-- Name: MpsiMassQuotation_MassQuotationSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiMassQuotation_MassQuotationSequenceNo_seq"', 2, true);


--
-- Name: MpsiMassSettlement_SettlementSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiMassSettlement_SettlementSequenceNo_seq"', 1, false);


--
-- Name: MpsiMassValidation_ValidationSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiMassValidation_ValidationSequenceNo_seq"', 1, true);


--
-- Name: MpsiMoldApproval_ApprovalSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiMoldApproval_ApprovalSequenceNo_seq"', 1, false);


--
-- Name: MpsiMoldDesign_DesignSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiMoldDesign_DesignSequenceNo_seq"', 1, true);


--
-- Name: MpsiMoldManufacture_ManufactureSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiMoldManufacture_ManufactureSequenceNo_seq"', 1, true);


--
-- Name: MpsiMoldManufacture_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiMoldManufacture_seq"', 1, false);


--
-- Name: MpsiMoldQuotation_QuotationSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiMoldQuotation_QuotationSequenceNo_seq"', 14, true);


--
-- Name: MpsiMoldTransfer_TransferSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiMoldTransfer_TransferSequenceNo_seq"', 1, false);


--
-- Name: MpsiMoldTrial_TrialSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiMoldTrial_TrialSequenceNo_seq"', 1, true);


--
-- Name: MpsiNotification_NotificationSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiNotification_NotificationSequenceNo_seq"', 1, false);


--
-- Name: MpsiPmRevisionMaster_PmSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiPmRevisionMaster_PmSequenceNo_seq"', 1, false);


--
-- Name: MpsiPmRound_PmRoundSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiPmRound_PmRoundSequenceNo_seq"', 1, false);


--
-- Name: MpsiPpapDocument_PpapSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiPpapDocument_PpapSequenceNo_seq"', 1, false);


--
-- Name: MpsiProjectStage_StageSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiProjectStage_StageSequenceNo_seq"', 34, true);


--
-- Name: MpsiProjectStepAttachment_AttachmentSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiProjectStepAttachment_AttachmentSequenceNo_seq"', 1, false);


--
-- Name: MpsiProjectStepMemo_MemoSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiProjectStepMemo_MemoSequenceNo_seq"', 1, false);


--
-- Name: MpsiRevisionHistory_RevisionSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiRevisionHistory_RevisionSequenceNo_seq"', 1, false);


--
-- Name: MpsiSyncInbox_InboxSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiSyncInbox_InboxSequenceNo_seq"', 1, false);


--
-- Name: MpsiSyncNodeRegistry_NodeSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiSyncNodeRegistry_NodeSequenceNo_seq"', 3, true);


--
-- Name: MpsiSyncOutbox_OutboxSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiSyncOutbox_OutboxSequenceNo_seq"', 1, false);


--
-- Name: MpsiUserAccount_id_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."MpsiUserAccount_id_seq"', 4, true);


--
-- Name: OperationEnd_OperationEndSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."OperationEnd_OperationEndSequenceNo_seq"', 1, false);


--
-- Name: OperationEquipment_OperationEquipmentSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."OperationEquipment_OperationEquipmentSequenceNo_seq"', 1, false);


--
-- Name: OperationStart_OperationStartSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."OperationStart_OperationStartSequenceNo_seq"', 1, false);


--
-- Name: Operation_OperationSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Operation_OperationSequenceNo_seq"', 5, true);


--
-- Name: Personnel_PersonnelSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Personnel_PersonnelSequenceNo_seq"', 4, true);


--
-- Name: Plant_PlantSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Plant_PlantSequenceNo_seq"', 1, false);


--
-- Name: ProductIncoming_ProductIncomingSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProductIncoming_ProductIncomingSequenceNo_seq"', 1, false);


--
-- Name: ProductPacking_ProductPackingSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProductPacking_ProductPackingSequenceNo_seq"', 1, false);


--
-- Name: ProductReleaseRequestHeader_ProductReleaseRequestHeaderSequ_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProductReleaseRequestHeader_ProductReleaseRequestHeaderSequ_seq"', 1, false);


--
-- Name: ProductReleaseRequestLine_ProductReleaseRequestLineSequence_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProductReleaseRequestLine_ProductReleaseRequestLineSequence_seq"', 1, false);


--
-- Name: ProductRelease_ProductReleaseSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProductRelease_ProductReleaseSequenceNo_seq"', 1, false);


--
-- Name: ProductTraceParameterOnCustom_ProductTraceParameterOnCustom_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProductTraceParameterOnCustom_ProductTraceParameterOnCustom_seq"', 1, false);


--
-- Name: ProductionOrder_ProductionOrderSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProductionOrder_ProductionOrderSequenceNo_seq"', 1, false);


--
-- Name: ProductionPerformanceEquipmen_ProductionPerformanceEquipmen_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProductionPerformanceEquipmen_ProductionPerformanceEquipmen_seq"', 1, false);


--
-- Name: ProductionPerformanceItem_ProductionPerformanceItemSequence_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProductionPerformanceItem_ProductionPerformanceItemSequence_seq"', 1, false);


--
-- Name: ProductionPerformancePersonne_ProductionPerformancePersonne_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProductionPerformancePersonne_ProductionPerformancePersonne_seq"', 1, false);


--
-- Name: ProductionPerformanceQuality_ProductionPerformanceQualitySe_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProductionPerformanceQuality_ProductionPerformanceQualitySe_seq"', 1, false);


--
-- Name: ProductionPerformance_ProductionPerformanceSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProductionPerformance_ProductionPerformanceSequenceNo_seq"', 1, false);


--
-- Name: ProductionPlanning_ProductionPlanningSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProductionPlanning_ProductionPlanningSequenceNo_seq"', 1, false);


--
-- Name: ProjectMaster_ProjectMasterSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."ProjectMaster_ProjectMasterSequenceNo_seq"', 14, true);


--
-- Name: PurchaseOrderHeader_PurchaseOrderHeaderSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."PurchaseOrderHeader_PurchaseOrderHeaderSequenceNo_seq"', 1, false);


--
-- Name: PurchaseOrderLine_PurchaseOrderLineSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."PurchaseOrderLine_PurchaseOrderLineSequenceNo_seq"', 1, false);


--
-- Name: PurchaseRequisition_PurchaseRequisitionSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."PurchaseRequisition_PurchaseRequisitionSequenceNo_seq"', 1, false);


--
-- Name: Return_ReturnSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Return_ReturnSequenceNo_seq"', 1, false);


--
-- Name: RoutingHeader_RoutingHeaderSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."RoutingHeader_RoutingHeaderSequenceNo_seq"', 1, false);


--
-- Name: RoutingLine_RoutingLineSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."RoutingLine_RoutingLineSequenceNo_seq"', 1, false);


--
-- Name: SalesOrderHeader_SalesOrderHeaderSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."SalesOrderHeader_SalesOrderHeaderSequenceNo_seq"', 1, false);


--
-- Name: SalesOrderLine_SalesOrderLineSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."SalesOrderLine_SalesOrderLineSequenceNo_seq"', 1, false);


--
-- Name: SalesPlan_SalesPlanSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."SalesPlan_SalesPlanSequenceNo_seq"', 1, false);


--
-- Name: Site_SiteSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."Site_SiteSequenceNo_seq"', 1, false);


--
-- Name: StockTransfer_StockTransferSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."StockTransfer_StockTransferSequenceNo_seq"', 1, false);


--
-- Name: StockerInventory_StockerInventorySequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."StockerInventory_StockerInventorySequenceNo_seq"', 1, false);


--
-- Name: SupplierInspectionApplication_SupplierInspectionApplication_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."SupplierInspectionApplication_SupplierInspectionApplication_seq"', 1, false);


--
-- Name: SupplierInspectionPlan_SupplierInspectionPlanSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."SupplierInspectionPlan_SupplierInspectionPlanSequenceNo_seq"', 1, false);


--
-- Name: SupplierInspectionResult_SupplierInspectionResultSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."SupplierInspectionResult_SupplierInspectionResultSequenceNo_seq"', 1, false);


--
-- Name: TraceParameter_TraceParameterSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."TraceParameter_TraceParameterSequenceNo_seq"', 1, false);


--
-- Name: TransferCommand_TransferCommandSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."TransferCommand_TransferCommandSequenceNo_seq"', 1, false);


--
-- Name: TransferEnd_TransferEndSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."TransferEnd_TransferEndSequenceNo_seq"', 1, false);


--
-- Name: TransferStart_TransferStartSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."TransferStart_TransferStartSequenceNo_seq"', 1, false);


--
-- Name: UOMGroupHeader_UOMGroupHeaderSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."UOMGroupHeader_UOMGroupHeaderSequenceNo_seq"', 1, false);


--
-- Name: UOMGroupLine_UOMGroupLineSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."UOMGroupLine_UOMGroupLineSequenceNo_seq"', 1, false);


--
-- Name: VendorPartyMaster_VendorPartyMasterSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."VendorPartyMaster_VendorPartyMasterSequenceNo_seq"', 6, true);


--
-- Name: WarehouseLocationHeader_WarehouseLocationHeaderSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."WarehouseLocationHeader_WarehouseLocationHeaderSequenceNo_seq"', 4, true);


--
-- Name: WarehouseLocationLine_WarehouseLocationLineSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."WarehouseLocationLine_WarehouseLocationLineSequenceNo_seq"', 3, true);


--
-- Name: WorkCalendar_WorkCalendarSequenceNo_seq; Type: SEQUENCE SET; Schema: public; Owner: mpsi_user
--

SELECT pg_catalog.setval('public."WorkCalendar_WorkCalendarSequenceNo_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict ofynpFugyB9nzNTQFl2H1vXd5lapF6Y8Xpl3KiHBIk2BophBdmiurYprnc8w42U

