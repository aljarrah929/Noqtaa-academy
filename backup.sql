--
-- PostgreSQL database dump
--

\restrict Xj0iST90PbIC8kCq4S22LkMiHeaDnRbvpHMjDzGny8aQvyDK3WucjSEE5ysypOo

-- Dumped from database version 16.11 (df20cf9)
-- Dumped by pg_dump version 16.10

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
-- Name: _system; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA _system;


--
-- Name: approval_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_action AS ENUM (
    'APPROVE',
    'REJECT'
);


--
-- Name: content_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.content_type AS ENUM (
    'video',
    'text',
    'link',
    'file'
);


--
-- Name: course_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.course_status AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'PUBLISHED',
    'REJECTED'
);


--
-- Name: join_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.join_request_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'STUDENT',
    'TEACHER',
    'ADMIN',
    'SUPER_ADMIN',
    'ACCOUNTANT'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: replit_database_migrations_v1; Type: TABLE; Schema: _system; Owner: -
--

CREATE TABLE _system.replit_database_migrations_v1 (
    id bigint NOT NULL,
    build_id text NOT NULL,
    deployment_id text NOT NULL,
    statement_count bigint NOT NULL,
    applied_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE; Schema: _system; Owner: -
--

CREATE SEQUENCE _system.replit_database_migrations_v1_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE OWNED BY; Schema: _system; Owner: -
--

ALTER SEQUENCE _system.replit_database_migrations_v1_id_seq OWNED BY _system.replit_database_migrations_v1.id;


--
-- Name: admin_dashboard_stats_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_dashboard_stats_config (
    id integer NOT NULL,
    mode character varying(20) DEFAULT 'AUTO'::character varying NOT NULL,
    pending_approvals_value character varying(50) DEFAULT '0'::character varying NOT NULL,
    total_teachers_value character varying(50) DEFAULT '0'::character varying NOT NULL,
    published_courses_value character varying(50) DEFAULT '0'::character varying NOT NULL,
    total_students_value character varying(50) DEFAULT '0'::character varying NOT NULL,
    updated_at timestamp without time zone DEFAULT now(),
    updated_by_user_id character varying
);


--
-- Name: admin_dashboard_stats_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.admin_dashboard_stats_config ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.admin_dashboard_stats_config_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: colleges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.colleges (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    theme_name character varying(100) NOT NULL,
    primary_color character varying(7) NOT NULL,
    secondary_color character varying(7) NOT NULL,
    logo_url character varying(500),
    created_at timestamp without time zone DEFAULT now(),
    university_id integer
);


--
-- Name: colleges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.colleges ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.colleges_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: course_approval_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_approval_logs (
    id integer NOT NULL,
    course_id integer NOT NULL,
    action public.approval_action NOT NULL,
    actor_user_id character varying NOT NULL,
    reason text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: course_approval_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.course_approval_logs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.course_approval_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id integer NOT NULL,
    college_id integer NOT NULL,
    teacher_id character varying NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    status public.course_status DEFAULT 'DRAFT'::public.course_status NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    cover_image_url character varying(500),
    is_locked boolean DEFAULT false NOT NULL,
    price integer DEFAULT 0 NOT NULL,
    major_id integer,
    code character varying(20),
    instructor_name character varying(255)
);


--
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.courses ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.courses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id integer NOT NULL,
    course_id integer NOT NULL,
    student_id character varying NOT NULL,
    created_by_user_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.enrollments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.enrollments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: featured_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.featured_profiles (
    id integer NOT NULL,
    name character varying(80) NOT NULL,
    title character varying(80),
    bio text,
    image_url character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by_user_id character varying,
    updated_by_user_id character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: featured_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.featured_profiles ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.featured_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: home_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.home_stats (
    id integer NOT NULL,
    stat1_value character varying(20) DEFAULT '50+'::character varying NOT NULL,
    stat1_label character varying(60) DEFAULT 'Quality Courses'::character varying NOT NULL,
    stat1_icon character varying(50) DEFAULT 'BookOpen'::character varying NOT NULL,
    stat2_value character varying(20) DEFAULT '1000+'::character varying NOT NULL,
    stat2_label character varying(60) DEFAULT 'Active Students'::character varying NOT NULL,
    stat2_icon character varying(50) DEFAULT 'Users'::character varying NOT NULL,
    stat3_value character varying(20) DEFAULT '30+'::character varying NOT NULL,
    stat3_label character varying(60) DEFAULT 'Expert Teachers'::character varying NOT NULL,
    stat3_icon character varying(50) DEFAULT 'GraduationCap'::character varying NOT NULL,
    stat4_value character varying(20) DEFAULT '3'::character varying NOT NULL,
    stat4_label character varying(60) DEFAULT 'Colleges'::character varying NOT NULL,
    stat4_icon character varying(50) DEFAULT 'Award'::character varying NOT NULL,
    updated_at timestamp without time zone DEFAULT now(),
    updated_by_user_id character varying
);


--
-- Name: home_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.home_stats ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.home_stats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: join_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.join_requests (
    id integer NOT NULL,
    course_id integer NOT NULL,
    student_id character varying NOT NULL,
    message text,
    receipt_key character varying(500) NOT NULL,
    receipt_mime character varying(100) NOT NULL,
    receipt_size integer NOT NULL,
    status public.join_request_status DEFAULT 'PENDING'::public.join_request_status NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    reviewed_at timestamp without time zone
);


--
-- Name: join_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.join_requests ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.join_requests_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id integer NOT NULL,
    course_id integer NOT NULL,
    title character varying(255) NOT NULL,
    content_type public.content_type NOT NULL,
    content text,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.lessons ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.lessons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: majors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.majors (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    college_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: majors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.majors ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.majors_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.password_reset_tokens ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.password_reset_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_questions (
    id integer NOT NULL,
    course_id integer NOT NULL,
    question text NOT NULL,
    options text[] NOT NULL,
    correct_answer text NOT NULL,
    explanation text,
    created_by_user_id character varying,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: quiz_questions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.quiz_questions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.quiz_questions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


--
-- Name: universities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.universities (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    logo_url character varying(500),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: universities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.universities ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.universities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    profile_image_url text,
    role public.user_role DEFAULT 'STUDENT'::public.user_role NOT NULL,
    college_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    password_hash character varying(255),
    public_id character varying(8),
    password_reset_last_sent_at timestamp without time zone,
    phone_number character varying(20),
    login_otp text,
    login_otp_expiry timestamp without time zone,
    university_id integer,
    major_id integer
);


--
-- Name: replit_database_migrations_v1 id; Type: DEFAULT; Schema: _system; Owner: -
--

ALTER TABLE ONLY _system.replit_database_migrations_v1 ALTER COLUMN id SET DEFAULT nextval('_system.replit_database_migrations_v1_id_seq'::regclass);


--
-- Data for Name: replit_database_migrations_v1; Type: TABLE DATA; Schema: _system; Owner: -
--

COPY _system.replit_database_migrations_v1 (id, build_id, deployment_id, statement_count, applied_at) FROM stdin;
1	23468949-e652-492b-977d-52e70e17a630	c54a3b4f-e44d-4589-a120-b3de50a4a0a8	1	2026-02-01 10:03:35.535498+00
2	fc8232ab-0dab-4e2a-8d7c-d7ece1eaf83d	c54a3b4f-e44d-4589-a120-b3de50a4a0a8	3	2026-02-09 05:05:58.055986+00
3	83eed9d5-d9ec-42b6-89ec-0446ac2bd172	c54a3b4f-e44d-4589-a120-b3de50a4a0a8	13	2026-02-10 12:04:06.495049+00
4	2b4be5f7-b348-4ed6-ad1b-16bc598daabc	c54a3b4f-e44d-4589-a120-b3de50a4a0a8	3	2026-02-10 12:43:54.850812+00
\.


--
-- Data for Name: admin_dashboard_stats_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admin_dashboard_stats_config (id, mode, pending_approvals_value, total_teachers_value, published_courses_value, total_students_value, updated_at, updated_by_user_id) FROM stdin;
1	AUTO	0	13	18	1000	2025-12-31 22:21:31.278	cpeacademy5-gmail
\.


--
-- Data for Name: colleges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.colleges (id, name, slug, theme_name, primary_color, secondary_color, logo_url, created_at, university_id) FROM stdin;
4	College of Pharmacy	pharmacy	Pharmacy Theme	#10b981	#059669	\N	2025-12-14 06:37:13.880748	1
6	College of IT	it	IT Theme	#8b5cf6	#7c3aed	\N	2025-12-14 06:37:13.880748	1
5	College of Engineering	engineering	Engineering Theme	#868af3	#2563eb		2025-12-14 06:37:13.880748	1
\.


--
-- Data for Name: course_approval_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.course_approval_logs (id, course_id, action, actor_user_id, reason, created_at) FROM stdin;
3	15	APPROVE	cpeacademy5-gmail	\N	2026-02-01 10:09:30.165767
4	16	APPROVE	cpeacademy5-gmail	\N	2026-02-10 18:59:23.389791
5	17	REJECT	cpeacademy5-gmail		2026-02-10 19:03:33.299501
\.


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.courses (id, college_id, teacher_id, title, description, status, created_at, updated_at, cover_image_url, is_locked, price, major_id, code, instructor_name) FROM stdin;
15	6	c7d2d8c0-4758-4fe8-a2b3-26f6b3570027	java		PUBLISHED	2026-02-01 10:05:24.063809	2026-02-10 18:56:42.763	https://medium.com/@rafaelmammadov/what-is-java-what-is-ide-3b2fa48fb6a1	f	14	13	\N	\N
16	6	c7d2d8c0-4758-4fe8-a2b3-26f6b3570027	c++ - first		PUBLISHED	2026-02-10 18:27:50.075953	2026-02-10 18:59:23.356		f	7	13	\N	\N
17	6	c7d2d8c0-4758-4fe8-a2b3-26f6b3570027	c		REJECTED	2026-02-10 19:01:18.523936	2026-02-10 19:03:33.266		f	5	13	\N	\N
\.


--
-- Data for Name: enrollments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.enrollments (id, course_id, student_id, created_by_user_id, created_at) FROM stdin;
10	15	029813f1-f544-4fef-b478-47f78fcf87d8	c7d2d8c0-4758-4fe8-a2b3-26f6b3570027	2026-02-01 18:33:38.886963
12	15	c484c915-0db9-46a0-b183-505d073318c1	c7d2d8c0-4758-4fe8-a2b3-26f6b3570027	2026-02-03 20:33:10.278638
14	15	b3773722-23aa-4573-9d7f-10f33ebb9fa8	c7d2d8c0-4758-4fe8-a2b3-26f6b3570027	2026-02-04 15:19:48.122903
15	15	1af05cb5-d979-468a-988f-e8ccfdcbce69	c7d2d8c0-4758-4fe8-a2b3-26f6b3570027	2026-02-09 08:40:10.840992
16	15	d9eef517-0e53-4a5c-b7aa-571424ab0fd3	c7d2d8c0-4758-4fe8-a2b3-26f6b3570027	2026-02-10 16:07:33.199706
17	15	ebe06d50-391d-4295-9857-adc6b1bc1260	cpeacademy5-gmail	2026-02-10 18:20:23.068834
\.


--
-- Data for Name: featured_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.featured_profiles (id, name, title, bio, image_url, is_active, sort_order, created_by_user_id, updated_by_user_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: home_stats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.home_stats (id, stat1_value, stat1_label, stat1_icon, stat2_value, stat2_label, stat2_icon, stat3_value, stat3_label, stat3_icon, stat4_value, stat4_label, stat4_icon, updated_at, updated_by_user_id) FROM stdin;
1	auto	Test Courses	BookOpen	20+	Active Students	Users	30+	Expert Teachers	GraduationCap	3	Colleges	Award	2026-01-31 20:14:26.896	cpeacademy5-gmail
\.


--
-- Data for Name: join_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.join_requests (id, course_id, student_id, message, receipt_key, receipt_mime, receipt_size, status, created_at, reviewed_at) FROM stdin;
6	15	c484c915-0db9-46a0-b183-505d073318c1	Hi \nكيفك اهويييييييمصىمصخصوصمصنثنثهصخثنثنثرتصتص	join-requests/15/c484c915-0db9-46a0-b183-505d073318c1/1770150720304-5E5DB199-0C8B-4D86-BC17-770C4775C049.jpeg	image/jpeg	1450246	APPROVED	2026-02-03 20:32:02.758123	2026-02-03 20:33:10.242
7	15	2e74158c-915b-4286-9e24-479e0ebe930f	Please	join-requests/15/2e74158c-915b-4286-9e24-479e0ebe930f/1770218013264-20260204_181315.jpg	image/jpeg	3448571	REJECTED	2026-02-04 15:13:36.618738	2026-02-04 15:15:25.625
8	15	b3773722-23aa-4573-9d7f-10f33ebb9fa8	\N	join-requests/15/b3773722-23aa-4573-9d7f-10f33ebb9fa8/1770218107616-image.jpg	image/jpeg	1838130	REJECTED	2026-02-04 15:15:09.913081	2026-02-04 15:15:46.115
9	15	2e74158c-915b-4286-9e24-479e0ebe930f	ابلييييز	join-requests/15/2e74158c-915b-4286-9e24-479e0ebe930f/1770218193088-IMG-20260201-WA0008.jpg	image/jpeg	52436	APPROVED	2026-02-04 15:16:34.398451	2026-02-04 15:16:50.798
10	15	1af05cb5-d979-468a-988f-e8ccfdcbce69	\N	join-requests/15/1af05cb5-d979-468a-988f-e8ccfdcbce69/1770626368081-WhatsApp_Image_2026-02-01_at_4.52.53_PM__1_.png	image/png	198667	APPROVED	2026-02-09 08:39:29.49951	2026-02-09 08:40:10.807
11	15	d9eef517-0e53-4a5c-b7aa-571424ab0fd3	\N	join-requests/15/d9eef517-0e53-4a5c-b7aa-571424ab0fd3/1770739624990-Screenshot_20260210_184331_Instagram.jpg	image/jpeg	1407595	APPROVED	2026-02-10 16:07:12.144666	2026-02-10 16:07:33.167
12	15	ebe06d50-391d-4295-9857-adc6b1bc1260	\N	join-requests/15/ebe06d50-391d-4295-9857-adc6b1bc1260/1770747418289-Screenshot_2024-08-05_205709.png	image/png	83174	APPROVED	2026-02-10 18:17:02.108856	2026-02-10 18:20:23.025
\.


--
-- Data for Name: lessons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lessons (id, course_id, title, content_type, content, order_index, created_at) FROM stdin;
31	15	شششش	text	شششششششششش	1	2026-02-01 10:08:48.255832
32	15	intro to java	video	https://media.cpeacademy.online/videos/15/1769969205391-WhatsApp_Video_2025-12-31_at_5.05.42_PM.mp4	1	2026-02-01 18:06:51.379912
33	15	Intro	video	https://media.cpeacademy.online/videos/15/1770150596631-trim.2B649C21-212E-44A9-A0C7-9B6015BDB74A.MOV	2	2026-02-03 20:30:00.940996
34	17	gggggg	video	https://media.cpeacademy.online/videos/17/1770750117381-Screen_Recording_2026-02-10_212300.mp4	0	2026-02-10 19:02:03.683509
\.


--
-- Data for Name: majors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.majors (id, name, slug, college_id, created_at) FROM stdin;
13	علوم حاسوب	-	6	2026-02-10 15:59:57.044081
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
8	c7d2d8c0-4758-4fe8-a2b3-26f6b3570027	4e54b90e280aeff2ac1be67d114d9dc6bf8eaa475ed3ec52757c7c185f6da135	2026-02-01 10:02:42.367	\N	2026-02-01 09:32:42.378884
9	c7d2d8c0-4758-4fe8-a2b3-26f6b3570027	46d20f571112607cf2bb91f37ae56d57d5065973e8cb145c03b2a089674c053a	2026-02-01 10:09:20.682	2026-02-01 09:39:54.155	2026-02-01 09:39:20.692873
\.


--
-- Data for Name: quiz_questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quiz_questions (id, course_id, question, options, correct_answer, explanation, created_by_user_id, created_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sessions (sid, sess, expire) FROM stdin;
p-wwTTahkI4q6AAV6zExmhJKJ5JT3NzG	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-10T20:32:39.979Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "c7d2d8c0-4758-4fe8-a2b3-26f6b3570027"}	2026-02-10 20:33:40
FmtSQ08c605JPHU_0NstZC9Zrsl0tqQg	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-11T15:10:19.219Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "b3773722-23aa-4573-9d7f-10f33ebb9fa8"}	2026-02-11 15:20:32
un8REPFtnlNjVUGRb6ppu3Kjotg2-267	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-17T18:12:26.173Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "ebe06d50-391d-4295-9857-adc6b1bc1260"}	2026-02-17 18:41:57
gEEgtYBeYDGkIMeLFK5BuvBDDchmxegM	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-17T16:05:50.337Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "d9eef517-0e53-4a5c-b7aa-571424ab0fd3"}	2026-02-17 17:30:02
W_4n6eWTJfSeCXQqfcNzyYBHdP6MaqMd	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-17T12:10:04.223Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "cpeacademy5-gmail"}	2026-02-17 19:03:35
bJrne4jKYwth8TH8Bgp9r4fd-9aU59s9	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-16T09:02:56.344Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "1af05cb5-d979-468a-988f-e8ccfdcbce69"}	2026-02-16 09:03:10
m8JodM5BJfUjKNb6EL5JRfHxrTRTCbl3	{"cookie": {"path": "/", "secure": true, "expires": "2026-02-17T18:19:49.053Z", "httpOnly": true, "sameSite": "none", "originalMaxAge": 604800000}, "userId": "c7d2d8c0-4758-4fe8-a2b3-26f6b3570027"}	2026-02-17 19:03:51
\.


