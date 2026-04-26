import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Map as MapIcon, 
  Gift, 
  LayoutDashboard, 
  Users, 
  Zap, 
  Droplets, 
  Flame,
  Plus,
  ChevronRight,
  Scan,
  Share2,
  Trophy,
  History,
  Info,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
type Tab = 'home' | 'scan' | 'map' | 'dashboard';

interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  points: number;
  role: 'owner' | 'member';
}

interface Receipt {
  id: string;
  shop: string;
  amount: number;
  points: number;
  date: string;
  isHKQuality: boolean;
}

interface ShopLocation {
  id: string;
  name: string;
  position: { lat: number; lng: number };
  type: 'quality' | 'bonus';
  description: string;
}

// --- Mock Data ---
const INITIAL_MEMBERS: FamilyMember[] = [
  { id: '1', name: '我 (戶主)', avatar: 'https://cdn.midjourney.com/40d04b48-b62c-48c9-9eb5-43cd0237e0c9/0_1.png', points: 1250, role: 'owner' },
  { id: '2', name: '阿媽', avatar: 'https://cdn.midjourney.com/8c69edd9-975d-4f21-9d47-fb3295428b03/0_0.png', points: 840, role: 'member' },
  { id: '3', name: '細佬', avatar: 'https://cdn.midjourney.com/2b913bb1-452b-403d-abab-ffc53465bb7a/0_3.png', points: 450, role: 'member' },
];

const RECENT_RECEIPTS: Receipt[] = [
  { id: 'r1', shop: '百佳超級市場', amount: 450, points: 9, date: '2024-04-09', isHKQuality: false },
  { id: 'r2', shop: '深水埗優質咖啡', amount: 120, points: 18, date: '2024-04-08', isHKQuality: true },
  { id: 'r3', shop: '大快活', amount: 65, points: 1.3, date: '2024-04-07', isHKQuality: false },
];

const SHOP_LOCATIONS: ShopLocation[] = [
  { id: 's1', name: '深水埗優質咖啡', position: { lat: 22.3307, lng: 114.1622 }, type: 'quality', description: '1.5x 積分加成' },
  { id: 's2', name: '正港達人打卡點', position: { lat: 22.3320, lng: 114.1600 }, type: 'bonus', description: '3x 積分限定' },
];

interface Reward {
  id: string;
  name: string;
  points: number;
  description: string;
  icon: any;
  color: string;
}

const REWARDS: Reward[] = [
  { id: 'u1', name: '中電 (CLP) $50 津貼', points: 5000, description: '直接扣減電費帳單', icon: Zap, color: 'text-hk-neon-yellow' },
  { id: 'u2', name: '水務署 $20 津貼', points: 2000, description: '直接扣減水費帳單', icon: Droplets, color: 'text-nike-blue' },
  { id: 'u3', name: '煤氣 (Towngas) $30 津貼', points: 3000, description: '直接扣減煤氣帳單', icon: Flame, color: 'text-nike-red' },
  { id: 'u4', name: '百佳 $10 現金券', points: 1000, description: '全港百佳分店適用', icon: Gift, color: 'text-hk-neon-pink' },
];

// --- Components ---

