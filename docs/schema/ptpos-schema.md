# PTPos.fdb — POS Terminal Database Schema

## Overview
142 tables, 0 views. This is the live POS terminal database — the source of the Electronic Journal (EJ).

## Key EJ Tables

### EJHEADER (114,167 rows) — Transaction Header
Every POS transaction gets a header. This is where cancels, no-sales, and security events live.

| Column | Type | Description |
|---|---|---|
| EJHEADERID | INTEGER PK | Unique EJ header ID |
| REGISTERID | INTEGER | Register that created it |
| LOCALEJHEADERID | INTEGER | Local ID on the register |
| TRANSACTIONNUMBER | INTEGER | POS transaction number |
| TRANSACTIONDATE | TIMESTAMP | When transaction occurred |
| ISFINALISED | VARCHAR(5) | T/F — is transaction complete |
| **ISCANCELLED** | VARCHAR(5) | **T/F — cancelled transaction (security)** |
| **ISNOSALE** | VARCHAR(5) | **T/F — no-sale / drawer open (security)** |
| SALETOTAL | DOUBLE | Total sale amount |
| GSTAMOUNT | DOUBLE | GST component |
| ITEMCOUNT | INTEGER | Number of items |
| EJHEADERTYPELOOKUPID | INTEGER FK | Type: SALE, NO SALE, ROLL PERIOD, FUEL, EOD, SHIFT, ADJUSTMENT |
| ROUNDING | DOUBLE | Rounding amount |
| TRAININGMODE | VARCHAR(5) | T/F — training mode |
| SCANTIME | DOUBLE | Total scan time (seconds) |
| TABLENUMBER | INTEGER | Table number (hospitality) |
| ROLLHEADERID | INTEGER | Associated roll period |
| REFERENCE | VARCHAR(20) | Reference text |
| REGISTERNUMBER | INTEGER | Register number |
| CLERKNUMBER | INTEGER | Clerk who processed |
| CLERKNAME | VARCHAR(30) | Clerk name |
| CLERKSHIFTID | INTEGER | Shift ID |
| SENTTOHEADOFFICE | VARCHAR(5) | T/F — synced to HO |
| POINTSPERDOLLARSPEND | DOUBLE | Loyalty points rate |
| **ISONHOLD** | VARCHAR(5) | **T/F — held/parked sale** |
| LASTMODIFIED | TIMESTAMP | Last modified |
| RECEIPTREFERENCE | VARCHAR(15) | Receipt ref |
| TRANSACTIONIDENTIFIER | VARCHAR(40) | Unique transaction ID |

### EJHEADERTYPELOOKUP — Transaction Types
| ID | Description |
|---|---|
| 1 | **SALE** |
| 2 | **NO SALE** (drawer open, no purchase) |
| 3 | ROLL PERIOD |
| 4 | FUEL DELIVERY |
| 5 | FUEL DIP |
| 6 | FUEL METER READING |
| 7 | FUEL DRIVEAWAY |
| 8 | FUEL TEST |
| 9 | **END OF DAY** |
| 10 | **END SHIFT** |
| 11 | **START/CONTINUE SHIFT** |
| 12 | **ADJUSTMENT** |

### EJDETAIL (1,334,010 rows) — EJ Entry Detail
Links EJHEADER to the objects in a transaction (PLU items, tenders, discounts, etc.)

| Column | Type | Description |
|---|---|---|
| EJDETAILID | INTEGER PK | Unique detail ID |
| EJHEADERID | INTEGER FK→EJHEADER | Parent header |
| ENTRYSEQUENCENUMBER | INTEGER | Sequence within transaction |
| EJENTRYTYPELOOKUPID | INTEGER FK | Entry type (see below) |
| ISERRORCORRECTED | VARCHAR(5) | T/F — was this error-corrected (voided) |
| LOCALEJDETAILID | INTEGER | Local ID |
| LASTMODIFIED | TIMESTAMP | |

### EJENTRYTYPELOOKUP — Entry Types
| ID | Description |
|---|---|
| 1 | RA OBJECT (received advice / cash handling) |
| 2 | PO OBJECT (purchase order) |
| 3 | TENDER OBJECT (payment) |
| 4 | ACCOUNT OBJECT (account charge) |
| 5 | PLU OBJECT (product line item) |
| 6 | DISCOUNT OBJECT |
| 7-9 | FUEL objects |
| 10 | HOLD SALE OBJECT |
| 11 | FLOAT OBJECT (cash drawer float) |
| 12 | TAG OBJECT |
| 13 | LOYALTY CARD OBJECT |
| 14 | VOUCHER OBJECT |

### EJPLUOBJECT (1,118,418 rows) — Product Line Items
102 columns! Key fields:

| Column | Description |
|---|---|
| EJPLUOBJECTID | PK |
| EJDETAILID | FK→EJDETAIL |
| PLU | Product lookup number |
| PRODUCTCODE | Product code |
| GSTRATE | GST rate |
| DESCRIPTION / CAPTION | Product description |
| SELLPRICE1/2 | Sell prices |
| SPECIALPRICE1/2 | Special prices |
| QTY | Quantity sold |
| ISSECONDPRICESALE / ISCUSTOMPRICESALE / ISRETURNED / **ISVOIDED** | Transaction flags |
| NETTAMOUNTINC/EX | Nett amounts |
| GROSSAMOUNTINC/EX | Gross amounts |
| GROSSGSTAMOUNT / NETTGSTAMOUNT | GST amounts |
| LOYALTYPOINTS | Points earned |
| MARKDOWNAMOUNT | Markdown amount |
| COSTPRICE | Unit cost |
| DEPTNUMBER / DEPTDESCRIPTION | Department |
| GROUPNUMBER / FAMILYCODE | Product hierarchy |
| SCANTIME | When scanned |
| COMMENT | Line item comment |
| ISSENSITIVEPRODUCT | Restricted item flag |
| ISAGERESTRICTEDITEM | Age-restricted |