--
-- Data for Name: universities; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.universities (id, name, slug, logo_url, created_at) FROM stdin;
1	Jordan University of Science and Technology	just	\N	2026-02-10 12:06:17.367661
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, first_name, last_name, profile_image_url, role, college_id, is_active, created_at, updated_at, password_hash, public_id, password_reset_last_sent_at, phone_number, login_otp, login_otp_expiry, university_id, major_id) FROM stdin;
cpeacademy5-gmail	cpeacademy5@gmail.com	CPE	Academy	\N	SUPER_ADMIN	\N	t	2025-12-14 08:53:08.376141	2025-12-16 06:36:13.565	$2b$10$uOcBMMjvuWR7ZDwWy2KuO.L3H1tIYEQaew6EWEMx.CkIMQibIe3gC	XX949618	\N	\N	\N	\N	\N	\N
029813f1-f544-4fef-b478-47f78fcf87d8	moalshar23@ph.just.edu.jo	www	wwww	\N	STUDENT	6	t	2026-02-01 18:09:22.868501	2026-02-01 18:09:22.868501	$2b$10$wJglUcfCk7ILbXYacVuJKOgjzDBJ.K3Uf4tCJZamncBlAysV/IU8.	IT652022	\N	\N	\N	\N	\N	\N
6d9b7de6-6975-4334-a4fa-bfaca9ca4dd4	moaalshar23@ph.just.edu.jo	Mohammad	Al-shar'e	\N	STUDENT	4	t	2026-02-02 04:35:56.263879	2026-02-02 04:35:56.263879	$2b$10$hOFeA5znHoJbrE30GSrL3.Si2WmmVuYCeAQQ.TJvfsmyrvUPABOra	PH909554	\N	\N	\N	\N	\N	\N
04093b31-b652-433e-b693-415609dd9ba1	moalshar23@ph.just.edu.jo.me	abdullah	Al-shar'e	\N	STUDENT	6	t	2026-02-03 14:22:11.251057	2026-02-03 14:22:11.251057	$2b$10$8.uVD8L5HFc96v7UPYf4jeJMNiE4MJPsadU56CCRNkwN/iBGgFcQq	IT405996	\N	\N	\N	\N	\N	\N
c484c915-0db9-46a0-b183-505d073318c1	kaljarrah929@gmail.com	Wafa	Al Jarrah 	\N	STUDENT	5	t	2026-02-03 20:31:13.305453	2026-02-03 20:31:13.305453	$2b$10$T1s7ERTOQnesU8fYc2fAK.yLNobA3gda9.IAklEoTBZRgPIAQpSqa	EN133970	\N	\N	\N	\N	\N	\N
b3773722-23aa-4573-9d7f-10f33ebb9fa8	obadaaljolany135@gmail.com	Eng	Obada	\N	STUDENT	5	t	2026-02-04 15:10:19.60165	2026-02-04 15:10:19.60165	$2b$10$0lixOc8zneoyEIlTu/q3puiDunru4toY.6fyfA6bOQU.QzhNf9opK	EN091399	\N	\N	\N	\N	\N	\N
2e74158c-915b-4286-9e24-479e0ebe930f	abdo.toto@air.com	Abdo	Big dick	\N	STUDENT	6	t	2026-02-04 15:12:32.493417	2026-02-10 16:03:46.236	$2b$10$ZVkQKJEXRzpXfNygeEbewet3gY4o7vK0gDc72YOZJsvpFt/E5zBZm	IT601783	\N	\N	\N	\N	1	13
d9eef517-0e53-4a5c-b7aa-571424ab0fd3	yousofshorman57@gmail.com	Yousof	57	\N	STUDENT	6	t	2026-02-10 16:05:50.583588	2026-02-10 16:05:50.583588	$2b$10$dT/Hpz9Dr6SPiDupj6cVMeG4obispsTZfkNxKy.VFB8MkJOCkVEB6	IT704260	\N	+962777600422	\N	\N	1	13
958e6f6f-f6f5-44db-8d0d-d2da776ab22b	bahaa2005ash@gmail.com	bahaa	abusharia	\N	STUDENT	6	t	2026-02-09 05:58:22.833553	2026-02-09 05:58:22.833553	$2b$10$pcGEphija93eVWIXuU/L6OIe3Xp60.05a/majFy5o20u/qSVjIbFq	IT712804	\N	0778108894	860914	2026-02-09 06:17:44.252	\N	\N
ebe06d50-391d-4295-9857-adc6b1bc1260	azemaze1090@gmail.com	bahaa	abu shareah	\N	STUDENT	6	t	2026-02-10 18:12:04.134846	2026-02-10 18:12:04.134846	$2b$10$aoxl012Tzdn2a1HZoRvP8O.QKBQQ.YckwswlR6QQPa2H/cmXsNW1a	IT927119	\N	0799999999	\N	\N	1	13
c7d2d8c0-4758-4fe8-a2b3-26f6b3570027	aljarrah929@gmail.com	abdullah	alkhaleel	\N	TEACHER	6	t	2026-02-01 09:32:30.158958	2026-02-01 10:04:36.798	$2b$10$fzakz1kCWmKJ1jPhkS31JOK8hrk90h9oRaQnVs1HK3O5y/trrWtZC	IT272492	2026-02-01 09:39:20.706	\N	\N	\N	\N	\N
1af05cb5-d979-468a-988f-e8ccfdcbce69	abdullah.alkhaleel@gmail.com	Abdullah	Aljarrah	\N	STUDENT	6	t	2026-02-03 14:23:02.016747	2026-02-03 14:23:02.016747	$2b$10$Y/zlRlwvOIfbmkAxmcb1FeQAldOwCSbkHNUl0N5YHRJadGOoOw5Ua	IT112699	\N	\N	\N	\N	\N	\N
\.


