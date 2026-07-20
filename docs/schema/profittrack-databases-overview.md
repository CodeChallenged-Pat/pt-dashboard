# ProfitTrack Databases — Schema Overview

## Location
`C:\Program Files (x86)\SSA\ProfitTrackServer\Databases\`

## Firebird Version
2.5.8 (Win32 + x64 installers bundled with PT)
Connection: `SYSDBA` / `masterkey`
Client lib: `C:\Program Files\Firebird\Firebird_2_5\bin\fbclient.dll`

## Four Databases

| Database | Size | Tables | Views | Purpose |
|---|---|---|---|---|
| **PTReport.fdb** | 30MB | 32 | 42 | **Reporting data warehouse** (star schema) — the primary source for our dashboard |
| **ProfitTrack.fdb** | 1.9GB | 609 | 5 | Main back-office database — products, customers, accounts, inventory, suppliers, EJ source |
| **PTPos.fdb** | 1.8GB | 142 | 0 | POS terminal database — clerk sales, EFTPOS, tenders, shifts, EJ objects |
| **PTServer.fdb** | 10MB | 22 | 0 | Server management — clients, operators, sessions, upgrades |

---

## PTReport.fdb — The Reporting Data Warehouse

This is a **classic star schema** data warehouse. ProfitTrack's ETL process extracts data from ProfitTrack.fdb and PTPos.fdb, transforms it, and loads it into PTReport.fdb.

### Star Schema Diagram

```
                    DIM_DATE ───────┐
                    DIM_TIME ───────┤
                    DIM_STORE ──────┤
                    DIM_PRODUCT ────┤── FACT_SALES (1,759 rows)
                    DIM_REGISTER ───┤    ├─ 45 columns, line-item grain
                    DIM_CLERKSHIFT ─┤    ├─ GROSS/NETT sales inc/ex GST
                    DIM_PROMOTION ──┤    ├─ Cost, profit, savings, loyalty
                    DIM_CUSTOMER ───┤    ├─ Transaction number + sequence
                    DIM_SALESOURCE ─┘    └─ EJ header/PLU object IDs
                                         │
                    DIM_DATE ───────┐    │
                    DIM_TIME ───────┤    │
                    DIM_PRODUCT ────┤── FACT_PURCHASE (0 rows)
                    DIM_STORE ──────┤
                                         │
                    DIM_DATE ───────┐    │
                    DIM_TIME ───────┤    │
                    DIM_PRODUCT ────┤── FACT_INVENTORYADJUSTMENT (0 rows)
                    DIM_STORE ──────┤
                    DIM_ADJKIND ────┘