### EJTENDEROBJECT (141,353 rows) — Payment/Tender Records
36 columns. Key fields:

| Column | Description |
|---|---|
| EJTENDEROBJECTID | PK |
| EJDETAILID | FK→EJDETAIL |
| DESCRIPTION | Tender description (Cash, EFTPOS, etc.) |
| AMOUNT | Amount tendered |
| TOTALAMOUNT | Total including rounding |
| TENDERNUMBER | Tender type number |
| TENDERTYPELOOKUPID | FK→TENDERTYPELOOKUP |
| EFTPOSCARDCODE | EFTPOS card type (EFT, VISA, MCARD, etc.) |
| EFTPOSCARDNUMBER | Masked card number |
| EFTPOSACCOUNTTYPELOOKUPID | Account type (SAVINGS, CHEQUE, CREDIT) |
| CURRENCYCODE / CURRENCYRATE / CURRENCYSALESAMOUNT | Multi-currency support |
| ISAPPROVED | T/F — was this approved |
| LOYALTYCARDNUMBER | Loyalty card used |
| CHEQUEBSB / CHEQUEACCOUNT / CHEQUENUMBER | Cheque details |
| ACCOUNTNUMBER | Account charge number |
| ISACCOUNTCHARGE | T/F |

### TENDERTYPELOOKUP — Payment Methods
| ID | Description |
|---|---|
| 1 | **CASH** |
| 2 | CHEQUE |
| 3 | **EFTPOS** |
| 4 | OTHER CHARGE |
| 5 | VOUCHER (PRESOLD/LOYALTY) |
| 6 | DEBTOR CHARGE |
| 7 | LOTTO |
| 8 | GIVEX |
| 9 | MOBILE |
| 10 | OPT |
| 11 | EPAY GIFTCARD |
| 12 | EPAY WALLET |
| 13 | VII GIFT CARD |
| 14 | AUR LOYALTY |

### EFTPOSCARDLOOKUP — Card Types
Active cards: EFTPOS, AMEX, DINERS CLUB, VISA, MCARD, UNIONPAY, DEBIT, WI PYMT, WIPYMT

### EFTPOSACCOUNTTYPELOOKUP — Account Types
NONE, SAVINGS, CHEQUE, CREDIT

### CURRENCYLOOKUP — Supported Currencies
AUD, NZD, USD, FJD (with rate, bank rate, margin, rounding)

### EJDISCOUNTOBJECT (56,505 rows) — Discount Line Items
| Column | Description |
|---|---|
| EJDISCOUNTOBJECTID | PK |
| EJDETAILID | FK |
| DESCRIPTION | Discount name |
| DISCOUNTRATE | Percentage |
| DISCOUNTTYPELOOKUPID | Type (dollar, percentage, etc.) |
| DISCOUNTSCOPELOOKUPID | Scope (deal, item, etc.) |
| AMOUNT | Discount amount |
| EJPLUOBJECTID | FK to PLU object discounted |
| DISCOUNTNUMBER | Discount reference |

### Other EJ Objects
| Table | Rows | Description |
|---|---|---|
| EJFLOATOBJECT | 0 | Cash drawer float (in/out) |
| EJRAOBJECT | 0 | Received advice / cash handling |
| EJHOLDSALEOBJECT | 1,538 | Held/parked sales |
| EJLOYALTYCARDOBJECT | 0 | Loyalty card transactions |
| EJVOUCHEROBJECT | 0 | Voucher transactions |
| EJDEALOBJECT | 56,505 | Deal/offer application |
| EJACCOUNTOBJECT | 0 | Account charge transactions |

### CLERKSHIFT (shifts)
| Column | Description |
|---|---|
| CLERKSHIFTID | PK |
| ISFINALISED / ISDECLARED | Shift status |
| STARTDATE / ENDDATE | Shift period |
| AUTOCREATED / AUTOFINALISED | Auto-managed flags |
| CLERKNUMBER | Clerk on duty |
| IDENTIFIER | Shift identifier |

### CLERKSHIFTTENDER — Per-shift tender totals
| Column | Description |
|---|---|
| CLERKSHIFTID | FK |
| AMOUNT | Expected amount |
| DECLAREDAMOUNT | Actually declared amount |
| TENDERNUMBER | Tender type |
| CLOSINGFLOATAMOUNT | Float at close |

### CLERKEFTPOSSALES — Per-clerk EFTPOS breakdown
EFTPOSCARDCODE, SALESQTY, SALESAMOUNT, POAMOUNT, RAAMOUNT, INDRAWERAMOUNT

### REGISTER — POS Register Configuration
47 columns including: REGISTERNUMBER, DESCRIPTION, HOST, PORT, PRINT settings, SECURITY settings, scale config, lock/clear timeouts, display settings