--
-- Name: replit_database_migrations_v1_id_seq; Type: SEQUENCE SET; Schema: _system; Owner: -
--

SELECT pg_catalog.setval('_system.replit_database_migrations_v1_id_seq', 4, true);


--
-- Name: admin_dashboard_stats_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.admin_dashboard_stats_config_id_seq', 1, true);


--
-- Name: colleges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.colleges_id_seq', 8, true);


--
-- Name: course_approval_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.course_approval_logs_id_seq', 5, true);


--
-- Name: courses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.courses_id_seq', 17, true);


--
-- Name: enrollments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.enrollments_id_seq', 17, true);


--
-- Name: featured_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.featured_profiles_id_seq', 1, true);


--
-- Name: home_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.home_stats_id_seq', 1, true);


--
-- Name: join_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.join_requests_id_seq', 12, true);


--
-- Name: lessons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lessons_id_seq', 34, true);


--
-- Name: majors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.majors_id_seq', 13, true);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 9, true);


--
-- Name: quiz_questions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.quiz_questions_id_seq', 1, false);


--
-- Name: universities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.universities_id_seq', 2, true);


--
-- Name: replit_database_migrations_v1 replit_database_migrations_v1_pkey; Type: CONSTRAINT; Schema: _system; Owner: -
--

ALTER TABLE ONLY _system.replit_database_migrations_v1
    ADD CONSTRAINT replit_database_migrations_v1_pkey PRIMARY KEY (id);


