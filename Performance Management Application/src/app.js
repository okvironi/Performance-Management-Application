import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Download, TrendingUp, Target, CheckCircle, Edit3, PlusCircle, Trash2, X, ListChecks, User, Save } from 'lucide-react';

// Library SheetJS (xlsx) akan dimuat melalui tag <script> secara dinamis
// karena import langsung tidak didukung di lingkungan ini.

// Global Firebase variables
const firebaseConfigJson = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-pm-app-mtid';

let app;
let auth;
let db;

try {
    const parsedConfig = JSON.parse(firebaseConfigJson);
    if (Object.keys(parsedConfig).length > 0) {
        app = initializeApp(parsedConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        setPersistence(auth, browserLocalPersistence);
    } else {
        console.error("Firebase config is empty. App will not connect to Firebase.");
    }
} catch (e) {
    console.error("Error parsing Firebase config:", e);
}

const initialActivitiesData = [
    { id: 'visit', name: 'Visit or Online Meeting', target: 12, actual: [], unit: 'kali' },
    { id: 'demo', name: 'Conduct Demo, Live eDemo, New Recorded Demo, Mini Exhibition, or On-site Event', target: 4, actual: [], unit: 'kali' }, 
    { id: 'product_test', name: 'Product Test', target: 3, actual: [], unit: 'kali' },
    { id: 'webinar', name: 'Present on Webinar, MT Academy and Seminar', target: 1, actual: [], unit: 'kali' },
    { id: 'app_note', name: 'Application Note and Innovation Initiative', target: 1, actual: [], unit: 'kali' },
    { id: 'facility_maintenance', name: 'Demo Facility Maintenance', target: 1, actual: [], unit: 'kali' },
];

// Modal Component for Achievement Details
const AchievementDetailModal = ({ isOpen, onClose, activity, onAddAchievement, onDeleteAchievement, theme }) => {
    const [newAchievementDate, setNewAchievementDate] = useState('');
    const [newAchievementDesc, setNewAchievementDesc] = useState('');
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (isOpen) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            setNewAchievementDate(`${year}-${month}-${day}`);
            setNewAchievementDesc('');
            setFormError('');
        }
    }, [isOpen]);

    if (!isOpen || !activity) return null;

    const handleAdd = () => {
        if (!newAchievementDate || !newAchievementDesc.trim()) {
            setFormError("Tanggal dan deskripsi kegiatan tidak boleh kosong.");
            return;
        }
        setFormError('');
        onAddAchievement(activity.id, { 
            id: crypto.randomUUID(), 
            date: newAchievementDate, 
            description: newAchievementDesc.trim() 
        });
        setNewAchievementDesc('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} p-6 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col`}>
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-semibold">Detail Pencapaian: {activity.name}</h4>
                    <button onClick={onClose} className={`${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'} transition-colors`}>
                        <X size={24} />
                    </button>
                </div>
                <div className={`mb-6 p-4 border rounded-lg ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                    <h5 className="text-md font-semibold mb-3">Tambah Pencapaian Baru</h5>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="achDate" className="block text-sm font-medium mb-1">Tanggal Kegiatan:</label>
                            <input type="date" id="achDate" value={newAchievementDate} onChange={(e) => setNewAchievementDate(e.target.value)} className={`w-full p-2.5 border rounded-md shadow-sm ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`} />
                        </div>
                        <div>
                            <label htmlFor="achDesc" className="block text-sm font-medium mb-1">Deskripsi/Nama Kegiatan:</label>
                            <textarea id="achDesc" placeholder="Contoh: Meeting penjajakan dengan PT. Sukses Selalu terkait produk X." value={newAchievementDesc} onChange={(e) => setNewAchievementDesc(e.target.value)} rows="3" className={`w-full p-2.5 border rounded-md shadow-sm ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all`} />
                        </div>
                        {formError && <p className="text-sm text-red-500 dark:text-red-400">{formError}</p>}
                        <button onClick={handleAdd} className="w-full flex items-center justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                            <PlusCircle size={18} className="mr-2" /> Tambah Pencapaian
                        </button>
                    </div>
                </div>
                <h5 className="text-md font-semibold mb-3">Daftar Pencapaian Tercatat ({activity.actual.length})</h5>
                <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {activity.actual.length === 0 ? (
                        <p className={`text-sm italic ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Belum ada pencapaian yang dicatat untuk aktivitas ini.</p>
                    ) : (
                        [...activity.actual].sort((a, b) => new Date(b.date) - new Date(a.date)).map((ach) => (
                            <div key={ach.id} className={`flex justify-between items-start p-3 rounded-lg shadow ${theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600/70' : 'bg-gray-100 hover:bg-gray-200/70'} transition-colors`}>
                                <div className="flex-grow mr-3">
                                    <p className="font-medium text-sm">{ach.description}</p>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{new Date(ach.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                                <button onClick={() => onDeleteAchievement(activity.id, ach.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-500/20" aria-label="Hapus pencapaian"><Trash2 size={18} /></button>
                            </div>
                        ))
                    )}
                </div>
                <button onClick={onClose} className="mt-6 w-full px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50">Tutup</button>
            </div>
        </div>
    );
};

// Activity Card Component
const ActivityCard = ({ activity, onActivityUpdate, onOpenDetailModal, isEditingTarget, onToggleEditTarget }) => {
    const actualCount = activity.actual ? activity.actual.length : 0;
    const percentage = activity.target > 0 ? Math.min((actualCount / activity.target) * 100, 100) : 0;
    const progressColor = percentage >= 100 ? 'bg-green-500' : (percentage >= 70 ? 'bg-yellow-500' : 'bg-blue-500');

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 flex-grow pr-2 leading-tight">{activity.name}</h3>
                    <button onClick={() => onToggleEditTarget(activity.id)} className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/20" aria-label={isEditingTarget ? "Simpan Target" : "Ubah Target"}>
                        {isEditingTarget ? <CheckCircle size={22} /> : <Edit3 size={20} />}
                    </button>
                </div>
                <div className="mb-5 space-y-3">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <Target size={16} className="mr-2.5 text-blue-500 flex-shrink-0" /><span className="mr-1">Target Bulanan:</span>
                        {isEditingTarget ? (
                            <input type="number" value={activity.target} onChange={(e) => onActivityUpdate(activity.id, 'target', parseInt(e.target.value) || 0)} className="ml-2 w-20 p-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" min="0" />
                        ) : (<span className="font-semibold ml-1">{activity.target} {activity.unit}</span>)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <TrendingUp size={16} className="mr-2.5 text-green-500 flex-shrink-0" /><span className="mr-1">Pencapaian Aktual:</span>
                        <span className="font-semibold ml-1">{actualCount} {activity.unit}</span>
                    </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3.5 mb-1.5 shadow-inner">
                    <div className={`${progressColor} h-3.5 rounded-full transition-all duration-700 ease-out`} style={{ width: `${percentage}%` }}></div>
                </div>
                <p className="text-right text-xs font-medium text-gray-600 dark:text-gray-400">{percentage.toFixed(0)}% Tercapai</p>
            </div>
            <button onClick={() => onOpenDetailModal(activity.id)} className="mt-5 w-full flex items-center justify-center px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50">
                <ListChecks size={16} className="mr-2" /> Kelola Detail Pencapaian
            </button>
        </div>
    );
};

// Main App Component
function App() {
    const [activities, setActivities] = useState(initialActivitiesData);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [editingTargetActivityId, setEditingTargetActivityId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [theme, setTheme] = useState('light');
    const [detailModalActivityId, setDetailModalActivityId] = useState(null);
    
    // State for user name input
    const [userName, setUserName] = useState('');
    const [editingName, setEditingName] = useState(false);
    const [tempName, setTempName] = useState('');


    const THEME_STORAGE_KEY = 'pmAppMtidTheme';
    const DATA_VERSION_PATH = 'monthlyGoals_V2';

    const firestoreDocPath = useCallback(() => {
        if (!currentUserId) return null;
        return `artifacts/${appId}/users/${currentUserId}/pmDataMtid/${DATA_VERSION_PATH}`; 
    }, [currentUserId]);

    // Load external script for XLSX generation
    useEffect(() => {
        const scriptId = 'xlsx-script';
        if (document.getElementById(scriptId)) return; 

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            const existingScript = document.getElementById(scriptId);
            if (existingScript) {
                document.body.removeChild(existingScript);
            }
        };
    }, []);

    useEffect(() => {
        document.title = "Performance Management Application - MT-ID";
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme) setTheme(storedTheme);
        else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    }, []);
    
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }, [theme]);

    useEffect(() => {
        if (!auth || !db) {
            setIsLoading(false); setError("Koneksi ke database gagal.");
            setActivities(initialActivitiesData.map(act => ({...act, actual: Array.isArray(act.actual) ? act.actual : [] })));
            return;
        }
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUserId(user.uid); setIsAuthReady(true);
            } else {
                try { initialAuthToken ? await signInWithCustomToken(auth, initialAuthToken) : await signInAnonymously(auth); } 
                catch (authError) { setError("Gagal autentikasi."); setIsAuthReady(true); setIsLoading(false); 
                    setActivities(initialActivitiesData.map(act => ({...act, actual: Array.isArray(act.actual) ? act.actual : [] })));
                }
            }
        });
        return () => unsubscribeAuth();
    }, []);
    
    useEffect(() => {
        if (!isAuthReady || !currentUserId || !db) {
            if (isAuthReady && !currentUserId && !error) { setIsLoading(false); setError("Tidak ada user terautentikasi.");
                setActivities(initialActivitiesData.map(act => ({...act, actual: Array.isArray(act.actual) ? act.actual : [] })));
            } else if (!isAuthReady && !error) { /* Waiting for auth */ } 
            else { setIsLoading(false); }
            return;
        }
        const docPath = firestoreDocPath();
        if (!docPath) { setIsLoading(false); setError("Jalur data tidak valid."); return; }
        
        setIsLoading(true);
        const unsubscribeFirestore = onSnapshot(doc(db, docPath), (docSnap) => {
            const defaultDataStructure = {
                activities: initialActivitiesData.map(act => ({...act, actual: Array.isArray(act.actual) ? act.actual : [] })),
                userName: ''
            };
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data && data.activities && Array.isArray(data.activities)) {
                    const mergedActivities = initialActivitiesData.map(initActivity => {
                        const savedActivity = data.activities.find(sa => sa.id === initActivity.id);
                        return savedActivity ? { ...initActivity, ...savedActivity, actual: Array.isArray(savedActivity.actual) ? savedActivity.actual : [] } 
                                           : { ...initActivity, actual: Array.isArray(initActivity.actual) ? initActivity.actual : [] };
                    });
                    const finalActivities = initialActivitiesData.map(initAct => mergedActivities.find(mAct => mAct.id === initAct.id) || { ...initAct, actual: Array.isArray(initAct.actual) ? initAct.actual : [] });
                    setActivities(finalActivities);
                } else {
                    setActivities(defaultDataStructure.activities);
                }
                setUserName(data && typeof data.userName === 'string' ? data.userName : defaultDataStructure.userName);
                setTempName(data && typeof data.userName === 'string' ? data.userName : defaultDataStructure.userName);
            } else { 
                setActivities(defaultDataStructure.activities);
                setUserName(defaultDataStructure.userName);
                setTempName(defaultDataStructure.userName);
                setDoc(doc(db, docPath), defaultDataStructure);
            }
            setIsLoading(false); setError(null);
        }, (firestoreError) => {
            setError("Gagal memuat data dari database.");
            setActivities(initialActivitiesData.map(act => ({...act, actual: Array.isArray(act.actual) ? act.actual : [] })));
            setUserName(''); setTempName('');
            setIsLoading(false);
        });
        return () => unsubscribeFirestore();
    }, [isAuthReady, currentUserId, firestoreDocPath]);

    const saveDataToFirestore = async (dataToSave) => {
        if (!isAuthReady || !currentUserId || !db) {
            if(!error) setError("Tidak bisa menyimpan. Cek koneksi/autentikasi."); return;
        }
        const docPath = firestoreDocPath();
        if (docPath) {
            try {
                const currentDataToMerge = { 
                    activities: activities,
                    userName: userName
                };
                await setDoc(doc(db, docPath), { ...currentDataToMerge, ...dataToSave }, { merge: true });
                setError(null);
            } catch (e) { setError("Gagal menyimpan perubahan."); }
        } else { if(!error) setError("Jalur penyimpanan tidak valid."); }
    };
    
    const handleNameEditToggle = () => {
        if (editingName) {
            const newTrimmedName = tempName.trim();
            if (newTrimmedName !== userName) { 
                setUserName(newTrimmedName);
                saveDataToFirestore({ userName: newTrimmedName });
            }
        } else {
            setTempName(userName);
        }
        setEditingName(!editingName);
    };
    
    const handleTempNameChange = (e) => {
        setTempName(e.target.value);
    };

    const handleUpdateTarget = (id, newTarget) => {
        const updatedActivities = activities.map(act => act.id === id ? { ...act, target: Math.max(0, newTarget) } : act );
        setActivities(updatedActivities);
        saveDataToFirestore({ activities: updatedActivities });
    };

    const handleAddAchievement = (activityId, achievementDetail) => {
        const updatedActivities = activities.map(act => {
            if (act.id === activityId) {
                const currentActuals = Array.isArray(act.actual) ? act.actual : [];
                return { ...act, actual: [...currentActuals, achievementDetail] };
            } return act;
        });
        setActivities(updatedActivities);
        saveDataToFirestore({ activities: updatedActivities });
    };

    const handleDeleteAchievement = (activityId, achievementDetailId) => {
        const updatedActivities = activities.map(act => {
            if (act.id === activityId) {
                 const currentActuals = Array.isArray(act.actual) ? act.actual : [];
                return { ...act, actual: currentActuals.filter(ach => ach.id !== achievementDetailId) };
            } return act;
        });
        setActivities(updatedActivities);
        saveDataToFirestore({ activities: updatedActivities });
    };
    
    const downloadExcel = () => {
        if (typeof window.XLSX === 'undefined') {
            setError("Library untuk membuat file Excel belum termuat. Silakan coba beberapa saat lagi.");
            return;
        }

        const XLSX = window.XLSX;

        // --- 1. Persiapan Data ---
        const dataSheet = [];
        dataSheet.push(['Nama Pengguna:', userName]);
        dataSheet.push([]);
        
        const tableHeaders = [
            "Nama Aktivitas", "Target Bulanan", "Pencapaian Aktual (Jumlah)", "Satuan", 
            "Persentase Tercapai (%)", "Tanggal Pencapaian", "Deskripsi Pencapaian"
        ];
        dataSheet.push(tableHeaders);
        
        activities.forEach(act => {
            const actualCount = act.actual ? act.actual.length : 0;
            const percentage = act.target > 0 ? (actualCount / act.target) : 0;
            
            if (actualCount === 0) {
                dataSheet.push([
                    act.name, act.target, 0, act.unit, percentage, "", ""
                ]);
            } else {
                act.actual.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(detail => {
                    dataSheet.push([
                        act.name, act.target, actualCount, act.unit, percentage,
                        new Date(detail.date + 'T00:00:00'),
                        detail.description
                    ]);
                });
            }
        });

        // --- 2. Membuat Worksheet ---
        const ws = XLSX.utils.aoa_to_sheet(dataSheet);
        
        // --- 3. Menambahkan Styling ---
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F81BD" } },
            border: {
                top: { style: "thin" }, bottom: { style: "thin" },
                left: { style: "thin" }, right: { style: "thin" }
            },
            alignment: { vertical: "center", horizontal: "center", wrapText: true }
        };
        
        const centeredCell = {
            border: {
                top: { style: "thin" }, bottom: { style: "thin" },
                left: { style: "thin" }, right: { style: "thin" }
            },
            alignment: { vertical: "center", horizontal: "center" }
        };

        const leftAlignedCell = {
            border: {
                top: { style: "thin" }, bottom: { style: "thin" },
                left: { style: "thin" }, right: { style: "thin" }
            },
            alignment: { vertical: "top", wrapText: true }
        };

        if(ws['!ref']) {
            const range = XLSX.utils.decode_range(ws['!ref']);
            const headerRowIndex = 2;

            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ c: C, r: headerRowIndex });
                if (ws[cellRef]) ws[cellRef].s = headerStyle;
            }

            for (let R = headerRowIndex + 1; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
                    if (ws[cellRef]) {
                        if (C === 0 || C === 6) { 
                            ws[cellRef].s = leftAlignedCell;
                        } else {
                            ws[cellRef].s = centeredCell;
                        }
                        if (ws[cellRef].t === 'n' && C === 4) {
                             ws[cellRef].z = '0.00%';
                        }
                        if (ws[cellRef].v instanceof Date) {
                            ws[cellRef].z = 'dd-mmm-yyyy';
                        }
                    }
                }
            }
            
            if(ws['A1']) ws['A1'].s = { font: { bold: true } };
        }

        ws['!cols'] = [
            { wch: 45 }, { wch: 15 }, { wch: 25 }, { wch: 10 }, 
            { wch: 25 }, { wch: 18 }, { wch: 50 }
        ];

        // --- 4. Membuat File & Unduh ---
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan Kinerja");
        const fileName = `Laporan_Kinerja_${userName.replace(/\s+/g, '_') || 'MT-ID'}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    if (isLoading && !error) {
        return ( <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4"> <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div><p className="mt-4 text-lg text-gray-700 dark:text-gray-300">Memuat data aplikasi...</p></div>);
    }
    
    const selectedActivityForModal = activities.find(act => act.id === detailModalActivityId);

    return (
        <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gradient-to-br from-slate-100 to-sky-100 text-gray-800'} p-4 md:p-8 transition-colors duration-300 font-sans`}>
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 text-center sm:text-left">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 dark:text-white">Performance Management Application</h1>
                    <p className="text-lg sm:text-xl text-blue-600 dark:text-blue-400 font-semibold mt-1">Product Inspection MT-ID</p>
                    
                    <div className="mt-3 flex items-center justify-center sm:justify-start">
                        {editingName || !userName ? (
                            <div className="flex items-center space-x-2">
                                <User size={20} className="text-gray-600 dark:text-gray-400" />
                                <input
                                    type="text"
                                    value={tempName}
                                    onChange={handleTempNameChange}
                                    onBlur={handleNameEditToggle}
                                    onKeyPress={(e) => { if (e.key === 'Enter') handleNameEditToggle(); }}
                                    placeholder="Masukkan Nama Anda"
                                    autoFocus={editingName || !userName}
                                    className={`p-1.5 border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 outline-none`}
                                />
                                <button onClick={handleNameEditToggle} className="p-1.5 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 rounded-full hover:bg-green-100 dark:hover:bg-green-500/20" aria-label="Simpan Nama">
                                    <Save size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <User size={20} className="text-gray-600 dark:text-gray-400" />
                                <span className="text-md font-medium text-gray-700 dark:text-gray-300">{userName}</span>
                                <button onClick={handleNameEditToggle} className="p-1.5 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/20" aria-label="Ubah Nama">
                                    <Edit3 size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                     {currentUserId && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center sm:text-left">ID Sesi: {currentUserId}</p>}
                </header>

                <div className="flex justify-end items-center mb-6 space-x-3">
                     <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2.5 rounded-lg bg-white dark:bg-gray-700 shadow-md hover:shadow-lg transition-all text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Toggle Light/Dark Mode">
                        {theme === 'light' ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-6.364-.386 1.591-1.591M3 12h2.25m.386-6.364 1.591 1.591" /></svg>}
                    </button>
                    <button onClick={downloadExcel} className="flex items-center px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50">
                        <Download size={18} className="mr-2" /> Unduh Laporan Excel (.xlsx)
                    </button>
                </div>
                {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow-md" role="alert"><p className="font-bold">Pemberitahuan Sistem:</p><p>{error}</p></div>}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activities.map(activity => ( <ActivityCard key={activity.id} activity={activity} onActivityUpdate={(activityId, field, value) => field === 'target' && handleUpdateTarget(activityId, value)} onOpenDetailModal={() => setDetailModalActivityId(activity.id)} isEditingTarget={editingTargetActivityId === activity.id} onToggleEditTarget={(activityId) => setEditingTargetActivityId(prev => prev === activityId ? null : activityId)} /> ))}
                </div>
                <footer className="mt-16 text-center text-sm text-gray-600 dark:text-gray-400">
                    <p>&copy; {new Date().getFullYear()} Performance Management Application - Product Inspection MT-ID.</p>
                    {(!auth || !db) && !error && <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">Mode Lokal: Koneksi database tidak tersedia.</p>}
                </footer>
            </div>
            <AchievementDetailModal isOpen={!!detailModalActivityId} onClose={() => setDetailModalActivityId(null)} activity={selectedActivityForModal} onAddAchievement={handleAddAchievement} onDeleteAchievement={handleDeleteAchievement} theme={theme} />
        </div>
    );
}

export default App;

