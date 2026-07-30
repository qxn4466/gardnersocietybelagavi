--
-- PostgreSQL database dump
--

\restrict Bd18rmMkPs08IgSwNx799iL2dvROMsVS84MeLXTCb64hEwzrhcE2qc33p6kf2zG

-- Dumped from database version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_master; Type: TABLE; Schema: public; Owner: avinash
--

CREATE TABLE public.account_master (
    id integer NOT NULL,
    account_name character varying(100) NOT NULL
);


ALTER TABLE public.account_master OWNER TO avinash;

--
-- Name: account_master_id_seq; Type: SEQUENCE; Schema: public; Owner: avinash
--

CREATE SEQUENCE public.account_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.account_master_id_seq OWNER TO avinash;

--
-- Name: account_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: avinash
--

ALTER SEQUENCE public.account_master_id_seq OWNED BY public.account_master.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: avinash
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    customer_id character varying(10) NOT NULL,
    salutation character varying(20),
    first_name character varying(100) NOT NULL,
    middle_name character varying(100),
    last_name character varying(100) NOT NULL,
    full_name character varying(300) NOT NULL,
    mobile_no character varying(20),
    address text,
    aadhaar_no character varying(20),
    aadhaar_doc_path character varying(300),
    pan_no character varying(20),
    pan_doc_path character varying(300),
    opening_balance numeric(12,2) NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.customers OWNER TO avinash;

--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: avinash
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO avinash;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: avinash
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: office_master; Type: TABLE; Schema: public; Owner: avinash
--

CREATE TABLE public.office_master (
    id integer NOT NULL,
    gst_no character varying(15) NOT NULL,
    phone1 character varying(15),
    phone2 character varying(15),
    office_name text NOT NULL,
    address text
);


ALTER TABLE public.office_master OWNER TO avinash;

--
-- Name: office_master_id_seq; Type: SEQUENCE; Schema: public; Owner: avinash
--

CREATE SEQUENCE public.office_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.office_master_id_seq OWNER TO avinash;

--
-- Name: office_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: avinash
--

ALTER SEQUENCE public.office_master_id_seq OWNED BY public.office_master.id;


--
-- Name: transaction_type_master; Type: TABLE; Schema: public; Owner: avinash
--

CREATE TABLE public.transaction_type_master (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    cash_book_column character varying(100) NOT NULL,
    ledger_account character varying(100) NOT NULL,
    display_order integer,
    entry_type character varying(10) DEFAULT 'CREDIT'::character varying
);


ALTER TABLE public.transaction_type_master OWNER TO avinash;

--
-- Name: transaction_type_master_id_seq; Type: SEQUENCE; Schema: public; Owner: avinash
--

CREATE SEQUENCE public.transaction_type_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transaction_type_master_id_seq OWNER TO avinash;

--
-- Name: transaction_type_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: avinash
--

ALTER SEQUENCE public.transaction_type_master_id_seq OWNED BY public.transaction_type_master.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: avinash
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    date date NOT NULL,
    cash_memo_no character varying(30) NOT NULL,
    customer_name character varying(200) NOT NULL,
    particulars text,
    transaction_type_id integer NOT NULL,
    amount_rs numeric(12,2) NOT NULL,
    amount_ps numeric(4,2) NOT NULL,
    remarks text,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT now(),
    status character varying(20) DEFAULT 'POSTED'::character varying NOT NULL,
    customer_id character varying(50),
    mobile_no character varying(20),
    entry_nature character varying(10) DEFAULT 'CREDIT'::character varying
);


ALTER TABLE public.transactions OWNER TO avinash;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: avinash
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO avinash;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: avinash
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: avinash
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(100) NOT NULL,
    full_name character varying(100) NOT NULL,
    role character varying(30) NOT NULL
);