--
-- Name: admin_dashboard_stats_config admin_dashboard_stats_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_dashboard_stats_config
    ADD CONSTRAINT admin_dashboard_stats_config_pkey PRIMARY KEY (id);


--
-- Name: colleges colleges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges
    ADD CONSTRAINT colleges_pkey PRIMARY KEY (id);


--
-- Name: colleges colleges_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges
    ADD CONSTRAINT colleges_slug_unique UNIQUE (slug);


--
-- Name: course_approval_logs course_approval_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_approval_logs
    ADD CONSTRAINT course_approval_logs_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: featured_profiles featured_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_profiles
    ADD CONSTRAINT featured_profiles_pkey PRIMARY KEY (id);


--
-- Name: home_stats home_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_stats
    ADD CONSTRAINT home_stats_pkey PRIMARY KEY (id);


--
-- Name: join_requests join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: majors majors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.majors
    ADD CONSTRAINT majors_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: universities universities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universities
    ADD CONSTRAINT universities_pkey PRIMARY KEY (id);


--
-- Name: universities universities_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universities
    ADD CONSTRAINT universities_slug_unique UNIQUE (slug);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_public_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_public_id_unique UNIQUE (public_id);


--
-- Name: idx_replit_database_migrations_v1_build_id; Type: INDEX; Schema: _system; Owner: -
--

