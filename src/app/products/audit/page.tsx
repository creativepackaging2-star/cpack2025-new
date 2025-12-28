'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Product } from '@/types';
import { Loader2, ArrowLeft, Download, RefreshCw, Upload } from 'lucide-react';
import Link from 'next/link';

export default function AuditPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [effectsMap, setEffectsMap] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchData();
        fetchResources();
    }, []);

    const fetchResources = async () => {
        // Fetch Special Effects Map because DB might store IDs
        const { data } = await supabase.from('special_effects').select('id, name');
        if (data) {
            const map: Record<string, string> = {};
            data.forEach((fx: any) => {
                map[String(fx.id)] = fx.name;
            });
            setEffectsMap(map);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('product_name', { ascending: true });

        if (error) {
            console.error('Error fetching:', error);
            alert('Error fetching data');
        } else {
            setProducts(data || []);
        }
        setLoading(false);
    };

    // Helper to render special effects (handles IDs, names, or JSON arrays)
    const renderSpecialEffects = (val: string | null) => {
        if (!val) return <span className="text-slate-400 italic">Null</span>;

        // Check if it's a simple ID in our map
        if (effectsMap[val]) return effectsMap[val];

        // Check if it's a JSON array of IDs e.g. ["1", "2"]
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
                return parsed.map(id => effectsMap[String(id)] || id).join(', ');
            }
        } catch (e) {
            // Not JSON
        }

        // Maybe comma separated string "1,2"
        if (val.includes(',')) {
            return val.split(',').map(part => {
                const trimmed = part.trim();
                return effectsMap[trimmed] || trimmed;
            }).join(', ');
        }

        return val;
    };

    const downloadCSV = () => {
        const headers = ['Product Name', 'Artwork Code', 'Special Effects (DB)', 'Specs (DB)', 'Google Drive Value (Check)'];
        const rows = products.map(p => [
            `"${p.product_name || ''}"`,
            `"${p.artwork_code || ''}"`,
            `"${p.special_effects || ''}"`,
            `"${p.specs || ''}"`,
            '' // Empty column for them to fill
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'special_effects_audit.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [csvData, setCsvData] = useState<Record<string, string>>({});
    const [stats, setStats] = useState({ match: 0, mismatch: 0, missing: 0 });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadStatus('Reading file...');
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            parseCSV(text);
        };
        reader.readAsText(file);
    };

    const parseCSV = (text: string) => {
        const lines = text.split(/\r?\n/);
        const map: Record<string, string> = {};
        let rowCount = 0;

        lines.forEach((line) => {
            if (!line.trim()) return;
            // Robust Split: Handle quotes
            // e.g. "Product, Name", "Effect"
            const cols = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
            if (!cols) return;

            // Clean up regex match results
            const cleanCols = cols.map(col => {
                return col.replace(/^,/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim();
            });

            if (cleanCols.length >= 2) {
                const name = cleanCols[0];
                const effect = cleanCols[1];

                if (name && name.toLowerCase() !== 'product name') {
                    map[name.toLowerCase()] = effect;
                    rowCount++;
                }
            }
        });

        setCsvData(map);
        calculateStats(products, map);
        setUploadStatus(`Parsed ${rowCount} rows successfully.`);
    };

    const calculateStats = (currentProducts: Product[], map: Record<string, string>) => {
        let match = 0, mismatch = 0, missing = 0;
        currentProducts.forEach(p => {
            const normName = (p.product_name || '').toLowerCase().trim();
            const csvValue = map[normName];

            const rawDbVal = p.special_effects || '';
            const resolvedDbVal = renderSpecialEffects(rawDbVal);

            // Adjusted logic: Compare CSV value against simple string DB value OR resolved name
            const dbValString = typeof resolvedDbVal === 'string' ? resolvedDbVal : rawDbVal;

            if (!csvValue) {
                missing++;
            } else if (
                csvValue.toLowerCase() === rawDbVal.toLowerCase() ||
                csvValue.toLowerCase() === dbValString.toLowerCase()
            ) {
                match++;
            } else {
                mismatch++;
            }
        });
        setStats({ match, mismatch, missing });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/products" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Data Audit: Special Effects</h1>
                        <p className="text-sm text-slate-500">Compare Database vs Legacy CSV</p>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    {uploadStatus && <span className="text-xs font-medium text-emerald-600 animate-pulse bg-emerald-50 px-2 py-1 rounded">{uploadStatus}</span>}
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-medium text-sm shadow-sm transition-colors">
                            <Upload className="h-4 w-4" />
                            Upload CSV
                        </button>
                    </div>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh DB
                    </button>
                    <button
                        onClick={downloadCSV}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium text-sm shadow-sm"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {Object.keys(csvData).length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-emerald-600">{stats.match}</div>
                        <div className="text-xs font-medium text-emerald-800 uppercase">Matches</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-amber-600">{stats.missing}</div>
                        <div className="text-xs font-medium text-amber-800 uppercase">Missing in CSV</div>
                    </div>
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.mismatch}</div>
                        <div className="text-xs font-medium text-red-800 uppercase">Values Differ</div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[30%]">
                                    Product Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-indigo-600 uppercase tracking-wider w-[25%] bg-indigo-50/50">
                                    DB Value
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-emerald-600 uppercase tracking-wider w-[25%] bg-emerald-50/50 border-l border-emerald-100">
                                    CSV Value
                                </th>
                                <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-[20%]">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex justify-center items-center gap-2 text-slate-500">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Loading audit data...
                                        </div>
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No products found.
                                    </td>
                                </tr>
                            ) : (
                                products.map((product, idx) => {
                                    const normName = (product.product_name || '').toLowerCase().trim();
                                    const csvVal = csvData[normName];

                                    // Use our helper to get the readable string
                                    const resolvedDbVal = renderSpecialEffects(product.special_effects);

                                    // Robust comparison string
                                    // If renderSpecialEffects returns a string (normal case), use it. 
                                    const dbValString = typeof resolvedDbVal === 'string' ? resolvedDbVal : String(product.special_effects || '');

                                    let status = 'neutral';
                                    let rowClass = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';

                                    if (Object.keys(csvData).length > 0) {
                                        if (!csvVal) status = 'missing';
                                        else if (
                                            csvVal.toLowerCase() === (product.special_effects || '').toLowerCase() ||
                                            csvVal.toLowerCase() === dbValString.toLowerCase()
                                        ) status = 'match';
                                        else status = 'differ';

                                        if (status === 'differ') rowClass = 'bg-red-50 hover:bg-red-100';
                                        if (status === 'match') rowClass = 'bg-emerald-50/30 hover:bg-emerald-50';
                                    }

                                    return (
                                        <tr key={product.id} className={`${rowClass} transition-colors`}>
                                            <td className="px-6 py-3 text-sm font-medium text-slate-900">
                                                {product.product_name}
                                                <div className="text-[10px] font-mono text-slate-400 font-normal">{product.artwork_code}</div>
                                            </td>
                                            <td className="px-6 py-3 text-sm text-indigo-700 font-medium bg-indigo-50/30">
                                                {resolvedDbVal}
                                            </td>
                                            <td className="px-6 py-3 text-sm border-l border-emerald-100 bg-emerald-50/30 text-emerald-800 font-medium">
                                                {csvVal || <span className="text-slate-300 italic">-</span>}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                {status === 'match' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-emerald-100 text-emerald-700">MATCH</span>}
                                                {status === 'differ' && <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 animate-pulse">MISMATCH</span>}
                                                {status === 'missing' && Object.keys(csvData).length > 0 && <span className="text-xs text-slate-400">Not in CSV</span>}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