const Navbar = ({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (t: Tab) => void }) => {
  const tabs: { id: Tab; icon: any; label: string }[] = [
    { id: 'home', icon: LayoutDashboard, label: '概覽' },
    { id: 'scan', icon: Scan, label: '掃描' },
    { id: 'map', icon: MapIcon, label: '地圖' },
    { id: 'dashboard', icon: History, label: '紀錄' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-nike-white border-t border-nike-grey-200 px-6 py-3 z-50 flex justify-between items-center max-w-md mx-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === tab.id ? "text-nike-black" : "text-nike-grey-500"
          )}
        >
          <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[10px] font-medium uppercase tracking-wider">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

const Header = () => (
  <header className="sticky top-0 bg-nike-white/80 backdrop-blur-md z-40 border-b border-nike-grey-100 px-6 py-4 flex justify-between items-center">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-nike-black flex items-center justify-center">
        <span className="text-white font-display font-bold text-xl italic">正</span>
      </div>
      <h1 className="text-lg font-bold tracking-tighter">正港購物節</h1>
    </div>
    <div className="flex items-center gap-3">
      <div className="bg-nike-grey-100 rounded-full p-2">
        <Users size={20} />
      </div>
      <div className="bg-nike-grey-100 rounded-full p-2">
        <Gift size={20} />
      </div>
    </div>
  </header>
);

const PointsCard = ({ totalPoints }: { totalPoints: number }) => (
  <div className="bg-nike-black text-white p-6 relative overflow-hidden">
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-nike-grey-500 text-xs uppercase font-medium tracking-widest mb-1">家庭集氣總積分</p>
          <h2 className="nike-display text-5xl">{totalPoints.toLocaleString()}</h2>
        </div>
        <div className="bg-hk-neon-cyan/20 text-hk-neon-cyan px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-hk-neon-cyan/30">
          Lv. 4 達人
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-nike-grey-300">
            <Zap size={14} className="text-hk-neon-yellow" />
            <span className="text-[10px] uppercase font-bold">電費</span>
          </div>
          <p className="font-display font-bold text-lg">-$240</p>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-nike-grey-300">
            <Droplets size={14} className="text-nike-blue" />
            <span className="text-[10px] uppercase font-bold">水費</span>
          </div>
          <p className="font-display font-bold text-lg">-$85</p>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-nike-grey-300">
            <Flame size={14} className="text-nike-red" />
            <span className="text-[10px] uppercase font-bold">煤氣</span>
          </div>
          <p className="font-display font-bold text-lg">-$110</p>
        </div>
      </div>
    </div>
    
    {/* Decorative Neon Lines */}
    <div className="absolute top-0 right-0 w-32 h-32 bg-hk-neon-pink/10 blur-3xl rounded-full -mr-16 -mt-16" />
    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-hk-neon-cyan to-transparent opacity-30" />
  </div>
);

const GoogleMapComponent = () => {
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
  const [selectedShop, setSelectedShop] = useState<ShopLocation | null>(null);

  if (!apiKey) {
    return (
      <div className="flex-1 bg-nike-grey-100 flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-16 h-16 bg-nike-grey-200 rounded-full flex items-center justify-center text-nike-grey-500">
          <Info size={32} />
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase mb-2">需要 Google Maps API Key</h4>
          <p className="text-[10px] text-nike-grey-500 leading-relaxed">
            請在 Settings &rarr; Secrets 中新增 <code className="bg-nike-grey-200 px-1">VITE_GOOGLE_MAPS_API_KEY</code> 以啟用真實地圖功能。
          </p>
        </div>
        <div className="w-full h-48 bg-nike-grey-200 animate-pulse mt-4 flex items-center justify-center">
          <span className="text-[10px] font-bold text-nike-grey-400 uppercase tracking-widest">地圖預覽模式</span>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="flex-1 relative">
        <Map
          defaultCenter={{ lat: 22.3307, lng: 114.1622 }}
          defaultZoom={15}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId="bf50a91347815ad" // Optional: Add your custom Map ID for styling
        >
          {SHOP_LOCATIONS.map((shop) => (
            <AdvancedMarker
              key={shop.id}
              position={shop.position}
              onClick={() => setSelectedShop(shop)}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white transition-transform active:scale-90",
                shop.type === 'quality' ? "bg-nike-black" : "bg-hk-neon-pink animate-bounce"
              )}>
                {shop.type === 'quality' ? <MapIcon size={16} /> : <Zap size={16} />}
              </div>
            </AdvancedMarker>
          ))}

          {selectedShop && (
            <InfoWindow
              position={selectedShop.position}
              onCloseClick={() => setSelectedShop(null)}
            >
              <div className="p-2 min-w-[120px]">
                <h5 className="text-xs font-bold mb-1">{selectedShop.name}</h5>
                <p className="text-[10px] text-nike-grey-500">{selectedShop.description}</p>
              </div>
            </InfoWindow>
          )}
        </Map>

        {/* Map UI Overlay */}
        <div className="absolute top-4 left-4 right-4 flex gap-2 pointer-events-none">
          <div className="flex-1 bg-white/90 backdrop-blur-sm border border-nike-grey-200 px-4 py-2 flex items-center gap-2 pointer-events-auto">
            <MapIcon size={16} className="text-nike-grey-500" />
            <span className="text-xs font-bold uppercase tracking-widest">搜尋 18 區商戶...</span>
          </div>
          <button className="bg-nike-black text-white p-2 pointer-events-auto">
            <Plus size={20} />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 right-4 bg-nike-black text-white p-4 pointer-events-auto">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-hk-neon-cyan">正在追蹤</p>
            <p className="text-[10px] font-bold uppercase tracking-widest">《正港達人》打卡路線</p>
          </div>
          <h4 className="text-sm font-bold mb-1">深水埗文青尋寶之旅</h4>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-nike-grey-800 rounded-full overflow-hidden">
              <div className="w-2/3 h-full bg-hk-neon-cyan" />
            </div>
            <span className="text-[10px] font-bold">2/3 完成</span>
          </div>
        </div>
      </div>
    </APIProvider>
  );
};

