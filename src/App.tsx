
import React, { useState, useRef, useEffect } from 'react';
import { AppState, SceneDescription, VideoOrientation } from './types';
import { analyzeAudio, generateSceneImage, generateSceneVideo, PRICING, VISUAL_STYLES } from './services/gemini';
import * as Storage from './services/storage';

// Componente de Spinner
const Spinner = ({ className }: { className?: string }) => (
  <svg className={`animate-spin ${className || "h-5 w-5 text-current"}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

// Componente de Overlay de Processamento (Bloqueante para etapas críticas)
const ProcessingOverlay = ({ active, message, progress }: { active: boolean, message: string, progress: number }) => {
  if (!active) return null;
  
  const subMessages = [
     "Processando dados...",
     "Sincronizando áudio...",
     "Gerando visuais...",
     "Quase lá...",
     "Por favor, aguarde..."
  ];
  const msgIndex = Math.floor((progress / 20)) % subMessages.length;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-fade-in cursor-wait">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="relative w-32 h-32 mx-auto">
           <div className="absolute inset-0 border-8 border-white/10 rounded-full"></div>
           <div className="absolute inset-0 border-8 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
           <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-indigo-400 animate-pulse">IA</div>
        </div>
        
        <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-wide animate-pulse">{message}</h2>
            <p className="text-indigo-300 text-xl font-medium tracking-wide">{subMessages[msgIndex]}</p>
        </div>

        {/* Barra de Progresso Gigante */}
        <div className="w-full bg-slate-800 rounded-full h-8 overflow-hidden border-2 border-slate-700 relative shadow-2xl">
           <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-300 ease-out flex items-center justify-end pr-4" style={{ width: `${Math.max(5, progress)}%` }}>
             <span className="text-white font-bold text-sm shadow-sm">{Math.floor(progress)}%</span>
           </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<Storage.UserProfile | null>(null);
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [scenes, setScenes] = useState<SceneDescription[]>([]);
  const [currentAudio, setCurrentAudio] = useState<{ id: string; code: string; name: string; url?: string; duration: number; buffer?: AudioBuffer; orientation: VideoOrientation } | null>(null);
  const [recentProjects, setRecentProjects] = useState<Storage.ProjectData[]>([]);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentStatusMessage, setCurrentStatusMessage] = useState("Aguardando comando..."); // Mensagem grande de status
  const [lastProcessedIndex, setLastProcessedIndex] = useState(-1);
  const [readyForMaster, setReadyForMaster] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [activeEngine, setActiveEngine] = useState<string>("Standby");
  const [activeStyle, setActiveStyle] = useState("cinematic");
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash-image');
  const [videoOrientation, setVideoOrientation] = useState<VideoOrientation>('landscape');
  
  // Controle de UI
  const [processingSceneId, setProcessingSceneId] = useState<string | null>(null);
  const stopRequestRef = useRef(false);
  const progressIntervalRef = useRef<any>(null);
  const renderWatchdogRef = useRef<any>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null); // Ref para auto-scroll
  
  const [pendingFile, setPendingFile] = useState<{ file: File, url: string, duration: number, buffer: AudioBuffer } | null>(null);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempPrompt, setTempPrompt] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { initApp(); }, []);

  // Auto-scroll nos logs
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    return () => {
      stopProgressSimulation();
      if (renderWatchdogRef.current) clearTimeout(renderWatchdogRef.current);
    };
  }, []);

  useEffect(() => {
    if (waveformRef.current && currentAudio?.buffer) {
      const canvas = waveformRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const data = currentAudio.buffer.getChannelData(0);
      const step = Math.ceil(data.length / canvas.width);
      const amp = canvas.height / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.strokeStyle = '#818cf8'; // Cor mais clara para o waveform
      ctx.lineWidth = 2;
      for (let i = 0; i < canvas.width; i++) {
        let min = 1.0; let max = -1.0;
        for (let j = 0; j < step; j++) {
          const datum = data[(i * step) + j];
          if (datum < min) min = datum; if (datum > max) max = datum;
        }
        ctx.lineTo(i, (1 + min) * amp); ctx.lineTo(i, (1 + max) * amp);
      }
      ctx.stroke();
    }
  }, [currentAudio, state]);

  const startProgressSimulation = (start: number, end: number, durationMs: number) => {
    stopProgressSimulation();
    let current = start;
    const stepTime = 200;
    const increment = (end - start) / (durationMs / stepTime);
    setRenderProgress(current);
    progressIntervalRef.current = setInterval(() => {
      current += increment;
      if (current >= end) current = end - 0.1;
      setRenderProgress(Math.min(current, 99));
    }, stepTime);
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const initApp = async () => {
    const savedUser = await Storage.getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
      await loadRecentProjects(savedUser.id);
      const lastSessionId = Storage.getLastSessionId();
      if (lastSessionId) await loadProjectById(lastSessionId);
    }
  };

  const loadRecentProjects = async (userId: string) => {
    const projects = await Storage.getAllProjects(userId);
    setRecentProjects(projects.sort((a, b) => b.lastUpdated - a.lastUpdated));
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
    // Atualiza a mensagem principal de status também, se não for erro
    if (!msg.includes("Erro") && !msg.includes("Falha")) {
        // Remove timestamps ou prefixos para o display grande
        setCurrentStatusMessage(msg.replace(/^[^\s]+ /, '')); 
    }
  };

  const loadProjectById = async (id: string) => {
    try {
      addLog("Carregando projeto salvo...");
      const proj = await Storage.getProject(id);
      if (!proj) return;
      
      const projectScenes = await Storage.getProjectScenes(id);
      setScenes(projectScenes);
      setVideoOrientation(proj.orientation);
      setTotalCost(proj.totalCost || 0);

      let audioUrl = undefined;
      let audioBuffer = undefined;
      
      if (proj.audioData) {
        const blob = new Blob([proj.audioData], { type: proj.mimeType || 'audio/mp3' });
        audioUrl = URL.createObjectURL(blob);
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioBuffer = await audioContext.decodeAudioData(proj.audioData);
      } else {
        addLog("⚠️ Aviso: Arquivo de áudio não encontrado. Por favor, restaure o arquivo.");
      }

      setCurrentAudio({ 
        id: proj.id, 
        code: proj.projectCode, 
        name: proj.name, 
        duration: proj.duration, 
        url: audioUrl, 
        buffer: audioBuffer,
        orientation: proj.orientation 
      });

      let lastIdx = -1;
      for (let i = 0; i < projectScenes.length; i++) {
        if (projectScenes[i].imageUrl && !projectScenes[i].imageUrl.includes('placehold.co')) lastIdx = i;
      }
      setLastProcessedIndex(lastIdx);
      
      const isComplete = projectScenes.length > 0 && projectScenes.every(s => !!s.imageUrl && !s.imageUrl.startsWith('https://placehold.co'));
      setReadyForMaster(isComplete);
      setState(AppState.GENERATING_IMAGES);
      
      // Cálculo de progresso
      const progress = isComplete ? 100 : Math.min(Math.round(((lastIdx + 1) / projectScenes.length) * 100), 100);
      setRenderProgress(progress);
      
      addLog(`Projeto "${proj.name}" carregado com sucesso.`);
    } catch (err) { addLog("❌ Falha ao carregar projeto."); }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    addLog(`Lendo arquivo de áudio: ${file.name}...`);
    const objectUrl = URL.createObjectURL(file);
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const bufferForStore = arrayBuffer.slice(0);
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      setPendingFile({ 
        file, 
        url: objectUrl, 
        duration: audioBuffer.duration, 
        buffer: audioBuffer 
      });
      (audioBuffer as any).rawBuffer = bufferForStore; 

      setProjectNameInput(file.name.replace(/\.[^/.]+$/, ""));
      setShowNamingModal(true);
      addLog("Áudio processado. Aguardando configuração do projeto.");
    } catch (err) { addLog("❌ Falha ao ler o arquivo de áudio."); }
  };

  const handleAttachAudio = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentAudio || !user) return;
    
    try {
      addLog("Restaurando áudio original...");
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const bufferForStore = arrayBuffer.slice(0);
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const objectUrl = URL.createObjectURL(file);

      setCurrentAudio(prev => prev ? ({
        ...prev,
        url: objectUrl,
        buffer: audioBuffer,
        duration: audioBuffer.duration
      }) : null);

      await Storage.saveProject({
        id: currentAudio.id,
        userId: user.id,
        projectCode: currentAudio.code,
        name: currentAudio.name,
        duration: currentAudio.duration,
        lastUpdated: Date.now(),
        orientation: currentAudio.orientation,
        audioData: bufferForStore,
        mimeType: file.type
      });

      addLog("✅ Áudio restaurado e salvo com sucesso!");
    } catch (err: any) {
      addLog(`❌ Falha ao restaurar áudio: ${err.message}`);
    }
  };

  const startNewProject = async () => {
    if (!pendingFile || !user) return;
    setShowNamingModal(false);
    const projId = `proj_${Date.now()}`;
    const code = `TON-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const name = projectNameInput.trim() || pendingFile.file.name;
    const rawBuffer = (pendingFile.buffer as any).rawBuffer;
    
    setCurrentAudio({ id: projId, code, name, url: pendingFile.url, duration: pendingFile.duration, buffer: pendingFile.buffer, orientation: videoOrientation });
    
    setState(AppState.ANALYZING_AUDIO);
    addLog("Iniciando análise inteligente do áudio...");
    startProgressSimulation(0, 85, 20000); 
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(pendingFile.file);
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const analyzed = await analyzeAudio(base64, pendingFile.file.type, pendingFile.duration, activeStyle);
          
          stopProgressSimulation(); 
          setRenderProgress(100);

          setScenes(analyzed);
          setTotalCost(PRICING.AUDIO_ANALYSIS);
          
          await Storage.saveProject({ 
            id: projId, 
            userId: user.id, 
            projectCode: code, 
            name, 
            duration: pendingFile.duration, 
            lastUpdated: Date.now(), 
            totalCost: PRICING.AUDIO_ANALYSIS, 
            orientation: videoOrientation,
            audioData: rawBuffer,
            mimeType: pendingFile.file.type
          });
          
          for (const s of analyzed) await Storage.saveScene(projId, s);
          
          addLog("Análise concluída. Roteiro criado.");
          setTimeout(() => {
            startProductionCycle(analyzed, { id: projId, code, name, duration: pendingFile.duration, orientation: videoOrientation }, -1, PRICING.AUDIO_ANALYSIS);
          }, 1000);

        } catch (innerErr: any) {
          stopProgressSimulation();
          addLog(`❌ Erro na Análise: ${innerErr.message}`);
          setState(AppState.ERROR);
        }
      };
    } catch (err: any) { 
      stopProgressSimulation();
      addLog(`❌ Erro de Leitura: ${err.message}`); 
      setState(AppState.ERROR); 
    }
  };

  const startProductionCycle = async (targetScenes: SceneDescription[], audioInfo: any, startIndexOverride: number, startCost: number) => {
    setState(AppState.GENERATING_IMAGES);
    stopRequestRef.current = false;
    let currentTotalCost = startCost;
    const updatedScenes = [...targetScenes];

    addLog("🚀 Iniciando produção das cenas...");

    for (let i = startIndexOverride + 1; i < targetScenes.length; i++) {
      if (stopRequestRef.current) { 
        addLog("🛑 Produção pausada pelo usuário."); 
        setCurrentStatusMessage("Produção Pausada");
        setProcessingSceneId(null);
        return; 
      }

      const existingScene = updatedScenes[i];
      if (existingScene.imageUrl && !existingScene.imageUrl.startsWith('https://placehold.co')) {
        setLastProcessedIndex(i);
        setRenderProgress(Math.round(((i + 1) / targetScenes.length) * 100));
        continue;
      }

      setLastProcessedIndex(i);
      setProcessingSceneId(updatedScenes[i].id);
      addLog(`Criando imagem da Cena ${i + 1} de ${targetScenes.length}...`);
      setActiveEngine(selectedModel.includes('pro') ? "Gemini Pro" : selectedModel.includes('free') ? "Pollinations Free" : "Gemini Flash");
      
      try {
        const genResult = await generateSceneImage(updatedScenes[i].visualPrompt, activeStyle, 0, selectedModel, audioInfo.orientation === 'landscape' ? '16:9' : '9:16');
        updatedScenes[i].imageUrl = genResult.url;
        currentTotalCost += genResult.cost;
        setTotalCost(currentTotalCost);
        setScenes([...updatedScenes]);
        
        await Storage.saveScene(audioInfo.id, updatedScenes[i]);
        await Storage.saveProject({ ...audioInfo, userId: user!.id, projectCode: audioInfo.code, lastUpdated: Date.now(), totalCost: currentTotalCost, orientation: audioInfo.orientation });
      } catch (err: any) { 
        addLog(`⚠️ Erro na Cena ${i+1}. Tentando a próxima...`); 
      }

      setRenderProgress(Math.round(((i + 1) / targetScenes.length) * 100));
    }

    setProcessingSceneId(null);
    const isComplete = updatedScenes.every(s => !!s.imageUrl && !s.imageUrl.startsWith('https://placehold.co'));
    setReadyForMaster(isComplete);
    if (isComplete) {
        addLog("✅ Todas as imagens foram criadas com sucesso!");
        setCurrentStatusMessage("Produção Visual Completa");
    }
  };

  const handleManualAnimate = async (index: number) => {
    if (!currentAudio || !scenes[index].imageUrl) return;
    const previousState = state;
    setProcessingSceneId(scenes[index].id); 
    setState(AppState.GENERATING_VEO);
    setActiveEngine("Veo 3.1 Fast");
    addLog(`Animando a Cena ${index + 1}...`);
    try {
      const videoUrl = await generateSceneVideo(scenes[index].imageUrl!, scenes[index].visualPrompt, currentAudio.orientation === 'landscape' ? '16:9' : '9:16');
      const updated = [...scenes];
      updated[index].videoUrl = videoUrl;
      const newCost = totalCost + PRICING.VEO_VIDEO;
      setScenes(updated);
      setTotalCost(newCost);
      await Storage.saveScene(currentAudio.id, updated[index]);
      await Storage.saveProject({ ...currentAudio, userId: user!.id, projectCode: currentAudio.code, lastUpdated: Date.now(), totalCost: newCost, orientation: currentAudio.orientation });
      addLog(`✅ Cena ${index+1} animada com sucesso.`);
    } catch (err: any) { addLog(`❌ Erro na animação: ${err.message}`); }
    setState(previousState);
    setActiveEngine("Standby");
    setProcessingSceneId(null);
  };

  const renderVideo = async (productionScenes: SceneDescription[], totalDuration: number, audioUrl: string) => {
    if (!audioUrl) {
       alert("Erro crítico: Áudio não encontrado. Por favor, utilize o botão 'Restaurar Áudio' para carregar o MP3 original.");
       return;
    }

    if (renderWatchdogRef.current) clearTimeout(renderWatchdogRef.current);

    setState(AppState.RENDERING_VIDEO);
    setActiveEngine("Master Mix");
    addLog("Iniciando a criação do vídeo final...");
    setRenderProgress(0);
    
    try {
      let assetsLoaded = 0;
      const totalAssets = productionScenes.length;
      
      const loadedAssets = await Promise.all(productionScenes.map(async (s, i) => {
        addLog(`Preparando cena ${i+1}...`);
        const asset = await new Promise<{img?: HTMLImageElement, vid?: HTMLVideoElement}>((resolve) => {
          if (s.videoUrl) {
            const vid = document.createElement('video');
            vid.src = s.videoUrl; vid.crossOrigin = "anonymous"; vid.muted = true; vid.loop = true;
            vid.oncanplaythrough = () => resolve({ vid });
            vid.onerror = () => resolve({ img: new Image() }); 
            vid.load();
          } else {
            const img = new Image(); img.crossOrigin = "anonymous"; img.src = s.imageUrl!;
            img.onload = () => resolve({ img });
            img.onerror = () => resolve({ img: new Image() }); 
          }
        });
        assetsLoaded++;
        setRenderProgress(Math.round((assetsLoaded / totalAssets) * 10)); 
        return asset;
      }));

      const canvas = canvasRef.current; if (!canvas) throw new Error("Canvas erro");
      const ctx = canvas.getContext('2d', { alpha: false }); if (!ctx) throw new Error("Contexto erro");
      
      if (videoOrientation === 'portrait') {
        canvas.width = 720; canvas.height = 1280;
      } else {
        canvas.width = 1280; canvas.height = 720;
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const audioEl = new Audio(audioUrl);
      audioEl.crossOrigin = "anonymous";
      
      const source = audioCtx.createMediaElementSource(audioEl);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination); 

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
        ? 'video/webm;codecs=vp9,opus' 
        : 'video/webm';

      const videoStream = canvas.captureStream(30); 
      const combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks()
      ]);

      const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 3000000 });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const cleanup = () => {
         if (renderWatchdogRef.current) clearTimeout(renderWatchdogRef.current);
         try {
           videoStream.getTracks().forEach(t => t.stop());
           dest.stream.getTracks().forEach(t => t.stop());
           audioCtx.close();
         } catch (e) { console.error(e); }
      };

      recorder.onstop = () => {
        cleanup();
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setFinalVideoUrl(url);
        setState(AppState.COMPLETED);
        setRenderProgress(100);
        addLog("🎬 VÍDEO FINALIZADO COM SUCESSO!");
      };

      recorder.onerror = (e) => {
         cleanup();
         addLog(`❌ Erro na gravação: ${(e as any).error?.message}`);
         setState(AppState.ERROR);
      };

      const safeDuration = (totalDuration * 1000) * 3; 
      renderWatchdogRef.current = setTimeout(() => {
         if (recorder.state === 'recording') {
            recorder.stop();
            addLog("⚠️ Gravação encerrada por tempo limite.");
         }
      }, Math.max(safeDuration, 30000)); 

      const timestamps = productionScenes.map(s => { 
        const p = s.timestamp.split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); 
      });

      addLog("Gravando vídeo...");
      await audioCtx.resume();
      recorder.start(); 
      await audioEl.play();

      const tick = () => {
        if (audioEl.ended || audioEl.currentTime >= totalDuration) {
           if (recorder.state === 'recording') recorder.stop();
           return;
        }

        let activeIdx = 0;
        for (let i = timestamps.length - 1; i >= 0; i--) {
           if (audioEl.currentTime >= timestamps[i]) { activeIdx = i; break; }
        }
        
        const asset = loadedAssets[activeIdx];
        const sourceAsset = asset.vid || asset.img;
        
        if (sourceAsset) {
          try {
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const sW = (sourceAsset as any).videoWidth || (sourceAsset as any).width || 1;
            const sH = (sourceAsset as any).videoHeight || (sourceAsset as any).height || 1;
            const ratio = Math.max(canvas.width / sW, canvas.height / sH);
            const nW = sW * ratio;
            const nH = sH * ratio;
            const nX = (canvas.width - nW) / 2;
            const nY = (canvas.height - nH) / 2;
            ctx.drawImage(sourceAsset as any, nX, nY, nW, nH);
          } catch (e) { console.warn("Frame drop", e); }
        }
        
        setRenderProgress(10 + Math.round((audioEl.currentTime / totalDuration) * 90));
        requestAnimationFrame(tick);
      };

      audioEl.onended = () => {
         if (recorder.state === 'recording') recorder.stop();
      };
      tick();
    } catch (e: any) {
       addLog(`❌ Falha Crítica: ${e.message}`);
       setState(AppState.ERROR);
    }
  };

  const handleReset = (force = false) => { 
    if (!force && state !== AppState.IDLE && state !== AppState.COMPLETED && !confirm("Tem certeza que deseja sair? O trabalho atual será fechado.")) return;
    Storage.clearLastSessionId(); setState(AppState.IDLE); setScenes([]); setCurrentAudio(null); 
    setFinalVideoUrl(null); setRenderProgress(0); setLogs([]); if (user) loadRecentProjects(user.id);
  };

  const handleNewProjectClick = () => {
     if (currentAudio && !confirm("Deseja iniciar um novo projeto? O atual será fechado.")) return;
     handleReset(true);
     if (fileInputRef.current) {
         fileInputRef.current.value = '';
         setTimeout(() => fileInputRef.current?.click(), 100);
     }
  };

  if (!user) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-indigo-500">
       <div className="max-w-md w-full text-center space-y-12">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto text-5xl font-black italic shadow-2xl">TM</div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tighter italic">Ton<span className="text-indigo-500">Moves</span></h2>
            <p className="text-slate-400 text-lg">Criador Automático de Videoclipes</p>
          </div>
          <button onClick={async () => { const mock = { id: "u1", name: "User", email: "", picture: "" }; await Storage.saveUser(mock); setUser(mock); }} className="w-full bg-indigo-600 text-white py-6 rounded-2xl font-bold text-2xl hover:bg-indigo-500 transition-all shadow-xl">ENTRAR</button>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#111] text-white flex flex-col font-sans selection:bg-indigo-500/40 relative">
      <ProcessingOverlay 
        active={state === AppState.ANALYZING_AUDIO || state === AppState.RENDERING_VIDEO} 
        message={state === AppState.ANALYZING_AUDIO ? "Analisando Áudio..." : "Criando Vídeo Final..."}
        progress={renderProgress}
      />

      <header className="px-6 py-5 border-b border-white/10 bg-[#1a1a1a] flex justify-between items-center sticky top-0 z-[100] shadow-md">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => handleReset(false)}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black italic text-sm shadow-lg">TM</div>
          <h1 className="font-bold text-2xl uppercase tracking-tight hidden sm:block text-slate-200">Ton<span className="text-indigo-400">Moves</span></h1>
        </div>

        <div className="flex items-center gap-3">
            <div className="hidden sm:block text-sm text-slate-400 font-bold uppercase tracking-widest bg-black/30 px-4 py-2 rounded-lg">
               {currentAudio ? `Projeto: ${currentAudio.name.substring(0, 20)}...` : 'Menu Inicial'}
            </div>
            {currentAudio && (
               <button onClick={() => handleReset(false)} className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-500/20">Sair do Projeto</button>
            )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-8">
        {state === AppState.IDLE ? (
          <div className="grid lg:grid-cols-2 gap-12 py-10">
            <div className="space-y-10">
              <div className="space-y-6">
                <h2 className="text-5xl sm:text-7xl font-black leading-tight text-white tracking-tight">Criar <span className="text-indigo-500">Videoclipe</span></h2>
                <p className="text-slate-400 text-xl max-w-lg leading-relaxed">Escolha uma música do seu computador e a Inteligência Artificial criará o vídeo para você.</p>
              </div>
              <div className="flex flex-col gap-6">
                <button onClick={() => fileInputRef.current?.click()} className="w-full bg-white text-black py-8 rounded-3xl font-black text-2xl hover:scale-[1.02] transition-all uppercase shadow-2xl flex items-center justify-center gap-4">
                  <span className="text-4xl">🎵</span> Escolher Música (MP3)
                </button>
                <button onClick={() => importInputRef.current?.click()} className="w-full border-2 border-white/10 text-slate-400 py-6 rounded-3xl font-bold text-lg uppercase hover:text-white hover:border-white/30 hover:bg-white/5 transition-all">
                   Importar Backup Antigo
                </button>
              </div>
            </div>
            <div className="bg-[#1a1a1a] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
              <h3 className="text-sm font-bold uppercase text-indigo-400 mb-6 tracking-widest border-b border-white/5 pb-4">Seus Projetos Recentes</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {recentProjects.length === 0 && <div className="text-slate-600 text-lg py-12 text-center">Nenhum projeto encontrado.</div>}
                {recentProjects.map(p => (
                  <div key={p.id} className="bg-black/40 p-6 rounded-2xl flex justify-between items-center border border-white/5 hover:border-indigo-500/40 transition-all cursor-pointer" onClick={() => loadProjectById(p.id)}>
                    <div className="truncate pr-4">
                      <div className="text-lg font-bold text-white mb-1">{p.name}</div>
                      <div className="text-xs text-slate-500 uppercase">{new Date(p.lastUpdated).toLocaleDateString()} • {p.orientation}</div>
                    </div>
                    <button className="bg-indigo-600 px-6 py-3 rounded-xl text-sm font-bold uppercase shadow-lg text-white">Abrir</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* MONITOR DE STATUS GRANDE E VISÍVEL */}
            <div className="relative bg-[#1a1a1a] rounded-[2rem] border border-white/10 p-8 shadow-2xl overflow-hidden">
               <div className="flex flex-col gap-6 relative z-10">
                  <div className="flex justify-between items-end">
                      <div className="space-y-2">
                          <span className="text-indigo-400 font-bold uppercase tracking-widest text-xs">Status Atual</span>
                          <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight max-w-3xl">{currentStatusMessage}</h2>
                      </div>
                      <div className="text-right">
                          <span className="text-5xl font-black text-white/90 block">{Math.floor(renderProgress)}%</span>
                      </div>
                  </div>

                  {/* BARRA DE PROGRESSO PRINCIPAL */}
                  <div className="w-full bg-black/50 rounded-full h-6 border border-white/10 overflow-hidden relative">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-500 ease-out shadow-[0_0_20px_rgba(99,102,241,0.6)]" 
                        style={{width: `${Math.max(2, renderProgress)}%`}} 
                      />
                  </div>

                  <div className="flex justify-between items-center text-sm text-slate-500 font-mono pt-2 border-t border-white/5 mt-2">
                     <span>Cenas: {scenes.length}</span>
                     <span>Duração: {currentAudio ? Math.floor(currentAudio.duration) : 0}s</span>
                     <span>Custo: ${totalCost.toFixed(3)}</span>
                  </div>
               </div>
               
               {/* Waveform visual decorativo no fundo */}
               <canvas ref={waveformRef} width={1200} height={150} className="absolute bottom-0 left-0 w-full h-40 opacity-10 pointer-events-none" />
            </div>

            {/* PAINEL DE COMANDO */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 flex flex-wrap gap-4 items-center justify-between shadow-xl">
               <div className="flex gap-4 flex-wrap">
                  <button onClick={handleNewProjectClick} className="bg-white/10 hover:bg-white/20 px-6 py-4 rounded-xl font-bold text-sm uppercase transition-all flex items-center gap-2 border border-white/10">
                    <span>🔄</span> Trocar Música
                  </button>

                  <button onClick={() => { if(currentAudio) Storage.exportProjectData(currentAudio.id); }} className="bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 px-6 py-4 rounded-xl font-bold text-sm uppercase transition-all flex items-center gap-2 border border-blue-500/30">
                    <span>💾</span> Salvar JSON
                  </button>
                  
                  {currentAudio && !currentAudio.url && (
                    <button onClick={() => attachInputRef.current?.click()} className="bg-yellow-600 text-white hover:bg-yellow-500 px-6 py-4 rounded-xl font-bold text-sm uppercase shadow-lg transition-all animate-pulse">
                       ⚠️ Restaurar Áudio
                    </button>
                  )}

                  {state === AppState.GENERATING_IMAGES && processingSceneId && (
                     <button onClick={() => { 
                       stopRequestRef.current = true;
                       addLog("🛑 Parando a pedido do usuário...");
                     }} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-6 py-4 rounded-xl font-bold text-sm uppercase border border-red-500/30 transition-all">
                        ⏹ Parar Processo
                     </button>
                  )}

                  {state === AppState.GENERATING_IMAGES && !processingSceneId && scenes.length > 0 && (
                     <button 
                        onClick={() => {
                            const startIndex = lastProcessedIndex >= scenes.length - 1 ? -1 : lastProcessedIndex;
                            startProductionCycle(scenes, currentAudio, startIndex, totalCost);
                        }} 
                        className="bg-indigo-600 text-white hover:bg-indigo-500 px-8 py-4 rounded-xl font-bold text-sm uppercase shadow-lg transition-all"
                     >
                        {lastProcessedIndex >= scenes.length - 1 ? "↺ Revisar Imagens" : "▶ Continuar Produção"}
                     </button>
                  )}
               </div>
               
               <button 
                  onClick={() => renderVideo(scenes, currentAudio!.duration, currentAudio!.url!)} 
                  disabled={!readyForMaster || state === AppState.RENDERING_VIDEO || !currentAudio?.url}
                  className={`px-10 py-4 rounded-xl font-black text-sm uppercase transition-all shadow-xl flex items-center gap-3 ${
                    readyForMaster && state !== AppState.RENDERING_VIDEO && currentAudio?.url
                    ? 'bg-green-600 text-white hover:bg-green-500 transform hover:scale-105 cursor-pointer ring-4 ring-green-500/20' 
                    : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                  }`}
               >
                  {state === AppState.RENDERING_VIDEO ? <><Spinner /> Trabalhando...</> : '🎬 CRIAR VÍDEO FINAL'}
               </button>
            </div>

            {/* LOGS (TERMINAL) AUMENTADO */}
            <div ref={logsContainerRef} className="bg-black/50 border border-white/10 rounded-xl p-5 h-48 overflow-y-auto font-mono text-sm text-slate-300 shadow-inner custom-scrollbar space-y-2">
              {logs.length === 0 && <div className="text-slate-600 italic">O histórico de ações aparecerá aqui...</div>}
              {logs.map((l, i) => (
                  <div key={i} className={`border-l-4 pl-3 py-1 ${i === 0 ? 'border-indigo-500 text-white bg-white/5' : 'border-slate-700 text-slate-400'}`}>
                      {l}
                  </div>
              ))}
            </div>

            {/* GRID DE CENAS */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {scenes.map((s, idx) => (
                <div key={s.id} className={`aspect-square rounded-2xl bg-[#1a1a1a] border-2 overflow-hidden relative group transition-all duration-300 ${idx === lastProcessedIndex ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-105 z-10' : 'border-white/5'}`}>
                  {s.imageUrl && !s.imageUrl.includes('placehold.co') ? (
                    <>
                      <img src={s.imageUrl} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-3 p-4">
                          <span className="text-white font-bold text-lg">Cena {idx + 1}</span>
                          {!s.videoUrl && (
                            <button 
                              onClick={() => handleManualAnimate(idx)} 
                              disabled={!!processingSceneId}
                              className="bg-white text-black px-4 py-2 rounded-lg text-xs font-black uppercase hover:bg-indigo-500 hover:text-white w-full"
                            >
                              {processingSceneId === s.id ? <Spinner /> : 'Animar Movimento'}
                            </button>
                          )}
                          <button onClick={() => {setEditingIndex(idx); setTempPrompt(s.visualPrompt);}} className="bg-black border border-white/30 text-white px-4 py-2 rounded-lg text-xs font-black uppercase hover:bg-white hover:text-black w-full">Editar</button>
                      </div>
                      {s.videoUrl && <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-md">COM VÍDEO</div>}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-center text-xs font-bold text-white backdrop-blur-sm">
                          {s.timestamp}
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-2">
                       <span className="text-2xl font-bold opacity-20">{idx + 1}</span>
                       <div className="text-[10px] uppercase font-bold">Aguardando...</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {state === AppState.COMPLETED && (
          <div className="space-y-12 text-center animate-fade-in py-10 bg-[#1a1a1a] rounded-[3rem] border border-white/10 p-8 shadow-2xl">
             <h2 className="text-4xl font-black text-green-400 uppercase tracking-widest mb-6">Seu vídeo está pronto!</h2>
             <div className="relative group max-w-4xl mx-auto shadow-2xl rounded-2xl overflow-hidden border-4 border-black bg-black">
               <video src={finalVideoUrl!} controls autoPlay className="w-full aspect-video" />
             </div>
             <div className="flex flex-col sm:flex-row justify-center items-center gap-6 pt-6">
               <a href={finalVideoUrl!} download={`${currentAudio?.name || 'video'}_master.webm`} className="w-full sm:w-auto bg-green-600 text-white px-12 py-6 rounded-2xl font-black text-xl hover:bg-green-500 transition-all uppercase shadow-xl flex items-center justify-center gap-3">
                 <span>⬇️</span> Baixar Vídeo
               </a>
               <button onClick={handleReset} className="text-slate-400 font-bold uppercase text-sm hover:text-white underline decoration-slate-600 underline-offset-4">Criar Novo Vídeo</button>
             </div>
          </div>
        )}
      </main>

      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" />
      <input type="file" ref={attachInputRef} onChange={handleAttachAudio} accept="audio/*" className="hidden" />
      <input type="file" ref={importInputRef} onChange={async (e) => {
        const file = e.target.files?.[0]; if (!file || !user) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const json = ev.target?.result as string;
            const newProjId = await Storage.importProjectData(json, user.id);
            await loadProjectById(newProjId);
            addLog("✅ Backup carregado com sucesso.");
          } catch (err: any) { addLog(`❌ Falha ao carregar backup: ${err.message}`); }
        };
        reader.readAsText(file);
      }} accept=".json" className="hidden" />
      
      {showNamingModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-fade-in">
           <div className="bg-[#1a1a1a] border border-white/20 w-full max-w-lg rounded-[2rem] p-8 md:p-12 space-y-8 shadow-2xl">
              <h3 className="text-3xl font-black uppercase text-white text-center">Configurar Projeto</h3>
              
              <div className="space-y-2">
                 <label className="text-sm font-bold text-indigo-400 uppercase tracking-wider ml-2">Nome do Vídeo</label>
                 <input type="text" value={projectNameInput} onChange={(e) => setProjectNameInput(e.target.value)} placeholder="Ex: Minha Música Nova" className="w-full bg-black border-2 border-white/10 rounded-xl p-4 text-xl font-bold text-white outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Estilo Visual</label>
                    <select value={activeStyle} onChange={(e) => setActiveStyle(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-4 text-sm font-bold uppercase text-white outline-none focus:border-indigo-500 cursor-pointer">
                       {Object.keys(VISUAL_STYLES).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Formato</label>
                    <div className="flex gap-2">
                        <button onClick={() => setVideoOrientation('landscape')} className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase border-2 ${videoOrientation === 'landscape' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-white/10 text-slate-500'}`}>TV (16:9)</button>
                        <button onClick={() => setVideoOrientation('portrait')} className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase border-2 ${videoOrientation === 'portrait' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-white/10 text-slate-500'}`}>Celular</button>
                    </div>
                 </div>
              </div>

              <button onClick={startNewProject} className="w-full bg-white text-black py-6 rounded-xl font-black text-xl uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all">
                  Confirmar e Criar
              </button>
           </div>
        </div>
      )}

      {editingIndex !== null && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl">
           <div className="bg-[#1a1a1a] border border-white/20 w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl">
              <h3 className="text-2xl font-black uppercase text-white mb-6">Editar Cena {editingIndex + 1}</h3>
              <p className="text-slate-400 text-sm mb-2">Descreva como você quer essa cena:</p>
              <textarea value={tempPrompt} onChange={(e) => setTempPrompt(e.target.value)} className="w-full h-40 bg-black border-2 border-white/10 rounded-xl p-4 text-lg text-white mb-8 outline-none focus:border-indigo-500 transition-all custom-scrollbar resize-none" />
              <div className="flex gap-4">
                 <button onClick={() => setEditingIndex(null)} className="flex-1 bg-white/5 py-4 rounded-xl font-bold uppercase text-sm border border-white/5 hover:bg-white/10 transition-all">Cancelar</button>
                 <button onClick={async () => {
                   if (!currentAudio) return;
                   addLog(`Recriando imagem da Cena ${editingIndex! + 1}...`);
                   setEditingIndex(null);
                   try {
                     const res = await generateSceneImage(tempPrompt, activeStyle, 0, selectedModel, currentAudio.orientation === 'landscape' ? '16:9' : '9:16');
                     const updated = [...scenes]; updated[editingIndex!].imageUrl = res.url; updated[editingIndex!].visualPrompt = tempPrompt;
                     setScenes(updated); setTotalCost(totalCost + res.cost);
                     await Storage.saveScene(currentAudio.id, updated[editingIndex!]);
                     addLog(`✅ Cena ${editingIndex! + 1} atualizada com sucesso.`);
                   } catch (e) { addLog("❌ Erro ao recriar cena."); }
                 }} className="flex-[2] bg-indigo-600 py-4 rounded-xl font-black uppercase text-sm shadow-xl hover:bg-indigo-500 transition-all text-white">Salvar Alteração</button>
              </div>
           </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
        .animate-fade-in { animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .cursor-wait { cursor: wait; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default App;
