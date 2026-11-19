import fs from 'fs';
import path from 'path';

export interface WhatsAppSendParams {
    target: string; // Phone number (e.g., "919876543210") or Group ID (e.g., "120363023456789012@g.us")
    filename: string;
    fileBuffer: Buffer;
    caption?: string;
}

export interface WhatsAppSendResult {
    success: boolean;
    provider: 'ultramsg' | 'evolution' | 'none';
    messageId?: string;
    target?: string;
    error?: string;
    rawResponse?: any;
}

export function getWhatsAppConfig() {
    const ultraInstance = process.env.ULTRAMSG_INSTANCE_ID?.trim();
    const ultraToken = process.env.ULTRAMSG_TOKEN?.trim();

    const evoUrl = process.env.EVOLUTION_API_URL?.trim();
    const evoKey = process.env.EVOLUTION_API_KEY?.trim();
    const evoInstance = process.env.EVOLUTION_INSTANCE_NAME?.trim() || 'default';

    const defaultTarget = process.env.WHATSAPP_DEFAULT_TARGET?.trim() || process.env.WHATSAPP_DEFAULT_GROUP_ID?.trim() || '';

    if (ultraInstance && ultraToken) {
        return {
            configured: true,
            provider: 'ultramsg' as const,
            ultraInstance,
            ultraToken,
            defaultTarget
        };
    }

    if (evoUrl && evoKey) {
        return {
            configured: true,
            provider: 'evolution' as const,
            evoUrl,
            evoKey,
            evoInstance,
            defaultTarget
        };
    }

    return {
        configured: false,
        provider: 'none' as const,
        ultraInstance: ultraInstance || '',
        ultraToken: ultraToken || '',
        defaultTarget
    };
}

export function saveWhatsAppConfig(config: { ultraInstance?: string; ultraToken?: string; defaultTarget?: string }) {
    try {
        const envPath = path.join(process.cwd(), '.env.local');
        let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

        const updates: Record<string, string> = {};
        if (config.ultraInstance !== undefined) updates['ULTRAMSG_INSTANCE_ID'] = config.ultraInstance.trim();
        if (config.ultraToken !== undefined) updates['ULTRAMSG_TOKEN'] = config.ultraToken.trim();
        if (config.defaultTarget !== undefined) updates['WHATSAPP_DEFAULT_TARGET'] = config.defaultTarget.trim();

        for (const [k, v] of Object.entries(updates)) {
            process.env[k] = v;
            const regex = new RegExp(`^${k}=.*$`, 'm');
            if (regex.test(content)) {
                content = content.replace(regex, `${k}=${v}`);
            } else {
                content += `\n${k}=${v}`;
            }
        }

        fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');
        return true;
    } catch (e) {
        console.error('Failed to write .env.local for WhatsApp config:', e);
        return false;
    }
}

/**
 * Format target phone or group ID into valid WhatsApp format:
 * - If contains '@g.us', it's already a group JID.
 * - If plain numbers, strip non-digits and ensure country code (default 91 for India if 10 digits).
 */
export function formatWhatsAppTarget(target: string): string {
    const trimmed = (target || '').trim();
    if (trimmed.includes('@g.us') || trimmed.includes('@s.whatsapp.net')) {
        return trimmed;
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10) {
        return `91${digits}`;
    }
    return digits;
}

/**
 * Send PDF Document to WhatsApp via UltraMsg (default) or Evolution API
 * When caption is omitted or empty, only the clean PDF document is sent (no write up).
 */
export async function sendWhatsAppDocument(params: WhatsAppSendParams): Promise<WhatsAppSendResult> {
    const config = getWhatsAppConfig();

    if (!config.configured) {
        return {
            success: false,
            provider: 'none',
            target: params.target,
            error: 'WhatsApp API credentials are not configured. Please enter your UltraMsg Instance ID & Token.'
        };
    }

    const targetFormatted = formatWhatsAppTarget(params.target);
    if (!targetFormatted) {
        return {
            success: false,
            provider: config.provider,
            target: params.target,
            error: 'A valid WhatsApp phone number or Group ID is required.'
        };
    }

    const base64Data = params.fileBuffer.toString('base64');

    // 1. UltraMsg Provider (Best & Recommended option)
    if (config.provider === 'ultramsg') {
        try {
            const dataUri = `data:application/pdf;base64,${base64Data}`;
            const endpoint = `https://api.ultramsg.com/${config.ultraInstance}/messages/document`;

            const formBody: Record<string, string> = {
                token: config.ultraToken!,
                to: targetFormatted,
                filename: params.filename,
                document: dataUri,
            };

            // Only attach caption if explicitly passed and not empty
            if (params.caption && params.caption.trim()) {
                formBody.caption = params.caption.trim();
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(formBody).toString(),
            });

            const data = await res.json();
            if (data.sent === 'true' || data.id || data.status === 'success') {
                return {
                    success: true,
                    provider: 'ultramsg',
                    target: targetFormatted,
                    messageId: data.id || (typeof data.message === 'string' ? data.message : undefined),
                    rawResponse: data,
                };
            }

            return {
                success: false,
                provider: 'ultramsg',
                target: targetFormatted,
                error: data.error || data.message || 'UltraMsg failed to deliver document.',
                rawResponse: data,
            };
        } catch (err: any) {
            return {
                success: false,
                provider: 'ultramsg',
                target: targetFormatted,
                error: err.message || 'Network error connecting to UltraMsg.',
            };
        }
    }

    // 2. Evolution API Provider
    if (config.provider === 'evolution') {
        try {
            const cleanUrl = config.evoUrl!.replace(/\/+$/, '');
            const endpoint = `${cleanUrl}/message/sendMedia/${config.evoInstance}`;

            const mediaMessage: any = {
                mediatype: 'document',
                media: base64Data,
                fileName: params.filename,
            };

            if (params.caption && params.caption.trim()) {
                mediaMessage.caption = params.caption.trim();
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': config.evoKey!,
                },
                body: JSON.stringify({
                    number: targetFormatted,
                    mediaMessage,
                }),
            });

            const data = await res.json();
            if (res.ok && (data.key?.id || data.messageId || data.status === 'SUCCESS' || data.sent)) {
                return {
                    success: true,
                    provider: 'evolution',
                    target: targetFormatted,
                    messageId: data.key?.id || data.messageId,
                    rawResponse: data,
                };
            }

            return {
                success: false,
                provider: 'evolution',
                target: targetFormatted,
                error: data.message || data.error || 'Evolution API failed to deliver document.',
                rawResponse: data,
            };
        } catch (err: any) {
            return {
                success: false,
                provider: 'evolution',
                target: targetFormatted,
                error: err.message || 'Network error connecting to Evolution API.',
            };
        }
    }

    return {
        success: false,
        provider: 'none',
        target: targetFormatted,
        error: 'Unknown WhatsApp provider configuration.',
    };
}