const CameraScanner = ({ onScanComplete }: { onScanComplete: (receipt: Receipt) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false 
        });
        setStream(mediaStream);
        setIsInitializing(false);
      } catch (err) {
        console.error("Camera access error:", err);
        setError("無法啟動相機。請確保已授權相機存取權限，並在 HTTPS 環境下使用。");
        setIsInitializing(false);
      }
    }

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => {
        console.error("Video play error:", err);
      });
    }
  }, [stream]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setError(null);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Analyze this receipt image. Extract the shop name, total amount, and date. Determine if it's a local Hong Kong small shop (isHKQuality). Return ONLY a JSON object with these fields: { \"shop\": string, \"amount\": number, \"date\": string, \"isHKQuality\": boolean }. If you can't find a field, use a reasonable default. For the amount, look for 'TOTAL', 'NET', 'AMOUNT', or '$' symbols." },
              { inlineData: { mimeType: "image/jpeg", data: base64Image } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              shop: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              date: { type: Type.STRING },
              isHKQuality: { type: Type.BOOLEAN }
            },
            required: ["shop", "amount", "date", "isHKQuality"]
          }
        }
      });

      const result = JSON.parse(response.text);
      
      onScanComplete({
        id: Math.random().toString(),
        shop: result.shop || "未知商戶",
        amount: result.amount || 0,
        points: (result.amount || 0) * (result.isHKQuality ? 0.15 : 0.02), // 15% for quality, 2% base
        date: result.date || new Date().toISOString().split('T')[0],
        isHKQuality: !!result.isHKQuality
      });
    } catch (err) {
      console.error("Analysis error:", err);
      setError("辨識失敗，請再試一次。請確保單據清晰可見。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 items-center w-full">
      <div className="w-full aspect-[3/4] bg-nike-black relative overflow-hidden flex items-center justify-center">
        {isInitializing ? (
          <div className="flex flex-col items-center gap-2 text-nike-grey-500">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-[10px] uppercase font-bold tracking-widest">初始化相機...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center text-nike-red">
            <AlertCircle size={48} />
            <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {isProcessing && (
              <div className="absolute inset-0 bg-nike-black/60 flex flex-col items-center justify-center gap-4 z-20">
                <motion.div 
                  animate={{ y: [-100, 100, -100] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-full h-1 bg-hk-neon-cyan shadow-[0_0_15px_rgba(0,255,255,0.8)]"
                />
                <p className="text-hk-neon-cyan font-display font-bold uppercase tracking-widest animate-pulse">正在辨識單據...</p>
              </div>
            )}

            {/* Viewfinder Corners */}
            <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-white/30 z-10" />
            <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-white/30 z-10" />
            <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-white/30 z-10" />
            <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-white/30 z-10" />
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 w-full">
        <button 
          onClick={captureAndAnalyze}
          disabled={isInitializing || isProcessing || !!error}
          className="nike-pill bg-nike-black text-white w-full flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
        >
          {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
          <span>{isProcessing ? '辨識中...' : '拍照上傳'}</span>
        </button>
        <p className="text-[10px] text-center text-nike-grey-500 font-medium uppercase tracking-widest">
          支援所有香港實體商戶單據
        </p>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [receipts, setReceipts] = useState(RECENT_RECEIPTS);
  const [showBlindBox, setShowBlindBox] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState<Reward | null>(null);

  const totalPoints = members.reduce((acc, m) => acc + m.points, 0);

  const handleRedeem = (reward: Reward) => {
    if (totalPoints < reward.points) return;
    
    // Deduct points from members proportionally or from owner
    setMembers(prev => {
      let remainingToDeduct = reward.points;
      return prev.map(m => {
        const deduction = Math.min(m.points, remainingToDeduct);
        remainingToDeduct -= deduction;
        return { ...m, points: m.points - deduction };
      });
    });
    
    setShowRedeemModal(null);
    alert(`成功兌換 ${reward.name}！津貼將於下期帳單自動扣除。`);
  };

  return (
    <div className="min-h-screen bg-nike-grey-50 pb-24 max-w-md mx-auto shadow-2xl relative">
      <Header />

      <main className="flex flex-col gap-6">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              <PointsCard totalPoints={totalPoints} />

              {/* Family Members */}
              <section className="px-6">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest">家庭成員</h3>
                  <button className="text-[10px] font-bold text-nike-blue uppercase tracking-widest flex items-center gap-1">
                    管理成員 <ChevronRight size={12} />
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                  {members.map(member => (
                    <div key={member.id} className="flex flex-col items-center gap-2 min-w-[70px]">
                      <div className="relative">
                        <img 
                          src={member.avatar} 
                          alt={member.name} 
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-full bg-nike-grey-200 border-2 border-white shadow-sm object-cover" 
                        />
                        {member.role === 'owner' && (
                          <div className="absolute -top-1 -right-1 bg-nike-black text-white p-1 rounded-full">
                            <Trophy size={10} />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-center">{member.name}</span>
                      <span className="text-[10px] text-nike-grey-500 font-medium">{member.points} pts</span>
                    </div>
                  ))}
                  <button className="flex flex-col items-center gap-2 min-w-[70px]">
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-nike-grey-300 flex items-center justify-center text-nike-grey-500">
                      <Plus size={20} />
                    </div>
                    <span className="text-[10px] font-bold">新增</span>
                  </button>
                </div>
              </section>

              {/* Quick Actions */}
              <section className="px-6 grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setActiveTab('scan')}
                  className="bg-white p-4 border border-nike-grey-200 flex flex-col gap-3 group active:scale-95 transition-transform"
                >
                  <div className="w-10 h-10 bg-nike-black text-white flex items-center justify-center group-hover:bg-hk-neon-pink transition-colors">
                    <Scan size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-nike-grey-500">立即集氣</p>
                    <p className="text-sm font-bold">掃描單據</p>
                  </div>
                </button>
                <button 
                  onClick={() => setActiveTab('map')}
                  className="bg-white p-4 border border-nike-grey-200 flex flex-col gap-3 group active:scale-95 transition-transform"
                >
                  <div className="w-10 h-10 bg-nike-black text-white flex items-center justify-center group-hover:bg-hk-neon-cyan transition-colors">
                    <MapIcon size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-nike-grey-500">尋找寶藏</p>
                    <p className="text-sm font-bold">18區地圖</p>
                  </div>
                </button>
              </section>

              {/* Recent Activity */}
              <section className="px-6 pb-6">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest">最近集氣紀錄</h3>
                  <button onClick={() => setActiveTab('dashboard')} className="text-[10px] font-bold text-nike-grey-500 uppercase tracking-widest">查看全部</button>
                </div>
                <div className="flex flex-col gap-3">
                  {receipts.map(receipt => (
                    <div key={receipt.id} className="bg-white p-4 border border-nike-grey-200 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 flex items-center justify-center",
                          receipt.isHKQuality ? "bg-hk-neon-yellow/10 text-hk-neon-yellow" : "bg-nike-grey-100 text-nike-grey-500"
                        )}>
                          <History size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold">{receipt.shop}</p>
                          <p className="text-[10px] text-nike-grey-500 font-medium">{receipt.date} • ${receipt.amount}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-nike-green">+{receipt.points}</p>
                        {receipt.isHKQuality && <p className="text-[8px] font-bold text-hk-neon-pink uppercase">1.5x 加成</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'scan' && (
            <motion.div 
              key="scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 py-8 flex flex-col gap-8 items-center"
            >
              <CameraScanner onScanComplete={(receipt) => {
                setReceipts([receipt, ...receipts]);
                setMembers(prev => prev.map(m => m.id === '1' ? { ...m, points: m.points + receipt.points } : m));
                setShowBlindBox(true);
              }} />

              <div className="bg-hk-neon-yellow/10 border border-hk-neon-yellow/30 p-4 w-full">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-hk-neon-yellow" />
                  <p className="text-xs font-bold uppercase tracking-widest">今日加成</p>
                </div>
                <p className="text-[10px] font-medium leading-relaxed">
                  於「HK Quality Pick」認證小店消費，可獲 <span className="text-hk-neon-pink font-bold">1.5倍</span> 積分！
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-[70vh]"
            >
              <GoogleMapComponent />
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6 py-4 flex flex-col gap-6"
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold tracking-tighter uppercase">生活資本報告</h2>
                <p className="text-xs text-nike-grey-500 font-medium uppercase tracking-widest">本月投資回報 (ROI)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 border border-nike-grey-200">
                  <p className="text-[10px] font-bold text-nike-grey-500 uppercase tracking-widest mb-1">已慳水電煤</p>
                  <p className="text-2xl font-display font-bold text-nike-green">$435.0</p>
                </div>
                <div className="bg-white p-4 border border-nike-grey-200">
                  <p className="text-[10px] font-bold text-nike-grey-500 uppercase tracking-widest mb-1">支持小店數</p>
                  <p className="text-2xl font-display font-bold text-nike-black">12 間</p>
                </div>
              </div>

              <div className="bg-nike-black text-white p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest">積分兌換中心</h4>
                  <p className="text-[10px] font-bold text-nike-grey-500 uppercase tracking-widest">餘額: {totalPoints} pts</p>
                </div>
                <div className="flex flex-col gap-4">
                  {REWARDS.map(reward => (
                    <div key={reward.id} className="flex justify-between items-center border-b border-nike-grey-800 pb-4">
                      <div className="flex items-center gap-3">
                        <reward.icon size={20} className={reward.color} />
                        <div>
                          <p className="text-xs font-bold">{reward.name}</p>
                          <p className="text-[10px] text-nike-grey-500">{reward.description}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowRedeemModal(reward)}
                        disabled={totalPoints < reward.points}
                        className={cn(
                          "text-[10px] font-bold px-3 py-1 uppercase tracking-widest transition-colors",
                          totalPoints >= reward.points 
                            ? "bg-hk-neon-cyan text-nike-black" 
                            : "bg-nike-grey-800 text-nike-grey-500 cursor-not-allowed"
                        )}
                      >
                        {reward.points} pts
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-widest">本月消費分佈</h4>
                <div className="flex h-8 w-full">
                  <div className="h-full bg-hk-neon-pink w-[40%] flex items-center justify-center text-[8px] font-bold">小店 (40%)</div>
                  <div className="h-full bg-nike-black w-[35%] flex items-center justify-center text-[8px] font-bold text-white">超市 (35%)</div>
                  <div className="h-full bg-nike-grey-300 w-[25%] flex items-center justify-center text-[8px] font-bold">其他 (25%)</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Redeem Confirmation Modal */}
      <AnimatePresence>
        {showRedeemModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-nike-black/80 flex items-center justify-center p-6 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-xs p-6 flex flex-col gap-6"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center bg-nike-grey-100", showRedeemModal.color)}>
                  <showRedeemModal.icon size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-tight">確認兌換?</h3>
                  <p className="text-xs text-nike-grey-500 mt-1">{showRedeemModal.name}</p>
                </div>
              </div>

              <div className="bg-nike-grey-50 p-4 border border-nike-grey-200">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-2">
                  <span>所需積分</span>
                  <span className="text-nike-red">{showRedeemModal.points} pts</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span>剩餘積分</span>
                  <span>{totalPoints - showRedeemModal.points} pts</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => handleRedeem(showRedeemModal)}
                  className="nike-pill bg-nike-black text-white text-xs w-full py-3"
                >
                  確認兌換
                </button>
                <button 
                  onClick={() => setShowRedeemModal(null)}
                  className="text-[10px] font-bold uppercase tracking-widest text-nike-grey-500 py-2"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Blind Box Modal */}
      <AnimatePresence>
        {showBlindBox && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-nike-black/95 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-xs p-8 flex flex-col items-center gap-6 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-hk-neon-pink via-hk-neon-cyan to-hk-neon-yellow" />
              
              <div className="w-24 h-24 bg-nike-black flex items-center justify-center relative">
                <Gift size={48} className="text-hk-neon-yellow animate-bounce" />
                <div className="absolute inset-0 border-2 border-hk-neon-cyan animate-pulse" />
              </div>

              <div>
                <h3 className="nike-display text-3xl mb-2">恭喜獲獎!</h3>
                <p className="text-xs text-nike-grey-500 font-medium uppercase tracking-widest mb-4">掃描成功回贈</p>
                <div className="text-4xl font-display font-bold text-hk-neon-pink mb-1">+13.2</div>
                <p className="text-[10px] font-bold uppercase tracking-widest">家庭集氣積分</p>
              </div>

              <div className="bg-nike-grey-100 p-4 w-full">
                <p className="text-[10px] font-bold uppercase tracking-widest text-nike-grey-500 mb-2">解鎖 One Take 挑戰</p>
                <p className="text-[10px] leading-relaxed mb-4">
                  拍下你的得獎反應並分享至 IG/Threads，即可額外獲得 <span className="text-nike-black font-bold">2倍積分</span>！
                </p>
                <button className="nike-pill bg-nike-black text-white text-xs w-full flex items-center justify-center gap-2">
                  <Share2 size={14} />
                  <span>立即挑戰</span>
                </button>
              </div>

              <button 
                onClick={() => setShowBlindBox(false)}
                className="text-[10px] font-bold uppercase tracking-widest text-nike-grey-500 underline"
              >
                暫時跳過
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