CREATE UNIQUE INDEX idx_replit_database_migrations_v1_build_id ON _system.replit_database_migrations_v1 USING btree (build_id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: idx_join_request_course_student_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_join_request_course_student_status ON public.join_requests USING btree (course_id, student_id, status);


--
-- Name: idx_join_request_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_join_request_status ON public.join_requests USING btree (status);


--
-- Name: admin_dashboard_stats_config admin_dashboard_stats_config_updated_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_dashboard_stats_config
    ADD CONSTRAINT admin_dashboard_stats_config_updated_by_user_id_users_id_fk FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- Name: colleges colleges_university_id_universities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.colleges
    ADD CONSTRAINT colleges_university_id_universities_id_fk FOREIGN KEY (university_id) REFERENCES public.universities(id);


--
-- Name: course_approval_logs course_approval_logs_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_approval_logs
    ADD CONSTRAINT course_approval_logs_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: course_approval_logs course_approval_logs_course_id_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_approval_logs
    ADD CONSTRAINT course_approval_logs_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: courses courses_college_id_colleges_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_college_id_colleges_id_fk FOREIGN KEY (college_id) REFERENCES public.colleges(id);


--
-- Name: courses courses_major_id_majors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_major_id_majors_id_fk FOREIGN KEY (major_id) REFERENCES public.majors(id);


--
-- Name: courses courses_teacher_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_teacher_id_users_id_fk FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: enrollments enrollments_course_id_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: enrollments enrollments_student_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_id_users_id_fk FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: featured_profiles featured_profiles_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_profiles
    ADD CONSTRAINT featured_profiles_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: featured_profiles featured_profiles_updated_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_profiles
    ADD CONSTRAINT featured_profiles_updated_by_user_id_users_id_fk FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- Name: home_stats home_stats_updated_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_stats
    ADD CONSTRAINT home_stats_updated_by_user_id_users_id_fk FOREIGN KEY (updated_by_user_id) REFERENCES public.users(id);


--
-- Name: join_requests join_requests_course_id_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: join_requests join_requests_student_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.join_requests
    ADD CONSTRAINT join_requests_student_id_users_id_fk FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: lessons lessons_course_id_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: majors majors_college_id_colleges_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.majors
    ADD CONSTRAINT majors_college_id_colleges_id_fk FOREIGN KEY (college_id) REFERENCES public.colleges(id);


--
-- Name: password_reset_tokens password_reset_tokens_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: quiz_questions quiz_questions_course_id_courses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: quiz_questions quiz_questions_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: users users_college_id_colleges_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_college_id_colleges_id_fk FOREIGN KEY (college_id) REFERENCES public.colleges(id);


--
-- Name: users users_major_id_majors_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_major_id_majors_id_fk FOREIGN KEY (major_id) REFERENCES public.majors(id);


--
-- Name: users users_university_id_universities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_university_id_universities_id_fk FOREIGN KEY (university_id) REFERENCES public.universities(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Xj0iST90PbIC8kCq4S22LkMiHeaDnRbvpHMjDzGny8aQvyDK3WucjSEE5ysypOo

