# Cognitive Agent & Social Physics Engine v2.0

Un motore di simulazione avanzato che modella agenti cognitivi con Teoria della Mente, propagazione dell'informazione distorta, formazione emergente di fazioni e storytelling generativo.

## 🎯 Funzionalità Principali

### 🧠 Teoria della Mente (ToM)
Sistema di ragionamento multi-livello che permette agli agenti di modellare gli stati mentali altrui:

- **Level 0**: Credenze dirette ("A pensa che B sia inaffidabile")
- **Level 1**: Inferenze di secondo ordine ("A pensa che B creda che C sia inaffidabile")
- **Level 2**: Ragionamento ricorsivo ("A pensa che B pensi che C creda...")
- **Rilevamento inganno**: Agenti con alta coscienziosità possono individuare contraddizioni
- **Decezione strategica**: Agenti con bassa gradevolezza possono pianificare inganni

**Accesso**: Clicca il pulsante "🧠 ToM" nella toolbar per visualizzare le inferenze mentali in tempo reale.

### 📖 Narrative Sandbox - Storytelling Generativo
Sistema di storytelling algoritmico che genera conseguenze emergenti da prompt utente:

- **Prompt naturali**: Scrivi eventi in italiano o inglese ("Agent_3 tradisce Agent_7", "Una crisi colpisce la comunità")
- **Riconoscimento automatico**: Il sistema identifica il tipo di evento (tradimento, alleanza, rumor, crisi, scoperta)
- **Conseguenze a cascata**: Ogni evento genera 2-4 conseguenze che si propagano nella rete
- **Archi narrativi**: Traccia l'evoluzione completa dalla initiation alla resolution
- **Effetti realistici**: Stress, formazione di memorie, aggiornamento delle credenze

**Accesso**: Clicca "📖 NARRATIVA" e scrivi il tuo prompt nella textarea.

### 📊 Report Generator - Analisi Post-Simulazione
Genera report analitici completi sulla stato della simulazione:

**Sezioni del Report**:
1. **Analisi della Rete**: Densità, fiducia media, agenti centrali, broker di informazione
2. **Analisi delle Fazioni**: Numero, dimensioni, coesione interna, polarizzazione
3. **Flusso Informativo**: Memorie totali, trasmissioni, memorie distorte, hub di informazione
4. **Profilo Psicologico**: OCEAN medio, stress, energia, outlier
5. **Eventi Critici**: Betragioni, altruismo, rumor identificati

**Raccomandazioni Automatiche**:
- Introduzione di mediatori per ridurre polarizzazione
- Iniezione di altruismo per migliorare fiducia
- Fact-checking per memorie distorte
- Integrazione di agenti isolati

**Accesso**: Clicca "📊 REPORT" per generare e visualizzare il report completo.

## 🎮 Controlli

### Toolbar Principale
- **▶ PLAY / ■ PAUSE**: Avvia/pausa la simulazione
- **SPD**: Velocità (1x, 5x, 20x tick/secondo)
- **+ AGENT**: Aggiungi un nuovo agente
- **✕ REMOVE**: Rimuovi l'agente selezionato
- **↻ RESET**: Reinizia la simulazione

### Injection Toolbar (in basso)
- **⚡ BETRAYAL**: Inietta un tradimento casuale
- **✦ ALTRUISM**: Inietta un atto di altruismo
- **◉ RUMOR**: Diffondi un rumor falso

### Interazione Canvas
- **Click su nodo**: Seleziona agente per ispezione
- **Drag su nodo**: Muovi l'agente manualmente

## 🔬 Architettura Tecnica

### Moduli
- `engine.ts`: Core simulation engine, Agent class, ForceLayout
- `theoryOfMind.ts`: Theory of Mind engine con ragionamento multi-livello
- `narrative.ts`: NarrativeSandbox + ReportGenerator
- `App.tsx`: React UI con Canvas rendering

### Modelli Cognitivi
- **Big Five (OCEAN)**: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
- **Stato interno**: Energy, Stress, SocialDrive
- **Memoria a grafo**: MemoryNode con truthValue, emotionalValence, certainty
- **Rete di credenze**: Trust levels per ogni agente conosciuto

### Fisica Sociale
- **Propagazione informazione**: Gossip con distorsione basata su personalità
- **Decadimento memoria**: Certainty diminuisce con trasmissioni multiple
- **Assimilazione credenze**: Basata su trust nel parlante
- **Reattanza**: Trust negativo inverte l'informazione
- **Clustering fazioni**: Label propagation su matrice di trust

### Force-Directed Layout
- Repulsione tra tutti i nodi
- Attrazione lungo archi (basata su trust)
- Center gravity per mantenere il grafo centrato
- Damping per stabilità

## 📈 Metriche e Visualizzazioni

### Canvas
- **Nodi**: Agenti colorati per fazione, dimensione = energia
- **Archi**: Verde = trust positivo, Rosso = trust negativo, spessore = intensità
- **Effetti**: Glow per stress elevato, pulse per agenti selezionati

### Sidebar Inspector
- Profilo OCEAN con barre visuali
- Stato interno (energia, stress, social drive)
- Memoria recente con certezza e valenza
- Top trusted/distrusted agents

### Event Console
- Log in tempo reale di tutte le interazioni
- Color-coded per tipo (betrayal, altruism, rumor, gossip, narrative)

## 🚀 Scenari d'Uso

### 1. Studio Fake News
```
1. Avvia simulazione con 15 agenti
2. Inietta un RUMOR
3. Osserva la propagazione e distorsione
4. Genera REPORT per analisi
```

### 2. Dinamiche di Polarizzazione
```
1. Lascia correre la simulazione per 200 tick
2. Osserva formazione fazioni
3. Inietta BETRAYAL tra fazioni opposte
4. Monitora ToM per vedere inferenze mentali
```

### 3. Storytelling Emergente
```
1. Crea una NARRATIVE: "Agent_2 scopre un complotto"
2. Osserva le conseguenze a cascata
3. Usa ToM per vedere come gli agenti interpretano
4. Genera REPORT finale
```

### 4. Resilienza della Rete
```
1. Inietta multiple BETRAYAL
2. Osserva come la rete reagisce
3. Inietta ALTRUISM per riparare
4. Confronta REPORT prima/dopo
```

## 🎨 Estensioni Future

- **Web Workers**: Per calcoli pesanti (clustering, ToM)
- **Persistenza**: Salvataggio/caricamento stati
- **Multi-osservatore**: WebSocket per condivisione simulazione
- **Machine Learning**: Training di modelli predittivi
- **Bias cognitivi**: Confirmation bias, availability heuristic
- **Economia emergente**: Scambio risorse, mercati

## 📝 Note Tecniche

- **Performance**: Ottimizzato per 20-30 agenti in tempo reale
- **Browser**: Chrome/Firefox/Safari moderni
- **Dipendenze**: React, TypeScript, Tailwind CSS
- **Build**: Vite per bundling veloce

## 🏆 Risultati Attesi

Dopo 100-200 tick di simulazione dovresti osservare:
- Formazione di 2-4 fazioni distinte
- Polarizzazione della fiducia (positiva/negativa)
- Diffusione di memorie distorte attraverso gossip
- Agenti bridge che connettono fazioni diverse
- Emergere di leader naturali (alta extraversion + agreeableness)
- Pattern di inganno e rilevamento

---

**Build**: `npm run build`  
**Dev**: `npm run dev`  
**Versione**: 2.0 - ToM + Narrative + Report
