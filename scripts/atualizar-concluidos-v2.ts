import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

// Normalizar nome do empreendimento para comparação
function normalizarNome(nome: string): string {
  let n = nome
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/í/g, 'i')
    .replace(/ã/g, 'a')
    .replace(/ç/g, 'c')
    .replace(/é/g, 'e');
  
  // Normalizar variações de Parque Lorena
  if (n === 'parque lorena' || n === 'parque lorena l' || n === 'parque lorena i') {
    return 'parque lorena i';
  }
  if (n === 'parque lorena ii' || n === 'parque lorena ll') {
    return 'parque lorena ii';
  }
  
  return n;
}

// Lista de lotes da planilha do usuário (lista completa)
const lotesUsuario = `
1	Parque Lorena
1	Parque da Guarda Residence
1	Jardim do Parque
1	Parque Lorena II
2	Montecarlo
2	Parque Lorena
2	Parque da Guarda Residence
2	Jardim do Parque
2	Parque Lorena II
2	Algarve
2	Aurora
3	Parque Lorena
3	Parque da Guarda Residence
3	Jardim do Parque
3	Montecarlo
3	Parque Lorena II
3	Algarve
3	Aurora
4	Parque Lorena
4	Parque da Guarda Residence
4	Jardim do Parque
4	Montecarlo
4	Parque Lorena II
5	Parque Lorena
5	Parque da Guarda Residence
5	Jardim do Parque
5	Montecarlo
5	Parque Lorena II
5	Algarve
6	Parque Lorena
6	Ilha dos Açores
6	Parque da Guarda Residence
6	Jardim do Parque
6	Parque Lorena II
6	Algarve
7	Parque Lorena
7	Ilha dos Açores
7	Parque da Guarda Residence
7	Jardim do Parque
7	Montecarlo
7	Parque Lorena II
8	Parque Lorena
8	Ilha dos Açores
8	Parque da Guarda Residence
8	Jardim do Parque
8	Montecarlo
8	Parque Lorena II
9	Parque Lorena
9	Ilha dos Açores
9	Parque da Guarda Residence
9	Jardim do Parque
9	Montecarlo
9	Parque Lorena II
10	Ilha dos Açores
10	Parque Lorena
10	Parque da Guarda Residence
10	Jardim do Parque
10	Montecarlo
10	Parque Lorena II
10	Algarve
10	Aurora
11	Ilha dos Açores
11	Parque Lorena
11	Parque da Guarda Residence
11	Jardim do Parque
11	Parque Lorena II
11	Aurora
12	Parque Lorena
12	Ilha dos Açores
12	Parque da Guarda Residence
12	Jardim do Parque
12	Montecarlo
12	Parque Lorena II
13	Parque Lorena
13	Ilha dos Açores
13	Parque da Guarda Residence
13	Jardim do Parque
13	Montecarlo
13	Parque Lorena II
13	Algarve
14	Parque Lorena
14	Parque da Guarda Residence
14	Jardim do Parque
14	Montecarlo
14	Parque Lorena II
14	Algarve
15	Ilha dos Açores
15	Parque Lorena
15	Parque da Guarda Residence
15	Jardim do Parque
15	Montecarlo
15	Parque Lorena II
16	Parque Lorena
16	Ilha dos Açores
16	Jardim do Parque
16	Montecarlo
16	Parque Lorena II
17	Ilha dos Açores
17	Parque Lorena
17	Parque da Guarda Residence
17	Jardim do Parque
17	Parque Lorena II
18	Ilha dos Açores
18	Parque Lorena
18	Parque da Guarda Residence
18	Jardim do Parque
18	Montecarlo
18	Parque Lorena II
19	Parque Lorena
19	Ilha dos Açores
19	Parque da Guarda Residence
19	Jardim do Parque
19	Montecarlo
19	Parque Lorena II
19	Aurora
20	Ilha dos Açores
20	Parque Lorena
20	Parque da Guarda Residence
20	Jardim do Parque
20	Montecarlo
20	Parque Lorena II
20	Aurora
21	Ilha dos Açores
21	Parque Lorena
21	Parque da Guarda Residence
21	Jardim do Parque
21	Parque Lorena II
22	Ilha dos Açores
22	Parque Lorena
22	Parque da Guarda Residence
22	Jardim do Parque
22	Montecarlo
22	Parque Lorena II
22	Aurora
23	Ilha dos Açores
23	Parque Lorena
23	Parque da Guarda Residence
23	Jardim do Parque
23	Montecarlo
23	Parque Lorena II
24	Ilha dos Açores
24	Parque Lorena
24	Parque da Guarda Residence
24	Jardim do Parque
24	Montecarlo
24	Parque Lorena II
24	Algarve
25	Ilha dos Açores
25	Parque da Guarda Residence
25	Jardim do Parque
25	Montecarlo
25	Parque Lorena II
26	Parque Lorena
26	Ilha dos Açores
26	Parque da Guarda Residence
26	Jardim do Parque
27	Parque Lorena
27	Ilha dos Açores
27	Parque da Guarda Residence
27	Jardim do Parque
27	Parque Lorena II
27	Aurora
28	Parque Lorena
28	Ilha dos Açores
28	Parque da Guarda Residence
28	Jardim do Parque
28	Montecarlo
28	Parque Lorena II
28	Aurora
29	Ilha dos Açores
29	Montecarlo
29	Parque Lorena
29	Parque da Guarda Residence
29	Jardim do Parque
29	Parque Lorena II
30	Ilha dos Açores
30	Parque Lorena
30	Parque da Guarda Residence
30	Jardim do Parque
30	Algarve
31	Ilha dos Açores
31	Parque Lorena
31	Parque da Guarda Residence
31	Jardim do Parque
31	Parque Lorena II
32	Parque Lorena
32	Parque da Guarda Residence
32	Montecarlo
32	Jardim do Parque
32	Aurora
33	Parque Lorena
33	Ilha dos Açores
33	Parque da Guarda Residence
33	Jardim do Parque
33	Montecarlo
34	Ilha dos Açores
34	Parque Lorena
34	Parque da Guarda Residence
34	Jardim do Parque
34	Montecarlo
34	Aurora
35	Ilha dos Açores
35	Parque Lorena
35	Parque da Guarda Residence
35	Jardim do Parque
35	Montecarlo
35	Parque Lorena II
35	Aurora
36	Ilha dos Açores
36	Parque Lorena
36	Jardim do Parque
36	Parque Lorena II
37	Parque Lorena
37	Ilha dos Açores
37	Parque da Guarda Residence
37	Jardim do Parque
37	Montecarlo
37	Parque Lorena II
38	Parque Lorena
38	Ilha dos Açores
38	Parque da Guarda Residence
38	Jardim do Parque
38	Montecarlo
38	Parque Lorena II
39	Ilha dos Açores
39	Parque Lorena
39	Parque da Guarda Residence
39	Jardim do Parque
39	Parque Lorena II
40	Ilha dos Açores
40	Parque Lorena
40	Parque da Guarda Residence
40	Jardim do Parque
40	Montecarlo
40	Parque Lorena II
41	Ilha dos Açores
41	Parque Lorena
41	Parque da Guarda Residence
41	Jardim do Parque
42	Ilha dos Açores
42	Parque da Guarda Residence
42	Parque Lorena
42	Jardim do Parque
42	Montecarlo
42	Parque Lorena II
43	Parque Lorena
43	Ilha dos Açores
43	Parque da Guarda Residence
43	Jardim do Parque
43	Montecarlo
43	Parque Lorena II
44	Parque Lorena
44	Ilha dos Açores
44	Parque da Guarda Residence
44	Jardim do Parque
44	Montecarlo
44	Parque Lorena II
45	Jardim do Parque
45	Parque Lorena
45	Ilha dos Açores
45	Parque da Guarda Residence
45	Montecarlo
45	Parque Lorena II
46	Ilha dos Açores
46	Parque Lorena
46	Parque da Guarda Residence
46	Jardim do Parque
46	Parque Lorena II
47	Ilha dos Açores
47	Parque Lorena
47	Parque da Guarda Residence
47	Jardim do Parque
47	Montecarlo
47	Parque Lorena II
47	Algarve
48	Ilha dos Açores
48	Parque Lorena
48	Parque da Guarda Residence
48	Jardim do Parque
48	Montecarlo
48	Parque Lorena II
48	Algarve
49	Ilha dos Açores
49	Parque Lorena
49	Parque da Guarda Residence
49	Jardim do Parque
49	Montecarlo
49	Parque Lorena II
50	Parque Lorena
50	Ilha dos Açores
50	Parque da Guarda Residence
50	Jardim do Parque
50	Montecarlo
50	Parque Lorena II
51	Ilha dos Açores
51	Jardim do Parque
51	Parque Lorena
51	Parque da Guarda Residence
51	Parque Lorena II
52	Ilha dos Açores
52	Parque Lorena
52	Parque da Guarda Residence
52	Jardim do Parque
52	Montecarlo
52	Parque Lorena II
53	Ilha dos Açores
53	Parque Lorena
53	Jardim do Parque
53	Montecarlo
53	Parque Lorena II
54	Parque Lorena
54	Ilha dos Açores
54	Jardim do Parque
54	Montecarlo
54	Parque Lorena II
55	Parque Lorena
55	Jardim do Parque
55	Montecarlo
55	Parque Lorena II
56	Ilha dos Açores
56	Parque Lorena
56	Jardim do Parque
56	Parque Lorena II
57	Ilha dos Açores
57	Parque Lorena
57	Jardim do Parque
57	Montecarlo
57	Parque Lorena II
57	Aurora
58	Parque Lorena
58	Jardim do Parque
58	Montecarlo
58	Parque Lorena II
58	Aurora
59	Parque Lorena
59	Ilha dos Açores
59	Jardim do Parque
59	Montecarlo
59	Parque Lorena II
59	Aurora
60	Montecarlo
60	Parque Lorena
60	Ilha dos Açores
60	Jardim do Parque
60	Parque Lorena II
60	Aurora
61	Parque Lorena
61	Ilha dos Açores
61	Jardim do Parque
61	Aurora
62	Ilha dos Açores
62	Parque Lorena
62	Jardim do Parque
62	Montecarlo
62	Parque Lorena II
62	Aurora
63	Parque Lorena
63	Jardim do Parque
63	Montecarlo
63	Parque Lorena II
64	Parque Lorena
64	Ilha dos Açores
64	Jardim do Parque
64	Montecarlo
64	Parque Lorena II
64	Aurora
65	Ilha dos Açores
65	Parque Lorena
65	Jardim do Parque
65	Montecarlo
65	Aurora
66	Parque Lorena
66	Ilha dos Açores
66	Jardim do Parque
66	Parque Lorena II
66	Algarve
66	Aurora
67	Ilha dos Açores
67	Parque Lorena
67	Jardim do Parque
67	Montecarlo
67	Parque Lorena II
67	Algarve
67	Aurora
68	Ilha dos Açores
68	Jardim do Parque
68	Montecarlo
68	Parque Lorena II
69	Parque Lorena
69	Jardim do Parque
69	Montecarlo
69	Parque Lorena II
69	Algarve
70	Parque Lorena
70	Ilha dos Açores
70	Jardim do Parque
70	Montecarlo
70	Parque Lorena II
71	Parque Lorena
71	Ilha dos Açores
71	Jardim do Parque
71	Parque Lorena II
71	Algarve
72	Ilha dos Açores
72	Parque Lorena
72	Jardim do Parque
72	Parque Lorena II
72	Algarve
72	Aurora
72	Erico Verissimo
73	Parque Lorena
73	Ilha dos Açores
73	Jardim do Parque
73	Montecarlo
73	Parque Lorena II
73	Algarve
73	Aurora
74	Parque Lorena
74	Ilha dos Açores
74	Jardim do Parque
74	Montecarlo
74	Parque Lorena II
74	Aurora
75	Parque Lorena
75	Ilha dos Açores
75	Jardim do Parque
75	Parque Lorena II
75	Algarve
75	Aurora
76	Ilha dos Açores
76	Parque Lorena
76	Jardim do Parque
76	Montecarlo
76	Parque Lorena II
76	Algarve
77	Parque Lorena
77	Ilha dos Açores
77	Jardim do Parque
77	Montecarlo
77	Parque Lorena II
78	Ilha dos Açores
78	Parque Lorena
78	Jardim do Parque
78	Montecarlo
78	Parque Lorena II
79	Parque Lorena
79	Ilha dos Açores
79	Jardim do Parque
79	Montecarlo
79	Parque Lorena II
79	Algarve
80	Ilha dos Açores
80	Parque Lorena
80	Jardim do Parque
80	Montecarlo
80	Parque Lorena II
80	Algarve
80	Aurora
81	Ilha dos Açores
81	Jardim do Parque
81	Parque Lorena
81	Parque Lorena II
81	Algarve
82	Ilha dos Açores
82	Jardim do Parque
82	Montecarlo
82	Parque Lorena
82	Parque Lorena II
82	Algarve
83	Ilha dos Açores
83	Jardim do Parque
83	Parque Lorena
83	Montecarlo
83	Parque Lorena II
84	Ilha dos Açores
84	Parque Lorena
84	Jardim do Parque
84	Montecarlo
84	Parque Lorena II
85	Ilha dos Açores
85	Parque Lorena
85	Jardim do Parque
85	Montecarlo
85	Parque Lorena II
86	Ilha dos Açores
86	Parque Lorena
86	Parque Lorena II
87	Ilha dos Açores
87	Parque Lorena
87	Montecarlo
88	Ilha dos Açores
88	Montecarlo
88	Erico Verissimo
89	Ilha dos Açores
89	Parque Lorena
89	Montecarlo
89	Parque Lorena II
89	Erico Verissimo
90	Ilha dos Açores
90	Parque Lorena
90	Montecarlo
90	Parque Lorena II
90	Erico Verissimo
91	Parque Lorena
91	Ilha dos Açores
91	Parque Lorena II
92	Ilha dos Açores
92	Parque Lorena
92	Montecarlo
92	Parque Lorena II
92	Aurora
93	Ilha dos Açores
93	Parque Lorena
93	Parque Lorena II
93	Aurora
94	Ilha dos Açores
94	Parque Lorena
94	Montecarlo
94	Parque Lorena II
94	Aurora
95	Parque Lorena
95	Ilha dos Açores
95	Montecarlo
95	Parque Lorena II
95	Aurora
96	Parque Lorena
96	Ilha dos Açores
96	Parque Lorena II
96	Aurora
97	Parque Lorena
97	Ilha dos Açores
97	Montecarlo
97	Parque Lorena II
97	Aurora
98	Parque Lorena
98	Ilha dos Açores
98	Montecarlo
98	Parque Lorena II
99	Parque Lorena
99	Ilha dos Açores
99	Montecarlo
100	Parque Lorena
100	Ilha dos Açores
100	Montecarlo
101	Ilha dos Açores
101	Parque Lorena
101	Parque Lorena II
102	Ilha dos Açores
102	Parque Lorena
102	Montecarlo
102	Parque Lorena II
102	Aurora
103	Ilha dos Açores
103	Parque Lorena
103	Montecarlo
103	Aurora
104	Ilha dos Açores
104	Parque Lorena
104	Montecarlo
104	Parque Lorena II
104	Aurora
105	Parque Lorena
105	Ilha dos Açores
105	Montecarlo
105	Parque Lorena II
106	Ilha dos Açores
106	Parque Lorena
106	Parque Lorena II
106	Aurora
107	Parque Lorena
107	Ilha dos Açores
107	Montecarlo
107	Parque Lorena II
108	Parque Lorena
108	Ilha dos Açores
108	Montecarlo
108	Parque Lorena II
109	Parque Lorena
109	Ilha dos Açores
109	Montecarlo
109	Parque Lorena II
109	Aurora
110	Parque Lorena
110	Ilha dos Açores
110	Montecarlo
110	Parque Lorena II
110	Aurora
111	Ilha dos Açores
111	Parque Lorena
111	Parque Lorena II
111	Aurora
112	Ilha dos Açores
112	Parque Lorena
112	Montecarlo
112	Parque Lorena II
113	Ilha dos Açores
113	Parque Lorena
113	Montecarlo
113	Aurora
114	Parque Lorena
114	Ilha dos Açores
114	Montecarlo
114	Parque Lorena II
115	Parque Lorena
115	Ilha dos Açores
115	Montecarlo
115	Parque Lorena II
116	Ilha dos Açores
116	Parque Lorena II
117	Ilha dos Açores
117	Montecarlo
117	Parque Lorena
117	Parque Lorena II
118	Parque Lorena
118	Ilha dos Açores
118	Montecarlo
118	Parque Lorena II
119	Parque Lorena
119	Ilha dos Açores
119	Montecarlo
119	Parque Lorena II
119	Aurora
120	Ilha dos Açores
120	Parque Lorena
120	Montecarlo
120	Parque Lorena II
120	Aurora
121	Ilha dos Açores
121	Parque Lorena
121	Parque Lorena II
122	Parque Lorena
122	Ilha dos Açores
122	Montecarlo
122	Parque Lorena II
123	Parque Lorena
123	Ilha dos Açores
123	Montecarlo
123	Parque Lorena II
123	Aurora
124	Ilha dos Açores
124	Parque Lorena
124	Parque Lorena II
124	Aurora
125	Ilha dos Açores
125	Parque Lorena
125	Parque Lorena II
126	Parque Lorena
126	Ilha dos Açores
126	Aurora
127	Ilha dos Açores
127	Parque Lorena
127	Montecarlo
127	Aurora
128	Ilha dos Açores
128	Parque Lorena
128	Montecarlo
128	Aurora
128	Morada da Coxilha
129	Ilha dos Açores
129	Parque Lorena
129	Montecarlo
129	Aurora
130	Ilha dos Açores
130	Parque Lorena
130	Montecarlo
130	Aurora
131	Parque Lorena
132	Parque Lorena
132	Montecarlo
132	Aurora
133	Parque Lorena
133	Ilha dos Açores
133	Montecarlo
134	Ilha dos Açores
134	Parque Lorena
134	Montecarlo
134	Aurora
135	Ilha dos Açores
135	Parque Lorena
135	Montecarlo
135	Aurora
136	Ilha dos Açores
136	Parque Lorena
137	Parque Lorena
137	Montecarlo
137	Aurora
138	Ilha dos Açores
138	Parque Lorena
138	Montecarlo
138	Aurora
139	Ilha dos Açores
139	Parque Lorena
139	Montecarlo
139	Aurora
140	Parque Lorena
140	Montecarlo
141	Ilha dos Açores
141	Parque Lorena
141	Aurora
142	Parque Lorena
142	Ilha dos Açores
142	Montecarlo
143	Ilha dos Açores
143	Parque Lorena
143	Montecarlo
144	Ilha dos Açores
144	Parque Lorena
144	Montecarlo
145	Ilha dos Açores
145	Parque Lorena
145	Montecarlo
146	Parque Lorena
146	Ilha dos Açores
147	Montecarlo
147	Parque Lorena
147	Ilha dos Açores
148	Parque Lorena
148	Ilha dos Açores
148	Montecarlo
149	Parque Lorena
149	Montecarlo
150	Ilha dos Açores
150	Parque Lorena
150	Montecarlo
150	Aurora
151	Ilha dos Açores
151	Parque Lorena
151	Aurora
152	Ilha dos Açores
152	Parque Lorena
152	Montecarlo
153	Ilha dos Açores
153	Parque Lorena
153	Montecarlo
153	Aurora
154	Parque Lorena
154	Montecarlo
155	Ilha dos Açores
155	Parque Lorena
155	Montecarlo
156	Parque Lorena
156	Ilha dos Açores
156	Aurora
157	Ilha dos Açores
157	Parque Lorena
157	Montecarlo
157	Aurora
158	Ilha dos Açores
158	Parque Lorena
158	Montecarlo
158	Aurora
159	Ilha dos Açores
159	Parque Lorena
159	Montecarlo
160	Ilha dos Açores
160	Parque Lorena
160	Montecarlo
161	Ilha dos Açores
161	Parque Lorena
162	Ilha dos Açores
162	Parque Lorena
162	Montecarlo
163	Ilha dos Açores
163	Parque Lorena
163	Montecarlo
164	Ilha dos Açores
164	Parque Lorena
164	Montecarlo
164	Aurora
165	Ilha dos Açores
165	Parque Lorena
165	Aurora
166	Ilha dos Açores
166	Parque Lorena
166	Montecarlo
167	Ilha dos Açores
167	Parque Lorena
167	Montecarlo
168	Ilha dos Açores
168	Montecarlo
168	Aurora
169	Ilha dos Açores
169	Parque Lorena
169	Montecarlo
169	Aurora
170	Ilha dos Açores
170	Parque Lorena
170	Montecarlo
170	Aurora
171	Ilha dos Açores
171	Parque Lorena
171	Aurora
172	Ilha dos Açores
172	Montecarlo
172	Aurora
173	Ilha dos Açores
174	Ilha dos Açores
174	Montecarlo
174	Aurora
175	Ilha dos Açores
175	Montecarlo
175	Aurora
176	Ilha dos Açores
176	Aurora
177	Ilha dos Açores
177	Montecarlo
177	Aurora
178	Ilha dos Açores
178	Montecarlo
179	Ilha dos Açores
179	Montecarlo
179	Aurora
180	Ilha dos Açores
180	Montecarlo
180	Aurora
181	Ilha dos Açores
181	Aurora
182	Ilha dos Açores
182	Montecarlo
183	Ilha dos Açores
186	Erico Verissimo
187	Montecarlo
187	Erico Verissimo
188	Montecarlo
189	Montecarlo
190	Montecarlo
191	Ilha dos Açores
191	Aurora
192	Ilha dos Açores
192	Montecarlo
193	Ilha dos Açores
193	Montecarlo
194	Ilha dos Açores
194	Montecarlo
194	Aurora
195	Ilha dos Açores
195	Montecarlo
195	Aurora
196	Ilha dos Açores
197	Ilha dos Açores
197	Montecarlo
198	Ilha dos Açores
199	Ilha dos Açores
199	Montecarlo
200	Montecarlo
201	Ilha dos Açores
201	Aurora
202	Ilha dos Açores
202	Montecarlo
202	Aurora
203	Ilha dos Açores
203	Montecarlo
204	Ilha dos Açores
204	Montecarlo
205	Ilha dos Açores
205	Montecarlo
206	Ilha dos Açores
207	Montecarlo
208	Montecarlo
209	Montecarlo
209	Aurora
210	Ilha dos Açores
210	Montecarlo
210	Aurora
211	Ilha dos Açores
211	Aurora
211	Erico Verissimo
212	Ilha dos Açores
212	Montecarlo
213	Ilha dos Açores
213	Montecarlo
214	Ilha dos Açores
214	Montecarlo
214	Aurora
215	Ilha dos Açores
215	Montecarlo
215	Aurora
216	Ilha dos Açores
216	Aurora
217	Ilha dos Açores
217	Montecarlo
217	Aurora
218	Ilha dos Açores
218	Montecarlo
219	Ilha dos Açores
220	Ilha dos Açores
220	Montecarlo
220	Aurora
221	Montecarlo
222	Ilha dos Açores
222	Montecarlo
223	Ilha dos Açores
223	Montecarlo
223	Aurora
224	Ilha dos Açores
224	Montecarlo
224	Aurora
225	Ilha dos Açores
225	Montecarlo
226	Aurora
227	Montecarlo
227	Aurora
228	Ilha dos Açores
228	Montecarlo
229	Ilha dos Açores
229	Montecarlo
230	Ilha dos Açores
230	Montecarlo
230	Erico Verissimo
231	Ilha dos Açores
232	Montecarlo
233	Ilha dos Açores
233	Montecarlo
234	Montecarlo
234	Erico Verissimo
235	Ilha dos Açores
235	Montecarlo
236	Ilha dos Açores
237	Ilha dos Açores
237	Montecarlo
238	Ilha dos Açores
238	Montecarlo
239	Ilha dos Açores
239	Montecarlo
240	Ilha dos Açores
241	Ilha dos Açores
241	Montecarlo
242	Montecarlo
242	Aurora
243	Ilha dos Açores
243	Montecarlo
243	Aurora
244	Ilha dos Açores
244	Montecarlo
245	Ilha dos Açores
245	Montecarlo
245	Aurora
246	Ilha dos Açores
246	Aurora
247	Ilha dos Açores
247	Montecarlo
247	Aurora
248	Ilha dos Açores
249	Aurora
250	Ilha dos Açores
250	Montecarlo
250	Aurora
251	Ilha dos Açores
252	Ilha dos Açores
252	Montecarlo
253	Montecarlo
254	Ilha dos Açores
254	Montecarlo
254	Aurora
255	Ilha dos Açores
255	Montecarlo
255	Aurora
256	Ilha dos Açores
256	Aurora
257	Ilha dos Açores
257	Montecarlo
257	Aurora
258	Ilha dos Açores
258	Montecarlo
259	Ilha dos Açores
259	Aurora
260	Ilha dos Açores
260	Montecarlo
261	Ilha dos Açores
261	Aurora
262	Ilha dos Açores
262	Aurora
263	Ilha dos Açores
263	Aurora
263	Erico Verissimo
264	Aurora
265	Ilha dos Açores
265	Aurora
266	Ilha dos Açores
266	Aurora
267	Ilha dos Açores
268	Ilha dos Açores
268	Aurora
269	Aurora
270	Aurora
271	Ilha dos Açores
271	Aurora
272	Ilha dos Açores
274	Aurora
275	Aurora
276	Aurora
277	Aurora
278	Aurora
278	Morada da Coxilha
279	Ilha dos Açores
279	Aurora
280	Ilha dos Açores
281	Ilha dos Açores
281	Aurora
282	Ilha dos Açores
282	Aurora
283	Ilha dos Açores
283	Aurora
284	Ilha dos Açores
285	Ilha dos Açores
285	Aurora
286	Ilha dos Açores
286	Aurora
287	Ilha dos Açores
287	Aurora
288	Ilha dos Açores
288	Aurora
289	Ilha dos Açores
290	Ilha dos Açores
290	Aurora
291	Ilha dos Açores
291	Aurora
292	Ilha dos Açores
293	Ilha dos Açores
294	Ilha dos Açores
294	Aurora
295	Ilha dos Açores
295	Aurora
296	Ilha dos Açores
296	Aurora
297	Ilha dos Açores
297	Aurora
298	Ilha dos Açores
298	Aurora
299	Aurora
301	Ilha dos Açores
301	Aurora
302	Aurora
303	Ilha dos Açores
307	Ilha dos Açores
309	Ilha dos Açores
310	Ilha dos Açores
311	Ilha dos Açores
312	Ilha dos Açores
313	Ilha dos Açores
314	Ilha dos Açores
316	Ilha dos Açores
317	Ilha dos Açores
318	Ilha dos Açores
319	Ilha dos Açores
321	Ilha dos Açores
322	Ilha dos Açores
324	Ilha dos Açores
325	Ilha dos Açores
326	Ilha dos Açores
327	Ilha dos Açores
328	Ilha dos Açores
329	Ilha dos Açores
330	Ilha dos Açores
332	Ilha dos Açores
333	Ilha dos Açores
334	Ilha dos Açores
336	Ilha dos Açores
337	Ilha dos Açores
338	Ilha dos Açores
339	Ilha dos Açores
340	Ilha dos Açores
341	Ilha dos Açores
342	Ilha dos Açores
343	Ilha dos Açores
344	Ilha dos Açores
345	Ilha dos Açores
346	Ilha dos Açores
347	Ilha dos Açores
348	Ilha dos Açores
350	Ilha dos Açores
351	Ilha dos Açores
352	Ilha dos Açores
354	Ilha dos Açores
356	Ilha dos Açores
`.trim().split('\n').map(line => {
  const [num, emp] = line.split('\t');
  return { numero: num.trim(), empreendimento: emp.trim() };
});

