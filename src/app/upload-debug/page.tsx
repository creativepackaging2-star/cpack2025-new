'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';

export default function UploadDebugPage() {
    const [status, setStatus] = useState<string>('Idle');
    const [debugInfo, setDebugInfo] = useState<any>({});
    const [logs, setLogs] = useState<string[]>([]);

    function log(msg: string) {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
        console.log(msg);
    }

    useEffect(() => {
        // Check config
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        setDebugInfo({
            urlConfigured: !!url,
            urlValue: url ? url.substring(0, 15) + '...' : 'MISSING',
            keyConfigured: !!key,
            bucketName: 'product-files'
        });
    }, []);

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('Uploading...');
        log('Starting upload of: ' + file.name);

        try {
            const fileName = `debug_web_${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;

            log('Target File Path: ' + fileName);

            // 1. Upload
            const { data, error } = await supabase.storage
                .from('product-files')
                .upload(fileName, file, { upsert: true });

            if (error) {
                log('❌ Upload ERROR: ' + JSON.stringify(error, null, 2));
                setStatus('Failed');
                alert(`Upload Failed!\n\nFULL ERROR: ${JSON.stringify(error, null, 2)}`);
                return;
            }

            log('✅ Upload SUCCESS: ' + JSON.stringify(data));

            // 2. Get URL
            const { data: urlData } = supabase.storage
                .from('product-files')
                .getPublicUrl(fileName);

            log('Public URL: ' + urlData.publicUrl);
            setStatus('Success');

        } catch (err: any) {
            log('💥 EXCEPTION: ' + err.message);
            setStatus('Error');
        }
    }

    return (
        <div className="p-10 max-w-2xl mx-auto font-mono text-sm">
            <h1 className="text-xl font-bold mb-5">Storage Debugger</h1>

            <div className="bg-slate-100 p-4 rounded mb-5">
                <h3 className="font-bold border-b border-slate-300 mb-2">Configuration</h3>
                <p>URL: {debugInfo.urlValue}</p>
                <p>Key Present: {debugInfo.keyConfigured ? 'YES' : 'NO'}</p>
                <p>Target Bucket: product-files</p>
            </div>

            <div className="mb-5 p-4 border-2 border-dashed border-indigo-300 rounded bg-indigo-50">
                <label className="block mb-2 font-bold">Select File to Test:</label>
                <input type="file" onChange={handleUpload} />
            </div>

            <div className="bg-black text-green-400 p-4 rounded min-h-[200px] overflow-auto">
                <h3 className="text-white border-b border-gray-700 mb-2">Logs</h3>
                {logs.length === 0 && <span className="opacity-50">Waiting for action...</span>}
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>

            <div className="mt-4 text-center">
                <span className={`px-3 py-1 rounded text-white ${status === 'Success' ? 'bg-green-600' : status === 'Failed' ? 'bg-red-600' : 'bg-slate-400'}`}>
                    Status: {status}
                </span>
            </div>
        </div>
    );
}
