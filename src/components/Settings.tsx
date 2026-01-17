import React from 'react';
import type { ImageProvider, VideoProvider, TranscriptionProvider } from '../App';

export const IMAGE_PROVIDERS: { id: ImageProvider; name: string; needsKey: boolean; description: string }[] = [
    { id: 'pollinations', name: 'Pollinations', needsKey: false, description: 'IA gratuita, sem limite, mais lento' },
    { id: 'pexels', name: 'Pexels', needsKey: true, description: 'Fotos reais HD, gratuito com API key' },
    { id: 'together', name: 'Together AI', needsKey: true, description: 'IA rapida, modelo FLUX.1, pago' },
    { id: 'openai', name: 'OpenAI DALL-E 3', needsKey: true, description: 'IA alta qualidade, pago' },
    { id: 'gemini', name: 'Google Gemini', needsKey: true, description: 'IA Imagen 3, pago' },
];
  
export const VIDEO_PROVIDERS: { id: VideoProvider; name: string; needsKey: boolean; description: string; icon: string }[] = [
    { id: 'local', name: 'Local (FFmpeg)', needsKey: false, description: 'Gratuito, processa no navegador', icon: '💻' },
    { id: 'pexels', name: 'Pexels Videos', needsKey: true, description: 'Videos reais HD, gratuito com API key', icon: '📹' },
    { id: 'runwayml', name: 'RunwayML Gen-3', needsKey: true, description: 'IA geradora de video de alta qualidade', icon: '🎥' },
    { id: 'lumaai', name: 'Luma Dream Machine', needsKey: true, description: 'Videos cinematograficos com IA', icon: '🌙' },
    { id: 'stability', name: 'Stability AI', needsKey: true, description: 'Stable Video Diffusion', icon: '🎞️' },
];

export const TRANSCRIPTION_PROVIDERS: { id: TranscriptionProvider; name: string; needsKey: boolean; description: string; icon: string }[] = [
    { id: 'filename', name: 'Nome do Arquivo', needsKey: false, description: 'Extrai contexto do nome do arquivo (gratis)', icon: '📄' },
    { id: 'groq', name: 'Groq Whisper', needsKey: true, description: 'Whisper gratuito, rapido e preciso', icon: '⚡' },
    { id: 'openai', name: 'OpenAI Whisper', needsKey: true, description: 'Whisper original, muito preciso (~$0.006/min)', icon: '🎯' },
    { id: 'disabled', name: 'Desativado', needsKey: false, description: 'Nao transcrever, usar apenas analise de audio', icon: '🔇' },
];