async function atualizar() {
  console.log('=== Atualizando registros como concluídos ===\n');
  console.log(`Total de combinações na lista: ${lotesUsuario.length}\n`);

  // Buscar todos os lotes do banco com seus registros
  console.log('Buscando dados do banco...');
  
  let todosLotes: any[] = [];
  let offset = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data: page } = await supabase
      .from('lotes')
      .select(`
        id,
        numero,
        empreendimentos!inner (nome),
        registros (id, data_recebimento_ri)
      `)
      .range(offset, offset + pageSize - 1);
    
    if (!page || page.length === 0) break;
    todosLotes = todosLotes.concat(page);
    offset += pageSize;
    if (page.length < pageSize) break;
  }

  console.log(`Total de lotes no banco: ${todosLotes.length}\n`);

  // Criar mapa normalizado
  const lotesMap = new Map<string, { loteId: string, registroId: string | null, concluido: boolean }>();
  
  for (const lote of todosLotes) {
    const emp = lote.empreendimentos as { nome: string };
    const nomeNorm = normalizarNome(emp.nome);
    // registros pode ser objeto único ou null
    const registro = lote.registros as { id: string, data_recebimento_ri: string | null } | null;
    
    // Criar chave com número original e com padding
    const numInt = parseInt(lote.numero, 10);
    const keys = [
      `${nomeNorm}|${lote.numero}`,
      `${nomeNorm}|${numInt}`,
      `${nomeNorm}|${String(numInt).padStart(2, '0')}`,
    ];
    
    for (const key of keys) {
      if (!lotesMap.has(key)) {
        lotesMap.set(key, {
          loteId: lote.id,
          registroId: registro?.id || null,
          concluido: !!registro?.data_recebimento_ri
        });
      }
    }
  }

  // Encontrar lotes para atualizar
  const paraAtualizar: string[] = [];
  const jasConcluidos: string[] = [];
  const naoEncontrados: string[] = [];
  const semRegistro: string[] = [];

  for (const { numero, empreendimento } of lotesUsuario) {
    const nomeNorm = normalizarNome(empreendimento);
    const key = `${nomeNorm}|${numero}`;
    
    const info = lotesMap.get(key);
    
    if (!info) {
      naoEncontrados.push(`${empreendimento} - ${numero}`);
    } else if (!info.registroId) {
      semRegistro.push(`${empreendimento} - ${numero}`);
    } else if (info.concluido) {
      jasConcluidos.push(`${empreendimento} - ${numero}`);
    } else {
      paraAtualizar.push(info.registroId);
    }
  }

  console.log(`Lotes encontrados e pendentes: ${paraAtualizar.length}`);
  console.log(`Lotes já concluídos: ${jasConcluidos.length}`);
  console.log(`Lotes não encontrados: ${naoEncontrados.length}`);
  console.log(`Lotes sem registro: ${semRegistro.length}`);

  if (naoEncontrados.length > 0 && naoEncontrados.length <= 20) {
    console.log('\nNão encontrados:');
    naoEncontrados.forEach(l => console.log(`  - ${l}`));
  }

  if (paraAtualizar.length === 0) {
    console.log('\n⚠️ Nenhum registro pendente para atualizar.');
    return;
  }

  // Remover duplicatas
  const idsUnicos = [...new Set(paraAtualizar)];
  console.log(`\nRegistros únicos para atualizar: ${idsUnicos.length}`);

  // Atualizar
  const dataAtual = new Date().toISOString().split('T')[0];
  
  const { data: updated, error } = await supabase
    .from('registros')
    .update({ data_recebimento_ri: dataAtual })
    .in('id', idsUnicos)
    .select('id');

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`\n✅ ${updated?.length || 0} registros atualizados como concluídos!`);
  console.log(`Data: ${dataAtual}`);
}

atualizar();
