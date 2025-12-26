import React, { useState } from 'react';
import { analyzeAudio, VISUAL_STYLES } from '../services/gemini';

interface Scene {
  timestamp: number;
  description: string;
  mood: string;
  intensity: number;
}

const App: React.FC = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'analyzing' | 'scenes' | 'generating' | 'done'>('upload');
  const [progress, setProgress] = useState(0);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
      setScenes([]);
      setFinalVideoUrl(null);
      setError(null);
      setCurrentStep('upload');
    } else {
      setError('Por favor, selecione um arquivo de áudio válido (MP3, WAV, OGG, etc.)');
    }
  };

  const handleAnalyze = async () => {
    if (!audioFile) return;
    setIsAnalyzing(true);
    setCurrentStep('analyzing');
    setProgress(0);
    setError(null);

    try {
      const base64 = await fileToBase64(audioFile);
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const analyzedScenes = await analyzeAudio(base64, audioFile.type, 0, selectedStyle);
      clearInterval(progressInterval);
      setProgress(100);
      
      setScenes(analyzedScenes.map(scene => ({
        timestamp: scene.timestamp,
        description: scene.description,
        mood: scene.mood,
        intensity: scene.intensity,
      })));

      setCurrentStep('scenes');
      setIsAnalyzing(false);
    } catch (err) {
      setError(`Erro: ${err instanceof Error ? err.message : 'Desconhecido'}`);
      setIsAnalyzing(false);
      setCurrentStep('upload');
    }
  };

  const handleGenerateVideo = async () => {
    if (scenes.length === 0) return;
    setIsGenerating(true);
    setCurrentStep('generating');
    setProgress(0);

    try {
      for (let i = 0; i < scenes.length; i++) {
        setProgress(Math.floor(((i + 1) / scenes.length) * 100));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setFinalVideoUrl(`https://example.com/video-${Date.now()}.mp4`);
      setCurrentStep('done');
      setIsGenerating(false);
    } catch (err) {
      setError(`Erro: ${err instanceof Error ? err.message : 'Desconhecido'}`);
      setIsGenerating(false);
      setCurrentStep('scenes');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const resetApp = () => {
    setAudioFile(null);
    setScenes([]);
    setFinalVideoUrl(null);
    setError(null);
    setCurrentStep('upload');
    setProgress(0);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <header style={{ maxWidth: '1200px', margin: '0 auto 40px', textAlign: 'center' }}>
        <h1 style={{
          color: 'white',
          fontSize: 'clamp(32px, 8vw, 56px)',
          fontWeight: '800',
          margin: '0 0 10px 0',
          textShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}>
          🎵 TONMOVES
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: 'clamp(16px, 3vw, 20px)', margin: 0 }}>
          Transforme seu áudio em vídeo profissional com IA
        </p>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto' }}>
        {error && (
          <div style={{
            background: '#fee',
            border: '2px solid #f44',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            color: '#c00',
          }}>
            <strong>⚠️ Erro:</strong> {error}
          </div>
        )}

        {currentStep === 'upload' && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>1. Selecione seu áudio</h2>
            
            <div style={{
              border: '2px dashed #667eea',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              background: audioFile ? '#f0f4ff' : '#fafafa',
              marginBottom: '20px',
            }}>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="audio-upload"
              />
              <label htmlFor="audio-upload" style={{ cursor: 'pointer', display: 'block' }}>
                {audioFile ? (
                  <>
                    <div style={{ fontSize: '48px' }}>🎵</div>
                    <p style={{ fontSize: '18px', color: '#667eea', fontWeight: 'bold', margin: '10px 0' }}>
                      {audioFile.name}
                    </p>
                    <p style={{ fontSize: '14px', color: '#666' }}>
                      {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '48px' }}>📁</div>
                    <p style={{ fontSize: '18px', color: '#333', fontWeight: 'bold' }}>
                      Clique para selecionar
                    </p>
                    <p style={{ fontSize: '14px', color: '#666' }}>
                      MP3, WAV, OGG, M4A
                    </p>
                  </>
                )}
              </label>
            </div>

            <h3 style={{ color: '#333' }}>2. Formato</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setAspectRatio('16:9')}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '16px',
                  border: `2px solid ${aspectRatio === '16:9' ? '#667eea' : '#ddd'}`,
                  borderRadius: '8px',
                  background: aspectRatio === '16:9' ? '#f0f4ff' : 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: aspectRatio === '16:9' ? 'bold' : 'normal',
                }}
              >
                📺 16:9
              </button>
              <button
                onClick={() => setAspectRatio('9:16')}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '16px',
                  border: `2px solid ${aspectRatio === '9:16' ? '#667eea' : '#ddd'}`,
                  borderRadius: '8px',
                  background: aspectRatio === '9:16' ? '#f0f4ff' : 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: aspectRatio === '9:16' ? 'bold' : 'normal',
                }}
              >
                📱 9:16
              </button>
            </div>

            <h3 style={{ color: '#333' }}>3. Estilo Visual</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
              marginBottom: '30px',
            }}>
              {Object.entries(VISUAL_STYLES).map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => setSelectedStyle(key)}
                  style={{
                    padding: '14px',
                    border: `2px solid ${selectedStyle === key ? '#667eea' : '#ddd'}`,
                    borderRadius: '8px',
                    background: selectedStyle === key ? '#f0f4ff' : 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: selectedStyle === key ? 'bold' : 'normal',
                  }}
                >
                  {style.emoji} {style.name}
                </button>
              ))}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!audioFile || isAnalyzing}
              style={{
                width: '100%',
                padding: '18px',
                background: audioFile ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: audioFile ? 'pointer' : 'not-allowed',
                boxShadow: audioFile ? '0 4px 15px rgba(102,126,234,0.4)' : 'none',
              }}
            >
              {isAnalyzing ? '🔄 Analisando...' : '🚀 Analisar e Criar'}
            </button>
          </div>
        )}

        {currentStep === 'analyzing' && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎧</div>
            <h2 style={{ color: '#333' }}>Analisando áudio...</h2>
            <div style={{
              width: '100%',
              height: '12px',
              background: '#eee',
              borderRadius: '6px',
              overflow: 'hidden',
              marginTop: '20px',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                transition: 'width 0.3s',
              }} />
            </div>
            <p style={{ color: '#666', marginTop: '10px' }}>{progress}%</p>
          </div>
        )}

        {currentStep === 'scenes' && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>✨ {scenes.length} cenas</h2>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
              {scenes.map((scene, i) => (
                <div key={i} style={{
                  padding: '16px',
                  border: '1px solid #eee',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  background: '#fafafa',
                }}>
                  <div style={{ fontWeight: 'bold', color: '#667eea', marginBottom: '8px' }}>
                    Cena {i + 1} - {scene.mood}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {scene.description}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={resetApp}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'white',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ← Voltar
              </button>
              <button
                onClick={handleGenerateVideo}
                disabled={isGenerating}
                style={{
                  flex: 2,
                  padding: '16px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(102,126,234,0.4)',
                }}
              >
                {isGenerating ? '🎬 Gerando...' : '🎬 Gerar Vídeo'}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'generating' && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎬</div>
            <h2 style={{ color: '#333' }}>Gerando vídeo...</h2>
            <p style={{ color: '#666' }}>Criando {scenes.length} cenas</p>
            <div style={{
              width: '100%',
              height: '12px',
              background: '#eee',
              borderRadius: '6px',
              overflow: 'hidden',
              marginTop: '20px',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                transition: 'width 0.3s',
              }} />
            </div>
            <p style={{ color: '#666', marginTop: '10px' }}>{progress}%</p>
          </div>
        )}

        {currentStep === 'done' && finalVideoUrl && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ color: '#333' }}>Vídeo criado!</h2>
            
            <div style={{
              background: '#f0f4ff',
              padding: '20px',
              borderRadius: '12px',
              margin: '20px 0',
            }}>
              <video
                controls
                style={{ width: '100%', maxWidth: '600px', borderRadius: '8px' }}
              >
                <source src={finalVideoUrl} type="video/mp4" />
              </video>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.open(finalVideoUrl, '_blank')}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ⬇️ Download
              </button>
              <button
                onClick={resetApp}
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '16px',
                  background: 'white',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                🔄 Criar Novo
              </button>
            </div>
          </div>
        )}
      </main>

      <footer style={{
        maxWidth: '900px',
        margin: '40px auto 0',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.8)',
        fontSize: '14px',
      }}>
        <p>Powered by Google Gemini AI • TONMOVES v2.7</p>
      </footer>
    </div>
  );
};

export default App;
