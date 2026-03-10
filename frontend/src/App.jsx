import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, History, CheckCircle, Flame, Droplets, Zap, ChevronRight } from 'lucide-react';

const App = () => {
  const [view, setView] = useState('camera'); // 'camera', 'loading', 'result', 'history'
  const [capturedImage, setCapturedImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [description, setDescription] = useState('');
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('nutriscan_history');
    return saved ? JSON.parse(saved) : [];
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (view === 'camera') {
      startCamera();
    }
  }, [view]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      analyzePhoto(dataUrl, description);
    }
  };

  const analyzePhoto = async (dataUrl, desc = '') => {
    setView('loading');

    try {
      // Convert dataUrl to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append('image', blob, 'photo.jpg');
      if (desc) {
        formData.append('description', desc);
      }

      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setAnalysis(result);

      // Save to history
      const newHistoryItem = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        image: dataUrl,
        data: result
      };
      const updatedHistory = [newHistoryItem, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('nutriscan_history', JSON.stringify(updatedHistory));

      setView('result');
    } catch (err) {
      console.error("Error analyzing photo:", err);
      alert("Error al analizar la imagen. Intentando de nuevo...");
      setView('camera');
    }
  };

  return (
    <div className="app-container">
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '28px', margin: 0, fontWeight: 700, background: 'linear-gradient(to right, #003366, #40E0D0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          NutriScan
        </h1>
        <button className="btn-secondary" onClick={() => setView('history')} style={{ padding: '8px' }}>
          <History size={24} />
        </button>
      </header>

      {view === 'camera' && (
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <div className="camera-preview">
            <video ref={videoRef} autoPlay playsInline />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="¿Qué estás comiendo? (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glass-input"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button className="btn-primary" onClick={capturePhoto} style={{ flex: 2 }}>
              <Camera size={24} />
              Capturar Foto
            </button>
            <button className="btn-secondary" onClick={() => fileInputRef.current.click()} style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <History size={24} />
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  setCapturedImage(event.target.result);
                  analyzePhoto(event.target.result, description);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
            Apunta a tu comida y presiona el botón
          </p>
        </div>
      )}

      {view === 'loading' && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div className="loading-spinner"></div>
          <h2 style={{ marginTop: '24px' }}>Analizando...</h2>
          <p style={{ color: 'var(--text-muted)' }}>Nuestra IA está identificando los alimentos y calculando nutrientes.</p>
        </div>
      )}

      {view === 'result' && analysis && (
        <>
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', padding: '8px', borderRadius: '12px' }}>
                <CheckCircle color="var(--accent-green)" size={24} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px' }}>Análisis Completo</h2>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Platillo detectado</p>
              </div>
            </div>

            <div className="macro-grid">
              <div className="macro-box">
                <Flame size={18} color="var(--accent-orange)" style={{ marginBottom: '4px' }} />
                <span className="macro-value">{analysis.totals.calories}</span>
                <span className="macro-label">Kcal</span>
              </div>
              <div className="macro-box">
                <Droplets size={18} color="#f59e0b" style={{ marginBottom: '4px' }} />
                <span className="macro-value">{analysis.totals.carbs}g</span>
                <span className="macro-label">Carbs</span>
              </div>
              <div className="macro-box">
                <Zap size={18} color="var(--accent-blue)" style={{ marginBottom: '4px' }} />
                <span className="macro-value">{analysis.totals.protein}g</span>
                <span className="macro-label">Prot</span>
              </div>
              <div className="macro-box">
                <Droplets size={18} color="var(--accent-red)" style={{ marginBottom: '4px' }} />
                <span className="macro-value">{analysis.totals.fat}g</span>
                <span className="macro-label">Grasa</span>
              </div>
            </div>
          </div>

          <h3 style={{ marginLeft: '12px', fontSize: '18px', marginBottom: '12px' }}>Desglose</h3>
          {analysis.foods.map((food, idx) => (
            <div key={idx} className="glass-card food-card" style={{ padding: '16px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px' }}>{food.name}</h4>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>{food.grams}g</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 700, fontSize: '18px' }}>{food.calories}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}>kcal</span>
              </div>
            </div>
          ))}

          <button className="btn-primary" onClick={() => setView('camera')} style={{ marginTop: '10px' }}>
            <RefreshCw size={20} />
            Nueva Foto
          </button>
        </>
      )}

      {view === 'history' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <button className="btn-secondary" onClick={() => setView('camera')} style={{ padding: '8px' }}>
              <ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <h2 style={{ margin: 0 }}>Historial</h2>
          </div>

          {history.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No hay análisis guardados aún.</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="glass-card" style={{ padding: '16px', display: 'flex', gap: '15px', alignItems: 'center' }}>
                <img src={item.image} alt="food" style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '16px' }}>{item.data.totals.calories} kcal</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{item.date}</p>
                </div>
                <button className="btn-secondary" onClick={() => {
                  setAnalysis(item.data);
                  setCapturedImage(item.image);
                  setView('result');
                }} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Ver
                </button>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
};

export default App;