```

### Fact Tables

#### FACT_SALES (1,759 rows) — THE KEY TABLE
**Grain:** One row per line item per transaction
**Composite PK:** DATEID, TIMEID, PRODUCTID, STOREID, REGISTERID, CLERKSHIFTID, PROMOTIONID, CUSTOMERID, SALESOURCEID, TRANSACTIONNUMBER, SALESEQUENCE

| Column | Type | Description |
|---|---|---|
| DATEID | INTEGER FK→DIM_DATE | Date dimension |
| TIMEID | INTEGER FK→DIM_TIME | Time dimension |
| PRODUCTID | INTEGER FK→DIM_PRODUCT | Product sold |
| STOREID | INTEGER FK→DIM_STORE | Store where sold |
| REGISTERID | INTEGER FK→DIM_REGISTER | POS register |
| CLERKSHIFTID | INTEGER FK→DIM_CLERKSHIFT | Clerk shift (who was working) |
| PROMOTIONID | INTEGER FK→DIM_PROMOTION | Active promotion |
| CUSTOMERID | INTEGER FK→DIM_CUSTOMER | Customer account |
| TRANSACTIONNUMBER | INTEGER | POS transaction number |
| SALESOURCEID | INTEGER FK→DIM_SALESOURCE | Sale source (POS, Back Office, etc.) |
| SALESEQUENCE | INTEGER | Line sequence within transaction |
| EJHEADERID | INTEGER | Electronic Journal header ID |
| EJPLUOBJECTID | INTEGER | EJ PLU object ID |
| ISSECONDPRICESALE | CHAR(4) | Y/N — was a second price applied |
| ISCUSTOMPRICESALE | CHAR(4) | Y/N — custom price |
| ISRETURNED | CHAR(4) | Y/N — returned item |
| QUANTITY | DOUBLE | Units sold |
| GROSSSALESINC | DOUBLE | Gross sales including GST |
| GROSSGSTAMOUNT | DOUBLE | GST component |
| GROSSSALESEX | DOUBLE | Gross sales excluding GST |
| NETTSALESINC | DOUBLE | Nett sales including GST (after discounts) |
| NETTGSTAMOUNT | DOUBLE | GST on nett sales |
| NETTSALESEX | DOUBLE | Nett sales excluding GST |
| UNITCOSTINC/EX | DOUBLE | Unit cost |
| UNITPRICEINC/EX | DOUBLE | Unit price |
| UNITSAVINGSINC/EX | DOUBLE | Savings per unit |
| TOTALSAVINGSINC/EX | DOUBLE | Total savings |
| TOTALCOSTINC/EX | DOUBLE | Total cost |
| TOTALPROFITEX | DOUBLE | Total profit (excl GST) |
| TOTALMARKDOWNS | DOUBLE | Markdown total |
| TOTALDISCOUNTS | DOUBLE | Discount total |
| TOTALLOYALTYPOINTS | DOUBLE | Loyalty points earned |
| TOTALREBATESINC/EX | DOUBLE | Rebate amounts |
| COSTSOURCE | VARCHAR(256) | Cost calculation source |
| STOCKQUANTITY | DOUBLE | Stock after sale |
| TRACKSEQ | INTEGER | Tracking sequence |
| TRANSACTIONTIME | TIMESTAMP | When transaction occurred |
| TOTALMARKDOWNUNITS | DOUBLE | Markdown units |

#### FACT_PURCHASE (0 rows)
**Grain:** One row per purchase line per supplier per store
Columns: DATEID, TIMEID, PRODUCTID, STOREID, SUPPLIERCODE, PURCHASESEQ, QUANTITY, INVOICENUMBER, INVOICEDATE, ORDERNUMBER, costs, prices

#### FACT_INVENTORYADJUSTMENT (0 rows)
**Grain:** One row per adjustment
Columns: DATEID, TIMEID, ADJUSTMENTSEQ, PRODUCTID, STOREID, ADJUSTMENTKINDID, QUANTITY, costs, prices, CTNQTY

#### FACT_COSTPROMOTION (0 rows)
Cost promotion tracking per store/product

#### FACT_STOCKTAKEDETAIL / FACT_STOCKTAKEHEADER (0 rows)
Stocktake session data

### Dimension Tables

#### DIM_STORE (2 rows)
| Column | Description |
|---|---|
| ID | PK |
| SOURCESTOREID | Original store ID from PT |
| STORECODE | Store code |
| STORENAME | Store name (e.g., "Salvation Army") |
| STATE, POSTCODE, SUBURB, REGION | Location |
| ISACTIVE | Y/N |

#### DIM_PRODUCT (580 rows) — Slowly Changing Dimension (SCD Type 2)
| Column | Description |
|---|---|
| ID | PK (surrogate) |
| EFFECTIVEDATE | When this version became active |
| EXPIREDDATE | When this version expired (NULL = current) |
| ISCURRENT | Y/N — current version flag |
| GTIN | Global Trade Item Number (barcode) |
| PAN | Product Article Number |
| PRODUCTCODE | Internal product code |
| PRODUCTNAME | Product name |
| SECTIONCODE/NAME | Section hierarchy |
| DEPARTMENTCODE/NAME | Department (e.g., "LADIES CLOTHES") |
| GROUPCODE/NAME | Group (e.g., "LADIES CLOTHES - TOPS") |
| COMMODITYCODE/NAME | Commodity |
| REGISTERDESCRIPTION | What shows on POS |
| CURRENTSUPPLIERCODE/NAME | Supplier |
| MANUFACTURERCODE/NAME | Manufacturer |
| GSTRATE | GST rate |
| CARTONCOSTINC/EX, UNITCOSTINC/EX, AVERAGEUNITCOSTINC/EX | Cost fields |
| RRPINC/EX | Recommended retail price |

#### DIM_CLERK (4 rows) / DIM_CLERKSHIFT (7 rows)
Staff and shift tracking. Clerk: CLERKID, CLERKCODE, CLERKNAME, NICKNAME, SECURITYLEVEL, ISTRAININGCLERK, ISACTIVE. ClerkShift: shift start/end, finalisation status, clerk info.

#### DIM_CUSTOMER (2 rows)
Account: ACCOUNTID, ACCOUNTNUMBER, SUBACCOUNTNUMBER, CUSTOMERNAME, CARDNUMBER, ACCOUNTTYPE, ACCOUNTGROUP, PRICELEVEL, ISACTIVE, location.

#### DIM_DATE (36,527 rows) — Pre-populated date dimension
Full date attributes: DATADATE, DAYOFWEEK/MONTH/YEAR, DAYNAME, WEEKOFYEAR, ISOWEEK, MONTH, CALENDARQUARTER, CALENDARYEAR, **FISCAL** day/week/month/quarter/halfyear/year, WEEKDAYINDICATOR (Weekday/Weekend), HOLIDAYINDICATOR.

#### DIM_TIME (1,441 rows)
TIMEHOUR, TIMEMINUTE, TIMESECOND, TIME24HOUR, TIME12HOUR.

#### DIM_REGISTER (2 rows)
STOREID, REGISTERNUMBER, REGISTERNAME, REGISTERTYPE ("Normal PTPOS register", "Back Office").

#### DIM_SALESOURCE (8 rows)
Sale origin: UNKNOWN, NONE, BOS (Back Office), POS, etc.

#### DIM_PROMOTION (9 rows)
SUPPLIERCODE/NAME, PROMOTIONCODE/NAME, PRIORITY.

### ACL/Security Tables
- ACL_USER_DEPT — user-to-department access (0 rows)
- ACL_USER_STORE — user-to-store access (0 rows)

### ETL Tables
- DIM_ETL — ETL run tracking (7 rows, start/finish timestamps)
- DIM_AUDIT — audit records (37 rows)
- DIM_BATCH — batch tracking
- ETL_EXTRACT_DETAILS — per-process extraction timestamps
- ETL_PRODUCT — staging table for product ETL

### Pre-Built Views (42 views)

| Category | Views | Purpose |
|---|---|---|
| **Time comparison sales** | VW_MTDSALES, VW_LMSALES, VW_LWSALES, VW_WTDSALES, VW_ISOYTDSALES | Month-to-date, last month, last week, week-to-date, ISO year-to-date comparisons with same columns as FACT_SALES + date/store/product dimensions |
| **Time lookups** | VW_MTDLOOKUP, VW_LMLOOKUP, VW_LWLOOKUP, VW_WTDLOOKUP, VW_ISOYTDLOOKUP | Date flags (ISTODAY, ISMTD, ISLM, etc.) for filtering |
| **Department fiscal** | VW_DEPT_FISCALYEAR | Sales by department by fiscal year/quarter/month |
| **PLU sales** | VW_PLUSALES, VW_PLUSALES_MONTH | Per-product sales with all dimensions, daily and monthly |
| **POS hourly** | VW_POSHOURLY, VW_POSHOURLYBYDEPT | Hourly sales with customer count, item count, sales value |
| **Promotions** | VW_PLUPROMOTIONSALES, VW_PROMOTIONHISTORY | Promotion performance per PLU |
| **Purchases** | VW_PURCHASEHISTORY, VW_PURCHASEHISTORYBYDEPT | Purchase history per PLU/department |
| **Stock** | VW_QOHHISTORY, VW_STOCKLOCATION, VW_PRODUCTSTOCKLOCATION | Quantity on hand history, stock locations |
| **Stocktake** | VW_STOCKTAKEDETAIL, VW_STOCKTAKEHEADER, VW_STOCKTAKESESSION | Stocktake sessions and details |
| **Markdowns** | VW_MARKDOWNS | Markdown counts and values per PLU |
| **Adjustments** | VW_GOODSADJUSTMENTS, VW_REASONCODES | Inventory adjustments with reasons |
| **Security** | VW_SECURITY, VW_DIM_STORE, VW_DIM_PRODUCT, etc. | Dimension view wrappers for security filtering |
| **Transactions** | VW_WTDTRANSACTIONS | Week-to-date transaction counts |

---

## Other Databases (Summary)

### ProfitTrack.fdb (609 tables) — Main Back-Office
The operational database. Key table groups:
- ACC* (40+ tables) — Accounts: ACCDEBTORS, ACCPAYMENTSDETAIL, ACCSALESDETAIL, ACCPOINTSTRANSACTION, ACCREBATE*
- EJ* tables — Electronic Journal source data
- Product/inventory/supplier tables
- ADDRESS — customer contact info
- Configuration tables

### PTPos.fdb (142 tables) — POS Terminal
- EJ* tables — EJ objects (EJACCOUNTOBJECT, EJDEALOBJECT, etc.)
- CLERK* tables — Clerk sales, shifts, tenders, EFTPOS
- DEAL* tables — Deal/offer configuration
- DEPTSALES, DEPTLOOKUP — Department sales
- EFTPOS* tables — EFTPOS card/tender data
- CURRENCYLOOKUP — Multi-currency support exists

### PTServer.fdb (22 tables) — Server Management
- CLIENT — client machines registered to the PT server
- OPERATOR — system operators
- CLIENTSESSION* — session tracking
- UPGRADEVERSION, VERSIONLINK — version management