interface SettingsProps {
    transcriptionProvider: TranscriptionProvider;
    setTranscriptionProvider: (provider: TranscriptionProvider) => void;
    transcriptionApiKey: string;
    setTranscriptionApiKey: (key: string) => void;
    handleSaveTranscriptionConfig: () => void;
    selectedProvider: ImageProvider;
    setSelectedProvider: (provider: ImageProvider) => void;
    apiKeys: Record<ImageProvider, string>;
    setApiKeys: React.Dispatch<React.SetStateAction<Record<ImageProvider, string>>>;
    handleSaveConfig: () => void;
    selectedVideoProvider: VideoProvider;
    setSelectedVideoProvider: (provider: VideoProvider) => void;
    videoApiKeys: Record<VideoProvider, string>;
    setVideoApiKeys: React.Dispatch<React.SetStateAction<Record<VideoProvider, string>>>;
    handleSaveVideoConfig: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
    transcriptionProvider, setTranscriptionProvider, transcriptionApiKey, setTranscriptionApiKey, handleSaveTranscriptionConfig,
    selectedProvider, setSelectedProvider, apiKeys, setApiKeys, handleSaveConfig,
    selectedVideoProvider, setSelectedVideoProvider, videoApiKeys, setVideoApiKeys, handleSaveVideoConfig
}) => {
  return (
    <div style={{ background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h2 style={{ marginTop: 0, color: '#333', fontSize: '24px' }}>⚙️ Configurações & Chaves de API</h2>
        
        <div style={{ background: '#ecfdf5', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '2px solid #10b981' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#047857', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🎤</span> Transcrição de Áudio
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                {TRANSCRIPTION_PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => setTranscriptionProvider(p.id)} style={{ padding: '12px 8px', border: `2px solid ${transcriptionProvider === p.id ? '#047857' : '#ddd'}`, borderRadius: '8px', background: transcriptionProvider === p.id ? '#d1fae5' : 'white', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', marginBottom: '4px' }}>{p.icon}</div>
                        <div style={{ fontWeight: transcriptionProvider === p.id ? 'bold' : 'normal', fontSize: '12px' }}>{p.name}</div>
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{p.description}</div>
                    </button>
                ))}
            </div>
            {TRANSCRIPTION_PROVIDERS.find(p => p.id === transcriptionProvider)?.needsKey && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="password" placeholder={`API Key para ${TRANSCRIPTION_PROVIDERS.find(p => p.id === transcriptionProvider)?.name}`} value={transcriptionApiKey} onChange={(e) => setTranscriptionApiKey(e.target.value)} style={{ flex: 1, padding: '10px 12px', border: '2px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                    <button onClick={handleSaveTranscriptionConfig} style={{ padding: '10px 16px', background: '#047857', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>Salvar</button>
                </div>
            )}
            {transcriptionProvider === 'groq' && (
                <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#047857' }}>
                    <strong>Groq Whisper:</strong> Obtenha sua API key gratuita em <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" style={{ color: '#047857' }}>console.groq.com</a>
                </p>
            )}
        </div>

        <div style={{ background: '#f0f8ff', padding: '20px', borderRadius: '12px', marginBottom: '16px', border: '2px solid #e0e7ff' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🖼️</span> Gerador de Imagens
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                {IMAGE_PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => setSelectedProvider(p.id)} style={{ padding: '12px 8px', border: `2px solid ${selectedProvider === p.id ? '#4f46e5' : '#ddd'}`, borderRadius: '8px', background: selectedProvider === p.id ? '#e0e7ff' : 'white', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontWeight: selectedProvider === p.id ? 'bold' : 'normal', fontSize: '13px' }}>{p.name}</div>
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{p.description}</div>
                    </button>
                ))}
            </div>
            {IMAGE_PROVIDERS.find(p => p.id === selectedProvider)?.needsKey && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="password" placeholder={`API Key para ${IMAGE_PROVIDERS.find(p => p.id === selectedProvider)?.name}`} value={apiKeys[selectedProvider]} onChange={(e) => setApiKeys(prev => ({ ...prev, [selectedProvider]: e.target.value }))} style={{ flex: 1, padding: '10px 12px', border: '2px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                    <button onClick={handleSaveConfig} style={{ padding: '10px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>Salvar</button>
                </div>
            )}
        </div>

        <div style={{ background: '#fef3c7', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '2px solid #fcd34d' }}>
            <h4 style={{ margin: '0 0 12px 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🎬</span> Gerador de Vídeo
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                {VIDEO_PROVIDERS.map(p => (
                    <button key={p.id} onClick={() => setSelectedVideoProvider(p.id)} style={{ padding: '12px 8px', border: `2px solid ${selectedVideoProvider === p.id ? '#b45309' : '#ddd'}`, borderRadius: '8px', background: selectedVideoProvider === p.id ? '#fde68a' : 'white', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', marginBottom: '4px' }}>{p.icon}</div>
                        <div style={{ fontWeight: selectedVideoProvider === p.id ? 'bold' : 'normal', fontSize: '12px' }}>{p.name}</div>
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{p.description}</div>
                    </button>
                ))}
            </div>
            {VIDEO_PROVIDERS.find(p => p.id === selectedVideoProvider)?.needsKey && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="password" placeholder={`API Key para ${VIDEO_PROVIDERS.find(p => p.id === selectedVideoProvider)?.name}`} value={videoApiKeys[selectedVideoProvider]} onChange={(e) => setVideoApiKeys(prev => ({ ...prev, [selectedVideoProvider]: e.target.value }))} style={{ flex: 1, padding: '10px 12px', border: '2px solid #ddd', borderRadius: '8px', fontSize: '14px' }} />
                    <button onClick={handleSaveVideoConfig} style={{ padding: '10px 16px', background: '#b45309', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>Salvar</button>
                </div>
            )}
            {selectedVideoProvider !== 'local' && (
                <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#92400e', background: '#fef3c7', padding: '8px', borderRadius: '6px' }}>
                    <strong>Nota:</strong> APIs de vídeo com IA (RunwayML, Luma, Stability) geram vídeos a partir de imagens usando inteligência artificial avançada. Requer assinatura do serviço.
                </p>
            )}
        </div>
    </div>
  );
};