ALTER TABLE public.users OWNER TO avinash;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: avinash
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO avinash;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: avinash
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: account_master id; Type: DEFAULT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.account_master ALTER COLUMN id SET DEFAULT nextval('public.account_master_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: office_master id; Type: DEFAULT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.office_master ALTER COLUMN id SET DEFAULT nextval('public.office_master_id_seq'::regclass);


--
-- Name: transaction_type_master id; Type: DEFAULT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.transaction_type_master ALTER COLUMN id SET DEFAULT nextval('public.transaction_type_master_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: account_master; Type: TABLE DATA; Schema: public; Owner: avinash
--

COPY public.account_master (id, account_name) FROM stdin;
1	Advance
2	Bank Current
3	Cash Sales
4	Cold Storage Adv
5	Commission
6	Interest
7	Lakshmi Pigmi Deposit
8	Lakshmi Pigmi Deposit Interest
9	Lakshmi Pigmi Deposit Loan
10	Loan a/c
11	Pesticide Sales
12	Pigmi Comm.
13	Purchases
14	Shares
15	Sundary a/c
16	Vegetable Comm.
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: avinash
--

COPY public.customers (id, customer_id, salutation, first_name, middle_name, last_name, full_name, mobile_no, address, aadhaar_no, aadhaar_doc_path, pan_no, pan_doc_path, opening_balance, status, created_at) FROM stdin;
1	1000000001	Mr.	Ramesh	Kumar	Patil	Mr. Ramesh Kumar Patil	9845012345	Plot 42, Shahapur, Belagavi, Karnataka - 590003	4589 1234 9012	\N	ABCDE1234F	\N	5000.00	ACTIVE	2026-07-23 09:47:48.022481
2	1000000002	Smt.	Sunita	R	Kulkarni	Smt. Sunita R Kulkarni	9448198765	12/B Tilakwadi 3rd Line, Belagavi, Karnataka - 590006	8901 2345 6789	\N	XYZPK9876Q	\N	10000.00	ACTIVE	2026-07-23 09:47:48.022481
3	1000000003	Sri.	Anand	B	Joshi	Sri. Anand B Joshi	9880054321	Main Street, Vadgaon, Belagavi, Karnataka - 590005	2345 6789 0123	\N	JOSHI5432M	\N	2500.00	ACTIVE	2026-07-23 09:47:48.022481
\.


--
-- Data for Name: office_master; Type: TABLE DATA; Schema: public; Owner: avinash
--

COPY public.office_master (id, gst_no, phone1, phone2, office_name, address) FROM stdin;
1	29AAATB1234C1Z5	0831-2401234	0831-2401235	Belagavi Gardeners Co-op Production Supply and Sale Society Ltd.	Belagavi, Karnataka - 590001
\.


--
-- Data for Name: transaction_type_master; Type: TABLE DATA; Schema: public; Owner: avinash
--

COPY public.transaction_type_master (id, name, cash_book_column, ledger_account, display_order, entry_type) FROM stdin;
1	Shares	Shares	Shares	1	CREDIT
3	Commission	Commissions	Commission	3	CREDIT
5	Interest	Interest	Interest	5	CREDIT
6	Pigmi Commission	Pigmi Comm.	Pigmi Comm.	6	CREDIT
9	Lakshmi Pigmi Deposit	Lakshmi Pigmi Deposit	Lakshmi Pigmi Deposit	9	CREDIT
10	Vegetable Commission	Vegetable Comm.	Vegetable Comm.	10	CREDIT
12	Cash Sales	Cash Sales	Cash Sales	12	CREDIT
13	Pesticide Sales	Pesticide Sales	Pesticide Sales	13	CREDIT
2	Purchases	Purchases	Purchases	2	DEBIT
4	Loan Account	Loan a/c	Loan a/c	4	DEBIT
7	Bank Current	Bank Current	Bank Current	7	DEBIT
8	Advance	Advance	Advance	8	DEBIT
11	Sundry Account	Sundary a/c	Sundary a/c	11	BOTH
14	Cold Storage Advance	Cold Storage Adv	Cold Storage Adv	14	DEBIT
15	Lakshmi Pigmi Deposit Loan	Lakshmi Pigmi Deposit Loan	Lakshmi Pigmi Deposit Loan	15	DEBIT
16	Lakshmi Pigmi Deposit Interest	Lakshmi Pigmi Deposit Interest	Lakshmi Pigmi Deposit Interest	16	DEBIT
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: avinash
--

COPY public.transactions (id, date, cash_memo_no, customer_name, particulars, transaction_type_id, amount_rs, amount_ps, remarks, created_by, created_at, status, customer_id, mobile_no, entry_nature) FROM stdin;
18	2026-06-01	BGS-20260601-0001	Mr. Ramesh Kumar Patil	Share Capital Allotment: 50 Shares @ Rs.100	1	5000.00	0.00	New member share entry	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000001	9845012345	CREDIT
19	2026-06-01	BGS-20260601-0002	Smt. Sunita R Kulkarni	Pigmi Deposit Installment #1	9	1000.00	0.00	Daily pigmi collection	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000002	9448198765	CREDIT
20	2026-06-03	BGS-20260603-0003	Sri. Anand B Joshi	Organic Fertilizer Purchase: 25 bags — CGST: Rs.312.50, SGST: Rs.312.50	2	12500.00	0.00	Bulk fertilizer stock	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000003	9880054321	DEBIT
21	2026-06-03	BGS-20260603-0004	Mr. Ramesh Kumar Patil	Pesticides Spray Supply: 12 bottles	13	8400.00	0.00	Retail pesticides sale	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000001	9845012345	CREDIT
1	2026-07-22	BGS-20260722-0001	Mr. Ramesh Kumar	Share purchase	1	5000.00	0.00	\N	Accountant	2026-07-22 20:24:48.096871	POSTED	CUST-1001	\N	CREDIT
2	2026-07-22	BGS-20260722-0002	Mr. Suresh Patil	Pesticide purchase	13	2500.00	50.00	\N	Ramesh	2026-07-22 20:39:46.638748	POSTED	CUST-1002	\N	CREDIT
4	2026-07-22	BGS-20260722-0004	Mr. Ganesh Kulkarni	Vegetable commission	10	750.00	25.00	\N	Ramesh	2026-07-22 20:39:46.724594	POSTED	CUST-1001	\N	CREDIT
6	2026-07-22	BGS-20260722-0006	Mr. one june	Pigmi: Rs.95.00 — CGST: Rs.2.50, SGST: Rs.2.50	9	100.00	0.00			2026-07-22 21:25:55.078541	POSTED	CUST-1004	\N	CREDIT
3	2026-07-22	BGS-20260722-0003	Mrs. Latha Desai	Loan repayment	4	15000.00	0.00	\N	Ramesh	2026-07-22 20:39:46.679097	POSTED	CUST-1003	\N	DEBIT
22	2026-06-05	BGS-20260605-0005	Smt. Sunita R Kulkarni	Agricultural Crop Loan Disbursement	4	25000.00	0.00	Approved crop loan #402	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000002	9448198765	DEBIT
23	2026-06-05	BGS-20260605-0006	Smt. Sunita R Kulkarni	Loan Interest Received	5	1250.00	0.00	Monthly interest payment	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000002	9448198765	CREDIT
24	2026-06-08	BGS-20260608-0007	Sri. Anand B Joshi	Produce Sales Agency Commission	3	3600.00	0.00	Society commission 5%	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000003	9880054321	CREDIT
25	2026-06-08	BGS-20260608-0008	Mr. Ramesh Kumar Patil	Current Account Deposit to Apex Bank	7	15000.00	0.00	Bank current transfer	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000001	9845012345	DEBIT
26	2026-06-10	BGS-20260610-0009	Smt. Sunita R Kulkarni	Hybrid Vegetable Seeds Sale	12	18200.00	0.00	Counter cash sale	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000002	9448198765	CREDIT
27	2026-06-10	BGS-20260610-0010	Mr. Ramesh Kumar Patil	Produce Procurement Advance	8	4500.00	0.00	Pre-harvest advance	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000001	9845012345	DEBIT
28	2026-06-12	BGS-20260612-0011	Sri. Anand B Joshi	APMC Market Vegetable Sale Commission	10	4800.00	0.00	Daily mandee commission	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000003	9880054321	CREDIT
29	2026-06-12	BGS-20260612-0012	Smt. Sunita R Kulkarni	Cold Storage Unit Rental Advance	14	9000.00	0.00	Seasonal cold storage booking	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000002	9448198765	DEBIT
30	2026-06-15	BGS-20260615-0013	Mr. Ramesh Kumar Patil	Collector Pigmi Commission 2%	6	2100.00	0.00	Pigmi agent payout commission	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000001	9845012345	CREDIT
31	2026-06-15	BGS-20260615-0014	Sri. Anand B Joshi	Pigmi Deposit Loan Disbursement	15	10000.00	0.00	Short term pigmi loan	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000003	9880054321	DEBIT
32	2026-06-18	BGS-20260618-0015	Smt. Sunita R Kulkarni	Pigmi Annual Interest Payout	16	750.00	0.00	Pigmi deposit interest credited	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000002	9448198765	DEBIT
33	2026-06-18	BGS-20260618-0016	Mr. Ramesh Kumar Patil	Sundry Miscellaneous Receipt	11	3500.00	0.00	Equipment usage charges	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000001	9845012345	CREDIT
34	2026-06-22	BGS-20260622-0017	Sri. Anand B Joshi	Sundry Maintenance Payment	11	2200.00	0.00	Store facility repair cost	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000003	9880054321	DEBIT
35	2026-06-22	BGS-20260622-0018	Smt. Sunita R Kulkarni	Fungicide & Insecticide Sale	13	11500.00	0.00	Monsoon pesticide kit	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000002	9448198765	CREDIT
36	2026-06-25	BGS-20260625-0019	Mr. Ramesh Kumar Patil	Drip Irrigation Equipment Purchase	2	14800.00	0.00	Micro irrigation kits	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000001	9845012345	DEBIT
37	2026-06-25	BGS-20260625-0020	Sri. Anand B Joshi	Pigmi Savings Monthly Deposit	9	5000.00	0.00	Monthly pigmi installment	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000003	9880054321	CREDIT
38	2026-06-28	BGS-20260628-0021	Mr. Ramesh Kumar Patil	Fruit Saplings & Nursery Cash Sale	12	22000.00	0.00	Nursery plant sales	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000001	9845012345	CREDIT
39	2026-06-28	BGS-20260628-0022	Smt. Sunita R Kulkarni	Labor Wages Advance Payment	8	6000.00	0.00	Farm labor advance	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000002	9448198765	DEBIT
40	2026-06-30	BGS-20260630-0023	Sri. Anand B Joshi	Additional Share Capital Purchase	1	10000.00	0.00	Class A share subscription	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000003	9880054321	CREDIT
41	2026-06-30	BGS-20260630-0024	Mr. Ramesh Kumar Patil	Tractor Equipment Purchase Loan Disbursement	4	30000.00	0.00	Farm machinery loan	Accountant	2026-07-23 14:06:25.440649	POSTED	1000000001	9845012345	DEBIT
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: avinash
--

COPY public.users (id, username, password, full_name, role) FROM stdin;
1	accountant	pass123	Accounts Officer	ACCOUNTS
2	cashier	pass123	Society Cashier	CASHIER
\.


--
-- Name: account_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: avinash
--

SELECT pg_catalog.setval('public.account_master_id_seq', 16, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: avinash
--

SELECT pg_catalog.setval('public.customers_id_seq', 3, true);


--
-- Name: office_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: avinash
--

SELECT pg_catalog.setval('public.office_master_id_seq', 1, true);


--
-- Name: transaction_type_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: avinash
--

SELECT pg_catalog.setval('public.transaction_type_master_id_seq', 16, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: avinash
--

SELECT pg_catalog.setval('public.transactions_id_seq', 41, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: avinash
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- Name: account_master account_master_account_name_key; Type: CONSTRAINT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.account_master
    ADD CONSTRAINT account_master_account_name_key UNIQUE (account_name);


--
-- Name: account_master account_master_pkey; Type: CONSTRAINT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.account_master
    ADD CONSTRAINT account_master_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: office_master office_master_pkey; Type: CONSTRAINT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.office_master
    ADD CONSTRAINT office_master_pkey PRIMARY KEY (id);


--
-- Name: transaction_type_master transaction_type_master_name_key; Type: CONSTRAINT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.transaction_type_master
    ADD CONSTRAINT transaction_type_master_name_key UNIQUE (name);


--
-- Name: transaction_type_master transaction_type_master_pkey; Type: CONSTRAINT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.transaction_type_master
    ADD CONSTRAINT transaction_type_master_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_account_master_id; Type: INDEX; Schema: public; Owner: avinash
--

CREATE INDEX ix_account_master_id ON public.account_master USING btree (id);


--
-- Name: ix_customers_customer_id; Type: INDEX; Schema: public; Owner: avinash
--

CREATE UNIQUE INDEX ix_customers_customer_id ON public.customers USING btree (customer_id);


--
-- Name: ix_customers_id; Type: INDEX; Schema: public; Owner: avinash
--

CREATE INDEX ix_customers_id ON public.customers USING btree (id);


--
-- Name: ix_customers_mobile_no; Type: INDEX; Schema: public; Owner: avinash
--

CREATE INDEX ix_customers_mobile_no ON public.customers USING btree (mobile_no);


--
-- Name: ix_office_master_id; Type: INDEX; Schema: public; Owner: avinash
--

CREATE INDEX ix_office_master_id ON public.office_master USING btree (id);


--
-- Name: ix_transaction_type_master_id; Type: INDEX; Schema: public; Owner: avinash
--

CREATE INDEX ix_transaction_type_master_id ON public.transaction_type_master USING btree (id);


--
-- Name: ix_transactions_cash_memo_no; Type: INDEX; Schema: public; Owner: avinash
--

CREATE UNIQUE INDEX ix_transactions_cash_memo_no ON public.transactions USING btree (cash_memo_no);


--
-- Name: ix_transactions_customer_id; Type: INDEX; Schema: public; Owner: avinash
--

CREATE INDEX ix_transactions_customer_id ON public.transactions USING btree (customer_id);


--
-- Name: ix_transactions_id; Type: INDEX; Schema: public; Owner: avinash
--

CREATE INDEX ix_transactions_id ON public.transactions USING btree (id);


--
-- Name: ix_transactions_mobile_no; Type: INDEX; Schema: public; Owner: avinash
--

CREATE INDEX ix_transactions_mobile_no ON public.transactions USING btree (mobile_no);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: avinash
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: avinash
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: transactions transactions_transaction_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: avinash
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_transaction_type_id_fkey FOREIGN KEY (transaction_type_id) REFERENCES public.transaction_type_master(id);


--
-- Name: cash_payment_vouchers; Type: TABLE; Schema: public
--

CREATE TABLE public.cash_payment_vouchers (
    id integer NOT NULL,
    voucher_no character varying(50) NOT NULL,
    date date NOT NULL,
    paid_to character varying(250) NOT NULL,
    purpose_remarks text,
    details_of_expenditure text,
    amount_rs numeric(12,2) DEFAULT 0 NOT NULL,
    amount_words text,
    receipt_doc_path text,
    payment_mode character varying(20) DEFAULT 'CASH'::character varying NOT NULL,
    cheque_no character varying(50),
    cheque_date date,
    bank_name character varying(150),
    created_by character varying(100),
    status character varying(20) DEFAULT 'POSTED'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.cash_payment_vouchers_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.cash_payment_vouchers_id_seq OWNED BY public.cash_payment_vouchers.id;
ALTER TABLE ONLY public.cash_payment_vouchers ALTER COLUMN id SET DEFAULT nextval('public.cash_payment_vouchers_id_seq'::regclass);
ALTER TABLE ONLY public.cash_payment_vouchers ADD CONSTRAINT cash_payment_vouchers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cash_payment_vouchers ADD CONSTRAINT cash_payment_vouchers_voucher_no_key UNIQUE (voucher_no);

--
-- Name: cash_receipt_vouchers; Type: TABLE; Schema: public
--

CREATE TABLE public.cash_receipt_vouchers (
    id integer NOT NULL,
    bill_no character varying(50) NOT NULL,
    date date NOT NULL,
    gst_no character varying(30),
    phone_no character varying(30),
    received_from character varying(250) NOT NULL,
    particulars text,
    loan_amount numeric(12,2) DEFAULT 0 NOT NULL,
    interest_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    receipt_doc_path text,
    payment_mode character varying(20) DEFAULT 'CASH'::character varying NOT NULL,
    cheque_no character varying(50),
    cheque_date date,
    bank_name character varying(150),
    created_by character varying(100),
    status character varying(20) DEFAULT 'POSTED'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.cash_receipt_vouchers_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.cash_receipt_vouchers_id_seq OWNED BY public.cash_receipt_vouchers.id;
ALTER TABLE ONLY public.cash_receipt_vouchers ALTER COLUMN id SET DEFAULT nextval('public.cash_receipt_vouchers_id_seq'::regclass);
ALTER TABLE ONLY public.cash_receipt_vouchers ADD CONSTRAINT cash_receipt_vouchers_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cash_receipt_vouchers ADD CONSTRAINT cash_receipt_vouchers_bill_no_key UNIQUE (bill_no);

--
-- Name: rent_bills; Type: TABLE; Schema: public
--

CREATE TABLE public.rent_bills (
    id integer NOT NULL,
    invoice_no character varying(50) NOT NULL,
    date date NOT NULL,
    consignee_name character varying(250) NOT NULL,
    consignee_address text,
    particulars text,
    hsn_sac character varying(50) DEFAULT '997212'::character varying,
    gst_rate numeric(5,2) DEFAULT 18.0 NOT NULL,
    qty numeric(10,2) DEFAULT 1.0 NOT NULL,
    rate numeric(12,2) DEFAULT 0 NOT NULL,
    per character varying(20) DEFAULT 'Month'::character varying,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    igst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    sgst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    cgst_amount numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    tax_amount_words text,
    payment_mode character varying(20) DEFAULT 'CASH'::character varying NOT NULL,
    cheque_no character varying(50),
    cheque_date date,
    bank_name character varying(150),
    created_by character varying(100),
    status character varying(20) DEFAULT 'POSTED'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.rent_bills_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.rent_bills_id_seq OWNED BY public.rent_bills.id;
ALTER TABLE ONLY public.rent_bills ALTER COLUMN id SET DEFAULT nextval('public.rent_bills_id_seq'::regclass);
ALTER TABLE ONLY public.rent_bills ADD CONSTRAINT rent_bills_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.rent_bills ADD CONSTRAINT rent_bills_invoice_no_key UNIQUE (invoice_no);

--
-- Name: cash_scroll_book; Type: TABLE; Schema: public
--

CREATE TABLE public.cash_scroll_book (
    id integer NOT NULL,
    date date NOT NULL,
    page_no character varying(50),
    voucher_no character varying(50),
    from_received_paid character varying(250) NOT NULL,
    received_amount numeric(12,2) DEFAULT 0 NOT NULL,
    paid_amount numeric(12,2) DEFAULT 0 NOT NULL,
    cheque_amount numeric(12,2) DEFAULT 0 NOT NULL,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.cash_scroll_book_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.cash_scroll_book_id_seq OWNED BY public.cash_scroll_book.id;
ALTER TABLE ONLY public.cash_scroll_book ALTER COLUMN id SET DEFAULT nextval('public.cash_scroll_book_id_seq'::regclass);
ALTER TABLE ONLY public.cash_scroll_book ADD CONSTRAINT cash_scroll_book_pkey PRIMARY KEY (id);

--
-- Name: cheque_issue_book; Type: TABLE; Schema: public
--

CREATE TABLE public.cheque_issue_book (
    id integer NOT NULL,
    issue_date date NOT NULL,
    name_to_whom_issued character varying(250) NOT NULL,
    cheque_no character varying(50) NOT NULL,
    amount_rs numeric(12,2) DEFAULT 0 NOT NULL,
    remarks text,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.cheque_issue_book_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.cheque_issue_book_id_seq OWNED BY public.cheque_issue_book.id;
ALTER TABLE ONLY public.cheque_issue_book ALTER COLUMN id SET DEFAULT nextval('public.cheque_issue_book_id_seq'::regclass);
ALTER TABLE ONLY public.cheque_issue_book ADD CONSTRAINT cheque_issue_book_pkey PRIMARY KEY (id);


-- ─── SHOP KEEPER TABLES ──────────────────────────────────────────────────────

CREATE TABLE public.shop_selling_rate_book (
    id integer NOT NULL,
    date date NOT NULL,
    name character varying(250) NOT NULL,
    particulars character varying(250) NOT NULL,
    qty numeric(10,2) DEFAULT 1.0 NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    sgst numeric(12,2) DEFAULT 0 NOT NULL,
    cgst numeric(12,2) DEFAULT 0 NOT NULL,
    hmall numeric(12,2) DEFAULT 0 NOT NULL,
    motor_rent numeric(12,2) DEFAULT 0 NOT NULL,
    total_amount numeric(12,2) DEFAULT 0 NOT NULL,
    net_rate numeric(12,2) DEFAULT 0 NOT NULL,
    selling_rate numeric(12,2) DEFAULT 0 NOT NULL,
    stock_book_no character varying(50),
    sign_status character varying(100) DEFAULT 'Signed'::character varying,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.shop_selling_rate_book_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.shop_selling_rate_book_id_seq OWNED BY public.shop_selling_rate_book.id;
ALTER TABLE ONLY public.shop_selling_rate_book ALTER COLUMN id SET DEFAULT nextval('public.shop_selling_rate_book_id_seq'::regclass);
ALTER TABLE ONLY public.shop_selling_rate_book ADD CONSTRAINT shop_selling_rate_book_pkey PRIMARY KEY (id);


CREATE TABLE public.shop_tax_invoices (
    id integer NOT NULL,
    invoice_no character varying(50) NOT NULL,
    date date NOT NULL,
    customer_name character varying(250) NOT NULL,
    customer_phone character varying(30),
    product_name character varying(250) NOT NULL,
    hsn_code character varying(50) DEFAULT '3808'::character varying,
    qty numeric(10,2) DEFAULT 1.0 NOT NULL,
    rate numeric(12,2) DEFAULT 0 NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.shop_tax_invoices_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.shop_tax_invoices_id_seq OWNED BY public.shop_tax_invoices.id;
ALTER TABLE ONLY public.shop_tax_invoices ALTER COLUMN id SET DEFAULT nextval('public.shop_tax_invoices_id_seq'::regclass);
ALTER TABLE ONLY public.shop_tax_invoices ADD CONSTRAINT shop_tax_invoices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.shop_tax_invoices ADD CONSTRAINT shop_tax_invoices_invoice_no_key UNIQUE (invoice_no);


CREATE TABLE public.shop_retail_bills (
    id integer NOT NULL,
    bill_no character varying(50) NOT NULL,
    date date NOT NULL,
    tin_no character varying(50) DEFAULT '29540268502'::character varying,
    customer_name character varying(250) NOT NULL,
    particulars text NOT NULL,
    rate numeric(12,2) DEFAULT 0 NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    seller_signature character varying(100) DEFAULT 'Seller Signed'::character varying,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.shop_retail_bills_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.shop_retail_bills_id_seq OWNED BY public.shop_retail_bills.id;
ALTER TABLE ONLY public.shop_retail_bills ALTER COLUMN id SET DEFAULT nextval('public.shop_retail_bills_id_seq'::regclass);
ALTER TABLE ONLY public.shop_retail_bills ADD CONSTRAINT shop_retail_bills_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.shop_retail_bills ADD CONSTRAINT shop_retail_bills_bill_no_key UNIQUE (bill_no);


CREATE TABLE public.pesticide_sale_register (
    id integer NOT NULL,
    date date NOT NULL,
    customer_name character varying(250) NOT NULL,
    product_name character varying(250) DEFAULT 'Boric Acid'::character varying NOT NULL,
    qty numeric(10,2) DEFAULT 1.0 NOT NULL,
    rate numeric(12,2) DEFAULT 0 NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    batch_no character varying(50),
    remarks text,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT now()
);

CREATE SEQUENCE public.pesticide_sale_register_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.pesticide_sale_register_id_seq OWNED BY public.pesticide_sale_register.id;
ALTER TABLE ONLY public.pesticide_sale_register ALTER COLUMN id SET DEFAULT nextval('public.pesticide_sale_register_id_seq'::regclass);
ALTER TABLE ONLY public.pesticide_sale_register ADD CONSTRAINT pesticide_sale_register_pkey PRIMARY KEY (id);

ALTER SEQUENCE public.cheque_issue_book_id_seq OWNED BY public.cheque_issue_book.id;
ALTER TABLE ONLY public.cheque_issue_book ALTER COLUMN id SET DEFAULT nextval('public.cheque_issue_book_id_seq'::regclass);
ALTER TABLE ONLY public.cheque_issue_book ADD CONSTRAINT cheque_issue_book_pkey PRIMARY KEY (id);

--
-- PostgreSQL database dump complete
--

\unrestrict Bd18rmMkPs08IgSwNx799iL2dvROMsVS84MeLXTCb64hEwzrhcE2qc33p6kf2zG


